import { stableId, type CardId } from './ids';

export const SUITS = ['spades', 'hearts', 'clubs', 'diamonds'] as const;
export type Suit = (typeof SUITS)[number];

export const RANKS = [
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'jack',
  'queen',
  'king',
  'ace',
] as const;
export type Rank = (typeof RANKS)[number];

export type CardEnhancement = 'none' | 'wild' | 'stone';

export interface PlayingCard {
  readonly id: CardId;
  readonly suit: Suit;
  readonly rank: Rank;
  readonly enhancement: CardEnhancement;
}

export function createPlayingCard(
  id: string,
  suit: Suit,
  rank: Rank,
  enhancement: CardEnhancement = 'none',
): PlayingCard {
  return { id: stableId<'playing-card'>(id), suit, rank, enhancement };
}

export function createStandardDeck(): PlayingCard[] {
  return SUITS.flatMap((suit) =>
    RANKS.map((rank) => createPlayingCard(`playing:${suit}:${rank}`, suit, rank)),
  );
}
