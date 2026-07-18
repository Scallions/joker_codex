import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV3 } from '../../src/content/runtime/runSetupV3';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import { createShopV2 } from '../../src/game-core/economy/shopV2';
import type { JokerDefinitionV2, OwnedTagV2 } from '../../src/game-core/model/runV2';
import type { RunStateV3 } from '../../src/game-core/model/runV3';

type CommandWithoutCheckpoint = RunCommandV2 extends infer Command
  ? Command extends RunCommandV2
    ? Omit<Command, 'checkpointId'>
    : never
  : never;

function command(run: RunStateV3, input: CommandWithoutCheckpoint): RunStateV3 {
  const result = executeCommandV2(run, {
    ...input,
    checkpointId: run.checkpointId,
  });
  expect(result).toMatchObject({ ok: true });
  if (!result.ok) throw new Error(result.rejection.message);
  return result.state as RunStateV3;
}

function tagId(referenceIndex: string): string {
  const row = PRODUCTION_CATALOG.rows.find(
    (candidate) =>
      candidate.family === 'tag' && candidate.referenceIndex === referenceIndex,
  );
  if (!row) throw new Error(`测试缺少戏签：${referenceIndex}`);
  return row.id;
}

function withLineupTags(
  run: RunStateV3,
  smallReference: string,
  bigReference = 'G24',
): RunStateV3 {
  return {
    ...run,
    progress: {
      ...run.progress,
      lineup: {
        ...run.progress.lineup,
        smallTagId: tagId(smallReference),
        bigTagId: tagId(bigReference),
      },
    },
  };
}

function ownedTag(run: RunStateV3, referenceIndex: string, index: number): OwnedTagV2 {
  const contentId = tagId(referenceIndex);
  const definition = run.content.tags.find((tag) => tag.id === contentId);
  if (!definition) throw new Error(`执行快照缺少戏签：${referenceIndex}`);
  return {
    instanceId: `test:tag:${referenceIndex}:${index}`,
    contentId,
    consumed: false,
    deferredWindow: definition.effects[0]?.windows[0] ?? null,
  };
}

function joker(index: number): JokerDefinitionV2 {
  return {
    kind: 'joker',
    contentId: `bxqp:joker:${String(23 + index).padStart(3, '0')}`,
    name: `戏签测试奇牌${index}`,
    description: '只用于戏签外部能力合约。',
    baseCost: 6,
    weightUnits: 100,
    effects: [],
    targetKind: 'none',
    minimumTargets: 0,
    maximumTargets: 0,
    rarity: 'uncommon',
    slotContribution: 1,
  };
}

describe('V3 戏签即时与延迟合约', () => {
  it('G18 等待下一张非复制戏签并按堆叠次数线性复制', () => {
    let run = withLineupTags(
      createProductionRunV3(PRODUCTION_CATALOG, { seed: 'copy-next-tag' }),
      'G18',
      'G24',
    );
    run = command(run, { type: 'skip-blind', position: 'small' });
    expect(run.inventory.tags.filter(({ consumed }) => !consumed)).toHaveLength(1);
    expect(run.economy.money).toBe(4);

    run = command(run, { type: 'skip-blind', position: 'big' });
    expect(run.economy.money).toBe(16);
    expect(
      run.inventory.tags.filter(
        ({ contentId, consumed }) => contentId === tagId('G24') && consumed,
      ),
    ).toHaveLength(2);
  });

  it('G19 只把下一轮初始手牌扩为十一张，不改变永久手牌上限', () => {
    let run = withLineupTags(
      createProductionRunV3(PRODUCTION_CATALOG, { seed: 'next-round-hand-size' }),
      'G19',
    );
    run = command(run, { type: 'skip-blind', position: 'small' });
    run = command(run, { type: 'select-blind', position: 'big' });

    expect(run.round?.handIds).toHaveLength(11);
    expect(run.rules.handSize).toBe(8);
    expect(
      run.inventory.tags.find(({ contentId }) => contentId === tagId('G19')),
    ).toMatchObject({
      consumed: true,
    });
  });

  it('G09 依普通已见池重抽即将登场的班主并物化结果', () => {
    let run = withLineupTags(
      createProductionRunV3(PRODUCTION_CATALOG, { seed: 'tag-boss-reroll' }),
      'G09',
    );
    const before = run.progress.lineup.boss.definitionId;
    run = command(run, { type: 'skip-blind', position: 'small' });

    expect(run.progress.lineup.boss.definitionId).not.toBe(before);
    expect(run.materializedChoicesV3.at(-1)).toMatchObject({
      kind: 'tag-boss-reroll',
      valueIds: [run.progress.lineup.boss.definitionId],
    });
  });

  it('G10 即时打开免费大号散牌包，跳过后回到下一盲注选择', () => {
    let run = withLineupTags(
      createProductionRunV3(PRODUCTION_CATALOG, { seed: 'free-mega-pack' }),
      'G10',
    );
    run = command(run, { type: 'skip-blind', position: 'small' });
    expect(run.pendingChoice?.current).toMatchObject({
      kind: 'pack',
      returnPhase: 'blind-select',
      remainingPicks: 2,
    });
    run = command(run, {
      type: 'skip-pack',
      choiceId: run.pendingChoice!.current.id,
    });

    expect(run.phase).toEqual({ kind: 'blind-select' });
    expect(run.progress.blindPosition).toBe('big');
  });

  it('G14 按本局已出手数结算，G23 只提升一个已物化牌型三级', () => {
    let ledger = withLineupTags(
      createProductionRunV3(PRODUCTION_CATALOG, { seed: 'hands-ledger-tag' }),
      'G14',
    );
    ledger = {
      ...ledger,
      history: {
        ...ledger.history,
        playedHandTypes: ['high-card', 'pair', 'flush'],
      },
    };
    ledger = command(ledger, { type: 'skip-blind', position: 'small' });
    expect(ledger.economy.money).toBe(7);

    let levels = withLineupTags(
      createProductionRunV3(PRODUCTION_CATALOG, { seed: 'hand-level-tag' }),
      'G23',
    );
    const before = levels.rules.handLevels;
    levels = command(levels, { type: 'skip-blind', position: 'small' });
    const changed = Object.entries(levels.rules.handLevels).filter(
      ([handType, level]) => level !== before[handType as keyof typeof before],
    );

    expect(changed).toHaveLength(1);
    expect(changed[0]![1]).toBe(4);
    expect(levels.materializedChoicesV3.at(-1)?.kind).toBe('tag-hand-level');
  });

  it('G17 仅把下间夜市初始商品和卡包设为免费', () => {
    const base = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'free-initial-shop',
    });
    const run: RunStateV3 = {
      ...base,
      inventory: { ...base.inventory, tags: [ownedTag(base, 'G17', 0)] },
    };
    const created = createShopV2(run);
    if (!created.ok) throw new Error(created.message);

    expect(created.shop.cardOffers.every(({ price }) => price === 0)).toBe(true);
    expect(created.shop.packOffers.every(({ price }) => price === 0)).toBe(true);
    expect(created.shop.voucherOffer?.price).toBeGreaterThan(0);
  });

  it('G08 在下间夜市加挂一张不同木牌，兑换后保留本幕常驻木牌', () => {
    const base = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'extra-voucher-tag',
    });
    let run: RunStateV3 = {
      ...base,
      economy: { ...base.economy, money: 100 },
      inventory: { ...base.inventory, tags: [ownedTag(base, 'G08', 0)] },
    };
    const created = createShopV2(run);
    if (!created.ok) throw new Error(created.message);
    const primary = created.shop.voucherOffer;
    const extra = created.shop.extraVoucherOffers?.[0];
    if (!primary || !extra) throw new Error('G08 应物化常驻与加挂木牌');

    expect(created.shop.extraVoucherOffers).toHaveLength(1);
    expect(extra.voucherId).not.toBe(primary.voucherId);
    expect(created.tags[0]).toMatchObject({ consumed: true });

    run = {
      ...run,
      phase: { kind: 'shop' },
      progress: { ...run.progress, anteVoucherId: created.anteVoucherId },
      inventory: { ...run.inventory, tags: created.tags },
      shop: created.shop,
      rngState: created.rngState,
    };
    run = command(run, { type: 'buy-voucher', offerId: extra.id });

    expect(run.shop?.voucherOffer?.id).toBe(primary.id);
    expect(run.shop?.extraVoucherOffers).toEqual([]);
    expect(run.progress.anteVoucherId).toBe(primary.voucherId);
    expect(run.inventory.voucherIds).toContain(extra.voucherId);
  });

  it('G01 与 G03 可为同一夜市增加免费奇牌并给基础版本奇牌加覆影版', () => {
    const base = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'free-edition-joker-tags',
    });
    const run: RunStateV3 = {
      ...base,
      rules: { ...base.rules, cardOfferSlots: 1 },
      content: { ...base.content, items: [joker(1), joker(2)] },
      inventory: {
        ...base.inventory,
        tags: [ownedTag(base, 'G01', 0), ownedTag(base, 'G03', 1)],
      },
    };
    const created = createShopV2(run);
    if (!created.ok) throw new Error(created.message);

    expect(created.shop.cardOffers).toHaveLength(2);
    expect(created.shop.cardOffers.every(({ price }) => price === 0)).toBe(true);
    expect(
      created.shop.cardOffers.find(
        ({ item }) => item.editionId === 'bxqp:edition:shadow-cutout',
      )?.item.slotContribution,
    ).toBe(0);
    expect(created.tags.every(({ consumed }) => consumed)).toBe(true);
  });
});
