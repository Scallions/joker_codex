import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV4 } from '../../src/content/runtime/runSetupV4';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { resolveHandScoreV2 } from '../../src/game-core/effects/scoreHandV2';
import type { CardId } from '../../src/game-core/model/ids';
import type { RunPlayingCard } from '../../src/game-core/model/runV2';
import { isRunStateV4, type RunStateV4 } from '../../src/game-core/model/runV4';
import { saleValue } from '../../src/game-core/economy/pricing';

function card(
  id: string,
  suit: RunPlayingCard['suit'],
  rank: RunPlayingCard['rank'],
): RunPlayingCard {
  return {
    id: `j021-030:${id}` as CardId,
    suit,
    rank,
    enhancementId: null,
    sealId: null,
    editionId: null,
    bonusChips: 0,
  };
}

function acquire(state: RunStateV4, ordinal: number, suffix = ''): RunStateV4 {
  const id = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const result = acquireContentByIdV3(state, id, `row:${ordinal}:${suffix}`);
  if (!result.ok || !isRunStateV4(result.state)) {
    throw new Error(result.ok ? '没有保持 V4' : result.message);
  }
  return result.state;
}

function roundRun(seed: string): RunStateV4 {
  const initial = createProductionRunV4(PRODUCTION_CATALOG, { seed });
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

function score(state: RunStateV4, cards: readonly RunPlayingCard[]) {
  const result = resolveHandScoreV2(state, cards);
  if (!result.ok) throw new Error(result.message);
  return result;
}

describe('奇牌 J021-J030', () => {
  it('J021 只销毁紧邻右侧可销毁奇牌，并原子加入其出售价值两倍', () => {
    let initial = createProductionRunV4(PRODUCTION_CATALOG, { seed: 'j021-grow' });
    initial = acquire(initial, 21);
    initial = acquire(initial, 1);
    const target = initial.inventory.jokers[1]!;
    const expected =
      saleValue(
        target.baseCost,
        target.editionCost,
        initial.rules.priceDiscountBasisPoints,
        target.sellValueOverride,
      ) * 2;
    const selected = executeCommandV2(initial, {
      type: 'select-blind',
      checkpointId: initial.checkpointId,
      position: 'small',
    });

    expect(selected.ok).toBe(true);
    if (!selected.ok || !isRunStateV4(selected.state)) return;
    expect(selected.state.inventory.jokers).toHaveLength(1);
    expect(selected.state.inventory.jokers[0]?.contentId).toBe('bxqp:joker:021');
    expect(selected.state.modifiersV3.jokers[0]?.abilityState).toEqual({
      storedMult: expected,
    });
    const played = [
      selected.state.deck.cards.find(
        ({ id }) => id === selected.state.round?.handIds[0],
      )!,
    ];
    const without = score(roundRun('j021-score-control'), played).breakdown.multiplier;
    expect(score(selected.state, played).breakdown.multiplier - without).toBe(expected);
  });

  it('J021 面对永久右邻时既不销毁也不成长', () => {
    let initial = createProductionRunV4(PRODUCTION_CATALOG, {
      seed: 'j021-permanent-boundary',
    });
    initial = acquire(initial, 21);
    initial = acquire(initial, 1);
    const targetId = initial.inventory.jokers[1]!.instanceId;
    initial = {
      ...initial,
      modifiersV3: {
        ...initial.modifiersV3,
        jokers: initial.modifiersV3.jokers.map((modifier) =>
          modifier.instanceId === targetId
            ? {
                ...modifier,
                stickerIds: ['bxqp:sticker:permanent'],
                saleAllowed: false,
              }
            : modifier,
        ),
      },
    };
    const selected = executeCommandV2(initial, {
      type: 'select-blind',
      checkpointId: initial.checkpointId,
      position: 'small',
    });

    expect(selected.ok).toBe(true);
    if (!selected.ok || !isRunStateV4(selected.state)) return;
    expect(selected.state.inventory.jokers).toHaveLength(2);
    expect(selected.state.modifiersV3.jokers[0]?.abilityState).toEqual({
      storedMult: 0,
    });
  });

  it('J022/J023/J025/J027/J028 使用共享动态值、历史、随机与立即重演', () => {
    const one = [card('one', 'clubs', '2')];
    const base = roundRun('j022-028-base');
    const baseline = score(base, one).breakdown;

    const j022 = acquire(base, 22);
    expect(score(j022, one).breakdown.cardChips - baseline.cardChips).toBe(
      base.round!.discardsRemaining * 30,
    );

    const zeroDiscards = {
      ...acquire(base, 23),
      round: { ...base.round!, discardsRemaining: 0 },
    };
    expect(score(zeroDiscards, one).breakdown.multiplier - baseline.multiplier).toBe(15);

    const sixth: RunStateV4 = {
      ...acquire(base, 25),
      history: {
        ...base.history,
        playedHandTypes: Array.from({ length: 5 }, () => 'high-card' as const),
      },
    };
    expect(score(sixth, one).breakdown.multiplier).toBe(baseline.multiplier * 4);

    const random = score(acquire(base, 27), one);
    expect(random.modifierRolls).toHaveLength(1);
    expect(random.breakdown.multiplier - baseline.multiplier).toBeGreaterThanOrEqual(0);
    expect(random.breakdown.multiplier - baseline.multiplier).toBeLessThanOrEqual(23);

    const finalHand: RunStateV4 = {
      ...acquire(base, 28),
      round: { ...base.round!, handsRemaining: 1 },
    };
    expect(score(finalHand, one).breakdown.cardChips).toBe(baseline.cardChips * 2);
  });

  it('J024 选盲后新增一张固定石面戏牌，且本回合只能进入弃牌区', () => {
    let initial = createProductionRunV4(PRODUCTION_CATALOG, {
      seed: 'j024-create-stone',
    });
    initial = acquire(initial, 24);
    const beforeIds = new Set(initial.deck.cards.map(({ id }) => id));
    const selected = executeCommandV2(initial, {
      type: 'select-blind',
      checkpointId: initial.checkpointId,
      position: 'small',
    });

    expect(selected.ok).toBe(true);
    if (!selected.ok || !isRunStateV4(selected.state) || !selected.state.round) return;
    const created = selected.state.deck.cards.filter(({ id }) => !beforeIds.has(id));
    expect(created).toHaveLength(1);
    expect(created[0]?.enhancementId).toBe('bxqp:enhancement:stone-mask');
    expect(selected.state.round.discardPileIds).toContain(created[0]!.id);
    expect(selected.state.round.handIds).not.toContain(created[0]!.id);
    expect(selected.state.round.drawPileIds).not.toContain(created[0]!.id);
  });

  it('J026 每个计分 8 先检查容量再独立掷骰，成功提案原子生成纸戏牌', () => {
    const eight = [card('eight', 'diamonds', '8')];
    const outcomes = Array.from({ length: 48 }, (_, index) => {
      const state = acquire(roundRun(`j026-chance:${index}`), 26);
      return score(state, eight);
    });
    expect(outcomes.every(({ modifierRolls }) => modifierRolls.length === 1)).toBe(true);
    const success = outcomes.find(
      ({ proposedState }) => proposedState.inventory.consumables.length === 1,
    );
    expect(success).toBeDefined();
    expect(success?.proposedState.inventory.consumables[0]?.contentId).toMatch(
      /^bxqp:tarot:/,
    );

    const full = acquire(roundRun('j026-full-capacity'), 26);
    const filled: RunStateV4 = {
      ...full,
      inventory: {
        ...full.inventory,
        consumables: Array.from({ length: full.rules.consumableSlots }, (_, index) => ({
          instanceId: `fixture:consumable:${index}` as never,
          contentId: 'fixture:consumable',
          name: '占位',
          description: '占位',
          baseCost: 0,
          editionCost: 0,
          editionId: null,
          effects: [],
          targetKind: 'none' as const,
          minimumTargets: 0,
          maximumTargets: 0,
          sellValueOverride: null,
        })),
      },
    };
    const rejectedRoll = score(filled, eight);
    expect(rejectedRoll.modifierRolls).toHaveLength(0);
    expect(rejectedRoll.proposedState.inventory.consumables).toHaveLength(
      full.rules.consumableSlots,
    );
  });

  it('J029 选择当前手序最右的最低非石面牌并按每次留手结算输出', () => {
    let state = acquire(roundRun('j029-held-lowest'), 29);
    const playedId = state.round!.handIds[0]!;
    const leftId = state.round!.handIds[1]!;
    const rightId = state.round!.handIds[2]!;
    const heldIds = new Set(state.round!.handIds.slice(1));
    state = {
      ...state,
      deck: {
        cards: state.deck.cards.map((entry) =>
          entry.id === leftId || entry.id === rightId
            ? { ...entry, rank: '3' as const }
            : heldIds.has(entry.id)
              ? { ...entry, rank: 'king' as const }
              : entry,
        ),
      },
    };
    const played = [state.deck.cards.find(({ id }) => id === playedId)!];
    const control = score(
      { ...state, inventory: { ...state.inventory, jokers: [] } },
      played,
    ).breakdown.multiplier;
    expect(score(state, played).breakdown.multiplier - control).toBe(6);
  });
});
