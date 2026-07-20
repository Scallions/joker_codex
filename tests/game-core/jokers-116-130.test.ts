import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { destroyPlayingCardsV6 } from '../../src/game-core/effects/playingCardDestructionV6';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { applyRunWindowEffectsV2 } from '../../src/game-core/effects/runWindowV2';
import {
  createShopV2,
  materializePackOptionsV2,
} from '../../src/game-core/economy/shopV2';
import type { RunStateV2 } from '../../src/game-core/model/runV2';
import { isRunStateV6, type RunStateV6 } from '../../src/game-core/model/runV6';
import { projectEffectivePlayingCardV3 } from '../../src/game-core/poker/effectiveCardV3';
import { materializeBlind } from '../../src/game-core/rules/ante';
import { resolveJokerPassiveCapabilities } from '../../src/game-core/rules/jokerPassiveCapabilitiesV3';
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

function acquireContentV6(state: RunStateV6, contentId: string): RunStateV6 {
  const result = acquireContentByIdV3(state, contentId, `test:${contentId}`);
  if (!result.ok || !isRunStateV6(result.state)) {
    throw new Error(result.ok ? '获得内容后没有保持 V6' : result.message);
  }
  return result.state;
}

function bossReadyV6(state: RunStateV6, referenceIndex: string): RunStateV6 {
  const row = PRODUCTION_CATALOG.rows.find(
    (candidate) =>
      candidate.family === 'blind' && candidate.referenceIndex === referenceIndex,
  );
  const blind = state.content.blinds.find(({ id }) => id === row?.id);
  if (!blind) throw new Error(`缺少班主盲注 ${referenceIndex}`);
  return {
    ...state,
    progress: {
      ...state.progress,
      blindPosition: 'boss',
      lineup: { ...state.progress.lineup, boss: materializeBlind(blind) },
    },
  };
}

describe('奇牌 J116-J130 执行合约', () => {
  it('J116/J117/J118/J119 分别结算花色戏票、概率倍率、筹码和倍率', () => {
    const diamond = v6Card('j116-diamond', 'diamonds', 'ace');
    let diamondState = acquireV6(initialV6('j116'), 116);
    diamondState = {
      ...diamondState,
      deck: { cards: [...diamondState.deck.cards, diamond] },
    };
    expect(scoreV6(diamondState, [diamond]).moneyDelta).toBe(1);

    let heartState = acquireV6(initialV6('j117'), 117);
    heartState = acquireV6(heartState, 126);
    const heart = v6Card('j117-heart', 'hearts', 'ace');
    const heartControl = scoreV6(withoutJokersV6(heartState), [heart]);
    const heartResult = scoreV6(heartState, [heart]);
    expect(heartResult.breakdown.multiplier).toBe(
      heartControl.breakdown.multiplier * 1.5,
    );

    const spade = v6Card('j118-spade', 'spades', 'ace');
    const spadeState = acquireV6(initialV6('j118'), 118);
    const spadeControl = scoreV6(withoutJokersV6(spadeState), [spade]);
    expect(
      scoreV6(spadeState, [spade]).breakdown.cardChips - spadeControl.breakdown.cardChips,
    ).toBe(50);

    const club = v6Card('j119-club', 'clubs', 'ace');
    const clubState = acquireV6(initialV6('j119'), 119);
    const clubControl = scoreV6(withoutJokersV6(clubState), [club]);
    expect(
      scoreV6(clubState, [club]).breakdown.multiplier - clubControl.breakdown.multiplier,
    ).toBe(7);
  });

  it('J120 只读取统一摧毁事务冻结的碎璃身份并影响下一次计分', () => {
    let state = acquireV6(initialV6('j120'), 120);
    const target = state.deck.cards[0]!;
    state = {
      ...state,
      deck: {
        cards: state.deck.cards.map((card) =>
          card.id === target.id
            ? { ...card, enhancementId: 'bxqp:enhancement:glass-ribbon' }
            : card,
        ),
      },
      modifiersV3: {
        ...state.modifiersV3,
        playingCards: state.modifiersV3.playingCards.map((modifier) =>
          modifier.cardId === target.id
            ? { ...modifier, enhancementId: 'bxqp:enhancement:glass-ribbon' }
            : modifier,
        ),
      },
    };
    const destroyed = destroyPlayingCardsV6(state, [target.id], 'test-glass');
    expect(destroyed.ok).toBe(true);
    if (!destroyed.ok) return;
    const next = asV6(destroyed.state);
    expect(abilityV6(next, 120, 'multFactorHundredths')).toBe(175);
    expect(next.deck.cards.some(({ id }) => id === target.id)).toBe(false);

    const card = v6Card('j120-score', 'clubs', 'ace');
    const control = scoreV6(withoutJokersV6(next), [card]);
    expect(scoreV6(next, [card]).breakdown.multiplier).toBe(
      control.breakdown.multiplier * 1.75,
    );
  });

  it('J121/J125/J126 的规则均由当前活跃被动投影', () => {
    let state = acquireV6(initialV6('j121-126-passives'), 121);
    state = acquireV6(state, 125);
    state = acquireV6(state, 126);
    expect(resolveJokerPassiveCapabilities(state)).toMatchObject({
      ok: true,
      capabilities: {
        duplicateShopFamilies: true,
        discardsPerRoundDelta: 3,
        handSizeDelta: -1,
        listedChancePower: 1,
      },
    });
    state = {
      ...state,
      inventory: {
        ...state.inventory,
        jokers: state.inventory.jokers.map((joker) => ({ ...joker, debuffed: true })),
      },
    };
    expect(resolveJokerPassiveCapabilities(state)).toMatchObject({
      ok: true,
      capabilities: {
        duplicateShopFamilies: false,
        discardsPerRoundDelta: 0,
        handSizeDelta: 0,
        listedChancePower: 0,
      },
    });
  });

  it('J121 只在当前活跃时允许夜市与牌包重复已持有和同批展示内容', () => {
    const seed = initialV6('j121-materialization');
    const tarot = seed.content.items.find(
      (item) => item.kind === 'consumable' && item.family === 'tarot',
    );
    const arcana = seed.content.packs.find((pack) => pack.family === 'arcana');
    if (!tarot || tarot.kind !== 'consumable' || !arcana) {
      throw new Error('缺少 J121 物化测试内容');
    }
    const restrictPool = (state: RunStateV6): RunStateV6 => ({
      ...state,
      content: { ...state.content, items: [tarot] },
    });

    const ordinary = restrictPool(acquireContentV6(seed, tarot.contentId));
    expect(
      materializePackOptionsV2(ordinary, arcana, 'j121:ordinary-pack', ordinary.rngState)
        .items,
    ).toEqual([]);
    const ordinaryShop = createShopV2(ordinary);
    expect(ordinaryShop.ok && ordinaryShop.shop.cardOffers).toHaveLength(0);

    const active = restrictPool(acquireContentV6(acquireV6(seed, 121), tarot.contentId));
    const activePack = materializePackOptionsV2(
      active,
      arcana,
      'j121:active-pack',
      active.rngState,
    );
    expect(activePack.items).toHaveLength(arcana.optionCount);
    expect(activePack.items.every(({ contentId }) => contentId === tarot.contentId)).toBe(
      true,
    );
    const activeShop = createShopV2(active);
    expect(activeShop.ok && activeShop.shop.cardOffers).toHaveLength(
      active.rules.cardOfferSlots,
    );

    const debuffed = {
      ...active,
      inventory: {
        ...active.inventory,
        jokers: active.inventory.jokers.map((joker) => ({ ...joker, debuffed: true })),
      },
    };
    expect(
      materializePackOptionsV2(debuffed, arcana, 'j121:debuffed-pack', debuffed.rngState)
        .items,
    ).toEqual([]);
    expect(activePack.items).toHaveLength(arcana.optionCount);
  });

  it('J122 要求四张不同计分牌完成四色分配', () => {
    const cards = [
      v6Card('j122-heart', 'hearts', '7'),
      v6Card('j122-diamond', 'diamonds', '7'),
      v6Card('j122-club', 'clubs', '7'),
      v6Card('j122-spade', 'spades', '7'),
    ];
    const state = acquireV6(initialV6('j122'), 122);
    const control = scoreV6(withoutJokersV6(state), cards);
    expect(scoreV6(state, cards).breakdown.multiplier).toBe(
      control.breakdown.multiplier * 3,
    );
  });

  it('J124 先按当前牌成长，再在同一手输出新筹码值', () => {
    const state = acquireV6(initialV6('j124'), 124);
    const card = v6Card('j124-two', 'spades', '2');
    const control = scoreV6(withoutJokersV6(state), [card]);
    const result = scoreV6(state, [card]);
    expect(result.breakdown.cardChips - control.breakdown.cardChips).toBe(8);
    expect(abilityV6(result.proposedState, 124, 'storedChips')).toBe(8);
  });

  it('J127 使用冻结的目标点数与花色逐张倍乘', () => {
    let state = acquireV6(initialV6('j127'), 127);
    const card = v6Card('j127-target', 'diamonds', 'queen');
    state = {
      ...state,
      jokerRuntimeV6: {
        ...state.jokerRuntimeV6,
        idolTargetRank: 'queen',
        idolTargetSuit: 'diamonds',
      },
    };
    const control = scoreV6(withoutJokersV6(state), [card]);
    expect(scoreV6(state, [card]).breakdown.multiplier).toBe(
      control.breakdown.multiplier * 2,
    );
  });

  it('J128 的梅花与非梅花必须由两张不同计分牌承担', () => {
    const state = acquireV6(initialV6('j128'), 128);
    const pair = [v6Card('j128-club', 'clubs', '8'), v6Card('j128-heart', 'hearts', '8')];
    const control = scoreV6(withoutJokersV6(state), pair);
    expect(scoreV6(state, pair).breakdown.multiplier).toBe(
      control.breakdown.multiplier * 2,
    );
    const singleton = [v6Card('j128-only-club', 'clubs', 'ace')];
    expect(scoreV6(state, singleton).breakdown.multiplier).toBe(
      scoreV6(withoutJokersV6(state), singleton).breakdown.multiplier,
    );
  });

  it('J129 仅在收到真实班主能力事件时支付 8 戏票', () => {
    const state = acquireV6(initialV6('j129'), 129);
    const applied = applyRunWindowEffectsV2(state, 'boss-ability-triggered', {
      eventContext: {
        eventFacts: {
          kind: 'boss-ability-triggered',
          bossId: 'bxqp:blind:test',
          ruleIds: ['test-rule'],
          affectedCardIds: [],
        },
        eventCardIdentities: {},
      },
    });
    expect(applied.ok).toBe(true);
    if (!applied.ok) return;
    expect(applied.state.economy.money - state.economy.money).toBe(8);
  });

  it('J129 只在真实出牌命中启用的班主规则时支付，J149 会完全抑制', () => {
    let active = bossReadyV6(acquireV6(initialV6('j129-real-boss'), 129), 'B09');
    active = commandV6(active, { type: 'select-blind', position: 'boss' });
    const club = active.deck.cards.find(({ suit }) => suit === 'clubs')!;
    const heart = active.deck.cards.find(({ suit }) => suit === 'hearts')!;
    const triggered = scoreV6(active, [club]);
    expect(triggered.proposedState.economy.money - active.economy.money).toBe(8);
    expect(
      triggered.breakdown.trace.some((line) => line.startsWith('boss-ability:')),
    ).toBe(true);
    const notTriggered = scoreV6(active, [heart]);
    expect(notTriggered.proposedState.economy.money - active.economy.money).toBe(0);
    expect(
      notTriggered.breakdown.trace.some((line) => line.startsWith('boss-ability:')),
    ).toBe(false);

    let suppressed = bossReadyV6(
      acquireV6(acquireV6(initialV6('j129-suppressed'), 129), 149),
      'B09',
    );
    suppressed = commandV6(suppressed, { type: 'select-blind', position: 'boss' });
    const suppressedClub = suppressed.deck.cards.find(({ suit }) => suit === 'clubs')!;
    const result = scoreV6(suppressed, [suppressedClub]);
    expect(result.proposedState.economy.money - suppressed.economy.money).toBe(0);
    expect(result.breakdown.trace.some((line) => line.startsWith('boss-ability:'))).toBe(
      false,
    );
  });

  it('J130 按非失效 J 弃牌数量成长并在回合开始重置', () => {
    let state = acquireV6(initialV6('j130'), 130);
    const jackA = v6Card('j130-a', 'clubs', 'jack');
    const jackB = v6Card('j130-b', 'hearts', 'jack');
    const discarded = applyRunWindowEffectsV2(state, 'discard', {
      eventContext: {
        eventFacts: {
          kind: 'discard',
          discardedCardIds: [jackA.id, jackB.id],
          firstDiscardOfRound: true,
          forced: false,
          discardedHandType: 'pair',
        },
        eventCardIdentities: {
          [jackA.id]: projectEffectivePlayingCardV3(state, jackA),
          [jackB.id]: projectEffectivePlayingCardV3(state, jackB),
        },
      },
    });
    expect(discarded.ok).toBe(true);
    if (!discarded.ok) return;
    state = asV6(discarded.state);
    expect(abilityV6(state, 130, 'multFactorHundredths')).toBe(200);

    const reset = applyRunWindowEffectsV2(state, 'round-start');
    expect(reset.ok).toBe(true);
    if (!reset.ok) return;
    expect(abilityV6(asV6(reset.state), 130, 'multFactorHundredths')).toBe(100);
  });
});
