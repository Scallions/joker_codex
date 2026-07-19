import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV5 } from '../../src/content/runtime/runSetupV5';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { applyRunWindowEffectsV2 } from '../../src/game-core/effects/runWindowV2';
import { resolveHandScoreV2 } from '../../src/game-core/effects/scoreHandV2';
import { definitionIsEligibleV3 } from '../../src/game-core/economy/shopV2';
import type { CardId } from '../../src/game-core/model/ids';
import type { RunPlayingCard } from '../../src/game-core/model/runV2';
import { isRunStateV5, type RunStateV5 } from '../../src/game-core/model/runV5';

function card(
  id: string,
  suit: RunPlayingCard['suit'],
  rank: RunPlayingCard['rank'],
): RunPlayingCard {
  return {
    id: `j051-070:${id}` as CardId,
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
  const contentId = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const result = acquireContentByIdV3(state, contentId, `rows-051-070:${suffix}`);
  if (!result.ok || !isRunStateV5(result.state)) {
    throw new Error(result.ok ? '没有保持 V5' : result.message);
  }
  return result.state;
}

function acquireMany(state: RunStateV5, ordinals: readonly number[]): RunStateV5 {
  return ordinals.reduce((next, ordinal) => acquire(next, ordinal), state);
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
  const contentId = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const source = state.inventory.jokers.find((joker) => joker.contentId === contentId);
  return state.modifiersV3.jokers.find(
    (modifier) => modifier.instanceId === source?.instanceId,
  )?.abilityState[key];
}

describe('奇牌 J051-J070 补充执行合约', () => {
  it('J053 按当前抽牌堆逐张提供 2 筹码，减益来源输出为零', () => {
    const played = [card('j53', 'clubs', '2')];
    const active = selectSmall(acquire(initial('j053-draw-pile'), 53));
    const control = score(withoutJokers(active), played).breakdown.cardChips;
    expect(score(active, played).breakdown.cardChips - control).toBe(
      active.round!.drawPileIds.length * 2,
    );

    const debuffed: RunStateV5 = {
      ...active,
      inventory: {
        ...active.inventory,
        jokers: active.inventory.jokers.map((joker) => ({ ...joker, debuffed: true })),
      },
    };
    expect(score(debuffed, played).breakdown.cardChips).toBe(control);
  });

  it('J059 只在顺子同时含 A 且容量允许时生成纸术牌，满区不耗 RNG', () => {
    const straight = ['ace', '2', '3', '4', '5'].map((rank, index) =>
      card(
        `j59-${rank}`,
        ['spades', 'hearts', 'clubs', 'diamonds', 'spades'][
          index
        ] as RunPlayingCard['suit'],
        rank as RunPlayingCard['rank'],
      ),
    );
    const state = acquire(initial('j059-straight-ace'), 59);
    const created = score(state, straight).proposedState;
    expect(created.inventory.consumables).toHaveLength(1);
    expect(created.inventory.consumables[0]?.contentId).toMatch(/^bxqp:tarot:/);

    const full: RunStateV5 = {
      ...state,
      rules: { ...state.rules, consumableSlots: 0 },
    };
    const blocked = score(full, straight).proposedState;
    expect(blocked.inventory.consumables).toHaveLength(0);
    expect(blocked.rngState).toEqual(full.rngState);
    const miss = score(state, straight.slice(1)).proposedState;
    expect(miss.inventory.consumables).toHaveLength(0);
  });

  it('j061-requires-j038-extinction：只由持久化 J038 灭失观察解锁，普通持有不够，并提供 ×3', () => {
    let state = initial('j061-requires-j038-extinction');
    const definition = state.content.items.find(
      (item) => item.contentId === 'bxqp:joker:061',
    );
    if (!definition) throw new Error('缺少 J061 定义');
    expect(definitionIsEligibleV3(state, definition, 'shop')).toBe(false);
    state = acquire(state, 38);
    expect(definitionIsEligibleV3(state, definition, 'shop')).toBe(false);
    state = {
      ...state,
      history: {
        ...state.history,
        effectObservations: [
          ...state.history.effectObservations,
          {
            window: 'round-end',
            key: 'bxqp:history:joker-038-extinct',
            value: true,
            sourceInstanceId: state.inventory.jokers[0]!.instanceId,
            effectId: 'test:j038-extinct',
            checkpointId: state.checkpointId,
          },
        ],
      },
    };
    expect(definitionIsEligibleV3(structuredClone(state), definition, 'shop')).toBe(true);
    const j38 = state.inventory.jokers.find(
      (joker) => joker.contentId === 'bxqp:joker:038',
    )!;
    state = {
      ...state,
      inventory: {
        ...state.inventory,
        jokers: state.inventory.jokers.filter(
          (joker) => joker.instanceId !== j38.instanceId,
        ),
      },
      modifiersV3: {
        ...state.modifiersV3,
        jokers: state.modifiersV3.jokers.filter(
          (modifier) => modifier.instanceId !== j38.instanceId,
        ),
      },
    };
    const withJ61 = acquire(state, 61);
    const played = [card('j61', 'hearts', '7')];
    const control = score(withoutJokers(withJ61), played).breakdown.multiplier;
    expect(score(withJ61, played).breakdown.multiplier / control).toBe(3);
  });

  it('J062 只读取当前回合中已接受的同牌型，不把当前手提前计入', () => {
    const played = [card('j62', 'diamonds', '7')];
    const fresh = selectSmall(acquire(initial('j062-repeat-hand'), 62));
    const control = score(withoutJokers(fresh), played).breakdown.multiplier;
    expect(score(fresh, played).breakdown.multiplier).toBe(control);
    const repeated: RunStateV5 = {
      ...fresh,
      round: { ...fresh.round!, handsPlayed: 1, lastHandType: 'high-card' },
      history: {
        ...fresh.history,
        playedHandTypes: [...fresh.history.playedHandTypes, 'high-card'],
      },
    };
    expect(score(repeated, played).breakdown.multiplier / control).toBe(3);
  });

  it('j064-j067-left-right：被先销毁的来源不再执行，右侧创建可供后续销毁', () => {
    const leftDestroy = selectSmall(
      acquireMany(initial('j064-left-j067-right'), [64, 67]),
    );
    expect(leftDestroy.inventory.jokers.map((joker) => joker.contentId)).toEqual([
      'bxqp:joker:064',
    ]);
    expect(ability(leftDestroy, 64, 'multFactorHundredths')).toBe(150);

    const leftCreate = selectSmall(
      acquireMany(initial('j067-left-j064-right'), [67, 64]),
    );
    expect(leftCreate.inventory.jokers).toHaveLength(3);
    expect(ability(leftCreate, 64, 'multFactorHundredths')).toBe(150);

    const alone = acquire(initial('j064-empty-pool'), 64);
    const rng = alone.rngState;
    const applied = applyRunWindowEffectsV2(alone, 'blind-selected');
    expect(applied.ok).toBe(true);
    if (!applied.ok || !isRunStateV5(applied.state)) return;
    expect(ability(applied.state, 64, 'multFactorHundredths')).toBe(150);
    expect(applied.state.rngState).toEqual(rng);
  });

  it('j065-exact-four-all-debuffed：恰好四张读取打出集合，全被减益也先成长再输出', () => {
    let state = acquire(initial('j065-four-debuffed'), 65);
    const ids = state.deck.cards.slice(0, 4).map((entry) => entry.id);
    state = {
      ...state,
      modifiersV3: {
        ...state.modifiersV3,
        playingCards: state.modifiersV3.playingCards.map((modifier) =>
          ids.includes(modifier.cardId) ? { ...modifier, debuffed: true } : modifier,
        ),
      },
    };
    const played = state.deck.cards.filter((entry) => ids.includes(entry.id));
    const result = score(state, played);
    expect(ability(result.proposedState, 65, 'storedChips')).toBe(4);
    expect(result.breakdown.cardChips).toBeGreaterThanOrEqual(4);
  });

  it('J066 仅由精确同花顺生成幽戏牌，并尊重容量边界', () => {
    const straightFlush = ['2', '3', '4', '5', '6'].map((rank) =>
      card(`j66-${rank}`, 'hearts', rank as RunPlayingCard['rank']),
    );
    const state = acquire(initial('j066-straight-flush'), 66);
    expect(
      score(state, straightFlush).proposedState.inventory.consumables[0]?.contentId,
    ).toMatch(/^bxqp:spectral:/);
    const full = { ...state, rules: { ...state.rules, consumableSlots: 0 } };
    expect(score(full, straightFlush).proposedState.inventory.consumables).toHaveLength(
      0,
    );
    expect(
      score(state, straightFlush.slice(0, 4)).proposedState.inventory.consumables,
    ).toHaveLength(0);
  });

  it('j069-straight-gap-boundaries：只把顺子最大间隔放宽到 2，重复来源不会继续放宽', () => {
    const stepTwo = ['2', '4', '6', '8', '10'].map((rank, index) =>
      card(
        `j69-two-${rank}`,
        ['clubs', 'hearts', 'diamonds', 'spades', 'clubs'][
          index
        ] as RunPlayingCard['suit'],
        rank as RunPlayingCard['rank'],
      ),
    );
    const active = acquire(initial('j069-step-two'), 69);
    expect(score(active, stepTwo).breakdown.handType).toBe('straight');
    expect(score(withoutJokers(active), stepTwo).breakdown.handType).toBe('high-card');

    const duplicates = acquire(acquire(initial('j069-no-stacking'), 69, 'a'), 69, 'b');
    const tooWide = ['2', '5', '8', 'jack', 'ace'].map((rank, index) =>
      card(
        `j69-wide-${rank}`,
        ['clubs', 'hearts', 'diamonds', 'spades', 'clubs'][
          index
        ] as RunPlayingCard['suit'],
        rank as RunPlayingCard['rank'],
      ),
    );
    expect(score(duplicates, tooWide).breakdown.handType).not.toBe('straight');
  });

  it('j070-add-not-transform：只响应永久新增牌，强化变换不伪造新增事件', () => {
    const state = acquireMany(initial('j070-transform-is-not-add'), [70, 76]);
    const face = card('j70-face', 'hearts', 'king');
    const result = score(state, [face]);
    expect(ability(result.proposedState, 70, 'multFactorHundredths')).toBe(100);
    expect(result.proposedState.deck.cards).toHaveLength(state.deck.cards.length);
  });
});
