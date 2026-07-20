import { expect, test, type Page } from '@playwright/test';

import type { RunStateV2 } from '../../src/game-core/model/runV2';

async function readActiveRun(page: Page): Promise<RunStateV2> {
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
      throw new Error('没有活动档案');
    }
    const run = await read(
      database
        .transaction('runs', 'readonly')
        .objectStore('runs')
        .get(meta.activeProfileId),
    );
    database.close();
    if (!run) throw new Error('没有活动牌局');
    return run as RunStateV2;
  });
}

async function enterRound(page: Page) {
  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  await page.getByRole('button', { name: '在此建档' }).first().click();
  await page.getByLabel('档案名').fill('朱印验收人');
  await page.getByRole('button', { name: '落印建档' }).click();
  await page.getByRole('button', { name: '暂时跳过教程' }).click();
  await page.getByRole('button', { name: '普通战役' }).click();
  await page.getByLabel('演出种子').fill('PRES0001');
  await page.getByRole('button', { name: '开始普通战役' }).click();
  await page.getByRole('button', { name: '登台应战' }).click();
  await expect(page.getByRole('button', { name: '出牌' })).toBeVisible();
}

async function landCurrentPresentation(page: Page) {
  const button = page.getByRole('button', {
    name: '落定演出，显示已提交结果',
  });
  try {
    await expect(button).toBeVisible({ timeout: 1_000 });
    await button.click({ timeout: 1_000 });
  } catch {
    // A short routine cue may already have completed by the time the DOM settles.
  }
}

async function selectFirstCard(page: Page) {
  await page.locator('[data-card-id]').first().click();
  await landCurrentPresentation(page);
}

test('完整与利落朱印都只呈现已提交结果，一点落定不会重发牌局命令', async ({ page }) => {
  await enterRound(page);
  await landCurrentPresentation(page);
  await selectFirstCard(page);
  const beforeFull = await readActiveRun(page);

  await page.getByRole('button', { name: '出牌' }).click();
  const fullPerformance = page.locator('[data-sequence-id][data-speed="full"]');
  await expect(fullPerformance).toBeVisible();
  const committedFull = await readActiveRun(page);
  expect(committedFull.checkpointId).toBe(beforeFull.checkpointId + 1);
  expect(committedFull).not.toEqual(beforeFull);
  await page.getByRole('button', { name: '落定演出，显示已提交结果' }).click();
  await expect(fullPerformance).toHaveCount(0);
  expect(await readActiveRun(page)).toEqual(committedFull);

  await page.getByRole('button', { name: '打开声场设置' }).click();
  const drawer = page.getByRole('dialog', { name: '声场控制台' });
  await drawer.getByRole('button', { name: '利落演出' }).click();
  await expect(drawer.getByText('正在落印…')).toHaveCount(0);
  await drawer.getByRole('button', { name: '收起声场' }).click();
  await selectFirstCard(page);
  const beforeBrisk = await readActiveRun(page);

  await page.getByRole('button', { name: '出牌' }).click();
  const briskPerformance = page.locator('[data-sequence-id][data-speed="brisk"]');
  await expect(briskPerformance).toBeVisible();
  await page.getByRole('button', { name: '落定演出，显示已提交结果' }).click();
  await expect(briskPerformance).toHaveCount(0);
  const committedBrisk = await readActiveRun(page);
  expect(committedBrisk.checkpointId).toBe(beforeBrisk.checkpointId + 1);

  await page.reload();
  expect(await readActiveRun(page)).toEqual(committedBrisk);
});
