import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV3 } from '../../src/content/runtime/runSetupV3';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { materializePackOptionsV2 } from '../../src/game-core/economy/shopV2';
import { resolveHandScoreV2 } from '../../src/game-core/effects/scoreHandV2';
import { stableId } from '../../src/game-core/model/ids';
import type {
  ConsumableDefinitionV2,
  OwnedConsumableV2,
} from '../../src/game-core/model/runV2';
import type { RunStateV3 } from '../../src/game-core/model/runV3';
import { createRandomState } from '../../src/game-core/rng/random';

function pack(run: RunStateV3, family: string, size = 'normal') {
  const found = run.content.packs.find(
    (candidate) => candidate.family === family && candidate.size === size,
  );
  if (!found) throw new Error(`测试缺少卡包：${family}/${size}`);
  return found;
}

function ownedConsumable(run: RunStateV3, contentId: string): OwnedConsumableV2 {
  const definition = run.content.items.find(
    (item): item is ConsumableDefinitionV2 =>
      item.kind === 'consumable' && item.contentId === contentId,
  );
  if (!definition) throw new Error(`测试缺少消耗牌：${contentId}`);
  return {
    instanceId: stableId<'consumable-instance'>(`test:held:${contentId}`),
    contentId,
    name: definition.name,
    description: definition.description,
    baseCost: definition.baseCost,
    editionCost: 0,
    editionId: null,
    effects: definition.effects,
    targetKind: definition.targetKind,
    minimumTargets: definition.minimumTargets,
    maximumTargets: definition.maximumTargets,
    sellValueOverride: null,
  };
}

describe('木牌、戏签与卡包冻结合约', () => {
  it('32 个卡包条目严格映射 15 个机械档案', () => {
    const rows = PRODUCTION_CATALOG.rows.filter(({ family }) => family === 'booster');

    expect(rows).toHaveLength(32);
    expect(PRODUCTION_CATALOG.boosterProfiles).toHaveLength(15);
    expect(
      new Set(rows.map(({ mechanicalProfileId }) => mechanicalProfileId)),
    ).toHaveLength(15);
    expect(
      rows.every(({ mechanicalProfileId }) =>
        PRODUCTION_CATALOG.boosterProfiles.some(({ id }) => id === mechanicalProfileId),
      ),
    ).toBe(true);
  });

  it('V10 对戏法包每个选项独立执行二成灵异替换', () => {
    const base = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'tarot-spectral-replacement',
    });
    const run: RunStateV3 = {
      ...base,
      inventory: {
        ...base.inventory,
        voucherIds: ['bxqp:voucher:wide-satchel', 'bxqp:voucher:spirit-in-paper'],
      },
    };
    const arcana = pack(run, 'arcana');
    const options = Array.from(
      { length: 80 },
      (_, index) =>
        materializePackOptionsV2(
          run,
          arcana,
          `test:arcana:${index}`,
          createRandomState(`arcana-replacement-${index}`),
        ).items,
    ).flat();
    const spectralCount = options.filter(({ contentId }) =>
      contentId.startsWith('bxqp:spectral:'),
    ).length;

    expect(spectralCount).toBeGreaterThan(0);
    expect(spectralCount).toBeLessThan(options.length);
    expect(
      options.every(
        ({ contentId }) =>
          contentId.startsWith('bxqp:tarot:') || contentId.startsWith('bxqp:spectral:'),
      ),
    ).toBe(true);
  });

  it('V11 保证星象包首项对应本局最常用牌型', () => {
    const base = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'guaranteed-most-played-planet',
    });
    const run: RunStateV3 = {
      ...base,
      inventory: {
        ...base.inventory,
        voucherIds: ['bxqp:voucher:favored-star'],
      },
      history: {
        ...base.history,
        playedHandTypes: ['high-card', 'pair', 'pair'],
      },
    };
    const options = materializePackOptionsV2(
      run,
      pack(run, 'celestial'),
      'test:guaranteed-planet',
      createRandomState('guaranteed-planet-options'),
    ).items;

    expect(options[0]?.contentId).toBe('bxqp:planet:paired-cymbal');
    expect(new Set(options.map(({ contentId }) => contentId))).toHaveLength(
      options.length,
    );
  });

  it('V12 仅在持有与当前牌型匹配的星象牌时乘算倍率', () => {
    const initial = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'held-matching-planet',
    });
    const selected = executeCommandV2(initial, {
      type: 'select-blind',
      checkpointId: initial.checkpointId,
      position: 'small',
    });
    if (!selected.ok) throw new Error(selected.rejection.message);
    const round = selected.state as RunStateV3;
    const cardId = round.round!.handIds[0]!;
    const card = round.deck.cards.find(({ id }) => id === cardId)!;
    const baseline = resolveHandScoreV2(round, [card]);
    if (!baseline.ok) throw new Error(baseline.message);
    const held: RunStateV3 = {
      ...round,
      inventory: {
        ...round.inventory,
        voucherIds: ['bxqp:voucher:favored-star', 'bxqp:voucher:held-star'],
        consumables: [ownedConsumable(round, 'bxqp:planet:solo-lantern')],
      },
    };
    const boosted = resolveHandScoreV2(held, [card]);
    if (!boosted.ok) throw new Error(boosted.message);

    expect(boosted.breakdown.multiplier).toBe(baseline.breakdown.multiplier * 1.5);
  });

  it('灵异包稀有替换只产生 X17/X18 且同种子重放一致', () => {
    const base = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'rare-spectral-options',
    });
    const run: RunStateV3 = {
      ...base,
      externalDependenciesV3: {
        ...base.externalDependenciesV3,
        requiredIds: ['bxqp:joker:023'],
        resolvedIds: ['bxqp:joker:023'],
      },
    };
    const spectral = pack(run, 'spectral');
    const materialize = (index: number) =>
      materializePackOptionsV2(
        run,
        spectral,
        `test:rare-spectral:${index}`,
        createRandomState(`rare-spectral-${index}`),
      );
    const first = Array.from({ length: 1_200 }, (_, index) => materialize(index));
    const replay = Array.from({ length: 1_200 }, (_, index) => materialize(index));
    const rareIds = first
      .flatMap(({ items }) => items)
      .map(({ contentId }) => contentId)
      .filter(
        (contentId) =>
          contentId === 'bxqp:spectral:legend-call' ||
          contentId === 'bxqp:spectral:all-stars-rise',
      );

    expect(rareIds.length).toBeGreaterThan(0);
    expect(first).toEqual(replay);
  });

  it('标准散牌包逐项物化强化、版本与印记独立掷骰且不会生成负容量版本', () => {
    const run = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'standard-pack-modifiers',
    });
    const standard = pack(run, 'standard');
    const items = Array.from(
      { length: 120 },
      (_, index) =>
        materializePackOptionsV2(
          run,
          standard,
          `test:standard-modifiers:${index}`,
          createRandomState(`standard-modifiers-${index}`),
        ).items,
    ).flat();
    const cards = items.map(({ generatedCard }) => generatedCard!);

    expect(cards.some(({ enhancementId }) => enhancementId !== null)).toBe(true);
    expect(cards.some(({ sealId }) => sealId !== null)).toBe(true);
    expect(cards.some(({ editionId }) => editionId !== null)).toBe(true);
    expect(
      cards.every(({ editionId }) => editionId !== 'bxqp:edition:shadow-cutout'),
    ).toBe(true);
    expect(
      materializePackOptionsV2(
        run,
        standard,
        'test:standard-replay',
        createRandomState('standard-replay'),
      ),
    ).toEqual(
      materializePackOptionsV2(
        run,
        standard,
        'test:standard-replay',
        createRandomState('standard-replay'),
      ),
    );
  });
});
