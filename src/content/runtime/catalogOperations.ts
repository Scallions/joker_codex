import { nextInteger, type RandomState } from '../../game-core/rng/random';
import type { CatalogEffect, CatalogOperation, CatalogTrigger } from '../schema/catalog';

export interface CatalogExecutionContext {
  readonly rngState: RandomState;
  readonly candidateIds: readonly string[];
  readonly selectedIds: readonly string[];
}

export interface MaterializedCatalogOperation {
  readonly effectId: string;
  readonly operationIndex: number;
  readonly operation: CatalogOperation;
  readonly applied: boolean;
  readonly materializedIds: readonly string[];
  readonly materializedValue: string | number | boolean | null;
}

export interface CatalogExecutionResult {
  readonly rngState: RandomState;
  readonly operations: readonly MaterializedCatalogOperation[];
}

function takeStableRandom(
  candidates: readonly string[],
  count: number,
  initialState: RandomState,
): { readonly ids: readonly string[]; readonly rngState: RandomState } {
  const pool = [...new Set(candidates)].sort((left, right) => left.localeCompare(right));
  const ids: string[] = [];
  let rngState = initialState;
  const limit = Math.min(Math.max(0, count), pool.length);
  for (let index = 0; index < limit; index += 1) {
    const draw = nextInteger(rngState, pool.length);
    const [selected] = pool.splice(draw.value, 1);
    if (selected !== undefined) ids.push(selected);
    rngState = draw.state;
  }
  return { ids, rngState };
}

function requestedCount(operation: CatalogOperation): number {
  switch (operation.type) {
    case 'card-modifier':
    case 'card-transform':
    case 'card-destroy':
    case 'card-copy':
    case 'content-create':
      return operation.count;
    default:
      return 0;
  }
}

function usesRandomSelection(operation: CatalogOperation): boolean {
  return (
    (operation.type === 'card-modifier' && operation.selection === 'random') ||
    (operation.type === 'card-transform' && operation.value === 'random-materialized') ||
    (operation.type === 'card-destroy' && operation.selection === 'random-held') ||
    (operation.type === 'card-copy' && operation.source === 'random-joker') ||
    operation.type === 'content-create'
  );
}

function selectedTargets(
  operation: CatalogOperation,
  context: CatalogExecutionContext,
  rngState: RandomState,
): { readonly ids: readonly string[]; readonly rngState: RandomState } {
  if (usesRandomSelection(operation)) {
    const requested = requestedCount(operation);
    return takeStableRandom(
      context.candidateIds,
      requested === 0 ? context.candidateIds.length : requested,
      rngState,
    );
  }
  if (
    operation.type === 'card-modifier' ||
    operation.type === 'card-transform' ||
    operation.type === 'card-destroy' ||
    operation.type === 'card-copy'
  ) {
    const count = requestedCount(operation);
    return {
      ids: count === 0 ? context.selectedIds : context.selectedIds.slice(0, count),
      rngState,
    };
  }
  return { ids: [], rngState };
}

function chance(
  operation: CatalogOperation,
  rngState: RandomState,
): { readonly applied: boolean; readonly rngState: RandomState } {
  let numerator: number | null = null;
  let denominator: number | null = null;
  if (operation.type === 'sticker-roll') {
    numerator = operation.numerator;
    denominator = operation.denominator;
  } else if (operation.type === 'score-rule') {
    numerator = operation.numerator;
    denominator = operation.denominator;
  } else if (operation.type === 'card-modifier') {
    numerator = operation.numerator ?? null;
    denominator = operation.denominator ?? null;
  }
  if (numerator === null || denominator === null) return { applied: true, rngState };
  if (numerator <= 0) return { applied: false, rngState };
  if (numerator >= denominator) return { applied: true, rngState };
  const draw = nextInteger(rngState, denominator);
  return { applied: draw.value < numerator, rngState: draw.state };
}

function materializedValue(
  operation: CatalogOperation,
): string | number | boolean | null {
  switch (operation.type) {
    case 'baseline':
      return operation.key;
    case 'passive-capability':
      return operation.value;
    case 'joker-score':
      return operation.metric;
    case 'joker-retrigger-card':
      return operation.count;
    case 'joker-create-content':
      return operation.family;
    case 'joker-create-playing-card':
      return operation.enhancementId;
    case 'joker-destroy-right-grow':
      return operation.stateKey;
    case 'joker-destroy-source':
      return operation.observationKey;
    case 'joker-state-change':
      return operation.key;
    case 'joker-level-current-hand':
      return operation.levels;
    case 'joker-sell-value-add':
      return operation.amount;
    case 'joker-round-resource':
      return operation.value;
    case 'joker-clone-played-card':
      return operation.snapshot;
    case 'joker-add-card-bonus':
      return operation.amount;
    case 'joker-transform-enhancement':
      return operation.enhancementId;
    case 'joker-destroy-event-card':
      return operation.target;
    case 'joker-random-destroy-other':
      return operation.excludePermanent;
    case 'joker-state-change-clamped':
      return operation.key;
    case 'joker-set-target':
      return operation.policy;
    case 'joker-inventory-sell-value-add':
      return operation.amount;
    case 'joker-create-fixed-tag':
      return operation.tagContentId;
    case 'joker-disable-current-boss':
      return true;
    case 'joker-passive-capability':
      return operation.capability;
    case 'joker-runtime-action':
      return operation.action;
    case 'joker-after-rarity':
      return operation.factor;
    case 'joker-record-observation':
      return operation.key;
    case 'rule-patch':
      return operation.value;
    case 'deck-recipe':
      return operation.count;
    case 'target-curve':
      return operation.curveId;
    case 'sticker-roll':
      return operation.stickerId;
    case 'card-modifier':
      return operation.modifierId;
    case 'card-transform':
      return operation.value;
    case 'card-destroy':
      return operation.count;
    case 'card-copy':
      return operation.count;
    case 'playing-card-create':
      return operation.count;
    case 'content-create':
      return operation.family;
    case 'money':
      return operation.amount;
    case 'hand-level':
      return operation.levels;
    case 'score-rule':
      return operation.amount;
    case 'shop-rule':
      return operation.value;
    case 'pack-rule':
      return operation.profileId;
    case 'blind-rule':
      return operation.value;
    case 'tag-rule':
      return operation.value;
    case 'restriction':
      return operation.key;
  }
}

export function executeCatalogEffects(
  effects: readonly CatalogEffect[],
  trigger: CatalogTrigger,
  context: CatalogExecutionContext,
): CatalogExecutionResult {
  const queued = effects
    .filter((effect) => effect.trigger === trigger || effect.trigger === 'passive')
    .sort(
      (left, right) => left.priority - right.priority || left.id.localeCompare(right.id),
    );
  const materialized: MaterializedCatalogOperation[] = [];
  let rngState = context.rngState;

  for (const effect of queued) {
    for (const [operationIndex, operation] of effect.operations.entries()) {
      const targets = selectedTargets(operation, context, rngState);
      rngState = targets.rngState;
      const check = chance(operation, rngState);
      rngState = check.rngState;
      materialized.push({
        effectId: effect.id,
        operationIndex,
        operation,
        applied: check.applied,
        materializedIds: targets.ids,
        materializedValue: materializedValue(operation),
      });
    }
  }

  return { rngState, operations: materialized };
}
