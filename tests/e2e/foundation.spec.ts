import { expect, test, type Page } from '@playwright/test';

import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { executeCommand } from '../../src/game-core/commands/executeCommand';
import type { RunCommand } from '../../src/game-core/commands/types';
import type { RunState } from '../../src/game-core/model/run';

async function createProfileAndRun(page: Page, seed: string, name = '浏览器戏主') {
  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  await page.getByRole('button', { name: '在此建档' }).first().click();
  await page.getByLabel('档案名').fill(name);
  await page.getByRole('button', { name: '落印建档' }).click();
  await page.getByLabel('试玩种子（可选）').fill(seed);
  await page.getByRole('button', { name: '开始今夜试玩' }).click();
  await expect(page.getByText('幕一 · 试演盲注')).toBeVisible();
}

async function parkPointer(page: Page) {
  await page.mouse.move(640, 240);
  await page.waitForTimeout(800);
}

async function waitForCheckpoint(page: Page, checkpointId: number) {
  await expect(page.getByText(`检查点 #${String(checkpointId)}`)).toBeVisible();
}

async function readActiveRun(page: Page): Promise<RunState> {
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
      database
        .transaction('meta', 'readonly')
        .objectStore('meta')
        .get('state') as IDBRequest<unknown>,
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
        .get(meta.activeProfileId) as IDBRequest<unknown>,
    );
    database.close();
    if (!run || typeof run !== 'object' || !('runId' in run)) {
      throw new Error('没有活动牌局');
    }
    return run as RunState;
  });
}

function apply(state: RunState, command: RunCommand): RunState {
  const result = executeCommand(state, command);
  if (!result.ok) throw new Error(result.rejection.message);
  return result.state;
}

test('固定种子在每个动作边界都恢复相同检查点', async ({ page }) => {
  const seed = 'browser-boundary-seed';
  await createProfileAndRun(page, seed);
  let expected = createFixtureRun(seed);
  expect(await readActiveRun(page)).toEqual(expected);

  const firstCardId = expected.hand[0]!.id;
  await page.locator(`[data-card-id="${firstCardId}"]`).click();
  expected = apply(expected, {
    type: 'toggle-card',
    checkpointId: expected.checkpointId,
    cardId: firstCardId,
  });
  await waitForCheckpoint(page, expected.checkpointId);
  await page.reload();
  await expect(page.getByText('已选 1 / 5')).toBeVisible();
  expect(await readActiveRun(page)).toEqual(expected);

  const consumable = expected.consumables[0]!;
  await page.getByRole('button', { name: '使用 移花换点' }).click();
  expected = apply(expected, {
    type: 'use-consumable',
    checkpointId: expected.checkpointId,
    consumableInstanceId: consumable.instanceId,
    cardId: firstCardId,
  });
  await waitForCheckpoint(page, expected.checkpointId);
  await page.reload();
  expect(await readActiveRun(page)).toEqual(expected);

  await page.getByRole('button', { name: '出牌' }).click();
  expected = apply(expected, {
    type: 'play-selected',
    checkpointId: expected.checkpointId,
  });
  await waitForCheckpoint(page, expected.checkpointId);
  await page.reload();
  await expect(page.getByText(/本手 ·/)).toBeVisible();
  expect(await readActiveRun(page)).toEqual(expected);

  const discardCardId = expected.hand[0]!.id;
  await page.locator(`[data-card-id="${discardCardId}"]`).click();
  expected = apply(expected, {
    type: 'toggle-card',
    checkpointId: expected.checkpointId,
    cardId: discardCardId,
  });
  await waitForCheckpoint(page, expected.checkpointId);
  await page.getByRole('button', { name: '弃牌' }).click();
  expected = apply(expected, {
    type: 'discard-selected',
    checkpointId: expected.checkpointId,
  });
  await waitForCheckpoint(page, expected.checkpointId);
  await page.reload();
  expect(await readActiveRun(page)).toEqual(expected);
});

test('固定顺子种子可赢下盲注、进入商店并完成试玩', async ({ page }) => {
  await createProfileAndRun(page, 'browser-win-5', '胜局戏主');
  const straightCardIds = [
    'playing:spades:9',
    'playing:diamonds:queen',
    'playing:hearts:jack',
    'playing:hearts:10',
    'playing:clubs:king',
  ];

  for (const cardId of straightCardIds) {
    await page.locator(`[data-card-id="${cardId}"]`).click();
  }
  await page.getByRole('button', { name: '出牌' }).click();
  await expect(page.getByText('百戏夜市 · 试演摊位')).toBeVisible();
  await page.reload();
  await expect(page.getByText('百戏夜市 · 试演摊位')).toBeVisible();

  const beforeReroll = await readActiveRun(page);
  await page.getByRole('button', { name: '重掷商品' }).click();
  await waitForCheckpoint(page, beforeReroll.checkpointId + 1);
  await page.reload();
  await expect(page.getByText('百戏夜市 · 试演摊位')).toBeVisible();
  await page.getByRole('button', { name: '收摊 · 完成试玩' }).click();
  await expect(page.getByRole('heading', { name: '今夜压轴，满堂喝彩' })).toBeVisible();
});

test('连续四次只出单张会进入失败落幕', async ({ page }) => {
  await createProfileAndRun(page, 'browser-loss-seed', '败局戏主');

  for (let hand = 0; hand < 4; hand += 1) {
    await page.getByTestId('playing-card').first().click();
    await page.getByRole('button', { name: '出牌' }).click();
  }

  await expect(page.getByRole('heading', { name: '锣声已止，再排一场' })).toBeVisible();
});

test('三档牌局相互隔离，导出档案可在清局后恢复原检查点', async ({ page }, testInfo) => {
  await createProfileAndRun(page, 'profile-a-seed', '甲档戏主');
  await page.getByTestId('playing-card').first().click();
  await waitForCheckpoint(page, 1);
  const exportedRun = await readActiveRun(page);
  await page.getByRole('button', { name: '返回戏主名簿' }).click();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出当前档' }).click();
  const download = await downloadPromise;
  const exportPath = testInfo.outputPath('profile-a.json');
  await download.saveAs(exportPath);

  await page.getByRole('button', { name: '在此建档' }).first().click();
  await page.getByLabel('档案名').fill('乙档戏主');
  await page.getByRole('button', { name: '落印建档' }).click();
  await page.getByLabel('试玩种子（可选）').fill('profile-b-seed');
  await page.getByRole('button', { name: '开始今夜试玩' }).click();
  expect((await readActiveRun(page)).seed).toBe('profile-b-seed');

  await page.getByRole('button', { name: '返回戏主名簿' }).click();
  await page
    .locator('article')
    .filter({ hasText: '甲档戏主' })
    .getByRole('button', { name: '续接此档' })
    .click();
  expect(await readActiveRun(page)).toEqual(exportedRun);

  page.once('dialog', (dialog) => {
    void dialog.accept();
  });
  await page.getByRole('button', { name: '放弃' }).click();
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();

  page.once('dialog', (dialog) => {
    void dialog.accept();
  });
  await page.locator('input[type="file"]').setInputFiles(exportPath);
  await expect(page.getByText('幕一 · 试演盲注')).toBeVisible();
  expect(await readActiveRun(page)).toEqual(exportedRun);
});

test('1280×720 基准画面覆盖名簿、牌桌、商店与结算', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  await parkPointer(page);
  await expect(page).toHaveScreenshot('profile-screen.png', {
    animations: 'disabled',
    fullPage: true,
  });

  await page.getByRole('button', { name: '在此建档' }).first().click();
  await page.getByLabel('档案名').fill('画面戏主');
  await page.getByRole('button', { name: '落印建档' }).click();
  await page.getByLabel('试玩种子（可选）').fill('browser-win-5');
  await page.getByRole('button', { name: '开始今夜试玩' }).click();
  await expect(page.getByText('幕一 · 试演盲注')).toBeVisible();
  await parkPointer(page);
  await expect(page).toHaveScreenshot('table-screen.png', {
    animations: 'disabled',
    fullPage: true,
  });

  const straightCardIds = [
    'playing:spades:9',
    'playing:diamonds:queen',
    'playing:hearts:jack',
    'playing:hearts:10',
    'playing:clubs:king',
  ];
  for (const cardId of straightCardIds) {
    await page.locator(`[data-card-id="${cardId}"]`).click();
  }
  await page.getByRole('button', { name: '出牌' }).click();
  await expect(page.getByText('百戏夜市 · 试演摊位')).toBeVisible();
  await parkPointer(page);
  await expect(page).toHaveScreenshot('shop-screen.png', {
    animations: 'disabled',
    fullPage: true,
  });

  await page.getByRole('button', { name: '收摊 · 完成试玩' }).click();
  await expect(page.getByRole('heading', { name: '今夜压轴，满堂喝彩' })).toBeVisible();
  await parkPointer(page);
  await expect(page).toHaveScreenshot('result-screen.png', {
    animations: 'disabled',
    fullPage: true,
  });
});
