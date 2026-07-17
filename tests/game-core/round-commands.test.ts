import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { executeCommand } from '../../src/game-core/commands/executeCommand';

describe('回合指令', () => {
  it('选择两张牌后弃牌，补牌并守恒检查点状态', () => {
    let state = createFixtureRun('discard-script');
    const selectedIds = state.hand.slice(0, 2).map((card) => card.id);

    for (const cardId of selectedIds) {
      const result = executeCommand(state, {
        type: 'toggle-card',
        checkpointId: state.checkpointId,
        cardId,
      });
      if (!result.ok) throw new Error(result.rejection.message);
      state = result.state;
    }

    const result = executeCommand(state, {
      type: 'discard-selected',
      checkpointId: state.checkpointId,
    });
    if (!result.ok) throw new Error(result.rejection.message);
    state = result.state;

    const allCards = [...state.drawPile, ...state.hand, ...state.discardPile];
    expect(state.checkpointId).toBe(3);
    expect(state.discardsRemaining).toBe(2);
    expect(state.selectedCardIds).toEqual([]);
    expect(state.hand).toHaveLength(8);
    expect(state.drawPile).toHaveLength(42);
    expect(state.discardPile.map((card) => card.id)).toEqual(selectedIds);
    expect(new Set(allCards.map((card) => card.id))).toHaveLength(52);
  });
});
