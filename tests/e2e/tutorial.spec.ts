import { expect, test, type Page } from '@playwright/test';

import type { RunStateV2 } from '../../src/game-core/model/runV2';
import type { ProfileRecord } from '../../src/persistence/profiles';

async function readActiveRun(page: Page): Promise<RunStateV2 | null> {
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
    return (run as RunStateV2 | undefined) ?? null;
  });
}

async function readActiveProfile(page: Page): Promise<ProfileRecord> {
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
    const profile = await read(
      database
        .transaction('profiles', 'readonly')
        .objectStore('profiles')
        .get(meta.activeProfileId),
    );
    database.close();
    if (!profile) throw new Error('活动档案不存在');
    return profile as ProfileRecord;
  });
}

async function waitForCheckpoint(page: Page, checkpointId: number) {
  await expect
    .poll(async () => (await readActiveRun(page))?.checkpointId ?? -1)
    .toBe(checkpointId);
}

async function createFreshProfile(page: Page) {
  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  await page.getByRole('button', { name: '在此建档' }).first().click();
  await page.getByLabel('档案名').fill('教程验收人');
  await page.getByRole('button', { name: '落印建档' }).click();
}

test('新档提示可跳过、重温并在刷新后恢复教程步骤', async ({ page }) => {
  await createFreshProfile(page);
  await expect(
    page.getByRole('heading', { name: '要先走一遍八步入门吗？' }),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: '普通战役' })).toBeDisabled();
  await page.getByRole('button', { name: '暂时跳过教程' }).click();
  await expect(page.getByRole('button', { name: '普通战役' })).toBeEnabled();
  await expect(page.getByRole('button', { name: '重温教程' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: '重温教程' })).toBeVisible();
  await page.getByRole('button', { name: '重温教程' }).click();
  await expect(page.getByRole('heading', { name: '先看盲注' })).toBeVisible();
  await page.getByRole('button', { name: '登台应战' }).click();
  await waitForCheckpoint(page, 1);
  await expect(page.getByRole('heading', { name: '挑选手牌' })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('heading', { name: '挑选手牌' })).toBeVisible();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: '跳过教程' }).click();
  await expect(page.getByRole('button', { name: '重温教程' })).toBeVisible();
  expect((await readActiveProfile(page)).tutorial).toMatchObject({
    status: 'skipped',
    replayCount: 1,
  });
});

test('八步教程通过真实界面完成且不写入普通进度', async ({ page }) => {
  const remoteRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4173') remoteRequests.push(request.url());
  });
  await createFreshProfile(page);
  await page.getByRole('button', { name: '开始八步教程' }).click();
  await expect(page.getByRole('heading', { name: '先看盲注' })).toBeVisible();

  const initial = await readActiveRun(page);
  if (!initial) throw new Error('教程没有创建活动牌局');
  await page.getByRole('button', { name: '跳过取签' }).click();
  await expect(page.getByText(/教程提示：.*小盲注/)).toBeVisible();
  expect(await readActiveRun(page)).toEqual(initial);

  await page.getByRole('button', { name: '登台应战' }).click();
  await waitForCheckpoint(page, 1);
  await page.reload();
  await expect(page.getByRole('heading', { name: '挑选手牌' })).toBeVisible();

  let state = await readActiveRun(page);
  if (!state?.round) throw new Error('教程没有进入牌桌');
  const firstCardId = state.round.handIds[0];
  if (!firstCardId) throw new Error('教程手牌为空');
  await page.locator(`[data-card-id="${firstCardId}"]`).click();
  await waitForCheckpoint(page, 2);
  await page.getByRole('button', { name: '出牌' }).click();
  await waitForCheckpoint(page, 3);
  await expect(page.getByRole('heading', { name: '整理后场' })).toBeVisible();

  state = await readActiveRun(page);
  if (!state?.round) throw new Error('教程牌桌状态丢失');
  let checkpointId = state.checkpointId;
  for (const cardId of state.round.handIds.slice(0, 3)) {
    await page.locator(`[data-card-id="${cardId}"]`).click();
    checkpointId += 1;
    await waitForCheckpoint(page, checkpointId);
  }
  await page.getByRole('button', { name: '弃牌' }).click();
  checkpointId += 1;
  await waitForCheckpoint(page, checkpointId);
  await expect(page.getByRole('heading', { name: '击败盲注' })).toBeVisible();

  for (;;) {
    state = await readActiveRun(page);
    if (!state || state.phase.kind !== 'round') break;
    const cardIds = state.round?.handIds.slice(0, 5) ?? [];
    for (const cardId of cardIds) {
      await page.locator(`[data-card-id="${cardId}"]`).click();
      checkpointId += 1;
      await waitForCheckpoint(page, checkpointId);
    }
    await page.getByRole('button', { name: '出牌' }).click();
    checkpointId += 1;
    await waitForCheckpoint(page, checkpointId);
  }
  await expect(page.getByText('赏银收据')).toBeVisible();
  await page.getByRole('button', { name: '收赏入夜市' }).click();
  checkpointId += 1;
  await waitForCheckpoint(page, checkpointId);
  await expect(page.getByRole('heading', { name: '奇牌入班' })).toBeVisible();

  state = await readActiveRun(page);
  if (!state?.shop) throw new Error('教程夜市状态丢失');
  const jokerShopState = state;
  const joker = jokerShopState.shop!.cardOffers.find(
    (offer) => offer.item.kind === 'joker' && offer.price <= jokerShopState.economy.money,
  );
  if (!joker) throw new Error('教程夜市没有可购买奇牌');
  await page.getByRole('button', { name: `购买 ${joker.item.name}` }).click();
  checkpointId += 1;
  await waitForCheckpoint(page, checkpointId);
  await expect(page.getByRole('heading', { name: '打开补充包' })).toBeVisible();

  state = await readActiveRun(page);
  if (!state?.shop) throw new Error('教程夜市状态丢失');
  const packShopState = state;
  const pack = packShopState.shop!.packOffers.find((offer) => {
    const definition = packShopState.content.packs.find(({ id }) => id === offer.packId);
    return (
      offer.price <= packShopState.economy.money &&
      definition?.allowedItemKinds.includes('consumable')
    );
  });
  if (!pack) throw new Error('教程夜市没有可购买补充包');
  await page.getByRole('button', { name: `购买 ${pack.name}` }).click();
  checkpointId += 1;
  await waitForCheckpoint(page, checkpointId);

  state = await readActiveRun(page);
  const packChoice = state?.pendingChoice?.current;
  if (!packChoice || packChoice.kind !== 'pack') throw new Error('教程补充包没有候选');
  const consumable = packChoice.options.find(({ item }) => item.kind === 'consumable');
  if (!consumable) throw new Error('教程补充包没有消耗牌');
  await page
    .getByRole('heading', { name: consumable.item.name })
    .locator('..')
    .getByRole('button', { name: '选此件' })
    .click();
  checkpointId += 1;
  await waitForCheckpoint(page, checkpointId);

  state = await readActiveRun(page);
  const targetChoice = state?.pendingChoice?.current;
  if (targetChoice?.kind === 'targets') {
    for (let index = 0; index < targetChoice.minimumTargets; index += 1) {
      await page.locator('button[data-selected="false"]').first().click();
      checkpointId += 1;
      await waitForCheckpoint(page, checkpointId);
    }
    await page.getByRole('button', { name: '确认施行' }).click();
    checkpointId += 1;
    await waitForCheckpoint(page, checkpointId);
  }
  await expect(page.getByRole('heading', { name: '离开夜市' })).toBeVisible();
  await page.getByRole('button', { name: '收摊 · 前往下一幕' }).click();
  await expect(page.getByText('入门教程 · 已完成')).toBeVisible();

  const profile = await readActiveProfile(page);
  expect(profile.tutorial.status).toBe('completed');
  expect(profile.statistics).toMatchObject({
    campaignStarts: 0,
    campaignWins: 0,
    handsPlayed: 0,
    itemsPurchased: 0,
  });
  expect(profile.collection.discoveredJokerIds).toEqual([]);
  expect(
    profile.achievements.every(({ completedAtEpochMs }) => completedAtEpochMs === null),
  ).toBe(true);
  expect(remoteRequests).toEqual([]);

  await page.getByRole('button', { name: '返回主菜单' }).click();
  await expect(page.getByRole('button', { name: '重温教程' })).toBeVisible();
});
