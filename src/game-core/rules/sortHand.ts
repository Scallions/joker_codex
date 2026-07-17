import { RANKS, SUITS, type PlayingCard } from '../model/cards';
import type { HandSortMode } from '../model/run';

function compareRank(left: PlayingCard, right: PlayingCard): number {
  const rankDifference = RANKS.indexOf(right.rank) - RANKS.indexOf(left.rank);
  if (rankDifference !== 0) return rankDifference;
  return SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit);
}

export function sortHand(
  hand: readonly PlayingCard[],
  mode: HandSortMode,
): PlayingCard[] {
  return [...hand].sort((left, right) => {
    if (mode === 'rank') return compareRank(left, right);
    const suitDifference = SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit);
    return suitDifference === 0 ? compareRank(left, right) : suitDifference;
  });
}
