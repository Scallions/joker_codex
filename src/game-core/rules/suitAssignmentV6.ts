import { SUITS, type Suit } from '../model/cards';
import type { CardId } from '../model/ids';
import type { EffectivePlayingCardV3 } from '../poker/effectiveCardV3';

interface SuitCandidateCard {
  readonly id: CardId;
  readonly suits: readonly Suit[];
}

function canMatchRoles(
  cards: readonly SuitCandidateCard[],
  roles: readonly (readonly Suit[])[],
): boolean {
  const orderedCards = [...cards].sort((left, right) => left.id.localeCompare(right.id));
  const used = new Set<CardId>();
  const visit = (roleIndex: number): boolean => {
    if (roleIndex >= roles.length) return true;
    const role = roles[roleIndex]!;
    for (const card of orderedCards) {
      if (used.has(card.id) || !card.suits.some((suit) => role.includes(suit))) {
        continue;
      }
      used.add(card.id);
      if (visit(roleIndex + 1)) return true;
      used.delete(card.id);
    }
    return false;
  };
  return visit(0);
}

function scoringCandidates(
  scoringCardIds: readonly CardId[],
  identities: Readonly<Record<CardId, EffectivePlayingCardV3>>,
): readonly SuitCandidateCard[] {
  return scoringCardIds.flatMap((id) => {
    const identity = identities[id];
    return identity && !identity.stone && !identity.debuffed
      ? [{ id, suits: identity.suits }]
      : [];
  });
}

export function hasFourDistinctSuitAssignment(
  scoringCardIds: readonly CardId[],
  identities: Readonly<Record<CardId, EffectivePlayingCardV3>>,
): boolean {
  return canMatchRoles(
    scoringCandidates(scoringCardIds, identities),
    SUITS.map((suit) => [suit]),
  );
}

export function hasDistinctClubAndOtherAssignment(
  scoringCardIds: readonly CardId[],
  identities: Readonly<Record<CardId, EffectivePlayingCardV3>>,
): boolean {
  return canMatchRoles(scoringCandidates(scoringCardIds, identities), [
    ['clubs'],
    ['hearts', 'diamonds', 'spades'],
  ]);
}
