import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV7 } from '../../src/content/runtime/runSetupV7';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import { resolveHandScoreV2 } from '../../src/game-core/effects/scoreHandV2';
import type { RunStateV2 } from '../../src/game-core/model/runV2';
import { selectHandCardsV2 } from '../../src/game-core/selectors/runV2';
import { createProfile } from '../../src/persistence/profiles';
import { exportProfileToJson } from '../../src/persistence/profileTransfer';

function apply(state: RunStateV2, command: RunCommandV2): RunStateV2 {
  const result = executeCommandV2(state, command);
  if (!result.ok) throw new Error(result.rejection.message);
  return result.state;
}

function combinations<T>(values: readonly T[], maximum = 5): T[][] {
  const output: T[][] = [];
  const visit = (start: number, selected: T[]) => {
    if (selected.length > 0) output.push(selected);
    if (selected.length === maximum) return;
    for (let index = start; index < values.length; index += 1) {
      visit(index + 1, [...selected, values[index]!]);
    }
  };
  visit(0, []);
  return output;
}

function indexedSeed(prefix: string, index: number): string {
  const stem = prefix
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .padEnd(4, 'X')
    .slice(0, 4);
  return `${stem}${index.toString(36).toUpperCase().padStart(4, '0')}`;
}

function createBrowserCampaignRun(seed: string) {
  const profile = createProfile(1, '浏览器戏主', 100);
  return createProductionRunV7(PRODUCTION_CATALOG, {
    seed,
    profileId: profile.id,
    runSequence: profile.nextRunSequence,
    runClass: 'campaign',
    eligibilityObjectiveIds: profile.objectives
      .filter(({ completedAtEpochMs }) => completedAtEpochMs !== null)
      .map(({ objectiveId }) => objectiveId),
    discoveredContentIds: profile.collection.discoveredJokerIds,
  });
}

function firstHandWinningProductionFixture(
  prefix: string,
  options: { readonly requireOpenablePack?: boolean } = {},
) {
  for (let index = 0; index < 300; index += 1) {
    const seed = indexedSeed(prefix, index);
    const initial = createBrowserCampaignRun(seed);
    const round = apply(initial, {
      type: 'select-blind',
      checkpointId: initial.checkpointId,
      position: 'small',
    });
    for (const cards of combinations(selectHandCardsV2(round))) {
      const score = resolveHandScoreV2(round, cards);
      if (!score.ok || score.breakdown.score < round.round!.targetScore) continue;

      let completed = round;
      for (const card of cards) {
        completed = apply(completed, {
          type: 'toggle-card',
          checkpointId: completed.checkpointId,
          cardId: card.id,
        });
      }
      completed = apply(completed, {
        type: 'play-selected',
        checkpointId: completed.checkpointId,
      });
      if (completed.phase.kind !== 'round-reward') continue;
      if (options.requireOpenablePack) {
        const shop = apply(completed, {
          type: 'claim-round-reward',
          checkpointId: completed.checkpointId,
        });
        if (!firstOpenablePack(shop)) continue;
      }
      return { seed, initial, round, cardIds: cards.map((card) => card.id) };
    }
  }
  throw new Error('未找到首手可破幕的确定性种子');
}

function firstOpenablePack(state: RunStateV2) {
  return state.shop?.packOffers.find(
    (offer) =>
      executeCommandV2(state, {
        type: 'buy-pack',
        checkpointId: state.checkpointId,
        offerId: offer.id,
      }).ok,
  );
}

function winFixtureBlind(state: RunStateV2): RunStateV2 {
  state = apply(state, {
    type: 'select-blind',
    checkpointId: state.checkpointId,
    position: state.progress.blindPosition,
  });
  const requiredCount =
    state.round?.blind.effects.find(
      (effect) => effect.handlerId === 'fixture:run-economy:handler:require-play-count',
    )?.parameters.count ?? 1;
  if (typeof requiredCount !== 'number') throw new Error('无效的出牌数量限制');
  for (const card of selectHandCardsV2(state)) {
    if ((state.round?.selectedCardIds.length ?? 0) >= requiredCount) break;
    if (state.round?.selectedCardIds.includes(card.id)) continue;
    state = apply(state, {
      type: 'toggle-card',
      checkpointId: state.checkpointId,
      cardId: card.id,
    });
  }
  state = apply(state, { type: 'play-selected', checkpointId: state.checkpointId });
  if (state.phase.kind !== 'round-reward') throw new Error('预置牌局未能破幕');
  return apply(state, {
    type: 'claim-round-reward',
    checkpointId: state.checkpointId,
  });
}

function createAnteEightBossFixture(): RunStateV2 {
  let state = createRunEconomyFixtureRun({
    seed: 'browser-ante-eight',
    targetScaleBasisPoints: 1,
    startingJokerContentIds: ['fixture:run-economy:item:joker:brass-drum'],
  });
  for (let ante = 1; ante <= 8; ante += 1) {
    const positions =
      ante === 8 ? (['small', 'big'] as const) : (['small', 'big', 'boss'] as const);
    for (const position of positions) {
      if (state.progress.blindPosition !== position) throw new Error('预置牌局路由错位');
      state = winFixtureBlind(state);
      state = apply(state, { type: 'leave-shop', checkpointId: state.checkpointId });
    }
  }
  if (
    state.progress.ante !== 8 ||
    state.progress.blindPosition !== 'boss' ||
    state.history.completedBlindIds.length !== 23
  ) {
    throw new Error('未能构造第八幕压轴前的确定性牌局');
  }
  return state;
}

async function importFixtureRun(page: Page, path: string, run: RunStateV2) {
  const profile = {
    ...createProfile(1, '压轴戏主', 100),
    activeRunId: run.runId,
    updatedAtEpochMs: 200,
    currentRunProgress: {
      ...createProfile(1, '压轴戏主', 100).currentRunProgress,
      runId: run.runId,
    },
  };
  await writeFile(path, exportProfileToJson(profile, run), 'utf8');
  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.locator('input[type="file"]').setInputFiles(path);
  await page.getByRole('button', { name: '确认导入' }).click();
}

async function createProfileAndRun(
  page: Page,
  seed: string,
  name = '浏览器戏主',
  enterRound = true,
) {
  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  await page.getByRole('button', { name: '在此建档' }).first().click();
  await page.getByLabel('档案名').fill(name);
  await page.getByRole('button', { name: '落印建档' }).click();
  await page.getByRole('button', { name: '暂时跳过教程' }).click();
  await page.getByRole('button', { name: '普通战役' }).click();
  await page.getByLabel('演出种子').fill(seed);
  await page.getByRole('button', { name: '开始普通战役' }).click();
  await expect(page.getByRole('heading', { name: '第 1 幕 · 择幕登台' })).toBeVisible();
  if (enterRound) {
    await page.getByRole('button', { name: '登台应战' }).click();
    await expect(page.getByRole('button', { name: '出牌' })).toBeVisible();
  }
}

async function parkPointer(page: Page) {
  await page.mouse.move(640, 240);
  await page.waitForTimeout(800);
}

async function waitForCheckpoint(page: Page, checkpointId: number) {
  await expect(page.getByText(`检查点 #${String(checkpointId)}`)).toBeVisible();
}

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
    )
      throw new Error('没有活动档案');
    const run = await read(
      database
        .transaction('runs', 'readonly')
        .objectStore('runs')
        .get(meta.activeProfileId),
    );
    database.close();
    if (!run || typeof run !== 'object' || !('runId' in run)) {
      throw new Error('没有活动牌局');
    }
    return run as RunStateV2;
  });
}

test('固定种子在选择、出牌与弃牌边界都恢复相同检查点', async ({ page }) => {
  const seed = 'BOUND001';
  await createProfileAndRun(page, seed, '边界戏主', false);
  let expected: RunStateV2 = createBrowserCampaignRun(seed);
  expect(await readActiveRun(page)).toEqual(expected);

  await page.getByRole('button', { name: '登台应战' }).click();
  expected = apply(expected, {
    type: 'select-blind',
    checkpointId: expected.checkpointId,
    position: 'small',
  });
  await waitForCheckpoint(page, expected.checkpointId);
  await page.reload();
  expect(await readActiveRun(page)).toEqual(expected);

  const firstCardId = expected.round!.handIds[0]!;
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

  await page.getByRole('button', { name: '弃牌' }).click();
  expected = apply(expected, {
    type: 'discard-selected',
    checkpointId: expected.checkpointId,
  });
  await waitForCheckpoint(page, expected.checkpointId);
  await page.reload();
  expect(await readActiveRun(page)).toEqual(expected);
});

test('固定强手可破幕、领赏、进入夜市并打开已物化卡包', async ({ page }) => {
  const fixture = firstHandWinningProductionFixture('browser-win', {
    requireOpenablePack: true,
  });
  await createProfileAndRun(page, fixture.seed, '胜局戏主');
  for (const cardId of fixture.cardIds) {
    await page.locator(`[data-card-id="${cardId}"]`).click();
  }
  await page.getByRole('button', { name: '出牌' }).click();
  await expect(page.getByText('赏银收据')).toBeVisible();
  await page.reload();
  await expect(page.getByText('赏银收据')).toBeVisible();
  await page.getByRole('button', { name: '收赏入夜市' }).click();
  await expect(page.getByText('百戏夜市 · 幕间奇货')).toBeVisible();

  const state = await readActiveRun(page);
  const pack = firstOpenablePack(state);
  if (!pack) throw new Error('确定性牌局没有可正常拆封的卡包');
  if (!state.shop) throw new Error('确定性牌局没有夜市');
  await page
    .getByRole('button', { name: `补充包 ${state.shop.packOffers.length}` })
    .click();
  await page.getByRole('button', { name: `购买 ${pack.name}` }).click();
  await expect(page.getByText('卡包已拆 · 选项已落印')).toBeVisible();
  const choice = (await readActiveRun(page)).pendingChoice?.current;
  expect(choice?.kind).toBe('pack');
  await page.reload();
  await expect(page.getByText('卡包已拆 · 选项已落印')).toBeVisible();
});

test('连续四次只出单张会进入失败落幕', async ({ page }) => {
  await createProfileAndRun(page, 'LOSS0001', '败局戏主');
  for (let hand = 0; hand < 4; hand += 1) {
    await page.getByTestId('playing-card').first().click();
    await page.getByRole('button', { name: '出牌' }).click();
  }
  await expect(page.getByRole('heading', { name: '锣声已止，再排一场' })).toBeVisible();
});

test('第八幕压轴从公开导入流程破幕并进入第九幕无尽', async ({ page }, testInfo) => {
  const fixturePath = testInfo.outputPath('ante-eight.json');
  await importFixtureRun(page, fixturePath, createAnteEightBossFixture());
  await expect(page.getByRole('heading', { name: '第 8 幕 · 择幕登台' })).toBeVisible();

  await page.getByRole('button', { name: '登台应战' }).click();
  let state = await readActiveRun(page);
  const requiredCount =
    state.round?.blind.effects.find(
      (effect) => effect.handlerId === 'fixture:run-economy:handler:require-play-count',
    )?.parameters.count ?? 1;
  if (typeof requiredCount !== 'number') throw new Error('无效的出牌数量限制');
  for (const card of selectHandCardsV2(state)) {
    if ((state.round?.selectedCardIds.length ?? 0) >= requiredCount) break;
    if (state.round?.selectedCardIds.includes(card.id)) continue;
    await page.locator(`[data-card-id="${card.id}"]`).click();
    state = await readActiveRun(page);
  }
  await page.getByRole('button', { name: '出牌' }).click();
  await expect(page.getByText('赏银收据')).toBeVisible();
  await page.getByRole('button', { name: '收赏入夜市' }).click();
  await expect(page.getByRole('heading', { name: '百戏压轴，今夜留名' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '百戏压轴，今夜留名' })).toBeVisible();
  await page.getByRole('button', { name: '进入无尽加演' }).click();
  await expect(page.getByRole('heading', { name: '第 9 幕 · 择幕登台' })).toBeVisible();
  const endless = await readActiveRun(page);
  expect(endless.progress).toMatchObject({ ante: 9, endless: true, campaignWon: true });
  expect(endless.history.completedBlindIds).toHaveLength(24);
});

test('写入故障不暴露未落盘检查点，故障消失后可继续', async ({ page }) => {
  await page.addInitScript(() => {
    type TransactionMethod = (
      this: IDBDatabase,
      storeNames: string | string[],
      mode?: IDBTransactionMode,
      options?: IDBTransactionOptions,
    ) => IDBTransaction;
    const transactionValue: unknown = Reflect.get(IDBDatabase.prototype, 'transaction');
    if (typeof transactionValue !== 'function') {
      throw new Error('无法注入本地写入故障');
    }
    const originalTransaction = transactionValue as TransactionMethod;
    IDBDatabase.prototype.transaction = function transactionWithFault(
      storeNames: string | string[],
      mode?: IDBTransactionMode,
      options?: IDBTransactionOptions,
    ): IDBTransaction {
      const faultState = globalThis as typeof globalThis & {
        __failNextCheckpointWrite?: boolean;
      };
      if (faultState.__failNextCheckpointWrite && mode === 'readwrite') {
        faultState.__failNextCheckpointWrite = false;
        throw new DOMException('模拟本地写入故障', 'QuotaExceededError');
      }
      if (options) return originalTransaction.call(this, storeNames, mode, options);
      if (mode) return originalTransaction.call(this, storeNames, mode);
      return originalTransaction.call(this, storeNames);
    };
  });
  await createProfileAndRun(page, 'FAIL0001', '故障戏主');
  const before = await readActiveRun(page);
  await page.evaluate(() => {
    (
      globalThis as typeof globalThis & { __failNextCheckpointWrite?: boolean }
    ).__failNextCheckpointWrite = true;
  });

  await page.getByTestId('playing-card').first().click();
  await expect(page.getByText('自动保存失败：模拟本地写入故障')).toBeVisible();
  expect(await readActiveRun(page)).toEqual(before);
  await expect(page.getByText('已选 0 / 5')).toBeVisible();

  await page.getByTestId('playing-card').first().click();
  await waitForCheckpoint(page, before.checkpointId + 1);
  expect((await readActiveRun(page)).round?.selectedCardIds).toHaveLength(1);
});

test('三档牌局相互隔离，导出后可恢复原检查点', async ({ page }, testInfo) => {
  await createProfileAndRun(page, 'PROFA001', '甲档戏主');
  await page.getByTestId('playing-card').first().click();
  await waitForCheckpoint(page, 2);
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
  await page.getByRole('button', { name: '暂时跳过教程' }).click();
  await page.getByRole('button', { name: '普通战役' }).click();
  await page.getByLabel('演出种子').fill('PROFB001');
  await page.getByRole('button', { name: '开始普通战役' }).click();
  expect((await readActiveRun(page)).seed).toBe('PROFB001');

  await page.getByRole('button', { name: '返回戏主名簿' }).click();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.locator('input[type="file"]').setInputFiles(exportPath);
  await page.getByRole('button', { name: '确认导入' }).click();
  await expect(page.getByRole('button', { name: '出牌' })).toBeVisible();
  const restoredRun = await readActiveRun(page);
  expect(restoredRun).toMatchObject({
    ...exportedRun,
    sessionV7: {
      ...(
        exportedRun as typeof restoredRun & {
          readonly sessionV7: { readonly profileId: string | null };
        }
      ).sessionV7,
      profileId: 'profile:3',
    },
  });
});

test('1280×720 基准画面覆盖名簿、盲注、牌桌、奖励、夜市与败局', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  await parkPointer(page);
  await expect(page).toHaveScreenshot('profile-screen-v2.png', {
    animations: 'disabled',
    fullPage: true,
  });

  const fixture = firstHandWinningProductionFixture('browser-visual');
  await page.getByRole('button', { name: '在此建档' }).first().click();
  await page.getByLabel('档案名').fill('画面戏主');
  await page.getByRole('button', { name: '落印建档' }).click();
  await page.getByRole('button', { name: '暂时跳过教程' }).click();
  await page.getByRole('button', { name: '普通战役' }).click();
  await page.getByLabel('演出种子').fill(fixture.seed);
  await page.getByRole('button', { name: '开始普通战役' }).click();
  await parkPointer(page);
  await expect(page).toHaveScreenshot('blind-screen-v2.png', {
    animations: 'disabled',
    fullPage: true,
  });

  await page.getByRole('button', { name: '登台应战' }).click();
  await parkPointer(page);
  await expect(page).toHaveScreenshot('table-screen-v2.png', {
    animations: 'disabled',
    fullPage: true,
  });
  for (const cardId of fixture.cardIds)
    await page.locator(`[data-card-id="${cardId}"]`).click();
  await page.getByRole('button', { name: '出牌' }).click();
  const settlePerformance = page.getByRole('button', {
    name: '落定演出，显示已提交结果',
  });
  await settlePerformance.evaluate((element) => (element as HTMLButtonElement).click());
  await expect(settlePerformance).toHaveCount(0);
  await parkPointer(page);
  await expect(page).toHaveScreenshot('reward-screen-v2.png', {
    animations: 'disabled',
    fullPage: true,
  });
  await page.getByRole('button', { name: '收赏入夜市' }).click();
  await parkPointer(page);
  await expect(page).toHaveScreenshot('shop-screen-v2.png', {
    animations: 'disabled',
    fullPage: true,
  });
});

test('1920×1080 名簿与牌桌保持固定舞台、无页面滚动和无遮挡操作', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  await parkPointer(page);

  const geometry = await page.evaluate(() => ({
    height: document.documentElement.scrollHeight,
    width: document.documentElement.scrollWidth,
  }));
  expect(geometry).toEqual({ height: 1080, width: 1920 });
  await expect(page.getByLabel('午夜百戏舞台')).toHaveScreenshot(
    'profile-screen-1920-v1.png',
    { animations: 'disabled' },
  );

  await createProfileAndRun(page, 'WIDE0001', '宽幕戏主');
  await parkPointer(page);
  await expect(page.getByRole('button', { name: '出牌' })).toBeInViewport();
  await expect(page.getByRole('button', { name: '弃牌' })).toBeInViewport();
  await expect(page.getByLabel('午夜百戏舞台')).toHaveScreenshot(
    'table-screen-1920-v1.png',
    { animations: 'disabled', maxDiffPixels: 10 },
  );
  expect(
    await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      width: document.documentElement.scrollWidth,
    })),
  ).toEqual({ height: 1080, width: 1920 });
});
