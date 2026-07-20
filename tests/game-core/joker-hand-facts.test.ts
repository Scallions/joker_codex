import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV4 } from '../../src/content/runtime/runSetupV4';
import { acquireContentByIdV3 } from '../../src/game-core/effects/applyStateOperationV3';
import type { CardId } from '../../src/game-core/model/ids';
import type { RunPlayingCard } from '../../src/game-core/model/runV2';
import { isRunStateV4, type RunStateV4 } from '../../src/game-core/model/runV4';
import { buildHandFactsV3 } from '../../src/game-core/poker/handFactsV3';

function card(
  id: string,
  suit: RunPlayingCard['suit'],
  rank: RunPlayingCard['rank'],
  enhancementId: string | null = null,
): RunPlayingCard {
  return {
    id: `facts:${id}` as CardId,
    suit,
    rank,
    enhancementId,
    sealId: null,
    editionId: null,
    bonusChips: 0,
  };
}

function acquire(run: RunStateV4, contentId: string): RunStateV4 {
  const result = acquireContentByIdV3(run, contentId, `facts:${contentId}`);
  if (!result.ok || !isRunStateV4(result.state)) {
    throw new Error(result.ok ? '获得奇牌后没有保持 V4' : result.message);
  }
  return result.state;
}

describe('奇牌共享手牌事实', () => {
  it('从全部打出牌推导独立子牌型，而不是只使用最强显示牌型', () => {
    const run = createProductionRunV4(PRODUCTION_CATALOG, { seed: 'facts-subhands' });
    const played = [
      card('a1', 'spades', 'ace'),
      card('a2', 'hearts', 'ace'),
      card('a3', 'clubs', 'ace'),
      card('k1', 'spades', 'king'),
      card('k2', 'hearts', 'king'),
    ];
    const result = buildHandFactsV3(run, played, []);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.displayedHand).toBe('full-house');
    expect(result.facts.contains).toEqual({
      pair: true,
      threeOfAKind: true,
      fourOfAKind: false,
      twoPair: true,
      straight: false,
      flush: false,
    });
    expect(result.facts.playedCardIds).toEqual(played.map(({ id }) => id));
    expect(new Set(result.facts.scoringCardIds)).toEqual(
      new Set(played.map(({ id }) => id)),
    );
  });

  it('J018 重复持有仍只降至四张，且顺子与同花可来自不同四张子集', () => {
    let run = createProductionRunV4(PRODUCTION_CATALOG, {
      seed: 'facts-four-card-mixed-subsets',
    });
    run = acquire(run, 'bxqp:joker:018');
    run = acquire(run, 'bxqp:joker:018');
    const played = [
      card('s2', 'spades', '2'),
      card('s3', 'spades', '3'),
      card('s4', 'spades', '4'),
      card('sk', 'spades', 'king'),
      card('h5', 'hearts', '5'),
    ];
    const result = buildHandFactsV3(run, played, []);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.rules).toEqual({
      straightSize: 4,
      flushSize: 4,
      straightMaximumStep: 1,
    });
    expect(result.facts.contains).toMatchObject({ straight: true, flush: true });
    expect(result.facts.displayedHand).toBe('straight-flush');
    expect(new Set(result.facts.scoringCardIds)).toEqual(
      new Set(played.map(({ id }) => id)),
    );
  });

  it('集中投影 Wild、Stone、减益与全局花牌，并稳定选择最右侧最低留手牌', () => {
    let run = createProductionRunV4(PRODUCTION_CATALOG, {
      seed: 'facts-effective-identity',
    });
    run = acquire(run, 'bxqp:joker:037');
    const held = [
      card('wild', 'hearts', '2', 'bxqp:enhancement:four-winds'),
      card('stone', 'clubs', 'ace', 'bxqp:enhancement:stone-mask'),
      card('right-two', 'diamonds', '2'),
    ];
    const debuffedIds = new Set<CardId>([held[0]!.id, held[2]!.id]);
    const result = buildHandFactsV3(run, [], held, { debuffedCardIds: debuffedIds });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.facts.heldCardIds).toEqual(held.map(({ id }) => id));
    expect(result.facts.selectedHeldCardId).toBe(held[2]!.id);
    expect(result.facts.effectiveCards[held[0]!.id]).toMatchObject({
      face: true,
      wild: true,
      stone: false,
      suits: ['hearts'],
      debuffed: true,
    });
    expect(result.facts.effectiveCards[held[1]!.id]).toMatchObject({
      rank: null,
      rankValue: null,
      suits: [],
      stone: true,
    });
    expect(result.facts.effectiveCards[held[2]!.id]).toMatchObject({
      face: true,
      rankValue: 2,
      debuffed: true,
    });
  });
});
