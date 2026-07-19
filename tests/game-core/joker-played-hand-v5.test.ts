import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV5 } from '../../src/content/runtime/runSetupV5';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import type { CardId } from '../../src/game-core/model/ids';
import { isRunStateV5, type RunStateV5 } from '../../src/game-core/model/runV5';
import type { RunPlayingCard } from '../../src/game-core/model/runV2';
import { createRandomState, nextInteger } from '../../src/game-core/rng/random';

function acquireJokers(state: RunStateV5, ordinals: readonly number[]): RunStateV5 {
  let next: RunStateV5 = {
    ...state,
    rules: { ...state.rules, jokerSlots: Math.max(20, state.rules.jokerSlots) },
  };
  for (const [index, ordinal] of ordinals.entries()) {
    const contentId = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
    const acquired = acquireContentByIdV3(
      next,
      contentId,
      `v5-played-hand:${contentId}:${index}`,
    );
    if (!acquired.ok || !isRunStateV5(acquired.state)) {
      throw new Error(acquired.ok ? '没有保持 V5' : acquired.message);
    }
    next = acquired.state;
  }
  return next;
}

function roundRun(seed: string, ordinals: readonly number[]): RunStateV5 {
  const acquired = acquireJokers(
    createProductionRunV5(PRODUCTION_CATALOG, { seed }),
    ordinals,
  );
  const selected = executeCommandV2(acquired, {
    type: 'select-blind',
    checkpointId: acquired.checkpointId,
    position: 'small',
  });
  if (!selected.ok || !isRunStateV5(selected.state)) {
    throw new Error(selected.ok ? '没有保持 V5' : selected.rejection.message);
  }
  return selected.state;
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

function play(state: RunStateV5, cardIds: readonly CardId[]): RunStateV5 {
  const selected: RunStateV5 = {
    ...state,
    round: { ...state.round!, selectedCardIds: cardIds },
  };
  const result = executeCommandV2(selected, {
    type: 'play-selected',
    checkpointId: selected.checkpointId,
  });
  if (!result.ok || !isRunStateV5(result.state)) {
    throw new Error(result.ok ? '没有保持 V5' : result.rejection.message);
  }
  return result.state;
}

function jokerState(state: RunStateV5, ordinal: number, key: string): unknown {
  const contentId = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const owned = state.inventory.jokers.find((joker) => joker.contentId === contentId);
  return state.modifiersV3.jokers.find(
    (modifier) => modifier.instanceId === owned?.instanceId,
  )?.abilityState[key];
}

describe('V5 单次出牌原子事务', () => {
  it('j052-j056-all-played-score：补入计分的牌也获得 J056 成长且不改展示牌型', () => {
    let state = roundRun('j052-all-played-score', [52, 56]);
    const ids = state.round!.handIds.slice(0, 3);
    const patches = [
      { rank: '2' as const, suit: 'clubs' as const },
      { rank: '5' as const, suit: 'diamonds' as const },
      { rank: '9' as const, suit: 'hearts' as const },
    ];
    ids.forEach((id, index) => {
      state = patchCard(state, id, patches[index]!);
    });

    const played = play(state, ids);

    expect(played.lastHand?.handType).toBe('high-card');
    expect(played.lastHand?.scoringCardIds).toEqual(ids);
    expect(played.lastHand?.cardChips).toBe(16);
    expect(
      ids.map((id) => played.deck.cards.find((card) => card.id === id)?.bonusChips),
    ).toEqual([5, 5, 5]);
  });

  it('j056-retrigger-current-pass-order：每个计分 pass 后成长，重演立即读取新值', () => {
    let state = roundRun('j056-bonus-before-retrigger', [56]);
    const cardId = state.round!.handIds[0]!;
    state = patchCard(state, cardId, {
      rank: '2',
      sealId: 'bxqp:seal:echo-knot',
      bonusChips: 0,
    });

    const played = play(state, [cardId]);
    const durable = played.deck.cards.find(({ id }) => id === cardId);

    expect(played.lastHand?.cardChips).toBe(9);
    expect(durable?.bonusChips).toBe(10);
  });

  it('j068-j076-left-right：按站位变换强化，J068 在移除前先增长', () => {
    const runCase = (seed: string, order: readonly number[]) => {
      let state = roundRun(seed, order);
      const cardId = state.round!.handIds[0]!;
      state = patchCard(state, cardId, {
        rank: 'king',
        enhancementId: 'bxqp:enhancement:brass-inlay',
      });
      const played = play(state, [cardId]);
      return {
        enhancementId: played.deck.cards.find(({ id }) => id === cardId)?.enhancementId,
        factor: jokerState(played, 68, 'multFactorHundredths'),
      };
    };

    expect(runCase('j068-before-j076', [68, 76])).toEqual({
      enhancementId: 'bxqp:enhancement:gold-leaf',
      factor: 110,
    });
    expect(runCase('j076-before-j068', [76, 68])).toEqual({
      enhancementId: null,
      factor: 110,
    });
  });

  it('j051-j054-clone-before-destroy / j051-j070-one-added-event：入口复制、后销毁且只记一次新增', () => {
    let state = roundRun('j051-j054-j070', [51, 54, 70]);
    const originalId = state.round!.handIds[0]!;
    state = patchCard(state, originalId, {
      rank: '6',
      suit: 'hearts',
      enhancementId: 'bxqp:enhancement:brass-inlay',
      sealId: 'bxqp:seal:echo-knot',
      bonusChips: 7,
    });
    const deckSize = state.deck.cards.length;

    const played = play(state, [originalId]);
    const clone = played.deck.cards.find(
      (card) => card.id !== originalId && card.bonusChips === 7,
    );

    expect(played.deck.cards).toHaveLength(deckSize);
    expect(played.deck.cards.some(({ id }) => id === originalId)).toBe(false);
    expect(clone).toMatchObject({
      rank: '6',
      suit: 'hearts',
      enhancementId: 'bxqp:enhancement:brass-inlay',
      sealId: 'bxqp:seal:echo-knot',
      bonusChips: 7,
    });
    expect(played.round?.handIds).toContain(clone?.id);
    expect(played.inventory.consumables).toHaveLength(1);
    expect(jokerState(played, 70, 'multFactorHundredths')).toBe(125);
  });

  it('j051-j056-clone-snapshot：同手成长不写入入口克隆，下一回合克隆读取已提交成长', () => {
    let state = roundRun('j051-j056-clone-snapshot', [51, 56]);
    const originalId = state.round!.handIds[0]!;
    state = patchCard(state, originalId, { rank: '7', bonusChips: 0 });
    const initialCardIds = new Set(state.deck.cards.map(({ id }) => id));
    const first = play(state, [originalId]);
    const firstClone = first.deck.cards.find(
      (candidate) => !initialCardIds.has(candidate.id),
    );
    expect(first.deck.cards.find((card) => card.id === originalId)?.bonusChips).toBe(5);
    expect(firstClone?.bonusChips).toBe(0);

    const replayReady: RunStateV5 = {
      ...first,
      phase: { kind: 'round' },
      round: {
        ...first.round!,
        targetScore: Number.MAX_SAFE_INTEGER,
        handIds: [originalId],
        drawPileIds: first.round!.drawPileIds.filter((id) => id !== originalId),
        discardPileIds: first.round!.discardPileIds.filter((id) => id !== originalId),
        selectedCardIds: [],
        handsPlayed: 0,
      },
    };
    const firstCardIds = new Set(first.deck.cards.map(({ id }) => id));
    const second = play(replayReady, [originalId]);
    const secondClone = second.deck.cards.find(
      (candidate) => !firstCardIds.has(candidate.id),
    );
    expect(firstClone?.bonusChips).toBe(0);
    expect(secondClone?.bonusChips).toBe(5);
  });

  it('j092-after-each-uncommon：被减益的少见被动奇牌站位后仍插入一次倍率', () => {
    let state = roundRun('j092-debuffed-passive-target', [69, 92]);
    const target = state.inventory.jokers.find(
      ({ contentId }) => contentId === 'bxqp:joker:069',
    )!;
    state = {
      ...state,
      inventory: {
        ...state.inventory,
        jokers: state.inventory.jokers.map((joker) =>
          joker.instanceId === target.instanceId ? { ...joker, debuffed: true } : joker,
        ),
      },
    };
    const cardId = state.round!.handIds[0]!;

    const played = play(state, [cardId]);
    const hooks =
      played.lastHand?.trace.filter((line) => line.startsWith('joker-after-rarity:')) ??
      [];

    expect(hooks).toHaveLength(1);
    expect(hooks[0]).toContain(target.instanceId);
  });

  it('j091-double-success-once：每个吉结 pass 至多成长一次，即使两个分支同时成功', () => {
    const forcedRng = Array.from({ length: 10_000 }, (_, index) =>
      createRandomState(`j091-forced-roll:${index}`),
    ).find((rngState) => {
      const mult = nextInteger(rngState, 5);
      const money = nextInteger(mult.state, 15);
      return mult.value === 0 && money.value === 0;
    });
    expect(forcedRng).toBeDefined();
    if (!forcedRng) return;
    let state = roundRun('j091-double-success', [91]);
    const cardId = state.round!.handIds[0]!;
    state = patchCard({ ...state, rngState: forcedRng }, cardId, {
      enhancementId: 'bxqp:enhancement:lucky-knot',
    });
    const played = play(state, [cardId]);
    const rolls = played.materializedChoicesV3
      .filter(({ kind }) => kind === 'playing-card-modifier-rolls')
      .flatMap(({ valueNumbers }) => valueNumbers);

    expect(rolls).toEqual([0, 0]);
    expect(jokerState(played, 91, 'multFactorHundredths')).toBe(125);
  });
});
