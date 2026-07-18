import type { CardId } from '../model/ids';
import type { OwnedTagV2, RoundStateV2, RunStateV2 } from '../model/runV2';
import type { RandomState } from '../rng/random';
import { pickStable } from '../rng/weighted';
import { resolveEffectOperations, type EffectOperation } from './registry';

export type RoundStartResolutionV2 =
  | {
      readonly ok: true;
      readonly round: RoundStateV2;
      readonly rngState: RandomState;
      readonly tags: readonly OwnedTagV2[];
    }
  | {
      readonly ok: false;
      readonly code: 'effect-handler-missing';
      readonly message: string;
    };

function chooseStableCardIds(
  candidates: readonly CardId[],
  requestedCount: number,
  initialState: RandomState,
): { readonly ids: readonly CardId[]; readonly rngState: RandomState } {
  const remaining = [...candidates];
  const ids: CardId[] = [];
  let rngState = initialState;
  const count = Math.max(0, Math.min(requestedCount, remaining.length));
  for (let index = 0; index < count; index += 1) {
    const draw = pickStable(remaining, (cardId) => cardId, rngState);
    ids.push(draw.value);
    remaining.splice(remaining.indexOf(draw.value), 1);
    rngState = draw.state;
  }
  return { ids, rngState };
}

function applyOperation(
  round: RoundStateV2,
  operation: EffectOperation,
  rngState: RandomState,
): { readonly round: RoundStateV2; readonly rngState: RandomState } {
  switch (operation.type) {
    case 'set-discards':
      return {
        round: { ...round, discardsRemaining: Math.max(0, operation.value) },
        rngState,
      };
    case 'set-hands':
      return {
        round: { ...round, handsRemaining: Math.max(0, operation.value) },
        rngState,
      };
    case 'add-hands':
      return {
        round: {
          ...round,
          handsRemaining: Math.max(0, round.handsRemaining + operation.amount),
        },
        rngState,
      };
    case 'adjust-hand-size': {
      if (operation.amount === 0) return { round, rngState };
      if (operation.amount > 0) {
        const count = Math.min(operation.amount, round.drawPileIds.length);
        return {
          round: {
            ...round,
            handIds: [...round.handIds, ...round.drawPileIds.slice(0, count)],
            drawPileIds: round.drawPileIds.slice(count),
          },
          rngState,
        };
      }
      const count = Math.min(-operation.amount, round.handIds.length);
      const kept = round.handIds.slice(0, round.handIds.length - count);
      const returned = round.handIds.slice(round.handIds.length - count);
      return {
        round: {
          ...round,
          handIds: kept,
          drawPileIds: [...returned, ...round.drawPileIds],
          selectedCardIds: round.selectedCardIds.filter((id) => kept.includes(id)),
          forcedSelectedCardIds: round.forcedSelectedCardIds.filter((id) =>
            kept.includes(id),
          ),
        },
        rngState,
      };
    }
    case 'draw-face-down': {
      const chosen = chooseStableCardIds(round.handIds, operation.count, rngState);
      return {
        round: { ...round, faceDownCardIds: chosen.ids },
        rngState: chosen.rngState,
      };
    }
    case 'force-card-choice': {
      const chosen = chooseStableCardIds(round.handIds, operation.count, rngState);
      return {
        round: {
          ...round,
          forcedSelectedCardIds: chosen.ids,
          selectedCardIds: chosen.ids,
        },
        rngState: chosen.rngState,
      };
    }
    default:
      return { round, rngState };
  }
}

export function applyRoundStartEffectsV2(
  state: RunStateV2,
  initialRound: RoundStateV2,
  initialRngState: RandomState,
): RoundStartResolutionV2 {
  let round = initialRound;
  let rngState = initialRngState;
  const blindEffects = initialRound.blind.effects
    .filter((effect) => effect.windows.includes('round-start'))
    .sort(
      (left, right) => left.priority - right.priority || left.id.localeCompare(right.id),
    );
  for (const effect of blindEffects) {
    const resolved = resolveEffectOperations(effect, 'round-start', state);
    if (!resolved.ok) return resolved;
    for (const operation of resolved.operations) {
      ({ round, rngState } = applyOperation(round, operation, rngState));
    }
  }

  const consumedTagInstances = new Set<string>();
  for (const tag of state.inventory.tags) {
    if (tag.consumed || tag.deferredWindow !== 'round-start') continue;
    const definition = state.content.tags.find(
      (candidate) => candidate.id === tag.contentId,
    );
    const effects = definition?.effects
      .filter((effect) => effect.windows.includes('round-start'))
      .sort(
        (left, right) =>
          left.priority - right.priority || left.id.localeCompare(right.id),
      );
    if (!effects?.length) continue;
    for (const effect of effects) {
      const resolved = resolveEffectOperations(effect, 'round-start', state);
      if (!resolved.ok) return resolved;
      for (const operation of resolved.operations) {
        ({ round, rngState } = applyOperation(round, operation, rngState));
      }
    }
    consumedTagInstances.add(tag.instanceId);
  }

  return {
    ok: true,
    round,
    rngState,
    tags: state.inventory.tags.map((tag) =>
      consumedTagInstances.has(tag.instanceId) ? { ...tag, consumed: true } : tag,
    ),
  };
}
