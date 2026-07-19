import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV4 } from '../../src/content/runtime/runSetupV4';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { applyRunWindowEffectsV2 } from '../../src/game-core/effects/runWindowV2';
import { resolveHandScoreV2 } from '../../src/game-core/effects/scoreHandV2';
import { saleValue } from '../../src/game-core/economy/pricing';
import type { CardId } from '../../src/game-core/model/ids';
import type { RunPlayingCard } from '../../src/game-core/model/runV2';
import { isRunStateV4, type RunStateV4 } from '../../src/game-core/model/runV4';

function card(
  id: string,
  suit: RunPlayingCard['suit'],
  rank: RunPlayingCard['rank'],
  enhancementId: string | null = null,
): RunPlayingCard {
  return {
    id: `j041-050:${id}` as CardId,
    suit,
    rank,
    enhancementId,
    sealId: null,
    editionId: null,
    bonusChips: 0,
  };
}

function base(seed: string): RunStateV4 {
  return createProductionRunV4(PRODUCTION_CATALOG, { seed });
}

function acquire(state: RunStateV4, ordinal: number, suffix = ''): RunStateV4 {
  const id = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const result = acquireContentByIdV3(state, id, `row:${ordinal}:${suffix}`);
  if (!result.ok || !isRunStateV4(result.state)) {
    throw new Error(result.ok ? '没有保持 V4' : result.message);
  }
  return result.state;
}

function selectBlind(state: RunStateV4): RunStateV4 {
  const result = executeCommandV2(state, {
    type: 'select-blind',
    checkpointId: state.checkpointId,
    position: 'small',
  });
  if (!result.ok || !isRunStateV4(result.state)) {
    throw new Error(result.ok ? '没有保持 V4' : result.rejection.message);
  }
  return result.state;
}

function score(state: RunStateV4, cards: readonly RunPlayingCard[]) {
  const result = resolveHandScoreV2(state, cards);
  if (!result.ok) throw new Error(result.message);
  if (!isRunStateV4(result.proposedState)) throw new Error('计分提案没有保持 V4');
  return { ...result, proposedState: result.proposedState };
}

function withoutJokers(state: RunStateV4): RunStateV4 {
  return {
    ...state,
    inventory: { ...state.inventory, jokers: [] },
    modifiersV3: { ...state.modifiersV3, jokers: [] },
  };
}

function ability(state: RunStateV4, contentId: string, key: string): number {
  const instance = state.inventory.jokers.find((joker) => joker.contentId === contentId);
  const value = state.modifiersV3.jokers.find(
    (modifier) => modifier.instanceId === instance?.instanceId,
  )?.abilityState[key];
  if (typeof value !== 'number') throw new Error(`缺少能力状态：${contentId}.${key}`);
  return value;
}

describe('奇牌 J041-J050', () => {
  it('J041 每张计分 A 依次给予 +20 筹码与 +4 倍率', () => {
    const played = [card('j41', 'spades', 'ace')];
    const state = acquire(base('j041-ordered-output'), 41);
    const control = score(withoutJokers(state), played).breakdown;
    const result = score(state, played).breakdown;

    expect(result.cardChips - control.cardChips).toBe(20);
    expect(result.multiplier - control.multiplier).toBe(4);
    const chipsIndex = result.trace.findIndex((entry) => entry.endsWith(':chips:20'));
    const multIndex = result.trace.findIndex((entry) => entry.endsWith(':mult:4'));
    expect(chipsIndex).toBeGreaterThanOrEqual(0);
    expect(multIndex).toBeGreaterThan(chipsIndex);
  });

  it('J042 对每张有效花牌独立掷 1/2，成功时每次获得 2 戏票', () => {
    const face = [card('j42', 'hearts', 'queen')];
    const outcomes = Array.from({ length: 48 }, (_, index) =>
      score(acquire(base(`j042-face:${index}`), 42), face),
    );

    expect(outcomes.every(({ modifierRolls }) => modifierRolls.length === 1)).toBe(true);
    expect(new Set(outcomes.map(({ moneyDelta }) => moneyDelta))).toEqual(
      new Set([0, 2]),
    );

    const number = score(acquire(base('j042-number'), 42), [
      card('j42-number', 'hearts', '6'),
    ]);
    expect(number.moneyDelta).toBe(0);
    expect(number.modifierRolls).toHaveLength(0);
  });

  it('J043 追溯本局同牌型历史并包含当前手', () => {
    let state = acquire(base('j043-history'), 43);
    state = {
      ...state,
      history: {
        ...state.history,
        playedHandTypes: ['high-card', 'pair', 'high-card', 'high-card'],
      },
    };
    const played = [card('j43', 'clubs', '2')];
    const control = score(withoutJokers(state), played).breakdown.multiplier;
    expect(score(state, played).breakdown.multiplier - control).toBe(4);
  });

  it('J044 在输出前按有效计分花牌重置或成长存储倍率', () => {
    const state = acquire(base('j044-state-before-output'), 44);
    const number = [card('j44-number', 'clubs', '6')];
    const first = score(state, number);
    expect(ability(first.proposedState, 'bxqp:joker:044', 'storedMult')).toBe(1);
    expect(
      first.breakdown.multiplier -
        score(withoutJokers(state), number).breakdown.multiplier,
    ).toBe(1);

    const second = score(first.proposedState, number);
    expect(ability(second.proposedState, 'bxqp:joker:044', 'storedMult')).toBe(2);
    expect(
      second.breakdown.multiplier -
        score(withoutJokers(first.proposedState), number).breakdown.multiplier,
    ).toBe(2);

    const face = [card('j44-face', 'clubs', 'king')];
    const reset = score(second.proposedState, face);
    expect(ability(reset.proposedState, 'bxqp:joker:044', 'storedMult')).toBe(0);
    expect(
      reset.breakdown.multiplier -
        score(withoutJokers(second.proposedState), face).breakdown.multiplier,
    ).toBe(0);
  });

  it('J045 的成功检定在基础值读取前永久升级当前牌型', () => {
    const played = [card('j45', 'diamonds', '7')];
    const outcomes = Array.from({ length: 64 }, (_, index) =>
      score(acquire(base(`j045-level:${index}`), 45), played),
    );
    const success = outcomes.find(({ breakdown }) => breakdown.handLevel === 2);
    const miss = outcomes.find(({ breakdown }) => breakdown.handLevel === 1);

    expect(success).toBeDefined();
    expect(miss).toBeDefined();
    expect(success?.proposedState.rules.handLevels['high-card']).toBe(2);
    expect(success?.breakdown.baseChips).toBeGreaterThan(miss!.breakdown.baseChips);
    expect(outcomes.every(({ modifierRolls }) => modifierRolls.length === 1)).toBe(true);
  });

  it('J046 回合结束后以当前出售价值为基准永久增加 3', () => {
    let state = selectBlind(acquire(base('j046-sell-growth'), 46));
    const owned = state.inventory.jokers.find(
      ({ contentId }) => contentId === 'bxqp:joker:046',
    )!;
    const before = saleValue(
      owned.baseCost,
      owned.editionCost,
      state.rules.priceDiscountBasisPoints,
      owned.sellValueOverride,
    );
    const cardId = state.round!.handIds[0]!;
    state = {
      ...state,
      round: { ...state.round!, targetScore: 1, selectedCardIds: [cardId] },
    };
    const played = executeCommandV2(state, {
      type: 'play-selected',
      checkpointId: state.checkpointId,
    });

    expect(played.ok).toBe(true);
    if (!played.ok) return;
    const grown = played.state.inventory.jokers.find(
      ({ contentId }) => contentId === 'bxqp:joker:046',
    )!;
    expect(grown.sellValueOverride).toBe(before + 3);
  });

  it('J047 选择盲注时先增加 3 次出牌，再把弃牌设为 0', () => {
    const control = selectBlind(base('j047-resources'));
    const result = selectBlind(acquire(base('j047-resources'), 47));

    expect(result.round?.handsRemaining).toBe(control.round!.handsRemaining + 3);
    expect(result.round?.discardsRemaining).toBe(0);
  });

  it('J048 对全黑留手、空留手与百搭留手成立，但石面留手失败', () => {
    const played = card('j48-played', 'hearts', '2');
    const held = card('j48-held', 'clubs', '7');
    const wild = card('j48-wild', 'hearts', '7', 'bxqp:enhancement:four-winds');
    const stone = card('j48-stone', 'spades', '7', 'bxqp:enhancement:stone-mask');
    const initial = acquire(selectBlind(base('j048-held-suits')), 48);
    const prepare = (heldCards: readonly RunPlayingCard[]): RunStateV4 => ({
      ...initial,
      deck: { cards: [played, ...heldCards] },
      round: {
        ...initial.round!,
        handIds: [played.id, ...heldCards.map(({ id }) => id)],
      },
      modifiersV3: {
        ...initial.modifiersV3,
        playingCards: heldCards.map((entry) => ({
          cardId: entry.id,
          enhancementId: entry.enhancementId,
          sealId: entry.sealId,
          editionId: entry.editionId,
          stickerIds: [],
          debuffed: false,
          perishableRoundsRemaining: null,
          rentalCostPerRound: 0,
          slotContribution: 0,
          saleAllowed: false,
        })),
      },
    });
    const factor = (heldCards: readonly RunPlayingCard[]) => {
      const state = prepare(heldCards);
      const control = score(withoutJokers(state), [played]).breakdown.multiplier;
      return score(state, [played]).breakdown.multiplier / control;
    };

    expect(factor([held])).toBe(3);
    expect(factor([])).toBe(3);
    expect(factor([wild])).toBe(3);
    expect(factor([stone])).toBe(1);
  });

  it('J049 先按顺子成长 15 存储筹码，再输出成长后的数值', () => {
    const straight = ['2', '3', '4', '5', '6'].map((rank, index) =>
      card(
        `j49-${rank}`,
        ['clubs', 'hearts', 'diamonds', 'spades', 'clubs'][
          index
        ] as RunPlayingCard['suit'],
        rank as RunPlayingCard['rank'],
      ),
    );
    const state = acquire(base('j049-growth'), 49);
    const first = score(state, straight);
    expect(ability(first.proposedState, 'bxqp:joker:049', 'storedChips')).toBe(15);
    expect(
      first.breakdown.cardChips -
        score(withoutJokers(state), straight).breakdown.cardChips,
    ).toBe(15);
    const second = score(first.proposedState, straight);
    expect(ability(second.proposedState, 'bxqp:joker:049', 'storedChips')).toBe(30);
  });

  it('J050 输出剩余筹码；每手后减 5，归零时无出售收益自毁', () => {
    let state = acquire(base('j050-burnout'), 50);
    const played = [card('j50', 'clubs', '2')];
    const control = score(withoutJokers(state), played).breakdown.cardChips;
    expect(score(state, played).breakdown.cardChips - control).toBe(100);

    const instance = state.inventory.jokers.find(
      ({ contentId }) => contentId === 'bxqp:joker:050',
    )!;
    state = {
      ...state,
      modifiersV3: {
        ...state.modifiersV3,
        jokers: state.modifiersV3.jokers.map((modifier) =>
          modifier.instanceId === instance.instanceId
            ? {
                ...modifier,
                abilityState: { ...modifier.abilityState, remainingChips: 5 },
              }
            : modifier,
        ),
      },
    };
    const moneyBefore = state.economy.money;
    const afterHand = applyRunWindowEffectsV2(state, 'after-hand');
    expect(afterHand.ok).toBe(true);
    if (!afterHand.ok || !isRunStateV4(afterHand.state)) return;
    expect(afterHand.state.inventory.jokers).not.toContainEqual(
      expect.objectContaining({ contentId: 'bxqp:joker:050' }),
    );
    expect(afterHand.state.economy.money).toBe(moneyBefore);
  });
});
