import type { JokerEventContextV5 } from '../rules/jokerEventFactsV5';
import type { CardId } from '../model/ids';
import { isRunStateV3 } from '../model/runV3';
import type { RunStateV2 } from '../model/runV2';
import { projectEffectivePlayingCardV3 } from '../poker/effectiveCardV3';
import { resolveJokerPassiveCapabilities } from '../rules/jokerPassiveCapabilitiesV3';
import type { EffectQueueFailureCode } from './registry';

export type PlayingCardDestructionProposalV6 =
  | {
      readonly ok: true;
      readonly state: RunStateV2;
      readonly eventContext: JokerEventContextV5;
    }
  | {
      readonly ok: false;
      readonly code: EffectQueueFailureCode | 'pool-empty';
      readonly message: string;
    };

export function removePlayingCardReferencesV6(
  state: RunStateV2,
  removed: ReadonlySet<CardId>,
): RunStateV2 {
  return {
    ...state,
    deck: { cards: state.deck.cards.filter(({ id }) => !removed.has(id)) },
    round: state.round
      ? {
          ...state.round,
          drawPileIds: state.round.drawPileIds.filter((id) => !removed.has(id)),
          handIds: state.round.handIds.filter((id) => !removed.has(id)),
          playedIds: state.round.playedIds.filter((id) => !removed.has(id)),
          discardPileIds: state.round.discardPileIds.filter((id) => !removed.has(id)),
          selectedCardIds: state.round.selectedCardIds.filter((id) => !removed.has(id)),
          forcedSelectedCardIds: state.round.forcedSelectedCardIds.filter(
            (id) => !removed.has(id),
          ),
          faceDownCardIds: state.round.faceDownCardIds.filter((id) => !removed.has(id)),
        }
      : null,
    ...(isRunStateV3(state)
      ? {
          modifiersV3: {
            ...state.modifiersV3,
            playingCards: state.modifiersV3.playingCards.filter(
              ({ cardId }) => !removed.has(cardId),
            ),
          },
        }
      : {}),
  };
}

export function preparePlayingCardDestructionV6(
  state: RunStateV2,
  cardIds: readonly CardId[],
  reason: string,
): PlayingCardDestructionProposalV6 {
  const unique = new Set(cardIds);
  if (unique.size !== cardIds.length) {
    return {
      ok: false,
      code: 'pool-empty',
      message: '永久摧毁请求包含重复戏牌',
    };
  }
  const cards = cardIds.map((cardId) => state.deck.cards.find(({ id }) => id === cardId));
  if (cards.some((card) => card === undefined)) {
    return {
      ok: false,
      code: 'pool-empty',
      message: '永久摧毁请求引用了不存在的戏牌',
    };
  }
  const passives = resolveJokerPassiveCapabilities(state);
  if (!passives.ok) return passives;
  const identities = Object.fromEntries(
    cards.flatMap((card) =>
      card
        ? [
            [
              card.id,
              projectEffectivePlayingCardV3(state, card, {
                allCardsFace: passives.capabilities.allCardsFace,
                suitColorEquivalence: passives.capabilities.suitColorEquivalence,
              }),
            ] as const,
          ]
        : [],
    ),
  );
  const enhancements = Object.fromEntries(
    cards.flatMap((card) => {
      if (!card) return [];
      const mirror = isRunStateV3(state)
        ? state.modifiersV3.playingCards.find(({ cardId }) => cardId === card.id)
        : undefined;
      return [[card.id, mirror?.enhancementId ?? card.enhancementId] as const];
    }),
  );
  return {
    ok: true,
    state: removePlayingCardReferencesV6(state, unique),
    eventContext: {
      eventFacts: { kind: 'playing-card-destroyed', cardIds, reason },
      eventCardIdentities: identities,
      eventCardEnhancementIds: enhancements,
    },
  };
}
