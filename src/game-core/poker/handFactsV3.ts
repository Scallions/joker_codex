import type { CardId } from '../model/ids';
import type { RunPlayingCard, RunStateV2 } from '../model/runV2';
import {
  resolveJokerPassiveCapabilities,
  type JokerPassiveCapabilityResolutionV3,
} from '../rules/jokerPassiveCapabilitiesV3';
import {
  effectiveCardForPokerV3,
  projectEffectivePlayingCardV3,
  type EffectivePlayingCardV3,
} from './effectiveCardV3';
import { detectPokerCandidates, evaluatePokerHand, type PokerHandType } from './evaluate';

export interface HandFactsV3 {
  readonly contains: {
    readonly pair: boolean;
    readonly threeOfAKind: boolean;
    readonly fourOfAKind: boolean;
    readonly twoPair: boolean;
    readonly straight: boolean;
    readonly flush: boolean;
  };
  readonly displayedHand: PokerHandType;
  readonly playedCardIds: readonly CardId[];
  readonly scoringCardIds: readonly CardId[];
  readonly heldCardIds: readonly CardId[];
  readonly selectedHeldCardId: CardId | null;
  readonly effectiveCards: Readonly<Record<CardId, EffectivePlayingCardV3>>;
  readonly rules: {
    readonly straightSize: number;
    readonly flushSize: number;
    readonly straightMaximumStep: 1 | 2;
  };
}

export type HandFactsResolutionV3 =
  | { readonly ok: true; readonly facts: HandFactsV3 }
  | Extract<JokerPassiveCapabilityResolutionV3, { readonly ok: false }>;

export function buildHandFactsV3(
  state: RunStateV2,
  playedCards: readonly RunPlayingCard[],
  heldCards: readonly RunPlayingCard[],
  options: { readonly debuffedCardIds?: ReadonlySet<CardId> } = {},
): HandFactsResolutionV3 {
  const passives = resolveJokerPassiveCapabilities(state);
  if (!passives.ok) return passives;
  const allCards = [...playedCards, ...heldCards];
  const effectiveCards = Object.fromEntries(
    allCards.map((card) => [
      card.id,
      projectEffectivePlayingCardV3(state, card, {
        allCardsFace: passives.capabilities.allCardsFace,
        suitColorEquivalence: passives.capabilities.suitColorEquivalence,
        ...(options.debuffedCardIds ? { debuffedCardIds: options.debuffedCardIds } : {}),
      }),
    ]),
  ) as Record<CardId, EffectivePlayingCardV3>;
  const pokerCards = playedCards.map((card) =>
    effectiveCardForPokerV3(card, effectiveCards[card.id]!),
  );
  const context = {
    straightSize: passives.capabilities.straightSize,
    flushSize: passives.capabilities.flushSize,
    straightMaximumStep: passives.capabilities.straightMaximumStep,
    handLevels: state.rules.handLevels,
    suitCandidates: Object.fromEntries(
      Object.entries(effectiveCards).map(([cardId, identity]) => [
        cardId,
        identity.suits,
      ]),
    ),
  };
  const candidates = detectPokerCandidates(pokerCards, context);
  const evaluation = evaluatePokerHand(pokerCards, context);
  const candidateTypes = new Set(candidates.map(({ type }) => type));
  const selectedHeldCardId =
    heldCards
      .map((card, index) => ({
        card,
        index,
        rankValue: effectiveCards[card.id]!.rankValue,
      }))
      .filter(
        (entry): entry is typeof entry & { readonly rankValue: number } =>
          entry.rankValue !== null,
      )
      .sort(
        (left, right) => left.rankValue - right.rankValue || right.index - left.index,
      )[0]?.card.id ?? null;

  return {
    ok: true,
    facts: {
      contains: {
        pair: candidateTypes.has('pair'),
        threeOfAKind: candidateTypes.has('three-of-a-kind'),
        fourOfAKind: candidateTypes.has('four-of-a-kind'),
        twoPair: candidateTypes.has('two-pair'),
        straight: candidateTypes.has('straight'),
        flush: candidateTypes.has('flush'),
      },
      displayedHand: evaluation.type,
      playedCardIds: playedCards.map(({ id }) => id),
      scoringCardIds: passives.capabilities.allPlayedCardsScore
        ? playedCards.map(({ id }) => id)
        : evaluation.scoringCardIds,
      heldCardIds: heldCards.map(({ id }) => id),
      selectedHeldCardId,
      effectiveCards,
      rules: {
        straightSize: passives.capabilities.straightSize,
        flushSize: passives.capabilities.flushSize,
        straightMaximumStep: passives.capabilities.straightMaximumStep,
      },
    },
  };
}
