import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV4 } from '../../src/content/runtime/runSetupV4';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import { resolveHandScoreV2 } from '../../src/game-core/effects/scoreHandV2';
import type { CardId } from '../../src/game-core/model/ids';
import type { RunPlayingCard } from '../../src/game-core/model/runV2';
import { isRunStateV4, type RunStateV4 } from '../../src/game-core/model/runV4';

function card(
  id: string,
  suit: RunPlayingCard['suit'],
  rank: RunPlayingCard['rank'],
): RunPlayingCard {
  return {
    id: `j031-040:${id}` as CardId,
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

function base(seed: string): RunStateV4 {
  return createProductionRunV4(PRODUCTION_CATALOG, { seed });
}

function score(state: RunStateV4, cards: readonly RunPlayingCard[]) {
  const result = resolveHandScoreV2(state, cards);
  if (!result.ok) throw new Error(result.message);
  return result;
}

function roundRun(seed: string, ordinal: number): RunStateV4 {
  const initial = acquire(base(seed), ordinal);
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

describe('奇牌 J031-J040', () => {
  it.each([
    [31, card('j31', 'clubs', '8'), 'multiplier', 8],
    [33, card('j33', 'clubs', 'king'), 'cardChips', 30],
    [38, card('j38', 'clubs', '2'), 'multiplier', 15],
    [39, card('j39', 'clubs', '10'), 'multiplier', 4],
    [40, card('j40', 'clubs', 'ace'), 'cardChips', 31],
  ] as const)(
    'J%03i 对匹配计分牌或独立窗口输出冻结数值',
    (ordinal, played, field, delta) => {
      const state = base(`row-${ordinal}`);
      expect(
        score(acquire(state, ordinal), [played]).breakdown[field] -
          score(state, [played]).breakdown[field],
      ).toBe(delta);
    },
  );

  it('J032 按完整牌组绸影数量计算 ×1+0.2n，而非只看当前手牌', () => {
    const state = acquire(base('j032-full-deck'), 32);
    const modifiedIds = new Set(state.deck.cards.slice(0, 2).map(({ id }) => id));
    const prepared: RunStateV4 = {
      ...state,
      deck: {
        cards: state.deck.cards.map((entry) =>
          modifiedIds.has(entry.id)
            ? { ...entry, enhancementId: 'bxqp:enhancement:silk-shadow' }
            : entry,
        ),
      },
      modifiersV3: {
        ...state.modifiersV3,
        playingCards: state.modifiersV3.playingCards.map((entry) =>
          modifiedIds.has(entry.cardId)
            ? { ...entry, enhancementId: 'bxqp:enhancement:silk-shadow' }
            : entry,
        ),
      },
    };
    const played = [card('j32-played', 'clubs', '2')];
    const control = score(base('j032-control'), played).breakdown.multiplier;
    expect(score(prepared, played).breakdown.multiplier).toBeCloseTo(control * 1.4);
  });

  it('J033 与 J037 共用有效花牌身份，J037 被减益后立即失效', () => {
    let state = acquire(base('j033-j037'), 33);
    state = acquire(state, 37);
    const number = [card('number-face', 'clubs', '6')];
    const control = score(base('j033-j037-control'), number).breakdown.cardChips;
    expect(score(state, number).breakdown.cardChips - control).toBe(30);

    const debuffed: RunStateV4 = {
      ...state,
      inventory: {
        ...state.inventory,
        jokers: state.inventory.jokers.map((joker) =>
          joker.contentId === 'bxqp:joker:037' ? { ...joker, debuffed: true } : joker,
        ),
      },
    };
    expect(score(debuffed, number).breakdown.cardChips - control).toBe(0);
  });

  it('J034 计数所有持有奇牌，包括自身、减益与零栏位实例', () => {
    let state = acquire(base('j034-owned-count'), 34);
    state = acquire(state, 1);
    const secondId = state.inventory.jokers[1]!.instanceId;
    state = {
      ...state,
      inventory: {
        ...state.inventory,
        jokers: state.inventory.jokers.map((joker) =>
          joker.instanceId === secondId
            ? { ...joker, debuffed: true, slotContribution: 0 }
            : joker,
        ),
      },
      modifiersV3: {
        ...state.modifiersV3,
        jokers: state.modifiersV3.jokers.map((modifier) =>
          modifier.instanceId === secondId
            ? { ...modifier, slotContribution: 0 }
            : modifier,
        ),
      },
    };
    const played = [card('j34', 'clubs', '2')];
    const control = score(base('j034-control'), played).breakdown.multiplier;
    expect(score(state, played).breakdown.multiplier - control).toBe(6);
  });

  it('J035 未弃牌时在利息计算前按剩余弃牌加钱', () => {
    let state = roundRun('j035-round-end-money', 35);
    const moneyBefore = state.economy.money;
    const expected = state.round!.discardsRemaining * 2;
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
    expect(played.state.economy.money - moneyBefore).toBe(expected);
    expect(played.state.economy.pendingReward?.interestReward).toBeGreaterThanOrEqual(0);
  });

  it('J036 只让 2-5 的计分牌立即额外结算一次', () => {
    const state = roundRun('j036-retrigger', 36);
    const low = [card('low', 'clubs', '2')];
    const high = [card('high', 'clubs', '6')];
    const control = base('j036-control');
    expect(score(state, low).breakdown.cardChips).toBe(
      score(control, low).breakdown.cardChips * 2,
    );
    expect(score(state, high).breakdown.cardChips).toBe(
      score(control, high).breakdown.cardChips,
    );
  });

  it('J038 每次回合结束只掷一次 1/6，成功无出售收益销毁并记录灭绝', () => {
    const outcomes = Array.from({ length: 48 }, (_, index) => {
      let state = roundRun(`j038-extinction:${index}`, 38);
      const moneyBefore = state.economy.money;
      const cardId = state.round!.handIds[0]!;
      state = {
        ...state,
        round: { ...state.round!, targetScore: 1, selectedCardIds: [cardId] },
      };
      const played = executeCommandV2(state, {
        type: 'play-selected',
        checkpointId: state.checkpointId,
      });
      return { played, moneyBefore };
    });
    const extinct = outcomes.find(
      ({ played }) =>
        played.ok &&
        !played.state.inventory.jokers.some(
          ({ contentId }) => contentId === 'bxqp:joker:038',
        ),
    );

    expect(extinct?.played.ok).toBe(true);
    if (!extinct?.played.ok || !isRunStateV4(extinct.played.state)) return;
    expect(extinct.played.state.economy.money).toBe(extinct.moneyBefore);
    expect(
      extinct.played.state.history.effectObservations.some(
        ({ key }) => key === 'bxqp:history:joker-038-extinct',
      ),
    ).toBe(true);
    expect(
      extinct.played.state.materializedChoicesV3.filter(
        ({ kind }) => kind === 'joker-lifecycle-rolls',
      ),
    ).toHaveLength(1);
  });
});
