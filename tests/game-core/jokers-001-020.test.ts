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
    id: `j001-020:${id}` as CardId,
    suit,
    rank,
    enhancementId: null,
    sealId: null,
    editionId: null,
    bonusChips: 0,
  };
}

function run(seed: string): RunStateV4 {
  return createProductionRunV4(PRODUCTION_CATALOG, { seed });
}

function acquire(state: RunStateV4, ordinal: number): RunStateV4 {
  const id = `bxqp:joker:${ordinal.toString().padStart(3, '0')}`;
  const result = acquireContentByIdV3(state, id, `row:${ordinal}`);
  if (!result.ok || !isRunStateV4(result.state)) {
    throw new Error(result.ok ? '没有保持 V4' : result.message);
  }
  return result.state;
}

function breakdown(state: RunStateV4, cards: readonly RunPlayingCard[]) {
  const result = resolveHandScoreV2(state, cards);
  if (!result.ok) throw new Error(result.message);
  return result.breakdown;
}

const pair = [card('pair-a', 'spades', '7'), card('pair-b', 'hearts', '7')];
const three = [...pair, card('three-c', 'clubs', '7')];
const twoPair = [...pair, card('pair-c', 'clubs', '9'), card('pair-d', 'diamonds', '9')];
const straight = [
  card('straight-2', 'spades', '2'),
  card('straight-3', 'hearts', '3'),
  card('straight-4', 'clubs', '4'),
  card('straight-5', 'diamonds', '5'),
  card('straight-6', 'spades', '6'),
];
const flush = [
  card('flush-2', 'hearts', '2'),
  card('flush-5', 'hearts', '5'),
  card('flush-7', 'hearts', '7'),
  card('flush-9', 'hearts', '9'),
  card('flush-k', 'hearts', 'king'),
];

describe('奇牌 J001-J020', () => {
  it.each([
    [1, [card('j1', 'clubs', '2')], 'multiplier', 4],
    [2, [card('j2', 'diamonds', '2')], 'multiplier', 3],
    [3, [card('j3', 'hearts', '2')], 'multiplier', 3],
    [4, [card('j4', 'spades', '2')], 'multiplier', 3],
    [5, [card('j5', 'clubs', '2')], 'multiplier', 3],
    [6, pair, 'multiplier', 8],
    [7, three, 'multiplier', 12],
    [8, twoPair, 'multiplier', 10],
    [9, straight, 'multiplier', 12],
    [10, flush, 'multiplier', 10],
    [11, pair, 'cardChips', 50],
    [12, three, 'cardChips', 100],
    [13, twoPair, 'cardChips', 80],
    [14, straight, 'cardChips', 100],
    [15, flush, 'cardChips', 80],
    [16, three, 'multiplier', 20],
  ] as const)('J%03i 在正例中只增加声明的 %s', (ordinal, cards, field, delta) => {
    const base = run(`row-${ordinal}-base`);
    const before = breakdown(base, cards)[field];
    const after = breakdown(acquire(base, ordinal), cards)[field];
    expect(after - before).toBe(delta);
  });

  it('条件为假与来源减益时不产生输出', () => {
    const wrongSuit = [card('wrong-suit', 'clubs', '2')];
    const j002 = run('j002-false');
    expect(breakdown(acquire(j002, 2), wrongSuit)).toEqual(breakdown(j002, wrongSuit));

    const fourCards = [
      card('four-a', 'spades', '2'),
      card('four-b', 'hearts', '4'),
      card('four-c', 'clubs', '6'),
      card('four-d', 'diamonds', '8'),
    ];
    const j016 = run('j016-boundary');
    expect(breakdown(acquire(j016, 16), fourCards)).toEqual(breakdown(j016, fourCards));

    const j001 = acquire(run('j001-debuffed'), 1);
    const debuffed: RunStateV4 = {
      ...j001,
      inventory: {
        ...j001.inventory,
        jokers: j001.inventory.jokers.map((joker) => ({ ...joker, debuffed: true })),
      },
    };
    const one = [card('debuffed-source', 'clubs', '2')];
    expect(breakdown(debuffed, one)).toEqual(breakdown(run('j001-control'), one));
  });

  it('J017 按空栏位加原始空座剪影数量计算，倍率因子最低为 1', () => {
    const base = run('j017-stencil');
    const one = [card('stencil', 'clubs', '2')];
    const owned = acquire(base, 17);
    expect(breakdown(owned, one).multiplier).toBe(breakdown(base, one).multiplier * 5);
    const crowded: RunStateV4 = {
      ...owned,
      rules: { ...owned.rules, jokerSlots: 1 },
    };
    expect(breakdown(crowded, one).multiplier).toBe(breakdown(base, one).multiplier);
  });

  it('J019 只为留手能力增加一次立即重演，不重演自身生成器', () => {
    const initial = run('j019-held-retrigger');
    const selected = executeCommandV2(initial, {
      type: 'select-blind',
      checkpointId: initial.checkpointId,
      position: 'small',
    });
    if (!selected.ok || !isRunStateV4(selected.state) || !selected.state.round) {
      throw new Error(selected.ok ? '没有保持 V4 回合' : selected.rejection.message);
    }
    const playedId = selected.state.round.handIds[0]!;
    const heldId = selected.state.round.handIds[1]!;
    const prepared: RunStateV4 = {
      ...selected.state,
      deck: {
        cards: selected.state.deck.cards.map((entry) =>
          entry.id === heldId
            ? { ...entry, enhancementId: 'bxqp:enhancement:silk-shadow' }
            : entry,
        ),
      },
      modifiersV3: {
        ...selected.state.modifiersV3,
        playingCards: selected.state.modifiersV3.playingCards.map((entry) =>
          entry.cardId === heldId
            ? { ...entry, enhancementId: 'bxqp:enhancement:silk-shadow' }
            : entry,
        ),
      },
    };
    const played = [prepared.deck.cards.find(({ id }) => id === playedId)!];
    const once = breakdown(prepared, played);
    const twice = breakdown(acquire(prepared, 19), played);

    expect(twice.multiplier).toBe(once.multiplier * 1.5);
    expect(
      twice.trace.filter(
        (line) => line.includes(`held-modifier`) && line.includes(heldId),
      ),
    ).toHaveLength(2);
  });
});
