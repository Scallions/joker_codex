import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { executeCommand } from '../../src/game-core/commands/executeCommand';

describe('试玩商店', () => {
  it('可重掷、购买、重排、出售奇牌并完成试玩', () => {
    let state = { ...createFixtureRun('shop-script'), targetScore: 1 };
    const selected = executeCommand(state, {
      type: 'toggle-card',
      checkpointId: state.checkpointId,
      cardId: state.hand[0]!.id,
    });
    if (!selected.ok) throw new Error(selected.rejection.message);
    state = selected.state;

    const played = executeCommand(state, {
      type: 'play-selected',
      checkpointId: state.checkpointId,
    });
    if (!played.ok) throw new Error(played.rejection.message);
    state = played.state;
    const rngBeforeReroll = state.rngState;

    const rerolled = executeCommand(state, {
      type: 'reroll-shop',
      checkpointId: state.checkpointId,
    });
    if (!rerolled.ok) throw new Error(rerolled.rejection.message);
    state = rerolled.state;
    expect(state.rngState).not.toBe(rngBeforeReroll);

    const jokerOffer = state.shop?.offers.find((offer) => offer.kind === 'joker');
    if (!jokerOffer) throw new Error('商店缺少奇牌商品');
    const bought = executeCommand(state, {
      type: 'buy-shop-offer',
      checkpointId: state.checkpointId,
      offerId: jokerOffer.id,
    });
    if (!bought.ok) throw new Error(bought.rejection.message);
    state = bought.state;
    const newJoker = state.jokers.at(-1);
    if (!newJoker) throw new Error('购买后缺少奇牌');

    const reordered = executeCommand(state, {
      type: 'reorder-joker',
      checkpointId: state.checkpointId,
      jokerInstanceId: newJoker.instanceId,
      toIndex: 0,
    });
    if (!reordered.ok) throw new Error(reordered.rejection.message);
    state = reordered.state;
    expect(state.jokers[0]?.instanceId).toBe(newJoker.instanceId);

    const sold = executeCommand(state, {
      type: 'sell-joker',
      checkpointId: state.checkpointId,
      jokerInstanceId: newJoker.instanceId,
    });
    if (!sold.ok) throw new Error(sold.rejection.message);
    state = sold.state;

    const left = executeCommand(state, {
      type: 'leave-shop',
      checkpointId: state.checkpointId,
    });
    if (!left.ok) throw new Error(left.rejection.message);
    state = left.state;

    expect(state.checkpointId).toBe(7);
    expect(state.jokers).toHaveLength(1);
    expect(state.money).toBe(11);
    expect(state.phase).toBe('won');
    expect(state.shop).toBeNull();
  });
});
