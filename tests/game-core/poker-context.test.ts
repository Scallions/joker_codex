import { createPlayingCard, type Rank, type Suit } from '../../src/game-core/model/cards';
import {
  detectPokerCandidates,
  evaluatePokerHand,
} from '../../src/game-core/poker/evaluate';

function card(id: string, suit: Suit, rank: Rank) {
  return createPlayingCard(`context:${id}`, suit, rank);
}

describe('牌型规则上下文', () => {
  it('支持四张顺子与四张同花，并保留全部候选牌型', () => {
    const cards = [
      card('2', 'spades', '2'),
      card('3', 'spades', '3'),
      card('4', 'spades', '4'),
      card('5', 'spades', '5'),
    ];
    const candidates = detectPokerCandidates(cards, {
      straightSize: 4,
      flushSize: 4,
    });

    expect(candidates.map((candidate) => candidate.type)).toEqual([
      'straight-flush',
      'flush',
      'straight',
      'high-card',
    ]);
  });

  it('可用覆盖值参与识别，并在最强牌型受限时稳定退回次强候选', () => {
    const cards = [
      card('a', 'hearts', '2'),
      card('b', 'hearts', '2'),
      card('c', 'clubs', '2'),
      card('d', 'diamonds', '5'),
      card('e', 'spades', '5'),
    ];
    const evaluation = evaluatePokerHand(cards, {
      straightSize: 5,
      flushSize: 5,
      rankOverrides: { [cards[2]!.id]: '5' },
      blockedHandTypes: ['full-house'],
    });

    expect(evaluation.type).toBe('three-of-a-kind');
    expect(evaluation.scoringCardIds).toEqual([cards[2]!.id, cards[3]!.id, cards[4]!.id]);
  });

  it('同一手牌的输入排列不会改变胜出牌型和计分牌集合', () => {
    const cards = [
      card('p1', 'spades', 'ace'),
      card('p2', 'hearts', 'ace'),
      card('k', 'clubs', 'king'),
      card('3', 'diamonds', '3'),
      card('2', 'spades', '2'),
    ];
    const forward = evaluatePokerHand(cards);
    const reverse = evaluatePokerHand([...cards].reverse());

    expect(reverse.type).toBe(forward.type);
    expect([...reverse.scoringCardIds].sort()).toEqual(
      [...forward.scoringCardIds].sort(),
    );
  });

  it('牌型等级按定义增量提升基础筹码与倍率', () => {
    const pair = [card('pair-a', 'spades', 'ace'), card('pair-b', 'hearts', 'ace')];
    const evaluation = evaluatePokerHand(pair, {
      straightSize: 5,
      flushSize: 5,
      handLevels: { pair: 3 },
    });

    expect(evaluation).toMatchObject({
      type: 'pair',
      level: 3,
      baseChips: 40,
      baseMultiplier: 4,
      chipsPerLevel: 15,
      multiplierPerLevel: 1,
    });
  });
});
