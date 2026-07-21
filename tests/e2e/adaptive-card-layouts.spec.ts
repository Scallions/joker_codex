import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV7 } from '../../src/content/runtime/runSetupV7';
import { createShopV2, materializeItemV2 } from '../../src/game-core/economy/shopV2';
import { validateRunStateV7 } from '../../src/game-core/invariants/validateRunStateV7';
import { stableId } from '../../src/game-core/model/ids';
import type { RunStateV7 } from '../../src/game-core/model/runV7';
import { exportProfileToJson } from '../../src/persistence/profileTransfer';
import { createProfile, type ProfileRecord } from '../../src/persistence/profiles';
import { projectRunStart } from '../../src/progression/reducer';
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

const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
] as const;

function startedRun(
  name: string,
  seed: string,
): {
  readonly profile: ProfileRecord;
  readonly run: RunStateV7;
} {
  const base = createProfile(1, name, 100);
  const run = createProductionRunV7(PRODUCTION_CATALOG, {
    seed,
    profileId: base.id,
    runSequence: base.nextRunSequence,
    runClass: 'campaign',
    eligibilityObjectiveIds: base.objectives.flatMap(
      ({ objectiveId, completedAtEpochMs }) =>
        completedAtEpochMs === null ? [] : [objectiveId],
    ),
    discoveredContentIds: base.collection.discoveredJokerIds,
  });
  return { profile: projectRunStart(base, run, 110), run };
}

function assertValidFixture(run: RunStateV7): RunStateV7 {
  const validation = validateRunStateV7(run);
  if (!validation.ok) {
    throw new Error(`自适应布局夹具无效：${validation.violations.join('；')}`);
  }
  return run;
}

function shopFixture(count: 1 | 2): {
  readonly profile: ProfileRecord;
  readonly run: RunStateV7;
} {
  const started = startedRun(`夜市${String(count)}卡人`, `SHOP000${String(count)}`);
  const created = createShopV2(started.run);
  if (!created.ok) throw new Error(created.message);
  const definitions = started.run.content.items.filter(
    (item) => item.kind === 'consumable' && item.contentId.startsWith('bxqp:'),
  );
  if (definitions.length < count || created.shop.cardOffers.length < count) {
    throw new Error('夜市自适应夹具缺少生产消耗牌或商品位');
  }
  let rngState = created.rngState;
  const cardOffers = created.shop.cardOffers.slice(0, count).map((offer, index) => {
    const definition = definitions[index]!;
    const materialized = materializeItemV2(
      definition,
      `adaptive-shop:${String(count)}:${String(index)}`,
      rngState,
    );
    rngState = materialized.rngState;
    return { ...offer, item: materialized.item, price: definition.baseCost };
  });
  const run = assertValidFixture({
    ...started.run,
    phase: { kind: 'shop' },
    shop: { ...created.shop, cardOffers },
    rngState,
    inventory: { ...started.run.inventory, tags: created.tags },
    progress: {
      ...started.run.progress,
      anteVoucherId: created.anteVoucherId,
    },
  });
  return { profile: started.profile, run };
}

function packChoiceFixture(count: 1 | 2 | 3 | 4 | 5): {
  readonly profile: ProfileRecord;
  readonly run: RunStateV7;
} {
  const started = startedRun(`拆包${String(count)}选人`, `PACK000${String(count)}`);
  const pack = started.run.content.packs.find(
    ({ family, size }) => family === 'arcana' && size === 'mega',
  );
  const definitions = started.run.content.items.filter(
    (item) => item.kind === 'consumable' && item.contentId.startsWith('bxqp:'),
  );
  if (!pack || definitions.length < count) throw new Error('拆包自适应夹具内容不足');
  let rngState = started.run.rngState;
  const options = definitions.slice(0, count).map((definition, index) => {
    const materialized = materializeItemV2(
      definition,
      `adaptive-pack:${String(count)}:${String(index)}`,
      rngState,
    );
    rngState = materialized.rngState;
    return {
      id: `adaptive-pack-option:${String(count)}:${String(index)}`,
      item: materialized.item,
      consumed: false,
    };
  });
  const choiceId = stableId<'choice'>(`choice:adaptive-pack:${String(count)}`);
  const run = assertValidFixture({
    ...started.run,
    phase: { kind: 'choice', choiceId },
    rngState,
    pendingChoice: {
      current: {
        id: choiceId,
        kind: 'pack',
        optional: true,
        returnPhase: 'blind-select',
        packId: pack.id,
        packOfferId: stableId<'pack-offer'>(`pack-offer:adaptive:${String(count)}`),
        options,
        remainingPicks: Math.min(pack.pickCount, count),
        temporaryJokerSlots: pack.temporaryJokerSlots,
        temporaryConsumableSlots: pack.temporaryConsumableSlots,
      },
      suspended: [],
    },
  });
  return { profile: started.profile, run };
}

async function importFixture(page: Page, fixturePath: string, replacing: boolean) {
  if (replacing) {
    await page.getByRole('button', { name: '返回戏主名簿' }).click();
    await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  } else {
    await page.goto('/');
  }
  await page.locator('input[type="file"]').setInputFiles(fixturePath);
  await expect(page.getByText('档案导入预览')).toBeVisible();
  await page.getByLabel('目标档位').selectOption('1');
  if (replacing) page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: '确认导入' }).click();
}

test('一张与两张夜市商品保持有界居中、高清本地画幅和可点击购买动作', async ({
  page,
}, testInfo) => {
  for (const count of [1, 2] as const) {
    const fixture = shopFixture(count);
    const path = testInfo.outputPath(`adaptive-shop-${String(count)}.json`);
    await writeFile(path, exportProfileToJson(fixture.profile, fixture.run), 'utf8');
    await importFixture(page, path, count > 1);
    await expect(
      page.getByRole('heading', { name: '百戏夜市 · 幕间奇货' }),
    ).toBeVisible();

    const grid = layoutZone(page, 'shop-offer-grid');
    const cards = grid.locator('article');
    await expect(grid).toHaveAttribute('data-offer-count', String(count));
    await expect(cards).toHaveCount(count);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(500);
      await expectPairwiseNonOverlapping(cards, `${String(count)} 张夜市商品`);
      await expectCenteredHorizontally(grid, cards, `${String(count)} 张夜市商品`);
      for (const offer of fixture.run.shop!.cardOffers) {
        await expectDirectHitTarget(
          page.getByRole('button', { name: `购买 ${offer.item.name}` }),
          `购买 ${offer.item.name}`,
        );
        await expectLoadedLocalArtwork(
          page.getByTestId(`catalog-art-${offer.item.contentId}`).locator('img'),
          `${offer.item.name} 目录画幅`,
          viewport.width === 1920 ? 96 : 80,
          viewport.width === 1920 ? 124 : 104,
        );
      }
      await expectNoOuterScroll(page);
    }
  }
});

test('一至五个补充包候选逐数居中，选项滚动且底部动作始终留在面板内', async ({
  page,
}, testInfo) => {
  for (const count of [1, 2, 3, 4, 5] as const) {
    const fixture = packChoiceFixture(count);
    const path = testInfo.outputPath(`adaptive-pack-${String(count)}.json`);
    await writeFile(path, exportProfileToJson(fixture.profile, fixture.run), 'utf8');
    await importFixture(page, path, count > 1);
    await expect(page.getByRole('heading', { name: /还可挑选 \d+ 件/ })).toBeVisible();

    const screen = layoutZone(page, 'pack-choice-screen');
    const options = layoutZone(page, 'pack-choice-options');
    const actions = layoutZone(page, 'pack-choice-actions');
    const cards = options.locator('article');
    await expect(options).toHaveAttribute('data-option-count', String(count));
    await expect(cards).toHaveCount(count);
    for (const viewport of VIEWPORTS) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(120);
      await expectContained(screen, options, `${String(count)} 选项候选区`);
      await expectContained(screen, actions, `${String(count)} 选项动作区`);
      await expectStackedAbove(options, actions, `${String(count)} 选项与动作`, 0);
      await expectPairwiseNonOverlapping(cards, `${String(count)} 个补充包候选`);
      await expectCenteredHorizontally(options, cards, `${String(count)} 个补充包候选`);
      await expect(page.getByRole('button', { name: '放弃余项' })).toBeVisible();
      for (const option of fixture.run.pendingChoice!.current.kind === 'pack'
        ? fixture.run.pendingChoice!.current.options
        : []) {
        const choose = page
          .getByRole('heading', { name: option.item.name })
          .locator('..')
          .getByRole('button', { name: '选此件' });
        await choose.scrollIntoViewIfNeeded();
        await expectDirectHitTarget(choose, `选择 ${option.item.name}`);
        await expectLoadedLocalArtwork(
          page.getByTestId(`catalog-art-${option.item.contentId}`).locator('img'),
          `${option.item.name} 候选画幅`,
          viewport.width === 1920 ? 96 : 80,
          viewport.width === 1920 ? 124 : 104,
        );
        await expect(page.getByRole('button', { name: '放弃余项' })).toBeVisible();
      }
      await expectNoOuterScroll(page);
    }
  }
});
