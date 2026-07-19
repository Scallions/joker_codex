import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV4 } from '../../src/content/runtime/runSetupV4';
import { createProductionRunV5 } from '../../src/content/runtime/runSetupV5';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { createShopV2, materializeItemV2 } from '../../src/game-core/economy/shopV2';
import { stableId } from '../../src/game-core/model/ids';
import type { RunStateV2 } from '../../src/game-core/model/runV2';
import { isRunStateV4, type RunStateV4 } from '../../src/game-core/model/runV4';
import { isRunStateV5, type RunStateV5 } from '../../src/game-core/model/runV5';
import { createProfile } from '../../src/persistence/profiles';
import { exportProfileToJson } from '../../src/persistence/profileTransfer';

function requireV4(state: RunStateV2): RunStateV4 {
  if (!isRunStateV4(state)) throw new Error('浏览器验收牌局未保持 V4');
  return state;
}

function createJ044ShopFixture(): { readonly run: RunStateV4; readonly name: string } {
  const initial = createProductionRunV4(PRODUCTION_CATALOG, {
    seed: 'browser-joker-shop',
  });
  const funded: RunStateV4 = {
    ...initial,
    economy: { ...initial.economy, money: 50 },
  };
  const definition = funded.content.items.find(
    (item) => item.kind === 'joker' && item.contentId === 'bxqp:joker:044',
  );
  if (!definition) throw new Error('缺少 J044 定义');
  const created = createShopV2(funded);
  if (!created.ok) throw new Error(created.message);
  const firstOffer = created.shop.cardOffers[0];
  if (!firstOffer) throw new Error('缺少夜市商品位');
  const materialized = materializeItemV2(
    definition,
    'browser-joker-shop-offer',
    created.rngState,
  );
  return {
    name: definition.name,
    run: {
      ...funded,
      phase: { kind: 'shop' },
      round: null,
      shop: {
        ...created.shop,
        cardOffers: [
          { ...firstOffer, item: materialized.item, price: definition.baseCost },
        ],
      },
      rngState: materialized.rngState,
      inventory: { ...funded.inventory, tags: created.tags },
      progress: { ...funded.progress, anteVoucherId: created.anteVoucherId },
    },
  };
}

function createJ050PackFixture(): RunStateV4 {
  const initial = createProductionRunV4(PRODUCTION_CATALOG, {
    seed: 'browser-joker-pack',
  });
  const definition = initial.content.items.find(
    (item) => item.kind === 'joker' && item.contentId === 'bxqp:joker:050',
  );
  const pack = initial.content.packs.find(({ family }) => family === 'buffoon');
  if (!definition || !pack) throw new Error('缺少百戏包或 J050');
  const materialized = materializeItemV2(
    definition,
    'browser-joker-pack-option',
    initial.rngState,
  );
  const choiceId = stableId<'choice'>('choice:browser-joker-pack');
  return {
    ...initial,
    phase: { kind: 'choice', choiceId },
    rngState: materialized.rngState,
    pendingChoice: {
      current: {
        id: choiceId,
        kind: 'pack',
        optional: true,
        returnPhase: 'blind-select',
        packId: pack.id,
        packOfferId: stableId<'pack-offer'>('pack-offer:browser-joker-pack'),
        options: [
          {
            id: 'option:browser-joker-050',
            item: materialized.item,
            consumed: false,
          },
        ],
        remainingPicks: 1,
        temporaryJokerSlots: pack.temporaryJokerSlots,
        temporaryConsumableSlots: pack.temporaryConsumableSlots,
      },
      suspended: [],
    },
  };
}

function createJ044TableFixture(): RunStateV4 {
  const initial = createProductionRunV4(PRODUCTION_CATALOG, {
    seed: 'browser-joker-table',
  });
  const acquired = acquireContentByIdV3(initial, 'bxqp:joker:044', 'browser-table');
  if (!acquired.ok) throw new Error(acquired.message);
  const selected = executeCommandV2(requireV4(acquired.state), {
    type: 'select-blind',
    checkpointId: acquired.state.checkpointId,
    position: 'small',
  });
  if (!selected.ok) throw new Error(selected.rejection.message);
  return requireV4(selected.state);
}

function createJ100TableFixture(): RunStateV5 {
  const initial = createProductionRunV5(PRODUCTION_CATALOG, {
    seed: 'browser-joker-100-table',
  });
  const acquired = acquireContentByIdV3(
    initial,
    'bxqp:joker:100',
    'browser-joker-100-table',
  );
  if (!acquired.ok || !isRunStateV5(acquired.state)) {
    throw new Error(acquired.ok ? 'J100 获取后未保持 V5' : acquired.message);
  }
  const selected = executeCommandV2(acquired.state, {
    type: 'select-blind',
    checkpointId: acquired.state.checkpointId,
    position: 'small',
  });
  if (!selected.ok || !isRunStateV5(selected.state)) {
    throw new Error(selected.ok ? 'J100 盲注未保持 V5' : selected.rejection.message);
  }
  return selected.state;
}

async function importFixtureRun(
  page: Page,
  testInfo: TestInfo,
  run: RunStateV2,
  label: string,
) {
  const profile = {
    ...createProfile(1, '奇牌验收戏主', 100),
    activeRunId: run.runId,
    updatedAtEpochMs: 200,
  };
  const fixturePath = testInfo.outputPath(`${label}.json`);
  await writeFile(fixturePath, exportProfileToJson(profile, run), 'utf8');
  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.locator('input[type="file"]').setInputFiles(fixturePath);
}

async function expectApprovedJokerImage(image: Locator, assetName: string) {
  await expect(image).toBeVisible();
  await expect(image).toHaveAttribute('src', `/assets/jokers/${assetName}.webp`);
  await expect(image).toHaveJSProperty('complete', true);
  expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBe(
    768,
  );
  expect(await image.evaluate((element: HTMLImageElement) => element.naturalHeight)).toBe(
    1024,
  );
}

function collectRemoteRequests(page: Page): string[] {
  const requests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4173') requests.push(request.url());
  });
  return requests;
}

async function settleStage(page: Page) {
  await page.mouse.move(640, 240);
  await page.waitForTimeout(900);
}

test('夜市购买生产 J044 后显示本地图像和持久当前值', async ({ page }, testInfo) => {
  const remoteRequests = collectRemoteRequests(page);
  const fixture = createJ044ShopFixture();
  await importFixtureRun(page, testInfo, fixture.run, 'joker-shop');
  await expect(page.getByRole('heading', { name: '百戏夜市 · 幕间奇货' })).toBeVisible();
  await expectApprovedJokerImage(page.getByTestId('joker-art-bxqp:joker:044'), '044');

  await page.getByRole('button', { name: `购买 ${fixture.name}` }).click();
  await expect(page.getByText('当前 +0 倍率')).toBeVisible();
  await page.reload();
  await expect(page.getByText('当前 +0 倍率')).toBeVisible();
  await expectApprovedJokerImage(page.getByTestId('joker-art-bxqp:joker:044'), '044');
  await settleStage(page);
  expect(remoteRequests).toEqual([]);
  await testInfo.attach(`joker-shop-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('百戏包选择生产 J050 并通过真实命令收入戏箱', async ({ page }, testInfo) => {
  const remoteRequests = collectRemoteRequests(page);
  await importFixtureRun(page, testInfo, createJ050PackFixture(), 'joker-pack');
  await expectApprovedJokerImage(page.getByTestId('joker-art-bxqp:joker:050'), '050');
  await expect(page.getByText('当前 +100 筹码')).toBeVisible();
  await page.getByRole('button', { name: '选此件' }).click();
  await expect(page.getByRole('heading', { name: '第 1 幕 · 择幕登台' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '第 1 幕 · 择幕登台' })).toBeVisible();
  expect(remoteRequests).toEqual([]);
});

test('牌桌展示生产 J044 的审定插画和已提交能力状态', async ({ page }, testInfo) => {
  const remoteRequests = collectRemoteRequests(page);
  await importFixtureRun(page, testInfo, createJ044TableFixture(), 'joker-table');
  await expect(page.getByRole('button', { name: '出牌' })).toBeVisible();
  await expectApprovedJokerImage(page.getByTestId('joker-art-bxqp:joker:044'), '044');
  await expect(page.getByText('当前 +0 倍率')).toBeVisible();
  await page.reload();
  await expect(page.getByText('当前 +0 倍率')).toBeVisible();
  await expectApprovedJokerImage(page.getByTestId('joker-art-bxqp:joker:044'), '044');
  await settleStage(page);
  expect(remoteRequests).toEqual([]);
  await testInfo.attach(`joker-table-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('V5 牌桌展示生产 J100 的本地插画和可恢复当前值', async ({ page }, testInfo) => {
  const remoteRequests = collectRemoteRequests(page);
  await importFixtureRun(page, testInfo, createJ100TableFixture(), 'joker-100-table');
  await expect(page.getByRole('button', { name: '出牌' })).toBeVisible();
  await expectApprovedJokerImage(page.getByTestId('joker-art-bxqp:joker:100'), '100');
  await expect(page.getByText('当前 ×2')).toBeVisible();
  await page.reload();
  await expect(page.getByText('当前 ×2')).toBeVisible();
  await expectApprovedJokerImage(page.getByTestId('joker-art-bxqp:joker:100'), '100');
  await settleStage(page);
  expect(remoteRequests).toEqual([]);
  await testInfo.attach(`joker-100-table-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});
