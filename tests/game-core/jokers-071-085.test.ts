import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV5 } from '../../src/content/runtime/runSetupV5';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { resolveHandScoreV2 } from '../../src/game-core/effects/scoreHandV2';
import type { CardId } from '../../src/game-core/model/ids';
import type { RunPlayingCard } from '../../src/game-core/model/runV2';
import { isRunStateV5, type RunStateV5 } from '../../src/game-core/model/runV5';

function card(
  id: string,
  suit: RunPlayingCard['suit'],
  rank: RunPlayingCard['rank'],
): RunPlayingCard {
  return {
    id: `j071-085:${id}` as CardId,
    suit,
    rank,
    enhancementId: null,
    sealId: null,
    editionId: null,
    bonusChips: 0,
  };
}

function initial(seed: string): RunStateV5 {
  const state = createProductionRunV5(PRODUCTION_CATALOG, { seed });
  return { ...state, rules: { ...state.rules, jokerSlots: 12 } };
}

function acquire(
  state: RunStateV5,
  ordinal: number,
  suffix = String(state.inventory.jokers.length),
): RunStateV5 {
  const id = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const result = acquireContentByIdV3(state, id, `rows-071-085:${suffix}`);
  if (!result.ok || !isRunStateV5(result.state)) {
    throw new Error(result.ok ? '没有保持 V5' : result.message);
  }
  return result.state;
}

function selectSmall(state: RunStateV5): RunStateV5 {
  const result = executeCommandV2(state, {
    type: 'select-blind',
    checkpointId: state.checkpointId,
    position: 'small',
  });
  if (!result.ok || !isRunStateV5(result.state)) {
    throw new Error(result.ok ? '没有保持 V5' : result.rejection.message);
  }
  return result.state;
}

function score(state: RunStateV5, played: readonly RunPlayingCard[]) {
  const result = resolveHandScoreV2(state, played);
  if (!result.ok || !isRunStateV5(result.proposedState)) {
    throw new Error(result.ok ? '没有保持 V5' : result.message);
  }
  return { ...result, proposedState: result.proposedState };
}

function withoutJokers(state: RunStateV5): RunStateV5 {
  return {
    ...state,
    inventory: { ...state.inventory, jokers: [] },
    modifiersV3: { ...state.modifiersV3, jokers: [] },
  };
}

function ability(state: RunStateV5, ordinal: number, key: string): unknown {
  const id = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const source = state.inventory.jokers.find((joker) => joker.contentId === id);
  return state.modifiersV3.jokers.find(
    (modifier) => modifier.instanceId === source?.instanceId,
  )?.abilityState[key];
}

function patchHeldRanks(state: RunStateV5, playedId: CardId, faceId: CardId): RunStateV5 {
  return {
    ...state,
    deck: {
      cards: state.deck.cards.map((entry) =>
        entry.id === faceId
          ? { ...entry, rank: 'king' as const }
          : state.round?.handIds.includes(entry.id) && entry.id !== playedId
            ? { ...entry, rank: '2' as const }
            : entry.id === playedId
              ? { ...entry, rank: '3' as const }
              : entry,
      ),
    },
  };
}

describe('奇牌 J071-J085 补充执行合约', () => {
  it('J071 在入口钱不多于 4 且有容量时生成纸术牌，两个边界均不耗额外 RNG', () => {
    const played = [card('j71', 'clubs', '2')];
    let state = acquire(initial('j071-low-money'), 71);
    state = { ...state, economy: { ...state.economy, money: 4 } };
    expect(
      score(state, played).proposedState.inventory.consumables[0]?.contentId,
    ).toMatch(/^bxqp:tarot:/);

    const rich = { ...state, economy: { ...state.economy, money: 5 } };
    const richResult = score(rich, played).proposedState;
    expect(richResult.inventory.consumables).toHaveLength(0);
    expect(richResult.rngState).toEqual(rich.rngState);
    const full = { ...state, rules: { ...state.rules, consumableSlots: 0 } };
    const fullResult = score(full, played).proposedState;
    expect(fullResult.inventory.consumables).toHaveLength(0);
    expect(fullResult.rngState).toEqual(full.rngState);
  });

  it('J072 每张有效留手 K 每个 pass 给予 ×1.5，减益 K 不触发', () => {
    let state = selectSmall(acquire(initial('j072-held-king'), 72));
    const [playedId, heldId] = state.round!.handIds;
    if (!playedId || !heldId) throw new Error('缺少留手牌');
    state = patchHeldRanks(state, playedId, heldId);
    const played = state.deck.cards.filter((entry) => entry.id === playedId);
    const control = score(withoutJokers(state), played).breakdown.multiplier;
    expect(score(state, played).breakdown.multiplier / control).toBe(1.5);

    const debuffed: RunStateV5 = {
      ...state,
      modifiersV3: {
        ...state.modifiersV3,
        playingCards: state.modifiersV3.playingCards.map((modifier) =>
          modifier.cardId === heldId ? { ...modifier, debuffed: true } : modifier,
        ),
      },
    };
    expect(score(debuffed, played).breakdown.multiplier).toBe(control);
  });

  it('j075-global-tie-reset：全局并列最高牌型重置，非最高牌型先成长再用于当前手', () => {
    const high = [card('j75-high', 'clubs', '7')];
    let state = acquire(initial('j075-global-tie-reset'), 75);
    state = {
      ...state,
      history: {
        ...state.history,
        playedHandTypes: ['pair', 'pair', 'high-card'],
      },
    };
    const grown = score(state, high);
    expect(ability(grown.proposedState, 75, 'multFactorHundredths')).toBe(120);
    const control = score(withoutJokers(state), high).breakdown.multiplier;
    expect(grown.breakdown.multiplier / control).toBe(1.2);

    const pair = [card('j75-pair-a', 'clubs', '8'), card('j75-pair-b', 'hearts', '8')];
    const reset = score(grown.proposedState, pair);
    expect(ability(reset.proposedState, 75, 'multFactorHundredths')).toBe(100);
  });

  it('j078-first-face-retrigger：只选第一张有效计分花牌，同一张牌重演时再次 ×2', () => {
    const first = {
      ...card('j78-first', 'hearts', 'king'),
      sealId: 'bxqp:seal:echo-knot',
    };
    const second = card('j78-second', 'spades', 'queen');
    const state = acquire(initial('j078-first-face-retrigger'), 78);
    const result = score(state, [first, second]);
    const traces = result.breakdown.trace.filter((line) =>
      line.includes('bxqp:effect:joker:078'),
    );
    expect(traces).toHaveLength(2);
    const control = score(withoutJokers(state), [first, second]).breakdown.multiplier;
    expect(result.breakdown.multiplier / control).toBe(4);
  });

  it('j080-j087-hand-size-recompute：动态叠加手牌上限，减益只影响后续抽牌且不裁当前手', () => {
    const control = selectSmall(initial('j080-j087-hand-size'));
    let state = acquire(
      acquire(acquire(initial('j080-j087-hand-size'), 80), 87, 'a'),
      87,
      'b',
    );
    state = selectSmall(state);
    expect(state.round!.handIds.length).toBe(control.round!.handIds.length + 7);
    const handIds = state.round!.handIds;
    const j80 = state.inventory.jokers.find(
      (joker) => joker.contentId === 'bxqp:joker:080',
    )!;
    state = {
      ...state,
      inventory: {
        ...state.inventory,
        jokers: state.inventory.jokers.map((joker) =>
          joker.instanceId === j80.instanceId ? { ...joker, debuffed: true } : joker,
        ),
      },
    };
    expect(state.round!.handIds).toEqual(handIds);
    const next = selectSmall({
      ...state,
      phase: { kind: 'blind-select' },
      round: null,
    });
    expect(next.round!.handIds.length).toBe(control.round!.handIds.length + 2);
  });

  it('j081-starting-size-late-acquire：始终以本局初始牌组为基准，购入前后删牌都得到 +8', () => {
    const played = [card('j81', 'diamonds', '7')];
    const beforeAcquireBase = initial('j081-starting-size-late-acquire');
    const reducedBefore: RunStateV5 = {
      ...beforeAcquireBase,
      deck: { cards: beforeAcquireBase.deck.cards.slice(0, -2) },
    };
    const late = acquire(reducedBefore, 81);
    const lateControl = score(withoutJokers(late), played).breakdown.multiplier;
    expect(score(late, played).breakdown.multiplier - lateControl).toBe(8);

    let early = acquire(initial('j081-starting-size-early-acquire'), 81);
    early = { ...early, deck: { cards: early.deck.cards.slice(0, -2) } };
    const earlyControl = score(withoutJokers(early), played).breakdown.multiplier;
    expect(score(early, played).breakdown.multiplier - earlyControl).toBe(8);
  });

  it('J082 对唯一有效留手花牌精确掷一次 1/2，成功与失败均可重放', () => {
    const outcomes = Array.from({ length: 32 }, (_, index) => {
      let state = selectSmall(acquire(initial(`j082-held-face:${index}`), 82));
      const [playedId, faceId] = state.round!.handIds;
      if (!playedId || !faceId) throw new Error('缺少留手花牌');
      state = patchHeldRanks(state, playedId, faceId);
      const played = state.deck.cards.filter((entry) => entry.id === playedId);
      return score(state, played);
    });
    expect(new Set(outcomes.map((result) => result.moneyDelta))).toEqual(new Set([0, 1]));
    expect(outcomes.every((result) => result.modifierRolls.length === 1)).toBe(true);
    let boundary = selectSmall(acquire(initial('j082-no-held-face'), 82));
    const playedId = boundary.round!.handIds[0]!;
    boundary = {
      ...boundary,
      deck: {
        cards: boundary.deck.cards.map((entry) =>
          boundary.round!.handIds.includes(entry.id)
            ? { ...entry, rank: '2' as const }
            : entry,
        ),
      },
    };
    const noFace = score(
      boundary,
      boundary.deck.cards.filter((entry) => entry.id === playedId),
    );
    expect(noFace.moneyDelta).toBe(0);
    expect(noFace.modifierRolls).toHaveLength(0);
  });
});
