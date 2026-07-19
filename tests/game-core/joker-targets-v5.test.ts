import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV5 } from '../../src/content/runtime/runSetupV5';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { applyRunWindowEffectsV2 } from '../../src/game-core/effects/runWindowV2';
import { stableId } from '../../src/game-core/model/ids';
import { isRunStateV5, type RunStateV5 } from '../../src/game-core/model/runV5';
import { runStateV5Schema } from '../../src/persistence/schemasV5';

function acquire(
  state: RunStateV5,
  ordinal: number,
  identity = `target:${ordinal}`,
): RunStateV5 {
  const widened: RunStateV5 = {
    ...state,
    rules: { ...state.rules, jokerSlots: 20 },
  };
  const result = acquireContentByIdV3(
    widened,
    `bxqp:joker:${ordinal.toString().padStart(3, '0')}`,
    identity,
  );
  if (!result.ok || !isRunStateV5(result.state)) {
    throw new Error(result.ok ? '没有保持 V5' : result.message);
  }
  return result.state;
}

function sourceTargets(state: RunStateV5, ordinal: number): readonly unknown[] {
  const contentId = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const instanceIds = new Set(
    state.inventory.jokers
      .filter((joker) => joker.contentId === contentId)
      .map((joker) => joker.instanceId),
  );
  return state.modifiersV3.jokers
    .filter((modifier) => instanceIds.has(modifier.instanceId))
    .map((modifier) => modifier.abilityState.targetHand);
}

function committedForPersistence(state: RunStateV5): RunStateV5 {
  return {
    ...state,
    checkpointId: Math.max(
      state.checkpointId,
      ...state.materializedChoicesV3.map((choice) => choice.checkpointId),
    ),
  };
}

describe('V5 回合目标物化', () => {
  it('j060-independent-targets-reload：双实例独立物化目标，存读档保持一致', () => {
    const initial = createProductionRunV5(PRODUCTION_CATALOG, {
      seed: 'j060-target',
    });
    const first = acquire(initial, 60, 'target:60:first');
    const acquired = acquire(first, 60, 'target:60:second');
    const initialTargets = sourceTargets(acquired, 60);
    const reloaded = runStateV5Schema.parse(
      structuredClone(committedForPersistence(acquired)),
    );
    const rotated = applyRunWindowEffectsV2(reloaded, 'round-end');

    expect(initialTargets).toHaveLength(2);
    expect(initialTargets.every((target) => typeof target === 'string')).toBe(true);
    expect(sourceTargets(reloaded, 60)).toEqual(initialTargets);
    expect(acquired.rngState).not.toEqual(initial.rngState);
    expect(rotated.ok).toBe(true);
    if (!rotated.ok || !isRunStateV5(rotated.state)) return;
    expect(sourceTargets(rotated.state, 60)).toHaveLength(2);
    expect(
      rotated.state.materializedChoicesV3
        .slice(-2)
        .every(({ kind }) => kind === 'joker-target-hand'),
    ).toBe(true);
    const committedRotated = committedForPersistence(rotated.state);
    expect(runStateV5Schema.parse(structuredClone(committedRotated))).toEqual(
      committedRotated,
    );
  });

  it('j083-weighted-shared-rank：从完整非石面牌组按牌权重选共享点数，全石面回退 A 且不耗 RNG', () => {
    const initial = createProductionRunV5(PRODUCTION_CATALOG, {
      seed: 'j083-weighted-rank',
    });
    const acquired = acquire(initial, 83);

    expect(acquired.jokerRuntimeV5.sharedRoundTargetRank).not.toBeNull();
    expect(acquired.rngState).not.toEqual(initial.rngState);

    const stone: RunStateV5 = {
      ...initial,
      deck: {
        cards: initial.deck.cards.map((card) => ({
          ...card,
          enhancementId: 'bxqp:enhancement:stone-mask',
        })),
      },
      modifiersV3: {
        ...initial.modifiersV3,
        playingCards: initial.modifiersV3.playingCards.map((modifier) => ({
          ...modifier,
          enhancementId: 'bxqp:enhancement:stone-mask',
        })),
      },
    };
    const fallback = acquire(stone, 83, 'target:83:all-stone');

    expect(fallback.jokerRuntimeV5.sharedRoundTargetRank).toBe('ace');
    expect(fallback.rngState).toEqual(stone.rngState);
  });

  it('j099-shared-suit-no-repeat：多个来源共享花色，存档后每回合只轮换一次且不连续重复', () => {
    const initial = createProductionRunV5(PRODUCTION_CATALOG, {
      seed: 'shared-target-dedup',
    });
    const rankSingle = acquire(initial, 83, 'target:83:first');
    const rankOwned = rankSingle.inventory.jokers[0]!;
    const rankModifier = rankSingle.modifiersV3.jokers[0]!;
    const rankDuplicateId = stableId<'joker-instance'>('target:83:duplicate');
    const rankDouble: RunStateV5 = {
      ...rankSingle,
      inventory: {
        ...rankSingle.inventory,
        jokers: [
          ...rankSingle.inventory.jokers,
          { ...rankOwned, instanceId: rankDuplicateId },
        ],
      },
      modifiersV3: {
        ...rankSingle.modifiersV3,
        jokers: [
          ...rankSingle.modifiersV3.jokers,
          { ...rankModifier, instanceId: rankDuplicateId },
        ],
      },
    };
    const oneRankRotation = applyRunWindowEffectsV2(rankSingle, 'round-end');
    const twoRankRotation = applyRunWindowEffectsV2(rankDouble, 'round-end');
    expect(oneRankRotation.ok && twoRankRotation.ok).toBe(true);
    if (!oneRankRotation.ok || !twoRankRotation.ok) return;
    expect(twoRankRotation.state.rngState).toEqual(oneRankRotation.state.rngState);
    expect(
      isRunStateV5(twoRankRotation.state) &&
        twoRankRotation.state.jokerRuntimeV5.sharedRoundTargetRank,
    ).toBe(
      isRunStateV5(oneRankRotation.state)
        ? oneRankRotation.state.jokerRuntimeV5.sharedRoundTargetRank
        : null,
    );

    const suitSingle = acquire(initial, 99, 'target:99:first');
    const previousSuit = suitSingle.jokerRuntimeV5.sharedRoundTargetSuit;
    const suitOwned = suitSingle.inventory.jokers[0]!;
    const suitModifier = suitSingle.modifiersV3.jokers[0]!;
    const suitDuplicateId = stableId<'joker-instance'>('target:99:duplicate');
    const suitDouble: RunStateV5 = {
      ...suitSingle,
      inventory: {
        ...suitSingle.inventory,
        jokers: [
          ...suitSingle.inventory.jokers,
          { ...suitOwned, instanceId: suitDuplicateId },
        ],
      },
      modifiersV3: {
        ...suitSingle.modifiersV3,
        jokers: [
          ...suitSingle.modifiersV3.jokers,
          { ...suitModifier, instanceId: suitDuplicateId },
        ],
      },
    };
    const suitReloaded = runStateV5Schema.parse(
      structuredClone(committedForPersistence(suitSingle)),
    );
    expect(suitReloaded.jokerRuntimeV5.sharedRoundTargetSuit).toBe(previousSuit);
    const oneSuitRotation = applyRunWindowEffectsV2(suitReloaded, 'round-end');
    const twoSuitRotation = applyRunWindowEffectsV2(suitDouble, 'round-end');
    expect(oneSuitRotation.ok && twoSuitRotation.ok).toBe(true);
    if (
      !oneSuitRotation.ok ||
      !twoSuitRotation.ok ||
      !isRunStateV5(oneSuitRotation.state) ||
      !isRunStateV5(twoSuitRotation.state)
    ) {
      return;
    }
    expect(twoSuitRotation.state.rngState).toEqual(oneSuitRotation.state.rngState);
    expect(twoSuitRotation.state.jokerRuntimeV5.sharedRoundTargetSuit).toBe(
      oneSuitRotation.state.jokerRuntimeV5.sharedRoundTargetSuit,
    );
    expect(oneSuitRotation.state.jokerRuntimeV5.sharedRoundTargetSuit).not.toBe(
      previousSuit,
    );
  });

  it('无相关活跃来源时不轮换残留共享目标，也不消耗 RNG', () => {
    const acquired = acquire(
      createProductionRunV5(PRODUCTION_CATALOG, { seed: 'inactive-shared-target' }),
      83,
    );
    const withoutSource: RunStateV5 = {
      ...acquired,
      inventory: { ...acquired.inventory, jokers: [] },
      modifiersV3: { ...acquired.modifiersV3, jokers: [] },
    };
    const resolved = applyRunWindowEffectsV2(withoutSource, 'round-end');

    expect(resolved.ok).toBe(true);
    if (!resolved.ok || !isRunStateV5(resolved.state)) return;
    expect(resolved.state.rngState).toEqual(withoutSource.rngState);
    expect(resolved.state.jokerRuntimeV5.sharedRoundTargetRank).toBe(
      withoutSource.jokerRuntimeV5.sharedRoundTargetRank,
    );
  });
});
