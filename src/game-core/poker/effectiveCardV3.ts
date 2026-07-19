import { RANKS, SUITS, type PlayingCard, type Rank, type Suit } from '../model/cards';
import type { CardId } from '../model/ids';
import { isRunStateV3 } from '../model/runV3';
import type { RunPlayingCard, RunStateV2 } from '../model/runV2';

const FACE_RANKS = new Set<Rank>(['jack', 'queen', 'king']);

export interface EffectivePlayingCardV3 {
  readonly id: CardId;
  readonly printedRank: Rank;
  readonly printedSuit: Suit;
  readonly rank: Rank | null;
  readonly rankValue: number | null;
  readonly suits: readonly Suit[];
  readonly face: boolean;
  readonly wild: boolean;
  readonly stone: boolean;
  readonly debuffed: boolean;
}

function modifierHasBaseline(
  state: RunStateV2,
  modifierId: string | null,
  key: string,
): boolean {
  if (!modifierId || !isRunStateV3(state)) return false;
  return (
    state.productionContentV3.rows
      .find(({ definition }) => definition.id === modifierId)
      ?.definition.effects.some((effect) =>
        effect.operations.some(
          (operation) => operation.type === 'baseline' && operation.key === key,
        ),
      ) ?? false
  );
}

export function rankValueV3(rank: Rank): number {
  if (rank === 'ace') return 11;
  if (FACE_RANKS.has(rank)) return 10;
  return RANKS.indexOf(rank) + 2;
}

export function projectEffectivePlayingCardV3(
  state: RunStateV2,
  card: RunPlayingCard,
  options: {
    readonly allCardsFace?: boolean;
    readonly debuffedCardIds?: ReadonlySet<CardId>;
  } = {},
): EffectivePlayingCardV3 {
  const mirror = isRunStateV3(state)
    ? state.modifiersV3.playingCards.find(({ cardId }) => cardId === card.id)
    : undefined;
  const enhancementId = mirror?.enhancementId ?? card.enhancementId;
  const debuffed =
    options.debuffedCardIds?.has(card.id) === true || mirror?.debuffed === true;
  const wild = modifierHasBaseline(
    state,
    enhancementId,
    'playing-card-counts-as-all-suits',
  );
  const stone = modifierHasBaseline(
    state,
    enhancementId,
    'playing-card-has-no-effective-rank-or-suit',
  );
  return {
    id: card.id,
    printedRank: card.rank,
    printedSuit: card.suit,
    rank: stone ? null : card.rank,
    rankValue: stone ? null : rankValueV3(card.rank),
    suits: stone ? [] : wild && !debuffed ? SUITS : [card.suit],
    face: options.allCardsFace === true || FACE_RANKS.has(card.rank),
    wild,
    stone,
    debuffed,
  };
}

export function effectiveCardForPokerV3(
  card: RunPlayingCard,
  identity: EffectivePlayingCardV3,
): PlayingCard {
  return {
    id: card.id,
    suit: card.suit,
    rank: card.rank,
    enhancement: identity.stone
      ? 'stone'
      : identity.wild && !identity.debuffed
        ? 'wild'
        : 'none',
  };
}
