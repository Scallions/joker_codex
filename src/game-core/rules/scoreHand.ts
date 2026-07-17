import type { PlayingCard } from '../model/cards';
import type { OwnedJoker, ScoreBreakdown } from '../model/run';
import { evaluatePokerHand, getCardChipValue } from '../poker/evaluate';

export function scoreHand(
  playedCards: readonly PlayingCard[],
  jokers: readonly OwnedJoker[],
): ScoreBreakdown {
  const evaluation = evaluatePokerHand(playedCards);
  const scoringIds = new Set(evaluation.scoringCardIds);
  const cardChips = playedCards
    .filter((card) => scoringIds.has(card.id))
    .reduce((total, card) => total + getCardChipValue(card), 0);
  const multiplier = jokers.reduce(
    (current, joker) => current * joker.handMultiplier,
    evaluation.baseMultiplier,
  );

  return {
    handType: evaluation.type,
    handName: evaluation.name,
    baseChips: evaluation.baseChips,
    cardChips,
    multiplier,
    score: Math.floor((evaluation.baseChips + cardChips) * multiplier),
    playedCardIds: playedCards.map((card) => card.id),
    scoringCardIds: evaluation.scoringCardIds,
  };
}
