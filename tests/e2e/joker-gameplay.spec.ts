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
import { createProfile, type ProfileRecord } from '../../src/persistence/profiles';
import { exportProfileToJson } from '../../src/persistence/profileTransfer';
import { projectTutorialSkip } from '../../src/progression/reducer';
import {
  selectJokerPresentation,
  type JokerPresentation,
} from '../../src/presentation/selectors/jokerPresentation';
import { readActiveProfileRunPair } from './helpers/indexedDb';
import { expectDirectHitTarget } from './helpers/layoutGeometry';

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
    currentRunProgress: {
      ...createProfile(1, '奇牌验收戏主', 100).currentRunProgress,
      runId: run.runId,
    },
  };
  const fixturePath = testInfo.outputPath(`${label}.json`);
  await writeFile(fixturePath, exportProfileToJson(profile, run), 'utf8');
  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.locator('input[type="file"]').setInputFiles(fixturePath);
  await page.getByRole('button', { name: '确认导入' }).click();
}

async function importFixtureProfile(
  page: Page,
  testInfo: TestInfo,
  profile: ProfileRecord,
  label: string,
) {
  const fixturePath = testInfo.outputPath(`${label}.json`);
  await writeFile(fixturePath, exportProfileToJson(profile, null), 'utf8');
  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.locator('input[type="file"]').setInputFiles(fixturePath);
  await page.getByRole('button', { name: '确认导入' }).click();
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

async function readActiveProfile(page: Page): Promise<ProfileRecord> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('baixiqipai');
      request.onerror = () => reject(request.error ?? new Error('无法打开本地数据库'));
      request.onsuccess = () => resolve(request.result);
    });
    const read = <T>(request: IDBRequest<T>) =>
      new Promise<T>((resolve, reject) => {
        request.onerror = () => reject(request.error ?? new Error('无法读取本地数据库'));
        request.onsuccess = () => resolve(request.result);
      });
    const meta = await read<unknown>(
      database.transaction('meta', 'readonly').objectStore('meta').get('state'),
    );
    if (
      !meta ||
      typeof meta !== 'object' ||
      !('activeProfileId' in meta) ||
      typeof meta.activeProfileId !== 'string'
    ) {
      database.close();
      throw new Error('没有活动档案');
    }
    const profile = await read<unknown>(
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

type InspectorClosePath = 'button' | 'backdrop' | 'escape';

async function inspectJokerArtwork(
  page: Page,
  testInfo: TestInfo,
  trigger: Locator,
  presentation: JokerPresentation,
  options: {
    readonly closePath?: InspectorClosePath;
    readonly screenshotLabel?: string;
  } = {},
) {
  const viewport = page.viewportSize();
  if (!viewport) throw new Error('浏览器验收缺少视口');
  await expect(trigger).toBeVisible();
  await expectDirectHitTarget(trigger, `查看 ${presentation.name} 大图`);
  await trigger.click();

  const dialog = page.getByRole('dialog', {
    name: `奇牌鉴赏 · ${presentation.name}`,
  });
  await expect(dialog).toBeVisible();
  await page.waitForTimeout(450);
  await expect(dialog.getByText(presentation.rarityLabel, { exact: true })).toBeVisible();
  await expect(dialog.getByText(presentation.description, { exact: true })).toBeVisible();
  await expect(dialog.getByText(presentation.flavor, { exact: true })).toBeVisible();
  if (presentation.currentValue) {
    await expect(
      dialog.getByText(presentation.currentValue, { exact: true }),
    ).toBeVisible();
  }

  const art = dialog.getByTestId('joker-inspector-art');
  await expectApprovedJokerImage(art, presentation.contentId.slice(-3));
  expect(await art.evaluate((element) => getComputedStyle(element).objectFit)).toBe(
    'contain',
  );
  await expectDirectHitTarget(art, `${presentation.name} 鉴赏画面`);
  const artBox = await art.boundingBox();
  const stageBox = await page.getByRole('region', { name: '午夜百戏舞台' }).boundingBox();
  if (!artBox || !stageBox) throw new Error('无法测量奇牌鉴赏画框');
  const minimum =
    viewport.width >= 1_900 ? { width: 384, height: 512 } : { width: 300, height: 400 };
  expect(artBox.width).toBeGreaterThanOrEqual(minimum.width);
  expect(artBox.height).toBeGreaterThanOrEqual(minimum.height);
  expect(Math.abs(artBox.width / artBox.height - 0.75)).toBeLessThan(0.01);
  expect(artBox.x).toBeGreaterThanOrEqual(stageBox.x - 0.5);
  expect(artBox.y).toBeGreaterThanOrEqual(stageBox.y - 0.5);
  expect(artBox.x + artBox.width).toBeLessThanOrEqual(stageBox.x + stageBox.width + 0.5);
  expect(artBox.y + artBox.height).toBeLessThanOrEqual(
    stageBox.y + stageBox.height + 0.5,
  );
  const overflow = await page.evaluate(() => ({
    x: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    y: document.documentElement.scrollHeight - document.documentElement.clientHeight,
    scrollX: window.scrollX,
    scrollY: window.scrollY,
  }));
  expect(overflow.x).toBeLessThanOrEqual(1);
  expect(overflow.y).toBeLessThanOrEqual(1);
  expect(overflow.scrollX).toBe(0);
  expect(overflow.scrollY).toBe(0);

  if (options.screenshotLabel) {
    await testInfo.attach(
      `${options.screenshotLabel}-${viewport.width}x${viewport.height}-${testInfo.project.name}`,
      { body: await page.screenshot(), contentType: 'image/png' },
    );
  }

  if (options.closePath === 'escape') {
    await page.keyboard.press('Escape');
  } else if (options.closePath === 'backdrop') {
    await page
      .getByTestId('joker-inspector-backdrop')
      .click({ position: { x: 8, y: 8 } });
  } else {
    const close = dialog.getByRole('button', { name: '关闭鉴赏' });
    await expectDirectHitTarget(close, '关闭鉴赏');
    await close.click();
  }
  await expect(dialog).toBeHidden();
}

function requirePresentation(contentId: string): JokerPresentation {
  const presentation = selectJokerPresentation(contentId);
  if (!presentation) throw new Error(`缺少奇牌展示：${contentId}`);
  return presentation;
}

function createCollectionFixture() {
  const rarities = ['common', 'uncommon', 'rare', 'legendary'] as const;
  const presentations = rarities.map((rarity) => {
    const row = PRODUCTION_CATALOG.rows.find(
      (candidate) => candidate.family === 'joker' && candidate.rarity === rarity,
    );
    if (!row) throw new Error(`缺少 ${rarity} 奇牌样本`);
    return requirePresentation(row.id);
  });
  const skipped = projectTutorialSkip(createProfile(1, '大图鉴赏戏主', 100), 150);
  return {
    presentations,
    profile: {
      ...skipped,
      collection: {
        ...skipped.collection,
        discoveredJokerIds: presentations
          .map(({ contentId }) => contentId)
          .sort((left, right) => left.localeCompare(right)),
      },
    },
  };
}

async function verifyShopInspector(page: Page, testInfo: TestInfo) {
  const remoteRequests = collectRemoteRequests(page);
  const fixture = createJ044ShopFixture();
  const presentation = requirePresentation('bxqp:joker:044');
  await importFixtureRun(page, testInfo, fixture.run, 'joker-shop');
  await expect(page.getByRole('heading', { name: '百戏夜市 · 幕间奇货' })).toBeVisible();
  await expectApprovedJokerImage(page.getByTestId('joker-art-bxqp:joker:044'), '044');

  const beforeOffer = await readActiveProfileRunPair(page);
  await inspectJokerArtwork(
    page,
    testInfo,
    page.getByRole('button', { name: `查看 ${presentation.name} 大图` }),
    presentation,
    { screenshotLabel: 'joker-inspector-shop-offer' },
  );
  expect(await readActiveProfileRunPair(page)).toEqual(beforeOffer);

  await page.getByRole('button', { name: `购买 ${fixture.name}` }).click();
  await expect(page.getByText('当前 +0 倍率')).toBeVisible();
  const beforeOwned = await readActiveProfileRunPair(page);
  await inspectJokerArtwork(
    page,
    testInfo,
    page.getByRole('button', { name: `查看 ${presentation.name} 大图` }),
    presentation,
    { closePath: 'escape', screenshotLabel: 'joker-inspector-shop-owned' },
  );
  expect(await readActiveProfileRunPair(page)).toEqual(beforeOwned);

  await page.reload();
  await expect(page.getByText('当前 +0 倍率')).toBeVisible();
  await expectApprovedJokerImage(page.getByTestId('joker-art-bxqp:joker:044'), '044');
  await settleStage(page);
  expect(remoteRequests).toEqual([]);
  return fixture;
}

async function verifyPackInspector(page: Page, testInfo: TestInfo) {
  const remoteRequests = collectRemoteRequests(page);
  const presentation = requirePresentation('bxqp:joker:050');
  await importFixtureRun(page, testInfo, createJ050PackFixture(), 'joker-pack');
  await expectApprovedJokerImage(page.getByTestId('joker-art-bxqp:joker:050'), '050');
  await expect(page.getByText('当前 +100 筹码')).toBeVisible();
  const before = await readActiveProfileRunPair(page);
  await inspectJokerArtwork(
    page,
    testInfo,
    page.getByRole('button', { name: `查看 ${presentation.name} 大图` }),
    presentation,
    { screenshotLabel: 'joker-inspector-pack' },
  );
  expect(await readActiveProfileRunPair(page)).toEqual(before);

  await page.getByRole('button', { name: '选此件' }).click();
  await expect(page.getByRole('heading', { name: '第 1 幕 · 择幕登台' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '第 1 幕 · 择幕登台' })).toBeVisible();
  expect(remoteRequests).toEqual([]);
}

async function verifyTableInspector(page: Page, testInfo: TestInfo) {
  const remoteRequests = collectRemoteRequests(page);
  const presentation = requirePresentation('bxqp:joker:044');
  await importFixtureRun(page, testInfo, createJ044TableFixture(), 'joker-table');
  await expect(page.getByRole('button', { name: '出牌' })).toBeVisible();
  await expectApprovedJokerImage(page.getByTestId('joker-art-bxqp:joker:044'), '044');
  await expect(page.getByText('当前 +0 倍率')).toBeVisible();
  const before = await readActiveProfileRunPair(page);
  await inspectJokerArtwork(
    page,
    testInfo,
    page.getByRole('button', { name: `查看 ${presentation.name} 大图` }),
    presentation,
    { closePath: 'backdrop', screenshotLabel: 'joker-inspector-table' },
  );
  expect(await readActiveProfileRunPair(page)).toEqual(before);

  await page.reload();
  await expect(page.getByText('当前 +0 倍率')).toBeVisible();
  await expectApprovedJokerImage(page.getByTestId('joker-art-bxqp:joker:044'), '044');
  await settleStage(page);
  expect(remoteRequests).toEqual([]);
}

async function verifyCollectionInspector(page: Page, testInfo: TestInfo) {
  const remoteRequests = collectRemoteRequests(page);
  const fixture = createCollectionFixture();
  await importFixtureProfile(page, testInfo, fixture.profile, 'joker-collection');
  await expect(page.getByRole('button', { name: '百戏图鉴' })).toBeVisible();
  await page.getByRole('button', { name: '百戏图鉴' }).click();
  await expect(page.getByRole('heading', { name: '百戏图鉴' })).toBeVisible();
  await page.getByLabel('内容类别').selectOption('joker');
  await expect(page.locator('[data-collection-row]')).toHaveCount(150);
  await expect(
    page.locator('[data-collection-row][data-hidden="true"] button'),
  ).toHaveCount(0);
  await expect(page.getByTestId('joker-inspector-art')).toHaveCount(0);

  const before = await readActiveProfile(page);
  for (const [index, presentation] of fixture.presentations.entries()) {
    const trigger = page.getByRole('button', {
      name: `查看 ${presentation.name} 大图`,
    });
    await trigger.evaluate((element) => {
      const row = element.closest('[data-collection-row]');
      const scrollArea = element.closest('[data-layout-zone="collection-scroll"]');
      if (!(row instanceof HTMLElement) || !(scrollArea instanceof HTMLElement)) {
        throw new Error('图鉴奇牌缺少内部滚动容器');
      }
      const rowBox = row.getBoundingClientRect();
      const scrollBox = scrollArea.getBoundingClientRect();
      scrollArea.scrollTop +=
        rowBox.top - scrollBox.top - (scrollBox.height - rowBox.height) / 2;
    });
    await expect
      .poll(async () => {
        const box = await trigger.boundingBox();
        const viewport = page.viewportSize();
        return Boolean(
          box && viewport && box.y >= 0 && box.y + box.height <= viewport.height,
        );
      })
      .toBe(true);
    await page.waitForTimeout(250);
    const thumbnail = page.getByTestId(`joker-art-${presentation.contentId}`);
    await expect(thumbnail).toHaveAttribute('src', presentation.assetPath);
    await expect(thumbnail).toHaveAttribute('loading', 'lazy');
    await inspectJokerArtwork(
      page,
      testInfo,
      trigger,
      presentation,
      index === fixture.presentations.length - 1
        ? { screenshotLabel: 'joker-inspector-collection-rarities' }
        : {},
    );
  }
  expect(await readActiveProfile(page)).toEqual(before);
  expect(remoteRequests).toEqual([]);
}

test('夜市购买生产 J044 后显示本地图像和持久当前值', async ({ page }, testInfo) => {
  await verifyShopInspector(page, testInfo);
  await testInfo.attach(`joker-shop-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('百戏包选择生产 J050 并通过真实命令收入戏箱', async ({ page }, testInfo) => {
  await verifyPackInspector(page, testInfo);
});

test('牌桌展示生产 J044 的审定插画和已提交能力状态', async ({ page }, testInfo) => {
  await verifyTableInspector(page, testInfo);
  await testInfo.attach(`joker-table-${testInfo.project.name}`, {
    body: await page.screenshot(),
    contentType: 'image/png',
  });
});

test('百戏图鉴按稀有度展示已发现奇牌且不泄露未发现内容', async ({ page }, testInfo) => {
  await verifyCollectionInspector(page, testInfo);
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

test.describe('1920x1080 奇牌鉴赏基线', () => {
  test.use({ viewport: { width: 1920, height: 1080 } });

  test('夜市商品和持有栏大图', async ({ page }, testInfo) => {
    await verifyShopInspector(page, testInfo);
  });

  test('百戏包候选大图', async ({ page }, testInfo) => {
    await verifyPackInspector(page, testInfo);
  });

  test('牌桌奇牌位大图', async ({ page }, testInfo) => {
    await verifyTableInspector(page, testInfo);
  });

  test('百戏图鉴四种稀有度大图', async ({ page }, testInfo) => {
    await verifyCollectionInspector(page, testInfo);
  });
});
