import type { CatalogOperation, CatalogTrigger } from '../../content/schema/catalog';
import {
  acquireContentByIdV3,
  applyStateOperationV3,
} from '../effects/applyStateOperationV3';
import type { CardId } from '../model/ids';
import { isRunStateV3 } from '../model/runV3';
import type { RunPlayingCard, RunStateV2 } from '../model/runV2';
import { projectEffectivePlayingCardV3 } from '../poker/effectiveCardV3';
import { resolveJokerPassiveCapabilities } from './jokerPassiveCapabilitiesV3';
import { usedConsumableSlotsForRun } from './inventoryCapacityV6';

function modifierOperations(
  state: RunStateV2,
  card: RunPlayingCard,
  trigger: CatalogTrigger,
): readonly {
  readonly sourceId: string;
  readonly effectId: string;
  readonly operation: CatalogOperation;
}[] {
  if (!isRunStateV3(state)) return [];
  const modifierIds = [card.enhancementId, card.sealId, card.editionId].filter(
    (id): id is string => id !== null,
  );
  return modifierIds.flatMap((modifierId) => {
    const row = state.productionContentV3.rows.find(
      ({ definition }) => definition.id === modifierId,
    )?.definition;
    if (!row) return [];
    return row.effects.flatMap((effect) =>
      effect.trigger === trigger
        ? effect.operations.map((operation) => ({
            sourceId: row.id,
            effectId: effect.id,
            operation,
          }))
        : [],
    );
  });
}

function cardIsDebuffed(state: RunStateV2, card: RunPlayingCard): boolean {
  if (
    isRunStateV3(state) &&
    state.modifiersV3.playingCards.some(
      (modifier) => modifier.cardId === card.id && modifier.debuffed,
    )
  ) {
    return true;
  }
  const passives = resolveJokerPassiveCapabilities(state);
  const effective = projectEffectivePlayingCardV3(state, card, {
    allCardsFace: passives.ok && passives.capabilities.allCardsFace,
  });
  return (state.round?.blind.effects ?? []).some((effect) => {
    if (effect.parameters.field !== 'debuff') return false;
    const value = effect.parameters.value;
    return (
      value === true ||
      value === card.suit ||
      (value === 'face-card' && effective.face) ||
      (effect.parameters.selection === 'played-this-ante' &&
        state.history.playedCardIdsThisAnte.includes(card.id))
    );
  });
}

function matchingPlanetId(state: RunStateV2): string | null {
  if (!isRunStateV3(state) || !state.lastHand) return null;
  return (
    state.productionContentV3.rows.find(
      ({ definition }) =>
        definition.family === 'planet' &&
        definition.effects.some((effect) =>
          effect.operations.some(
            (operation) =>
              operation.type === 'hand-level' &&
              operation.hand === state.lastHand?.handType,
          ),
        ),
    )?.definition.id ?? null
  );
}

export function applyDiscardModifierLifecycleV3(
  state: RunStateV2,
  discardedIds: readonly CardId[],
): RunStateV2 {
  if (!isRunStateV3(state)) return state;
  const cardMap = new Map(state.deck.cards.map((card) => [card.id, card]));
  let next: RunStateV2 = state;
  for (const cardId of discardedIds) {
    const card = cardMap.get(cardId);
    if (!card || cardIsDebuffed(next, card)) continue;
    for (const entry of modifierOperations(next, card, 'discard')) {
      if (
        entry.operation.type !== 'content-create' ||
        entry.operation.family !== 'tarot' ||
        usedConsumableSlotsForRun(next) >= next.rules.consumableSlots
      ) {
        continue;
      }
      const created = applyStateOperationV3(
        next,
        {
          type: 'create-content-family',
          family: 'tarot',
          count: entry.operation.count,
          rarity: entry.operation.rarity,
          capacityRequired: entry.operation.capacityRequired,
          stickerPolicy: entry.operation.stickerPolicy,
        },
        {
          window: 'discard',
          sourceInstanceId: card.id,
          effectId: entry.effectId,
        },
      );
      if (created.ok) next = created.state;
    }
  }
  return next;
}

export function applyRoundEndModifierLifecycleV3(state: RunStateV2): RunStateV2 {
  if (!isRunStateV3(state) || !state.round) return state;
  const cardMap = new Map(state.deck.cards.map((card) => [card.id, card]));
  let next: RunStateV2 = state;
  for (const cardId of state.round.handIds) {
    const card = cardMap.get(cardId);
    if (!card || cardIsDebuffed(next, card)) continue;
    for (const entry of modifierOperations(next, card, 'round-end')) {
      if (entry.operation.type === 'money' && entry.operation.mode === 'add') {
        next = {
          ...next,
          economy: {
            ...next.economy,
            money: next.economy.money + entry.operation.amount,
          },
        };
      }
      if (
        entry.operation.type === 'baseline' &&
        entry.operation.key === 'create-planet-for-final-hand-if-capacity' &&
        usedConsumableSlotsForRun(next) < next.rules.consumableSlots
      ) {
        const planetId = matchingPlanetId(next);
        if (!planetId) continue;
        const acquired = acquireContentByIdV3(
          next,
          planetId,
          `held-seal:${next.runId}:${next.checkpointId + 1}:${card.id}`,
        );
        if (acquired.ok) next = acquired.state;
      }
    }
  }
  return next;
}
