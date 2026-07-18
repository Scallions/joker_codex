import type { CatalogRow } from '../schema/catalog';

export type AcquisitionSource = 'shop' | 'pack' | 'generated' | 'free' | 'challenge';

export interface EligibilityContext {
  readonly source: AcquisitionSource;
  readonly ante: number;
  readonly challengeId: string | null;
  readonly ownedContentIds: ReadonlySet<string>;
  readonly offeredContentIds: ReadonlySet<string>;
  readonly playedHandIds: ReadonlySet<string>;
  readonly completedObjectiveIds: ReadonlySet<string>;
  readonly discoveredContentIds: ReadonlySet<string>;
  readonly availableExternalIds: ReadonlySet<string>;
  readonly bannedContentIds: ReadonlySet<string>;
  readonly excludedFamilies: ReadonlySet<CatalogRow['family']>;
  readonly allowDuplicates: boolean;
}

export type EligibilityResult =
  { readonly eligible: true } | { readonly eligible: false; readonly reason: string };

export function catalogRowIsExcludedBySemanticRules(
  row: CatalogRow,
  ruleKeys: ReadonlySet<string>,
): boolean {
  const operations = row.effects.flatMap((effect) => effect.operations);
  if (
    ruleKeys.has('discount-voucher-pair') &&
    row.family === 'voucher' &&
    operations.some(
      (operation) =>
        operation.type === 'shop-rule' && operation.key === 'discount-basis-points',
    )
  ) {
    return true;
  }
  if (
    ruleKeys.has('hand-count-increase') &&
    operations.some(
      (operation) =>
        operation.type === 'rule-patch' &&
        operation.key === 'hands-per-round' &&
        operation.mode === 'add' &&
        typeof operation.value === 'number' &&
        operation.value > 0,
    )
  ) {
    return true;
  }
  if (
    ruleKeys.has('face-debuff-boss') &&
    row.family === 'blind' &&
    operations.some(
      (operation) =>
        operation.type === 'card-transform' &&
        operation.field === 'debuff' &&
        operation.value === 'face-card',
    )
  ) {
    return true;
  }
  if (
    ruleKeys.has('sell-to-enable-finisher') &&
    row.family === 'blind' &&
    operations.some(
      (operation) =>
        operation.type === 'blind-rule' && operation.key === 'debuff-until-joker-sold',
    )
  ) {
    return true;
  }
  if (
    ruleKeys.has('add-non-glass-card') &&
    operations.some((operation) => operation.type === 'playing-card-create')
  ) {
    return true;
  }
  if (
    ruleKeys.has('overwrite-glass') &&
    operations.some(
      (operation) =>
        operation.type === 'card-modifier' &&
        operation.family === 'enhancement' &&
        operation.modifierId !== 'bxqp:enhancement:glass-ribbon',
    )
  ) {
    return true;
  }
  if (ruleKeys.has('no-joker-routes')) {
    if (
      row.externalDependencyIds.length > 0 ||
      row.family === 'tarot' ||
      row.family === 'spectral'
    ) {
      return true;
    }
    if (
      operations.some(
        (operation) =>
          (operation.type === 'content-create' && operation.family === 'joker') ||
          (operation.type === 'tag-rule' &&
            ['free-joker', 'edition-joker'].includes(operation.key)) ||
          (operation.type === 'blind-rule' &&
            [
              'conceal-reorder-jokers',
              'debuff-until-joker-sold',
              'disable-random-joker',
            ].includes(operation.key)),
      )
    ) {
      return true;
    }
  }
  return false;
}

export function catalogEligibility(
  row: CatalogRow,
  context: EligibilityContext,
): EligibilityResult {
  if (context.bannedContentIds.has(row.id)) {
    return { eligible: false, reason: 'content-banned' };
  }
  if (context.excludedFamilies.has(row.family)) {
    return { eligible: false, reason: 'family-excluded' };
  }
  if (
    !context.allowDuplicates &&
    (context.ownedContentIds.has(row.id) || context.offeredContentIds.has(row.id))
  ) {
    return { eligible: false, reason: 'duplicate-excluded' };
  }
  if (row.prerequisiteIds.some((id) => !context.ownedContentIds.has(id))) {
    return { eligible: false, reason: 'prerequisite-missing' };
  }
  if (row.externalDependencyIds.some((id) => !context.availableExternalIds.has(id))) {
    return { eligible: false, reason: 'external-dependency-missing' };
  }
  switch (row.availability.kind) {
    case 'always':
      break;
    case 'minimum-ante':
      if (context.ante < row.availability.value) {
        return { eligible: false, reason: 'ante-too-low' };
      }
      break;
    case 'prerequisite':
      if (!context.ownedContentIds.has(row.availability.value)) {
        return { eligible: false, reason: 'prerequisite-missing' };
      }
      break;
    case 'hand-played':
      if (!context.playedHandIds.has(row.availability.value)) {
        return { eligible: false, reason: 'hand-undiscovered' };
      }
      break;
    case 'challenge-only':
      if (context.challengeId !== row.availability.value) {
        return { eligible: false, reason: 'wrong-challenge' };
      }
      break;
    case 'profile-objective':
      if (!context.completedObjectiveIds.has(row.availability.value)) {
        return { eligible: false, reason: 'objective-incomplete' };
      }
      break;
  }
  if (
    row.discovery.kind === 'profile-objective' &&
    !context.completedObjectiveIds.has(row.discovery.value)
  ) {
    return { eligible: false, reason: 'undiscovered' };
  }
  if (
    row.discovery.kind === 'after-use' &&
    !context.discoveredContentIds.has(row.discovery.value)
  ) {
    return { eligible: false, reason: 'undiscovered' };
  }
  return { eligible: true };
}

export function eligibleCatalogRows(
  rows: readonly CatalogRow[],
  context: EligibilityContext,
): readonly CatalogRow[] {
  return rows
    .filter((row) => catalogEligibility(row, context).eligible)
    .sort((left, right) => left.id.localeCompare(right.id));
}
