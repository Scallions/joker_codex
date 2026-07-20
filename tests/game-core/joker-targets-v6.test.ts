import type { RunStateV6 } from '../../src/game-core/model/runV6';
import { acquireV6, commandV6, enterShopV6, initialV6 } from '../helpers/jokerV6';

function playWinningHand(state: RunStateV6): RunStateV6 {
  let started = commandV6(state, { type: 'select-blind', position: 'small' });
  const cardId = started.round!.handIds[0]!;
  started = {
    ...started,
    round: {
      ...started.round!,
      targetScore: 1,
      selectedCardIds: [cardId],
    },
  };
  return commandV6(started, { type: 'play-selected' });
}

describe('V6 守垒与神龛目标生命周期', () => {
  it('首次获取从稳定非石像牌池物化共享目标并记录池、索引和目标证据', () => {
    let state = acquireV6(initialV6('target-v6-acquire'), 103);
    state = acquireV6(state, 127);

    expect(state.jokerRuntimeV6.castleTargetSuit).not.toBeNull();
    expect(state.jokerRuntimeV6.idolTargetRank).not.toBeNull();
    expect(state.jokerRuntimeV6.idolTargetSuit).not.toBeNull();
    const targetChoices = state.materializedChoicesV3.filter(({ kind }) =>
      ['set-castle-target', 'set-idol-target'].includes(kind),
    );
    expect(targetChoices).toHaveLength(2);
    for (const choice of targetChoices) {
      const poolIds = choice.valueIds.filter((value) => value.startsWith('pool:'));
      expect(poolIds).toHaveLength(state.deck.cards.length);
      expect(choice.valueNumbers).toHaveLength(2);
      expect(choice.valueNumbers[1]).toBe(poolIds.length);
      expect(choice.valueNumbers[0]).toBeGreaterThanOrEqual(0);
      expect(choice.valueNumbers[0]).toBeLessThan(poolIds.length);
    }
  });

  it('全石像牌组使用固定黑桃与黑桃 A 后备，不消费 RNG', () => {
    let state = initialV6('target-v6-stone-fallback');
    state = {
      ...state,
      deck: {
        cards: state.deck.cards.map((card) => ({
          ...card,
          enhancementId: 'bxqp:enhancement:stone-mask',
        })),
      },
      modifiersV3: {
        ...state.modifiersV3,
        playingCards: state.modifiersV3.playingCards.map((modifier) => ({
          ...modifier,
          enhancementId: 'bxqp:enhancement:stone-mask',
        })),
      },
    };
    const rngBefore = state.rngState;
    state = acquireV6(state, 103);
    state = acquireV6(state, 127);

    expect(state.rngState).toEqual(rngBefore);
    expect(state.jokerRuntimeV6).toMatchObject({
      castleTargetSuit: 'spades',
      idolTargetRank: 'ace',
      idolTargetSuit: 'spades',
    });
    const choices = state.materializedChoicesV3.filter(({ kind }) =>
      ['set-castle-target', 'set-idol-target'].includes(kind),
    );
    expect(choices.every(({ valueIds }) => valueIds[0] === 'fallback')).toBe(true);
    expect(choices.every(({ valueNumbers }) => valueNumbers.length === 0)).toBe(true);
  });

  it('盲注选择会为仍为空的活跃来源补齐目标', () => {
    let state = acquireV6(initialV6('target-v6-blind-repair'), 103);
    state = acquireV6(state, 127);
    const choiceCount = state.materializedChoicesV3.length;
    state = {
      ...state,
      jokerRuntimeV6: {
        ...state.jokerRuntimeV6,
        castleTargetSuit: null,
        idolTargetRank: null,
        idolTargetSuit: null,
      },
    };

    const started = commandV6(state, { type: 'select-blind', position: 'small' });
    expect(started.jokerRuntimeV6.castleTargetSuit).not.toBeNull();
    expect(started.jokerRuntimeV6.idolTargetRank).not.toBeNull();
    expect(started.jokerRuntimeV6.idolTargetSuit).not.toBeNull();
    expect(started.materializedChoicesV3).toHaveLength(choiceCount + 2);
  });

  it('回合结算轮换目标；序列化再载入后保持 RNG、证据与结果等价', () => {
    let state = acquireV6(initialV6('target-v6-reload'), 103);
    state = acquireV6(state, 127);
    const choiceCount = state.materializedChoicesV3.length;
    const restored = JSON.parse(JSON.stringify(state)) as RunStateV6;

    const uninterrupted = playWinningHand(state);
    const reloaded = playWinningHand(restored);
    expect(uninterrupted.phase.kind).toBe('round-reward');
    expect(uninterrupted.materializedChoicesV3).toHaveLength(choiceCount + 2);
    expect(reloaded).toEqual(uninterrupted);
  });

  it('多个同类来源共享目标，出售最后一个相关来源时才清空', () => {
    let state = acquireV6(initialV6('target-v6-sale'), 103, 'first');
    state = acquireV6(state, 103, 'second');
    const [first, second] = state.inventory.jokers.filter(
      ({ contentId }) => contentId === 'bxqp:joker:103',
    );
    if (!first || !second) throw new Error('缺少双守垒来源');
    state = enterShopV6(state);
    state = commandV6(state, {
      type: 'sell-joker',
      jokerInstanceId: first.instanceId,
    });
    expect(state.jokerRuntimeV6.castleTargetSuit).not.toBeNull();
    state = commandV6(state, {
      type: 'sell-joker',
      jokerInstanceId: second.instanceId,
    });
    expect(state.jokerRuntimeV6.castleTargetSuit).toBeNull();
  });
});
