import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV5 } from '../../src/content/runtime/runSetupV5';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { applyRunWindowEffectsV2 } from '../../src/game-core/effects/runWindowV2';
import { validateBeforeHandV2 } from '../../src/game-core/effects/scoreHandV2';
import { isRunStateV5, type RunStateV5 } from '../../src/game-core/model/runV5';
import { materializeBlind } from '../../src/game-core/rules/ante';
import { getBlindTargetForRun } from '../../src/game-core/rules/runtimeV3';

function acquire(state: RunStateV5, ordinal: number): RunStateV5 {
  const widened: RunStateV5 = {
    ...state,
    rules: { ...state.rules, jokerSlots: 20 },
  };
  const result = acquireContentByIdV3(
    widened,
    `bxqp:joker:${ordinal.toString().padStart(3, '0')}`,
    `sale-boss:${ordinal}`,
  );
  if (!result.ok || !isRunStateV5(result.state)) {
    throw new Error(result.ok ? '没有保持 V5' : result.message);
  }
  return result.state;
}

describe('V5 出售触发与班主失效', () => {
  it('j077-sale-boss-only：仅压轴出售会失效班主，立即恢复普通目标且下一盲注重置', () => {
    const ordinaryAcquired = acquire(
      createProductionRunV5(PRODUCTION_CATALOG, { seed: 'j077-ordinary-sale' }),
      77,
    );
    const ordinarySelected = executeCommandV2(ordinaryAcquired, {
      type: 'select-blind',
      checkpointId: ordinaryAcquired.checkpointId,
      position: 'small',
    });
    expect(ordinarySelected.ok).toBe(true);
    if (!ordinarySelected.ok || !isRunStateV5(ordinarySelected.state)) return;
    const ordinarySource = ordinarySelected.state.inventory.jokers.find(
      ({ contentId }) => contentId === 'bxqp:joker:077',
    )!;
    const ordinarySold = executeCommandV2(ordinarySelected.state, {
      type: 'sell-joker',
      checkpointId: ordinarySelected.state.checkpointId,
      jokerInstanceId: ordinarySource.instanceId,
    });
    expect(ordinarySold.ok).toBe(true);
    if (!ordinarySold.ok || !isRunStateV5(ordinarySold.state)) return;
    expect(ordinarySold.state.jokerRuntimeV5.bossDisabledForRound).toBe(false);

    const acquired = acquire(
      createProductionRunV5(PRODUCTION_CATALOG, { seed: 'j077-disable-boss' }),
      77,
    );
    const highTarget = acquired.content.blinds.find(
      (blind) => blind.kind === 'boss' && blind.targetMultiplier === 4,
    )!;
    const exactFive = acquired.content.blinds.find((blind) =>
      blind.effects.some((effect) => effect.parameters.key === 'require-play-count'),
    )!;
    const boss = {
      ...materializeBlind(highTarget),
      effects: exactFive.effects,
    };
    const ready: RunStateV5 = {
      ...acquired,
      phase: { kind: 'blind-select' },
      progress: {
        ...acquired.progress,
        blindPosition: 'boss',
        lineup: { ...acquired.progress.lineup, boss },
      },
    };
    const selected = executeCommandV2(ready, {
      type: 'select-blind',
      checkpointId: ready.checkpointId,
      position: 'boss',
    });
    expect(selected.ok).toBe(true);
    if (!selected.ok || !isRunStateV5(selected.state)) return;
    const cardId = selected.state.round!.handIds[0]!;
    expect(
      validateBeforeHandV2(selected.state, [
        selected.state.deck.cards.find(({ id }) => id === cardId)!,
      ]),
    ).toContain('恰好打出5张牌');
    const constrainedTarget = selected.state.round!.targetScore;
    const source = selected.state.inventory.jokers.find(
      ({ contentId }) => contentId === 'bxqp:joker:077',
    )!;
    const transientlyConstrained: RunStateV5 = {
      ...selected.state,
      round: {
        ...selected.state.round!,
        forcedSelectedCardIds: [cardId],
        faceDownCardIds: [cardId],
      },
      modifiersV3: {
        ...selected.state.modifiersV3,
        playingCards: selected.state.modifiersV3.playingCards.map((modifier) => ({
          ...modifier,
          debuffed: true,
        })),
      },
    };

    const sold = executeCommandV2(transientlyConstrained, {
      type: 'sell-joker',
      checkpointId: transientlyConstrained.checkpointId,
      jokerInstanceId: source.instanceId,
    });

    expect(sold.ok).toBe(true);
    if (!sold.ok || !isRunStateV5(sold.state)) return;
    expect(sold.state.jokerRuntimeV5.bossDisabledForRound).toBe(true);
    expect(sold.state.round!.targetScore).toBe(getBlindTargetForRun(sold.state, 2));
    expect(sold.state.round!.targetScore).toBeLessThan(constrainedTarget);
    expect(sold.state.round!.forcedSelectedCardIds).toEqual([]);
    expect(sold.state.round!.faceDownCardIds).toEqual([]);
    expect(
      sold.state.modifiersV3.playingCards.every((modifier) => !modifier.debuffed),
    ).toBe(true);
    expect(
      validateBeforeHandV2(sold.state, [
        sold.state.deck.cards.find(({ id }) => id === cardId)!,
      ]),
    ).toBeNull();

    const nextReady: RunStateV5 = {
      ...sold.state,
      phase: { kind: 'blind-select' },
      round: null,
      progress: { ...sold.state.progress, blindPosition: 'boss' },
    };
    const nextSelected = executeCommandV2(nextReady, {
      type: 'select-blind',
      checkpointId: nextReady.checkpointId,
      position: 'boss',
    });
    expect(nextSelected.ok).toBe(true);
    if (!nextSelected.ok || !isRunStateV5(nextSelected.state)) return;
    expect(nextSelected.state.jokerRuntimeV5.bossDisabledForRound).toBe(false);
  });

  it('j094-sold-copier-trigger：只在自身或复制它的出售根源售出时生成固定复签', () => {
    const acquired = acquire(
      createProductionRunV5(PRODUCTION_CATALOG, { seed: 'j094-sale-source' }),
      94,
    );
    const source = acquired.inventory.jokers.find(
      ({ contentId }) => contentId === 'bxqp:joker:094',
    )!;
    const unrelated = applyRunWindowEffectsV2(acquired, 'item-sold', {
      eventContext: {
        eventFacts: {
          kind: 'item-sale',
          family: 'consumable',
          instanceId: 'unrelated-consumable',
        },
        eventCardIdentities: {},
      },
    });
    expect(unrelated.ok).toBe(true);
    if (!unrelated.ok) return;
    expect(unrelated.state.inventory.tags).toHaveLength(0);

    const ownSale = applyRunWindowEffectsV2(acquired, 'item-sold', {
      eventContext: {
        eventFacts: {
          kind: 'item-sale',
          family: 'joker',
          instanceId: source.instanceId,
        },
        eventCardIdentities: {},
      },
    });
    expect(ownSale.ok).toBe(true);
    if (!ownSale.ok) return;
    expect(ownSale.state.inventory.tags).toHaveLength(1);
    expect(ownSale.state.inventory.tags[0]?.contentId).toBe('bxqp:tag:copy-sign');

    const copierInstanceId = 'test:j094:copier';
    const copiedSale = applyRunWindowEffectsV2(acquired, 'item-sold', {
      additionalSources: [
        {
          instanceId: copierInstanceId,
          position: 999,
          effects: [
            {
              id: 'test:j094:copy-source',
              handlerId: 'fixture:run-economy:handler:copy-joker',
              windows: ['item-sold'],
              priority: 0,
              parameters: { targetInstanceId: source.instanceId },
            },
          ],
        },
      ],
      eventContext: {
        eventFacts: {
          kind: 'item-sale',
          family: 'joker',
          instanceId: copierInstanceId,
        },
        eventCardIdentities: {},
      },
    });
    expect(copiedSale.ok).toBe(true);
    if (!copiedSale.ok) return;
    expect(copiedSale.state.inventory.tags).toHaveLength(1);
    expect(copiedSale.state.inventory.tags[0]?.contentId).toBe('bxqp:tag:copy-sign');
  });
});
