import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

import type { RunStateV7 } from '../../src/game-core/model/runV7';
import { createProfile } from '../../src/persistence/profiles';
import { exportProfileToJson } from '../../src/persistence/profileTransfer';
import { expectInsideStage, expectNoOuterScroll } from './helpers/layoutGeometry';

async function readActiveRunV7(page: Page): Promise<RunStateV7 | null> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('baixiqipai');
      request.onerror = () => reject(request.error ?? new Error('无法打开本地数据库'));
      request.onsuccess = () => resolve(request.result);
    });
    const read = (request: IDBRequest<unknown>) =>
      new Promise<unknown>((resolve, reject) => {
        request.onerror = () => reject(request.error ?? new Error('无法读取本地数据库'));
        request.onsuccess = () => resolve(request.result);
      });
    const meta = await read(
      database.transaction('meta', 'readonly').objectStore('meta').get('state'),
    );
    if (
      !meta ||
      typeof meta !== 'object' ||
      !('activeProfileId' in meta) ||
      typeof meta.activeProfileId !== 'string'
    ) {
      database.close();
      return null;
    }
    const run = await read(
      database
        .transaction('runs', 'readonly')
        .objectStore('runs')
        .get(meta.activeProfileId),
    );
    database.close();
    return (run as RunStateV7 | undefined) ?? null;
  });
}

async function createSkippedProfile(page: Page, name: string) {
  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  await page.getByRole('button', { name: '在此建档' }).first().click();
  await page.getByLabel('档案名').fill(name);
  await page.getByRole('button', { name: '落印建档' }).click();
  await page.getByRole('button', { name: '暂时跳过教程' }).click();
  await expect(page.getByRole('button', { name: '普通战役' })).toBeEnabled();
}

async function expectContentHeightSurface(page: Page, headingName: string) {
  const surface = page
    .getByRole('heading', { name: headingName })
    .locator('xpath=ancestor::*[@data-layout-size][1]');
  await expect(surface).toHaveAttribute('data-layout-size', 'content');

  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(100);
    await expectInsideStage(page, surface, headingName);
    const stage = await page.getByRole('region', { name: '午夜百戏舞台' }).boundingBox();
    const panel = await surface.boundingBox();
    expect(stage).not.toBeNull();
    expect(panel).not.toBeNull();
    if (stage && panel) {
      const lowerSceneGap = stage.y + stage.height - (panel.y + panel.height);
      expect(lowerSceneGap).toBeGreaterThanOrEqual(viewport.width === 1920 ? 96 : 16);
    }
    await expectNoOuterScroll(page);
  }
}

test('图鉴、成就、帮助、统计与种子分享组成可刷新本地闭环', async ({ page }, testInfo) => {
  const remoteRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4173') remoteRequests.push(request.url());
  });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (
            globalThis as typeof globalThis & { __copiedSeedCode?: string }
          ).__copiedSeedCode = value;
        },
      },
    });
  });
  await createSkippedProfile(page, '总账验收人');
  await testInfo.attach(`progression-menu-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });

  await page.getByRole('button', { name: '百戏图鉴' }).click();
  await expect(page.getByRole('heading', { name: '百戏图鉴' })).toBeVisible();
  await expect(page.locator('[data-collection-row]')).toHaveCount(380);
  await expect(
    page.locator('[data-collection-row] h3', { hasText: '未发现奇牌' }),
  ).toHaveCount(150);
  await page.getByLabel('内容类别').selectOption('joker');
  await page.getByLabel('状态').selectOption('undiscovered');
  await expect(page.locator('[data-collection-row]')).toHaveCount(150);
  await expect(page.getByText('当前显示 150 项')).toBeVisible();
  await testInfo.attach(`progression-collection-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: '百戏图鉴' })).toBeVisible();
  await expect(page.locator('[data-collection-row]')).toHaveCount(380);

  await page.getByRole('button', { name: '返回主菜单' }).click();
  await page.getByRole('button', { name: '百戏成就簿' }).click();
  await expect(page.locator('[data-achievement-row]')).toHaveCount(31);
  await expect(page.getByText('公开成就 · 已完成 0 / 31')).toBeVisible();
  await expect(page.getByText(/^bxqp:achievement:/)).toHaveCount(0);

  await page.getByRole('button', { name: '返回主菜单' }).click();
  await page.getByRole('button', { name: '牌型与术语' }).click();
  await expect(page.locator('[data-hand-reference-row]')).toHaveCount(12);
  await page.getByRole('button', { name: '返回主菜单' }).click();
  await page.getByRole('button', { name: '统计账册' }).click();
  await expect(page.getByText('普通胜场').locator('..')).toContainText('0');

  await page.getByRole('button', { name: '返回主菜单' }).click();
  await page.getByRole('button', { name: '种子牌局' }).click();
  await page.reload();
  await expect(page.getByRole('heading', { name: '种子牌局设置' })).toBeVisible();
  await page.getByLabel('种子或分享码').fill('abcd1234');
  const canonical = 'BXQP1|progression-modes-1|ABCD1234|D01|S01';
  await expect(page.getByText(canonical)).toBeVisible();
  await testInfo.attach(`progression-seed-setup-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
  await page.getByRole('button', { name: '复制分享码' }).click();
  await expect(page.getByRole('button', { name: '已复制 ✓' })).toBeVisible();
  await expect(page.getByText('分享码已复制')).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (globalThis as typeof globalThis & { __copiedSeedCode?: string })
          .__copiedSeedCode,
    ),
  ).toBe(canonical);
  await page.getByLabel('种子或分享码').fill('abcd1235');
  await expect(page.getByRole('button', { name: '复制分享码' })).toBeVisible();
  await expect(page.getByText('分享码已复制')).toHaveCount(0);
  await page.evaluate(() => {
    navigator.clipboard.writeText = async () => {
      throw new Error('clipboard denied');
    };
  });
  await page.getByRole('button', { name: '复制分享码' }).click();
  await expect(page.getByText('复制失败，请手动选择分享码')).toBeVisible();
  await expect(page.getByRole('button', { name: '复制分享码' })).toBeVisible();
  await page.getByLabel('种子或分享码').fill('abcd1234');
  await expect(page.getByText('复制失败，请手动选择分享码')).toHaveCount(0);
  await page.getByRole('button', { name: '开始种子牌局' }).click();
  await expect(page.getByRole('heading', { name: '第 1 幕 · 择幕登台' })).toBeVisible();

  const run = await readActiveRunV7(page);
  expect(run?.sessionV7).toMatchObject({ runClass: 'seeded' });
  expect(run?.seed).toBe('ABCD1234');
  await page.reload();
  await expect(page.getByRole('heading', { name: '第 1 幕 · 择幕登台' })).toBeVisible();
  await page.getByRole('button', { name: '主菜单' }).click();
  await expect(page.getByRole('button', { name: '继续牌局' })).toBeVisible();
  await page.getByRole('button', { name: '继续牌局' }).click();
  await page.getByRole('button', { name: '档案维护' }).click();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: '放弃当前牌局' }).click();
  await expect(page.getByRole('heading', { name: '今晚演哪一出' })).toBeVisible();
  await expect(page.getByRole('button', { name: '继续牌局' })).toHaveCount(0);
  expect(remoteRequests).toEqual([]);
});

test('大舞台短内容页面收束到内容并露出既有戏台背景', async ({ page }) => {
  await createSkippedProfile(page, '大舞台验收人');

  await expectContentHeightSurface(page, '今晚演哪一出');
  await page.getByRole('button', { name: '戏报 0' }).click();
  await expectContentHeightSurface(page, '戏报');
  await page.getByRole('button', { name: '返回主菜单' }).click();

  await page.getByRole('button', { name: '种子牌局' }).click();
  await expectContentHeightSurface(page, '种子牌局设置');
  await page.getByRole('button', { name: '返回主菜单' }).click();

  await page.getByRole('button', { name: '档案维护' }).click();
  await expectContentHeightSurface(page, '档案维护');
  await page.getByRole('button', { name: '返回主菜单' }).click();

  await page.getByRole('button', { name: '普通战役' }).click();
  await expectContentHeightSurface(page, '普通战役设置');
  await expect(page.getByRole('button', { name: '开始普通战役' })).toBeEnabled();
  await page.getByRole('button', { name: '开始普通战役' }).click();
  await expect(page.getByRole('heading', { name: '第 1 幕 · 择幕登台' })).toBeVisible();
  await expectContentHeightSurface(page, '第 1 幕 · 择幕登台');
});

test('导入已开放挑战的档案后可开局、刷新、弃局并保留挑战尝试', async ({
  page,
}, testInfo) => {
  const base = createProfile(1, '挑战验收人', 100);
  const profile = {
    ...base,
    updatedAtEpochMs: 200,
    tutorial: {
      ...base.tutorial,
      status: 'skipped' as const,
      startedAtEpochMs: 150,
      skippedAtEpochMs: 150,
    },
    challengeProgress: {
      ...base.challengeProgress,
      nextAvailableOrdinal: 1,
    },
    objectives: base.objectives.map((record) =>
      record.objectiveId === 'bxqp:objective:challenge:01'
        ? {
            ...record,
            current: record.target,
            completedAtEpochMs: 200,
            source: 'campaign' as const,
          }
        : record,
    ),
  };
  const fixturePath = testInfo.outputPath('challenge-profile.json');
  await writeFile(fixturePath, exportProfileToJson(profile, null), 'utf8');

  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles(fixturePath);
  await expect(page.getByText('档案导入预览')).toBeVisible();
  await page.getByRole('button', { name: '确认导入' }).click();
  await expect(page.getByRole('button', { name: '挑战模式' })).toBeEnabled();
  await page.getByRole('button', { name: '挑战模式' }).click();
  await expect(page.getByRole('heading', { name: '挑战模式设置' })).toBeVisible();
  await expect(page.getByLabel('已开放挑战')).toHaveValue(
    profile.challengeProgress.records[0]?.challengeId ?? '',
  );
  await expect(page.getByLabel('牌组')).toHaveCount(0);
  await expect(page.getByLabel('筹码等级')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '开始挑战' })).toBeEnabled();
  await page.getByRole('button', { name: '开始挑战' }).click();
  await expect(page.getByRole('heading', { name: '第 1 幕 · 择幕登台' })).toBeVisible();
  expect((await readActiveRunV7(page))?.sessionV7.runClass).toBe('challenge');

  await page.reload();
  await expect(page.getByRole('heading', { name: '第 1 幕 · 择幕登台' })).toBeVisible();
  await page.getByRole('button', { name: '档案维护' }).click();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: '放弃当前牌局' }).click();
  await page.getByRole('button', { name: '统计账册' }).click();
  await expect(page.getByText('尝试 1').first()).toBeVisible();
});
