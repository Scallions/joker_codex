import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV4 } from '../../src/content/runtime/runSetupV4';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { isRunStateV4, type RunStateV4 } from '../../src/game-core/model/runV4';

function acquire(state: RunStateV4, contentId: string): RunStateV4 {
  const result = acquireContentByIdV3(state, contentId, `transaction:${contentId}`);
  if (!result.ok || !isRunStateV4(result.state)) {
    throw new Error(result.ok ? '没有保持 V4' : result.message);
  }
  return result.state;
}

function selectedRun(seed: string, jokerId: string): RunStateV4 {
  const initial = acquire(createProductionRunV4(PRODUCTION_CATALOG, { seed }), jokerId);
  const selected = executeCommandV2(initial, {
    type: 'select-blind',
    checkpointId: initial.checkpointId,
    position: 'small',
  });
  if (!selected.ok || !isRunStateV4(selected.state)) {
    throw new Error(selected.ok ? '没有保持 V4' : selected.rejection.message);
  }
  return selected.state;
}

describe('V4 原子出牌提案', () => {
  it('J026 的掷骰、内容选择、库存与检查点由同一次成功命令提交', () => {
    const attempts = Array.from({ length: 48 }, (_, index) => {
      let state = selectedRun(`transaction-create:${index}`, 'bxqp:joker:026');
      const cardId = state.round!.handIds[0]!;
      state = {
        ...state,
        deck: {
          cards: state.deck.cards.map((card) =>
            card.id === cardId ? { ...card, rank: '8' as const } : card,
          ),
        },
      };
      const toggled = executeCommandV2(state, {
        type: 'toggle-card',
        checkpointId: state.checkpointId,
        cardId,
      });
      if (!toggled.ok) throw new Error(toggled.rejection.message);
      return executeCommandV2(toggled.state, {
        type: 'play-selected',
        checkpointId: toggled.state.checkpointId,
      });
    });
    const success = attempts.find(
      (result) => result.ok && result.state.inventory.consumables.length === 1,
    );

    expect(success?.ok).toBe(true);
    if (!success?.ok || !isRunStateV4(success.state)) return;
    expect(success.state.inventory.consumables[0]?.contentId).toMatch(/^bxqp:tarot:/);
    expect(
      success.state.materializedChoicesV3.some(
        ({ kind }) => kind === 'playing-card-modifier-rolls',
      ),
    ).toBe(true);
    expect(
      success.domainEvents.filter(({ type }) => type === 'hand-scored'),
    ).toHaveLength(1);
  });

  it('任一 handler 失败时整手拒绝，输入检查点、RNG 与库存保持原样', () => {
    const state = selectedRun('transaction-handler-failure', 'bxqp:joker:001');
    const cardId = state.round!.handIds[0]!;
    const broken: RunStateV4 = {
      ...state,
      inventory: {
        ...state.inventory,
        jokers: state.inventory.jokers.map((joker) => ({
          ...joker,
          effects: joker.effects.map((effect) => ({
            ...effect,
            handlerId: 'missing:joker-handler',
          })),
        })),
      },
      round: { ...state.round!, selectedCardIds: [cardId] },
    };
    const before = structuredClone(broken);
    const result = executeCommandV2(broken, {
      type: 'play-selected',
      checkpointId: broken.checkpointId,
    });

    expect(result).toMatchObject({
      ok: false,
      rejection: { code: 'effect-handler-missing' },
    });
    expect(broken).toEqual(before);
  });
});
