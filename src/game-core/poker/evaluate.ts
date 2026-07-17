import { RANKS, SUITS, type PlayingCard, type Rank } from '../model/cards';
import type { CardId } from '../model/ids';

export type PokerHandType =
  | 'high-card'
  | 'pair'
  | 'two-pair'
  | 'three-of-a-kind'
  | 'straight'
  | 'flush'
  | 'full-house'
  | 'four-of-a-kind'
  | 'straight-flush'
  | 'five-of-a-kind'
  | 'flush-house'
  | 'flush-five';

export interface PokerHandDefinition {
  readonly type: PokerHandType;
  readonly name: string;
  readonly baseChips: number;
  readonly baseMultiplier: number;
}

export interface PokerHandEvaluation extends PokerHandDefinition {
  readonly scoringCardIds: readonly CardId[];
}

export const POKER_HANDS: Record<PokerHandType, PokerHandDefinition> = {
  'high-card': { type: 'high-card', name: '高牌', baseChips: 5, baseMultiplier: 1 },
  pair: { type: 'pair', name: '对子', baseChips: 10, baseMultiplier: 2 },
  'two-pair': { type: 'two-pair', name: '两对', baseChips: 20, baseMultiplier: 2 },
  'three-of-a-kind': {
    type: 'three-of-a-kind',
    name: '三条',
    baseChips: 30,
    baseMultiplier: 3,
  },
  straight: { type: 'straight', name: '顺子', baseChips: 30, baseMultiplier: 4 },
  flush: { type: 'flush', name: '同花', baseChips: 35, baseMultiplier: 4 },
  'full-house': { type: 'full-house', name: '葫芦', baseChips: 40, baseMultiplier: 4 },
  'four-of-a-kind': {
    type: 'four-of-a-kind',
    name: '四条',
    baseChips: 60,
    baseMultiplier: 7,
  },
  'straight-flush': {
    type: 'straight-flush',
    name: '同花顺',
    baseChips: 100,
    baseMultiplier: 8,
  },
  'five-of-a-kind': {
    type: 'five-of-a-kind',
    name: '五条',
    baseChips: 120,
    baseMultiplier: 12,
  },
  'flush-house': {
    type: 'flush-house',
    name: '同花葫芦',
    baseChips: 140,
    baseMultiplier: 14,
  },
  'flush-five': {
    type: 'flush-five',
    name: '同花五条',
    baseChips: 160,
    baseMultiplier: 16,
  },
};

const RANK_VALUE: Record<Rank, number> = Object.fromEntries(
  RANKS.map((rank, index) => [rank, index + 2]),
) as Record<Rank, number>;

function groupByRank(cards: readonly PlayingCard[]): Map<Rank, PlayingCard[]> {
  const groups = new Map<Rank, PlayingCard[]>();

  for (const card of cards) {
    const group = groups.get(card.rank) ?? [];
    group.push(card);
    groups.set(card.rank, group);
  }

  return groups;
}

function isStraight(cards: readonly PlayingCard[]): boolean {
  if (cards.length !== 5) return false;

  const values = [...new Set(cards.map((card) => RANK_VALUE[card.rank]))].sort(
    (left, right) => left - right,
  );

  if (values.length !== 5) return false;
  if (values.join(',') === '2,3,4,5,14') return true;

  return values.every((value, index) => index === 0 || value === values[index - 1]! + 1);
}

function isFlush(cards: readonly PlayingCard[]): boolean {
  if (cards.length !== 5) return false;

  return SUITS.some((suit) =>
    cards.every((card) => card.suit === suit || card.enhancement === 'wild'),
  );
}

function cardIds(cards: readonly PlayingCard[]): CardId[] {
  return cards.map((card) => card.id);
}

export function evaluatePokerHand(cards: readonly PlayingCard[]): PokerHandEvaluation {
  const rankCards = cards.filter((card) => card.enhancement !== 'stone');
  const stoneCards = cards.filter((card) => card.enhancement === 'stone');
  const groups = [...groupByRank(rankCards).values()].sort(
    (left, right) => right.length - left.length,
  );
  const counts = groups.map((group) => group.length);
  const straight = isStraight(rankCards);
  const flush = isFlush(rankCards);

  let type: PokerHandType;
  let scoringCards: PlayingCard[];

  if (counts[0] === 5 && flush) {
    type = 'flush-five';
    scoringCards = rankCards;
  } else if (counts[0] === 3 && counts[1] === 2 && flush) {
    type = 'flush-house';
    scoringCards = rankCards;
  } else if (counts[0] === 5) {
    type = 'five-of-a-kind';
    scoringCards = groups[0]!;
  } else if (straight && flush) {
    type = 'straight-flush';
    scoringCards = rankCards;
  } else if (counts[0] === 4) {
    type = 'four-of-a-kind';
    scoringCards = groups[0]!;
  } else if (counts[0] === 3 && counts[1] === 2) {
    type = 'full-house';
    scoringCards = rankCards;
  } else if (flush) {
    type = 'flush';
    scoringCards = rankCards;
  } else if (straight) {
    type = 'straight';
    scoringCards = rankCards;
  } else if (counts[0] === 3) {
    type = 'three-of-a-kind';
    scoringCards = groups[0]!;
  } else if (counts[0] === 2 && counts[1] === 2) {
    type = 'two-pair';
    scoringCards = [...groups[0]!, ...groups[1]!];
  } else if (counts[0] === 2) {
    type = 'pair';
    scoringCards = groups[0]!;
  } else {
    type = 'high-card';
    const highest = rankCards.reduce<PlayingCard | undefined>((current, card) => {
      if (!current || RANK_VALUE[card.rank] > RANK_VALUE[current.rank]) return card;
      return current;
    }, undefined);
    scoringCards = highest ? [highest] : [];
  }

  return {
    ...POKER_HANDS[type],
    scoringCardIds: cardIds([...scoringCards, ...stoneCards]),
  };
}

export function getCardChipValue(card: PlayingCard): number {
  if (card.enhancement === 'stone') return 50;
  if (card.rank === 'ace') return 11;
  if (card.rank === 'jack' || card.rank === 'queen' || card.rank === 'king') return 10;
  return Number(card.rank);
}
