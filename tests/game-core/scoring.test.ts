import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { executeCommand } from '../../src/game-core/commands/executeCommand';

describe('出牌结算', () => {
  it('依次结算牌型、计分牌与奇牌倍率，并在达标后进入商店', () => {
    let state = { ...createFixtureRun('winning-script'), targetScore: 1 };
    const playedIds = state.hand.slice(0, 5).map((card) => card.id);

    for (const cardId of playedIds) {
      const selected = executeCommand(state, {
        type: 'toggle-card',
        checkpointId: state.checkpointId,
        cardId,
      });
      if (!selected.ok) throw new Error(selected.rejection.message);
      state = selected.state;
    }

    const result = executeCommand(state, {
      type: 'play-selected',
      checkpointId: state.checkpointId,
    });
    if (!result.ok) throw new Error(result.rejection.message);
    state = result.state;

    expect(state.lastHand).not.toBeNull();
    expect(state.lastHand?.playedCardIds).toEqual(playedIds);
    expect(state.lastHand?.multiplier).toBeGreaterThanOrEqual(1.5);
    expect(state.lastHand?.score).toBe(state.roundScore);
    expect(state.handsRemaining).toBe(3);
    expect(state.phase).toBe('shop');
    expect(state.shop?.offers).toHaveLength(2);
    expect(state.money).toBe(14);
    expect(result.domainEvents.map((event) => event.type)).toContain('blind-won');
    expect(result.presentationEvents.map((event) => event.type)).toEqual([
      'hand-reveal',
      'score-stamp',
      'blind-cleared',
    ]);
  });
});
