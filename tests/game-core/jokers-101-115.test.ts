import { applyRunWindowEffectsV2 } from '../../src/game-core/effects/runWindowV2';
import { saleValue } from '../../src/game-core/economy/pricing';
import { projectEffectivePlayingCardV3 } from '../../src/game-core/poker/effectiveCardV3';
import { resolveJokerPassiveCapabilities } from '../../src/game-core/rules/jokerPassiveCapabilitiesV3';
import type { RunStateV2 } from '../../src/game-core/model/runV2';
import { isRunStateV6, type RunStateV6 } from '../../src/game-core/model/runV6';
import {
  abilityV6,
  acquireV6,
  commandV6,
  initialV6,
  scoreV6,
  v6Card,
  withoutJokersV6,
} from '../helpers/jokerV6';

function asV6(state: RunStateV2): RunStateV6 {
  if (!isRunStateV6(state)) throw new Error('效果结算降级了 V6');
  return state;
}

describe('奇牌 J101-J115 执行合约', () => {
  it('J101/J104/J106 在每个计分 pass 输出筹码、倍率和戏票', () => {
    const ten = v6Card('101-ten', 'hearts', '10');
    const face = v6Card('104-face', 'hearts', 'king');
    const gold = v6Card('106-gold', 'hearts', '7', {
      enhancementId: 'bxqp:enhancement:gold-leaf',
    });
    const eight = v6Card('101-eight', 'hearts', '8');
    const two = v6Card('101-two', 'hearts', '2');
    let state = acquireV6(initialV6('j101-106'), 101);
    state = acquireV6(state, 104);
    state = acquireV6(state, 106);
    const cards = [ten, face, gold, eight, two];
    state = { ...state, deck: { cards: [...state.deck.cards, ...cards] } };
    const control = scoreV6(withoutJokersV6(state), cards);
    const result = scoreV6(state, cards);

    expect(result.breakdown.cardChips - control.breakdown.cardChips).toBe(10);
    expect(result.breakdown.multiplier - control.breakdown.multiplier).toBe(9);
    expect(result.moneyDelta).toBe(4);
  });

  it('J102 的第十手仍重演，之后递减并自毁', () => {
    let state = acquireV6(initialV6('j102-tenth'), 102);
    const source = state.inventory.jokers.find(
      ({ contentId }) => contentId === 'bxqp:joker:102',
    )!;
    state = {
      ...state,
      modifiersV3: {
        ...state.modifiersV3,
        jokers: state.modifiersV3.jokers.map((modifier) =>
          modifier.instanceId === source.instanceId
            ? {
                ...modifier,
                abilityState: { ...modifier.abilityState, remainingHands: 1 },
              }
            : modifier,
        ),
      },
    };
    const card = v6Card('j102-card', 'spades', 'ace');
    const control = scoreV6(withoutJokersV6(state), [card]);
    const result = scoreV6(state, [card]);

    expect(result.breakdown.cardChips).toBe(control.breakdown.cardChips * 2);
    expect(
      result.proposedState.inventory.jokers.some(
        ({ instanceId }) => instanceId === source.instanceId,
      ),
    ).toBe(false);
  });

  it('J103 按冻结目标花色累计，输出读取持久状态', () => {
    let state = acquireV6(initialV6('j103-castle'), 103);
    const card = state.deck.cards.find(({ suit }) => suit === 'hearts')!;
    state = {
      ...state,
      jokerRuntimeV6: { ...state.jokerRuntimeV6, castleTargetSuit: 'hearts' },
    };
    const discarded = applyRunWindowEffectsV2(state, 'discard', {
      eventContext: {
        eventFacts: {
          kind: 'discard',
          discardedCardIds: [card.id],
          firstDiscardOfRound: true,
          forced: false,
          discardedHandType: 'high-card',
        },
        eventCardIdentities: {
          [card.id]: projectEffectivePlayingCardV3(state, card),
        },
      },
    });
    expect(discarded.ok).toBe(true);
    if (!discarded.ok) return;
    const discardedV6 = asV6(discarded.state);
    expect(abilityV6(discardedV6, 103, 'storedChips')).toBe(3);
    const result = scoreV6(discardedV6, [v6Card('j103-score', 'clubs', '2')]);
    const control = scoreV6(withoutJokersV6(discardedV6), [
      v6Card('j103-score', 'clubs', '2'),
    ]);
    expect(result.breakdown.cardChips - control.breakdown.cardChips).toBe(3);
  });

  it('J105 出售任意物品后成长，班主结算时重置', () => {
    const state = acquireV6(initialV6('j105-sale'), 105);
    const sold = applyRunWindowEffectsV2(state, 'item-sold', {
      eventContext: {
        eventFacts: { kind: 'item-sale', family: 'consumable', instanceId: 'other' },
        eventCardIdentities: {},
      },
    });
    expect(sold.ok).toBe(true);
    if (!sold.ok) return;
    const soldV6 = asV6(sold.state);
    expect(abilityV6(soldV6, 105, 'multFactorHundredths')).toBe(125);
    const reset = applyRunWindowEffectsV2(soldV6, 'round-end', {
      eventContext: {
        eventFacts: { kind: 'blind-result', position: 'boss', defeated: true },
        eventCardIdentities: {},
      },
    });
    expect(reset.ok).toBe(true);
    if (!reset.ok) return;
    expect(abilityV6(asV6(reset.state), 105, 'multFactorHundredths')).toBe(100);
  });

  it('J107 只在四分之一阈值保命，自毁并留下免基础赏金凭据', () => {
    const state = acquireV6(initialV6('j107-survival'), 107);
    const survived = applyRunWindowEffectsV2(state, 'blind-survival', {
      eventContext: {
        eventFacts: {
          kind: 'blind-survival',
          score: 25,
          targetScore: 100,
          deckExhausted: false,
        },
        eventCardIdentities: {},
      },
    });
    expect(survived.ok).toBe(true);
    if (!survived.ok) return;
    expect(
      survived.state.inventory.jokers.some(
        ({ contentId }) => contentId === 'bxqp:joker:107',
      ),
    ).toBe(false);
    expect(survived.state.history.effectObservations).toContainEqual(
      expect.objectContaining({ key: 'blind-survival-base-reward-zero' }),
    );
  });

  it('J107 不响应抽牌耗尽，真实命令直接失败且不自毁', () => {
    const source = acquireV6(initialV6('j107-deck-exhaustion-window'), 107);
    const bypassed = applyRunWindowEffectsV2(source, 'blind-survival', {
      eventContext: {
        eventFacts: {
          kind: 'blind-survival',
          score: 25,
          targetScore: 100,
          deckExhausted: true,
        },
        eventCardIdentities: {},
      },
    });
    expect(bypassed.ok).toBe(true);
    if (!bypassed.ok) return;
    expect(
      bypassed.state.inventory.jokers.some(
        ({ contentId }) => contentId === 'bxqp:joker:107',
      ),
    ).toBe(true);
    expect(
      bypassed.state.history.effectObservations.some(
        ({ key }) => key === 'blind-survival-base-reward-zero',
      ),
    ).toBe(false);

    let state = commandV6(acquireV6(initialV6('j107-deck-exhaustion-command'), 107), {
      type: 'select-blind',
      position: 'small',
    });
    const cardId = state.round!.handIds[0]!;
    state = {
      ...state,
      round: {
        ...state.round!,
        targetScore: 100_000,
        score: 25_000,
        handsRemaining: 2,
        drawPileIds: [],
        handIds: [cardId],
        selectedCardIds: [cardId],
      },
    };
    const lost = commandV6(state, { type: 'play-selected' });
    expect(lost.phase.kind).toBe('run-lost');
    expect(lost.result?.reason).toBe('抽牌堆耗尽且未达到盲注目标');
    expect(
      lost.inventory.jokers.some(({ contentId }) => contentId === 'bxqp:joker:107'),
    ).toBe(true);
  });

  it('J110 使用其他奇牌当前售价总和，不计算自己', () => {
    let state = acquireV6(initialV6('j110-sale-sum'), 110);
    state = acquireV6(state, 101);
    const other = state.inventory.jokers.find(
      ({ contentId }) => contentId === 'bxqp:joker:101',
    )!;
    const expected = saleValue(
      other.baseCost,
      other.editionCost,
      state.rules.priceDiscountBasisPoints,
      other.sellValueOverride,
    );
    const card = v6Card('j110-card', 'clubs', '3');
    const result = scoreV6(state, [card]);
    const control = scoreV6(withoutJokersV6(state), [card]);
    expect(result.breakdown.multiplier - control.breakdown.multiplier).toBe(expected);
  });

  it('J111/J113/J114/J115 分别进入资源、花色、历史与首牌重演', () => {
    let state = acquireV6(initialV6('j111-115'), 111);
    state = acquireV6(state, 113);
    state = acquireV6(state, 114);
    state = acquireV6(state, 115);
    state = {
      ...state,
      history: {
        ...state.history,
        skippedBlindIds: ['skip-a', 'skip-b'],
      },
    };
    const passives = resolveJokerPassiveCapabilities(state);
    expect(passives).toMatchObject({
      ok: true,
      capabilities: {
        handSizeDelta: 2,
        handsPerRoundDelta: -1,
        suitColorEquivalence: true,
      },
    });
    const cards = [
      v6Card('color-a', 'hearts', '2'),
      v6Card('color-b', 'diamonds', '4'),
      v6Card('color-c', 'hearts', '6'),
      v6Card('color-d', 'diamonds', '8'),
      v6Card('color-e', 'hearts', '10'),
    ];
    const result = scoreV6(state, cards);
    expect(result.breakdown.handType).toBe('flush');
    expect(
      result.breakdown.trace.filter((line) => line.startsWith('retrigger:')),
    ).toHaveLength(2);
    expect(result.breakdown.multiplier).toBeGreaterThan(0);

    const started = commandV6(state, { type: 'select-blind', position: 'small' });
    expect(started.round?.handsRemaining).toBe(state.rules.handsPerRound - 1);
    expect(started.round?.handIds).toHaveLength(state.rules.handSize + 2);
  });

  it('J112 每个来源在回合开始生成一张随机封印牌并强制入手', () => {
    const state = acquireV6(initialV6('j112-sealed'), 112);
    const deckSize = state.deck.cards.length;
    const started = commandV6(state, { type: 'select-blind', position: 'small' });
    const created = started.deck.cards.filter((card) =>
      card.id.includes('playing:sealed'),
    );
    expect(started.deck.cards).toHaveLength(deckSize + 1);
    expect(created).toHaveLength(1);
    expect(created[0]?.sealId).toMatch(/^bxqp:seal:/);
    expect(started.round?.handIds).toContain(created[0]?.id);
  });
});
