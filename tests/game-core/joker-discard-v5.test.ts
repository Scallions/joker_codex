import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV5 } from '../../src/content/runtime/runSetupV5';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import type { CardId } from '../../src/game-core/model/ids';
import { isRunStateV5, type RunStateV5 } from '../../src/game-core/model/runV5';
import type { RunPlayingCard } from '../../src/game-core/model/runV2';

const DISCARD_JOKERS = [57, 58, 83, 95, 100] as const;

function acquireDiscardJokers(seed: string): RunStateV5 {
  const initial = createProductionRunV5(PRODUCTION_CATALOG, { seed });
  let state: RunStateV5 = {
    ...initial,
    rules: {
      ...initial.rules,
      jokerSlots: 10,
    },
  };
  for (const ordinal of DISCARD_JOKERS) {
    const contentId = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
    const acquired = acquireContentByIdV3(state, contentId, `discard:${ordinal}`);
    if (!acquired.ok || !isRunStateV5(acquired.state)) {
      throw new Error(acquired.ok ? '没有保持 V5' : acquired.message);
    }
    state = acquired.state;
  }
  const selected = executeCommandV2(state, {
    type: 'select-blind',
    checkpointId: state.checkpointId,
    position: 'small',
  });
  if (!selected.ok || !isRunStateV5(selected.state)) {
    throw new Error(selected.ok ? '没有保持 V5' : selected.rejection.message);
  }
  return setJokerState(selected.state, 58, 'storedMult', 3);
}

function setJokerState(
  state: RunStateV5,
  ordinal: number,
  key: string,
  value: number,
): RunStateV5 {
  const contentId = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const source = state.inventory.jokers.find((joker) => joker.contentId === contentId);
  return {
    ...state,
    modifiersV3: {
      ...state.modifiersV3,
      jokers: state.modifiersV3.jokers.map((modifier) =>
        modifier.instanceId === source?.instanceId
          ? {
              ...modifier,
              abilityState: { ...modifier.abilityState, [key]: value },
            }
          : modifier,
      ),
    },
  };
}

function jokerState(state: RunStateV5, ordinal: number, key: string): unknown {
  const contentId = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const source = state.inventory.jokers.find((joker) => joker.contentId === contentId);
  return state.modifiersV3.jokers.find(
    (modifier) => modifier.instanceId === source?.instanceId,
  )?.abilityState[key];
}

function patchCard(
  state: RunStateV5,
  cardId: CardId,
  patch: Partial<Omit<RunPlayingCard, 'id'>>,
): RunStateV5 {
  return {
    ...state,
    deck: {
      cards: state.deck.cards.map((card) =>
        card.id === cardId ? { ...card, ...patch } : card,
      ),
    },
    modifiersV3: {
      ...state.modifiersV3,
      playingCards: state.modifiersV3.playingCards.map((modifier) =>
        modifier.cardId === cardId
          ? {
              ...modifier,
              ...(patch.enhancementId !== undefined
                ? { enhancementId: patch.enhancementId }
                : {}),
              ...(patch.sealId !== undefined ? { sealId: patch.sealId } : {}),
              ...(patch.editionId !== undefined ? { editionId: patch.editionId } : {}),
            }
          : modifier,
      ),
    },
  };
}

function discard(state: RunStateV5, cardIds: readonly CardId[]): RunStateV5 {
  const selected: RunStateV5 = {
    ...state,
    round: { ...state.round!, selectedCardIds: cardIds },
  };
  const result = executeCommandV2(selected, {
    type: 'discard-selected',
    checkpointId: selected.checkpointId,
  });
  if (!result.ok || !isRunStateV5(result.state)) {
    throw new Error(result.ok ? '没有保持 V5' : result.rejection.message);
  }
  return result.state;
}

describe('V5 弃牌快照事务', () => {
  it('j057-j083-j095-j100-discard-snapshot：读取同一张入口快照，弃牌修饰先于销毁结算', () => {
    let state = acquireDiscardJokers('discard-singleton-snapshot');
    const cardId = state.round!.handIds[0]!;
    state = {
      ...state,
      jokerRuntimeV5: { ...state.jokerRuntimeV5, sharedRoundTargetRank: 'king' },
    };
    state = patchCard(state, cardId, {
      rank: 'king',
      sealId: 'bxqp:seal:script-seal',
    });
    const money = state.economy.money;

    const discarded = discard(state, [cardId]);

    expect(discarded.economy.money).toBe(money + 8);
    expect(discarded.inventory.consumables).toHaveLength(1);
    expect(discarded.deck.cards.some((card) => card.id === cardId)).toBe(false);
    expect(jokerState(discarded, 58, 'storedMult')).toBe(2);
    expect(jokerState(discarded, 100, 'multFactorHundredths')).toBe(199);
  });

  it('j058-discard-action-not-card-count / j095-first-discard-consumed：五张牌只消耗一次首弃机会', () => {
    let state = acquireDiscardJokers('discard-five-card-action');
    const ids = state.round!.handIds.slice(0, 5);
    state = {
      ...state,
      jokerRuntimeV5: { ...state.jokerRuntimeV5, sharedRoundTargetRank: 'king' },
    };
    for (const [index, cardId] of ids.entries()) {
      state = patchCard(state, cardId, {
        rank: 'king',
        suit: index % 2 === 0 ? 'hearts' : 'spades',
      });
    }
    const money = state.economy.money;

    const first = discard(state, ids);

    expect(first.economy.money).toBe(money + 30);
    expect(first.deck.cards).toHaveLength(state.deck.cards.length);
    expect(jokerState(first, 58, 'storedMult')).toBe(2);
    expect(jokerState(first, 100, 'multFactorHundredths')).toBe(195);

    const laterId = first.round!.handIds[0]!;
    const laterReady = patchCard(first, laterId, { rank: '2' });
    const later = discard(laterReady, [laterId]);
    expect(later.economy.money).toBe(first.economy.money);
    expect(later.deck.cards.some((card) => card.id === laterId)).toBe(true);
    expect(jokerState(later, 58, 'storedMult')).toBe(1);
    expect(jokerState(later, 100, 'multFactorHundredths')).toBe(194);
  });

  it('j100-card-count-threshold：按弃牌张数降至 ×1 时在同一事务销毁来源', () => {
    let state = acquireDiscardJokers('j100-card-count-threshold');
    const cardId = state.round!.handIds[0]!;
    state = setJokerState(state, 100, 'multFactorHundredths', 101);
    state = {
      ...state,
      jokerRuntimeV5: { ...state.jokerRuntimeV5, sharedRoundTargetRank: 'king' },
    };
    state = patchCard(state, cardId, { rank: '2', suit: 'clubs' });

    const discarded = discard(state, [cardId]);

    expect(
      discarded.inventory.jokers.some(({ contentId }) => contentId === 'bxqp:joker:100'),
    ).toBe(false);
    expect(jokerState(discarded, 100, 'multFactorHundredths')).toBeUndefined();
  });

  it('减益来源不读取弃牌事件，牌自身弃牌修饰仍正常发生', () => {
    let state = acquireDiscardJokers('discard-debuffed-sources');
    const cardId = state.round!.handIds[0]!;
    state = {
      ...state,
      jokerRuntimeV5: { ...state.jokerRuntimeV5, sharedRoundTargetRank: 'king' },
      inventory: {
        ...state.inventory,
        jokers: state.inventory.jokers.map((joker) => ({ ...joker, debuffed: true })),
      },
    };
    state = patchCard(state, cardId, {
      rank: 'king',
      sealId: 'bxqp:seal:script-seal',
    });
    const money = state.economy.money;

    const discarded = discard(state, [cardId]);

    expect(discarded.economy.money).toBe(money);
    expect(discarded.inventory.consumables).toHaveLength(1);
    expect(discarded.deck.cards.some((card) => card.id === cardId)).toBe(true);
    expect(jokerState(discarded, 58, 'storedMult')).toBe(3);
    expect(jokerState(discarded, 100, 'multFactorHundredths')).toBe(200);
  });
});
