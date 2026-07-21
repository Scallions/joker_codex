import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

import { commitRunCommand } from '../../src/app/commitRunCommand';
import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import type { RunStateV2 } from '../../src/game-core/model/runV2';
import { isRunStateV7, type RunStateV7 } from '../../src/game-core/model/runV7';
import { exportProfileToJson } from '../../src/persistence/profileTransfer';
import { createProfile, type ProfileRecord } from '../../src/persistence/profiles';
import { projectRunStart } from '../../src/progression/reducer';
import { createTutorialRun } from '../../src/tutorial/script';
import {
  expectCenteredHorizontally,
  expectContained,
  expectDirectHitTarget,
  expectLoadedLocalArtwork,
  expectNoOuterScroll,
  expectPairwiseNonOverlapping,
  expectStackedAbove,
  layoutZone,
} from './helpers/layoutGeometry';

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

async function createIncompatiblePackRecoveryFixture(): Promise<{
  readonly profile: ProfileRecord;
  readonly run: RunStateV7;
}> {
  const base = createProfile(1, '断场恢复人', 100);
  let run = createTutorialRun(PRODUCTION_CATALOG, base);
  let profile = projectRunStart(base, run, 110);
  let nowEpochMs = 120;
  const repository = { commitCheckpoint: async () => undefined };
  const apply = async (command: RunCommandV2) => {
    const result = await commitRunCommand(
      repository,
      profile,
      run,
      command,
      nowEpochMs++,
    );
    if (!result.ok) throw new Error(result.message);
    if (!isRunStateV7(result.state)) throw new Error('恢复夹具丢失 V7 身份');
    profile = result.profile;
    run = result.state;
  };

  await apply({
    type: 'select-blind',
    checkpointId: run.checkpointId,
    position: 'small',
  });
  await apply({
    type: 'toggle-card',
    checkpointId: run.checkpointId,
    cardId: run.round!.handIds[0]!,
  });
  await apply({ type: 'play-selected', checkpointId: run.checkpointId });
  for (const cardId of run.round!.handIds.slice(0, 3)) {
    await apply({ type: 'toggle-card', checkpointId: run.checkpointId, cardId });
  }
  await apply({ type: 'discard-selected', checkpointId: run.checkpointId });
  while (run.phase.kind === 'round') {
    for (const cardId of run.round!.handIds.slice(0, 5)) {
      await apply({ type: 'toggle-card', checkpointId: run.checkpointId, cardId });
    }
    await apply({ type: 'play-selected', checkpointId: run.checkpointId });
  }
  await apply({ type: 'claim-round-reward', checkpointId: run.checkpointId });

  const joker = run.shop?.cardOffers.find(
    (offer) => offer.item.kind === 'joker' && offer.price <= run.economy.money,
  );
  if (!joker) throw new Error('恢复夹具缺少可购买奇牌');
  await apply({
    type: 'buy-shop-offer',
    checkpointId: run.checkpointId,
    offerId: joker.id,
  });
  const incompatible = run.shop?.packOffers.find((offer) => {
    const definition = run.content.packs.find(({ id }) => id === offer.packId);
    return (
      offer.price <= run.economy.money &&
      definition !== undefined &&
      !definition.allowedItemKinds.includes('consumable')
    );
  });
  if (!incompatible) throw new Error('恢复夹具缺少不兼容补充包');
  const opened = executeCommandV2(run, {
    type: 'buy-pack',
    checkpointId: run.checkpointId,
    offerId: incompatible.id,
  });
  if (!opened.ok || !isRunStateV7(opened.state)) {
    throw new Error(opened.ok ? '恢复夹具丢失 V7 身份' : opened.rejection.message);
  }
  return {
    profile: {
      ...profile,
      activeProjectionCursor: {
        runId: opened.state.runId,
        checkpointId: opened.state.checkpointId,
      },
    },
    run: opened.state,
  };
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

test('导入旧版不兼容补充包选择后可以返回夜市并完成教程', async ({ page }, testInfo) => {
  const fixture = await createIncompatiblePackRecoveryFixture();
  const fixturePath = testInfo.outputPath('tutorial-incompatible-pack.json');
  await writeFile(fixturePath, exportProfileToJson(fixture.profile, fixture.run), 'utf8');

  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles(fixturePath);
  await expect(page.getByText('档案导入预览')).toBeVisible();
  await expect(page.getByText('含活动牌局')).toBeVisible();
  await page.getByRole('button', { name: '确认导入' }).click();

  await expect(page.getByRole('heading', { name: /还可挑选 \d+ 件/ })).toBeVisible();
  const recovery = page.getByRole('button', { name: '返回夜市并跳过本步' });
  await expect(recovery).toBeEnabled();
  const optionButtons = page.getByRole('button', { name: '选此件' });
  expect(await optionButtons.count()).toBeGreaterThan(0);
  for (let index = 0; index < (await optionButtons.count()); index += 1) {
    await expect(optionButtons.nth(index)).toBeDisabled();
  }

  const beforeRecovery = await readActiveRun(page);
  if (!beforeRecovery) throw new Error('导入后缺少活动教程');
  await recovery.click();
  await waitForCheckpoint(page, beforeRecovery.checkpointId + 1);
  await expect(page.getByRole('heading', { name: '离开夜市' })).toBeVisible();
  await page.getByRole('button', { name: '收摊 · 前往下一幕' }).click();
  await expect(page.getByText('八步入门 · 8/8 完成')).toBeVisible();

  const profile = await readActiveProfile(page);
  expect(profile.tutorial.status).toBe('completed');
  expect(profile.statistics).toMatchObject({
    campaignStarts: 0,
    campaignWins: 0,
    handsPlayed: 0,
    itemsPurchased: 0,
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
  const settlePerformance = page.getByRole('button', {
    name: '落定演出，显示已提交结果',
  });
  if (await settlePerformance.isVisible()) {
    await settlePerformance.evaluate((element) => (element as HTMLButtonElement).click());
    await expect(settlePerformance).toHaveCount(0);
  }

  state = await readActiveRun(page);
  if (!state?.shop) throw new Error('教程夜市状态丢失');
  const jokerShopState = state;
  const jokerShop = state.shop;
  const joker = jokerShop.cardOffers.find(
    (offer) => offer.item.kind === 'joker' && offer.price <= jokerShopState.economy.money,
  );
  if (!joker) throw new Error('教程夜市没有可购买奇牌');
  const jokerPurchase = page.getByRole('button', { name: `购买 ${joker.item.name}` });
  const itemTab = page.getByRole('button', {
    name: `单品 ${jokerShop.cardOffers.length}`,
  });
  const packTab = page.getByRole('button', {
    name: `补充包 ${jokerShop.packOffers.length}`,
  });
  await expect(itemTab).toHaveAttribute('aria-pressed', 'true');
  await expect(packTab).toHaveAttribute('aria-pressed', 'false');
  for (const offer of jokerShop.packOffers) {
    await expect(page.getByRole('button', { name: `购买 ${offer.name}` })).toHaveCount(0);
  }
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(120);
    await expectPairwiseNonOverlapping(
      layoutZone(page, 'shop-offer-grid').locator('article'),
      `教程单品 ${String(viewport.width)}x${String(viewport.height)}`,
    );
    for (const offer of jokerShop.cardOffers) {
      await expectDirectHitTarget(
        page.getByRole('button', { name: `购买 ${offer.item.name}` }),
        `购买 ${offer.item.name}`,
      );
    }
    await expectNoOuterScroll(page);
  }
  await jokerPurchase.click();
  checkpointId += 1;
  await waitForCheckpoint(page, checkpointId);
  await expect(page.getByRole('heading', { name: '打开补充包' })).toBeVisible();

  state = await readActiveRun(page);
  if (!state?.shop) throw new Error('教程夜市状态丢失');
  const packShopState = state;
  const packShop = state.shop;
  await expect(
    page.getByRole('button', {
      name: `补充包 ${packShop.packOffers.length}`,
    }),
  ).toHaveAttribute('aria-pressed', 'true');
  for (const offer of packShop.cardOffers) {
    await expect(
      page.getByRole('button', { name: `购买 ${offer.item.name}` }),
    ).toHaveCount(0);
  }
  await page.reload();
  await expect(page.getByRole('heading', { name: '打开补充包' })).toBeVisible();
  await expect(
    page.getByRole('button', {
      name: `补充包 ${packShop.packOffers.length}`,
    }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.waitForTimeout(500);
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(120);
    const offerGrid = layoutZone(page, 'shop-offer-grid');
    const offerCards = offerGrid.locator('article');
    await expectPairwiseNonOverlapping(
      offerCards,
      `教程补充包 ${String(viewport.width)}x${String(viewport.height)}`,
    );
    await expectCenteredHorizontally(
      offerGrid,
      offerCards,
      `教程补充包居中 ${String(viewport.width)}x${String(viewport.height)}`,
    );
    for (const offer of packShop.packOffers) {
      await expectDirectHitTarget(
        page.getByRole('button', { name: `购买 ${offer.name}` }),
        `购买 ${offer.name}`,
      );
      await expectLoadedLocalArtwork(
        page.getByTestId(`catalog-art-${offer.packId}`).locator('img'),
        `${offer.name} 目录画幅`,
        viewport.width === 1920 ? 96 : 80,
        viewport.width === 1920 ? 124 : 104,
      );
    }
    await expectNoOuterScroll(page);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
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
  const consumable =
    packChoice.options.find(
      ({ item }) => item.kind === 'consumable' && item.targetKind !== 'none',
    ) ?? packChoice.options.find(({ item }) => item.kind === 'consumable');
  if (!consumable) throw new Error('教程补充包没有消耗牌');
  const consumableChoice = page
    .getByRole('heading', { name: consumable.item.name })
    .locator('..')
    .getByRole('button', { name: '选此件' });
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(120);
    const packScreen = layoutZone(page, 'pack-choice-screen');
    const packOptions = layoutZone(page, 'pack-choice-options');
    const packActions = layoutZone(page, 'pack-choice-actions');
    const optionCards = packOptions.locator('article');
    await expectContained(packScreen, packOptions, '补充包选择 / 候选区');
    await expectContained(packScreen, packActions, '补充包选择 / 动作区');
    await expectStackedAbove(packOptions, packActions, '补充包候选区 / 动作区', 0);
    await expectPairwiseNonOverlapping(
      optionCards,
      `补充包候选 ${String(viewport.width)}x${String(viewport.height)}`,
    );
    await expectCenteredHorizontally(
      packOptions,
      optionCards,
      `补充包候选居中 ${String(viewport.width)}x${String(viewport.height)}`,
    );
    await expectDirectHitTarget(
      consumableChoice,
      `补充包消耗牌 ${String(viewport.width)}x${String(viewport.height)}`,
    );
    await expectLoadedLocalArtwork(
      page.getByTestId(`catalog-art-${consumable.item.contentId}`).locator('img'),
      `${consumable.item.name} 目录画幅`,
      viewport.width === 1920 ? 96 : 80,
      viewport.width === 1920 ? 124 : 104,
    );
    await expectNoOuterScroll(page);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await consumableChoice.click();
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
    const confirmChoice = page.getByRole('button', { name: '确认施行' });
    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(120);
      const targetScreen = layoutZone(page, 'target-choice-screen');
      const targetPanel = layoutZone(page, 'target-choice-panel');
      await expect(targetScreen).toHaveCSS('overflow', 'clip');
      await expect(targetPanel).toHaveCSS('overflow', 'clip');
      const eligibleTargets = page.locator('button[data-selected]');
      await expectDirectHitTarget(
        eligibleTargets.first(),
        `补充包首个目标 ${String(viewport.width)}x${String(viewport.height)}`,
      );
      await expectDirectHitTarget(
        eligibleTargets.last(),
        `补充包末个目标 ${String(viewport.width)}x${String(viewport.height)}`,
      );
      await expectDirectHitTarget(
        confirmChoice,
        `补充包目标确认 ${String(viewport.width)}x${String(viewport.height)}`,
      );
      await expectNoOuterScroll(page);
    }
    await page.setViewportSize({ width: 1280, height: 720 });
    await confirmChoice.click();
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
