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
    id: `j086-100:${id}` as CardId,
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
  const result = acquireContentByIdV3(state, id, `rows-086-100:${suffix}`);
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

describe('奇牌 J086-J100 补充执行合约', () => {
  it('j086-retroactive-tarot-history：追溯购入前的纸术使用历史，不计算星谱或幽戏牌', () => {
    let state = initial('j086-retroactive-tarot-history');
    const ids = (['tarot', 'planet', 'spectral'] as const).map((family) => {
      const definition = state.content.items.find(
        (item) => item.kind === 'consumable' && item.family === family,
      );
      if (!definition) throw new Error(`缺少 ${family} 定义`);
      return definition.contentId;
    });
    state = {
      ...state,
      history: {
        ...state.history,
        effectObservations: [ids[0], ids[0], ids[1], ids[2]].map((contentId, index) => ({
          window: 'item-acquired' as const,
          key: 'consumable-used',
          value: contentId!,
          sourceInstanceId: `j086:history:${index}`,
          effectId: `j086:history:${index}`,
          checkpointId: state.checkpointId,
        })),
      },
    };
    state = acquire(state, 86);
    const played = [card('j86', 'clubs', '7')];
    const control = score(withoutJokers(state), played).breakdown.multiplier;
    expect(score(state, played).breakdown.multiplier - control).toBe(2);
  });

  it('j088-round-resource-boundary：重复来源只在盲注选择时增加弃牌次数，途中减益不倒扣', () => {
    const control = selectSmall(initial('j088-round-resource-boundary'));
    let state = acquire(
      acquire(initial('j088-round-resource-boundary'), 88, 'a'),
      88,
      'b',
    );
    state = selectSmall(state);
    expect(state.round!.discardsRemaining).toBe(control.round!.discardsRemaining + 2);
    const granted = state.round!.discardsRemaining;
    state = {
      ...state,
      inventory: {
        ...state.inventory,
        jokers: state.inventory.jokers.map((joker) => ({ ...joker, debuffed: true })),
      },
    };
    expect(state.round!.discardsRemaining).toBe(granted);
    const next = selectSmall({
      ...state,
      phase: { kind: 'blind-select' },
      round: null,
    });
    expect(next.round!.discardsRemaining).toBe(control.round!.discardsRemaining);
  });

  it('J089 按完整牌组石面强化数量提供每张 25 筹码', () => {
    let state = initial('j089-full-deck-stone-count');
    const stoneId = state.deck.cards[0]!.id;
    state = {
      ...state,
      deck: {
        cards: state.deck.cards.map((entry) =>
          entry.id === stoneId
            ? { ...entry, enhancementId: 'bxqp:enhancement:stone-mask' }
            : entry,
        ),
      },
      modifiersV3: {
        ...state.modifiersV3,
        playingCards: state.modifiersV3.playingCards.map((modifier) =>
          modifier.cardId === stoneId
            ? { ...modifier, enhancementId: 'bxqp:enhancement:stone-mask' }
            : modifier,
        ),
      },
    };
    state = acquire(state, 89);
    const played = [card('j89', 'hearts', '4')];
    const control = score(withoutJokers(state), played).breakdown.cardChips;
    expect(score(state, played).breakdown.cardChips - control).toBe(25);
  });

  it('J091 的吉结重演每个成功 pass 各成长一次，全部失败不成长', () => {
    const lucky = {
      ...card('j91-lucky', 'diamonds', '7'),
      enhancementId: 'bxqp:enhancement:lucky-knot',
      sealId: 'bxqp:seal:echo-knot',
    };
    let doubleSuccess: ReturnType<typeof score> | null = null;
    let allFailed: ReturnType<typeof score> | null = null;
    for (let index = 0; index < 256 && (!doubleSuccess || !allFailed); index += 1) {
      const result = score(acquire(initial(`j091-retrigger:${index}`), 91), [lucky]);
      const factor = ability(result.proposedState, 91, 'multFactorHundredths');
      if (factor === 150) doubleSuccess = result;
      if (factor === 100) allFailed = result;
    }
    expect(doubleSuccess).not.toBeNull();
    expect(allFailed).not.toBeNull();
    expect(doubleSuccess?.modifierRolls).toHaveLength(4);
    expect(ability(allFailed!.proposedState, 91, 'multFactorHundredths')).toBe(100);
  });

  it('j093-negative-money-clamp：按当前位置的钱计算筹码，零与负债都钳制为零', () => {
    const played = [card('j93', 'spades', '3')];
    let state = acquire(initial('j093-positive-money'), 93);
    state = { ...state, economy: { ...state.economy, money: 7 } };
    const control = score(withoutJokers(state), played).breakdown.cardChips;
    expect(score(state, played).breakdown.cardChips - control).toBe(14);
    for (const money of [0, -5]) {
      const boundary = {
        ...state,
        rules: { ...state.rules, allowedDebt: 10 },
        economy: { ...state.economy, money },
      };
      expect(score(boundary, played).breakdown.cardChips).toBe(
        score(withoutJokers(boundary), played).breakdown.cardChips,
      );
    }
  });

  it('j098-triggering-hand-benefits：识别包含两对的更高牌型，先成长 2 再让触发手受益', () => {
    const fullHouse = [
      card('j98-2a', 'clubs', '2'),
      card('j98-2b', 'hearts', '2'),
      card('j98-3a', 'diamonds', '3'),
      card('j98-3b', 'spades', '3'),
      card('j98-3c', 'clubs', '3'),
    ];
    const state = acquire(initial('j098-triggering-hand-benefits'), 98);
    const control = score(withoutJokers(state), fullHouse).breakdown.multiplier;
    const result = score(state, fullHouse);
    expect(result.breakdown.handType).toBe('full-house');
    expect(ability(result.proposedState, 98, 'storedMult')).toBe(2);
    expect(result.breakdown.multiplier - control).toBe(2);

    const miss = score(state, [card('j98-miss', 'clubs', '7')]);
    expect(ability(miss.proposedState, 98, 'storedMult')).toBe(0);
  });
});
