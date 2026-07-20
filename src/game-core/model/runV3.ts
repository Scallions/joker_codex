import type { BoosterProfile, CatalogRow } from '../../content/schema/catalog';
import type { CardId, JokerInstanceId } from './ids';
import type { RunStateV2 } from './runV2';
import type { RunStateV5 } from './runV5';
import type { RunStateV6 } from './runV6';
import { nextInteger } from '../rng/random';

export const RUN_SCHEMA_VERSION_V3 = 3 as const;
export const CONTENT_VERSION_V3 = 'catalog-baseline-3' as const;

export interface RunSetupIdentityV3 {
  readonly deckId: string;
  readonly stakeId: string;
  readonly appliedStakeIds: readonly string[];
  readonly challengeId: string | null;
  readonly rulePatchEffectIds: readonly string[];
}

export interface RunCatalogRowSnapshotV3 {
  readonly definition: CatalogRow;
  readonly name: string;
  readonly description: string;
}

export interface RunContentSnapshotV3 {
  readonly contentVersion: RunStateV2['contentVersion'];
  readonly rows: readonly RunCatalogRowSnapshotV3[];
  readonly boosterProfiles: readonly BoosterProfile[];
}

export interface PlayingCardModifierStateV3 {
  readonly cardId: CardId;
  readonly enhancementId: string | null;
  readonly sealId: string | null;
  readonly editionId: string | null;
  readonly debuffed: boolean;
}

export interface JokerModifierStateV3 {
  readonly instanceId: JokerInstanceId;
  readonly stickerIds: readonly string[];
  readonly perishableRoundsRemaining: number | null;
  readonly rentalRoundCost: number;
  readonly saleAllowed: boolean;
  readonly slotContribution: number;
}

export interface RunModifiersV3 {
  readonly playingCards: readonly PlayingCardModifierStateV3[];
  readonly jokers: readonly JokerModifierStateV3[];
}

export interface RunRulesV3 {
  readonly targetCurveId: 'baseline' | 'green' | 'purple';
  readonly anteOneThroughEightTargets: readonly number[];
  readonly blindRewardPolicy: 'normal' | 'small-zero' | 'small-big-zero' | 'all-zero';
  readonly remainingHandReward: number;
  readonly remainingDiscardReward: number;
  readonly discardCost: number;
  readonly priceInflationPerPurchase: number;
  readonly purchasesMade: number;
  readonly shopFamilyWeightMultipliers: Readonly<Record<string, number>>;
  readonly playingCardsInShop: boolean;
  readonly jokersInShop: boolean;
  readonly bossRerollCost: number | null;
  readonly bossRerollLimitPerAnte: number | null;
  readonly bannedContentIds: readonly string[];
  readonly excludedRuleKeys: readonly string[];
  readonly stickerRuleIds: readonly string[];
}

export interface ExternalDependencyStateV3 {
  readonly requiredIds: readonly string[];
  readonly resolvedIds: readonly string[];
  readonly validationMode: 'catalog-child' | 'integration-strict';
}

export interface MaterializedChoiceV3 {
  readonly id: string;
  readonly kind: string;
  readonly valueIds: readonly string[];
  readonly valueNumbers: readonly number[];
  readonly checkpointId: number;
}

export interface MigrationMetadataV3 {
  readonly sourceSchemaVersion: 1 | 2 | 3;
  readonly sourceContentVersion: string;
  readonly sourceCheckpointId: number;
  readonly recoveryFingerprint: string;
}

export interface RunStateV3 extends RunStateV2 {
  readonly schemaVersion: typeof RUN_SCHEMA_VERSION_V3;
  readonly contentVersion: 'run-economy-2' | typeof CONTENT_VERSION_V3;
  readonly mode: 'migrated-run-economy' | 'production-campaign' | 'production-challenge';
  readonly setupV3: RunSetupIdentityV3;
  readonly productionContentV3: RunContentSnapshotV3;
  readonly rulesV3: RunRulesV3;
  readonly modifiersV3: RunModifiersV3;
  readonly externalDependenciesV3: ExternalDependencyStateV3;
  readonly materializedChoicesV3: readonly MaterializedChoiceV3[];
  readonly migrationV3: MigrationMetadataV3;
}

export const RUN_SCHEMA_VERSION_V4 = 4 as const;
export const CONTENT_VERSION_V4 = 'joker-catalog-1' as const;

export type AbilityStateValueV4 = string | number | boolean;

export interface JokerModifierStateV4 extends JokerModifierStateV3 {
  readonly abilityState: Readonly<Record<string, AbilityStateValueV4>>;
}

export interface RunModifiersV4 extends Omit<RunModifiersV3, 'jokers'> {
  readonly jokers: readonly JokerModifierStateV4[];
}

export interface MigrationMetadataV4 {
  readonly sourceSchemaVersion: 1 | 2 | 3 | 4;
  readonly sourceContentVersion: string;
  readonly sourceCheckpointId: number;
  readonly recoveryFingerprint: string;
}

export type RunStateV4 = Omit<
  RunStateV3,
  'schemaVersion' | 'contentVersion' | 'modifiersV3'
> & {
  readonly schemaVersion: typeof RUN_SCHEMA_VERSION_V4;
  readonly contentVersion:
    'run-economy-2' | 'catalog-baseline-3' | typeof CONTENT_VERSION_V4;
  readonly modifiersV3: RunModifiersV4;
  readonly migrationV4: MigrationMetadataV4;
};

export type AbilityStateRun = RunStateV4 | RunStateV5 | RunStateV6;
export type CatalogRunState = Omit<
  RunStateV3,
  'schemaVersion' | 'contentVersion' | 'modifiersV3'
> & {
  readonly schemaVersion:
    typeof RUN_SCHEMA_VERSION_V3 | typeof RUN_SCHEMA_VERSION_V4 | 5 | 6;
  readonly contentVersion:
    | 'run-economy-2'
    | typeof CONTENT_VERSION_V3
    | typeof CONTENT_VERSION_V4
    | 'joker-catalog-2'
    | 'joker-catalog-3';
  readonly modifiersV3: RunModifiersV3;
  readonly migrationV4?: MigrationMetadataV4;
  readonly jokerRuntimeV5?: RunStateV5['jokerRuntimeV5'];
  readonly migrationV5?: RunStateV5['migrationV5'];
  readonly jokerRuntimeV6?: RunStateV6['jokerRuntimeV6'];
  readonly migrationV6?: RunStateV6['migrationV6'];
};

export function isLegacyRunStateV3(run: RunStateV2): run is RunStateV3 {
  return (
    run.schemaVersion === RUN_SCHEMA_VERSION_V3 &&
    'setupV3' in run &&
    'productionContentV3' in run &&
    'rulesV3' in run &&
    'modifiersV3' in run &&
    'externalDependenciesV3' in run &&
    'materializedChoicesV3' in run &&
    'migrationV3' in run
  );
}

export function isRunStateV4(run: RunStateV2): run is RunStateV4 {
  return (
    run.schemaVersion === RUN_SCHEMA_VERSION_V4 &&
    'setupV3' in run &&
    'productionContentV3' in run &&
    'rulesV3' in run &&
    'modifiersV3' in run &&
    'externalDependenciesV3' in run &&
    'materializedChoicesV3' in run &&
    'migrationV3' in run &&
    'migrationV4' in run
  );
}

export function isAbilityStateRun(run: RunStateV2): run is AbilityStateRun {
  return (
    isRunStateV4(run) ||
    ((run.schemaVersion === 5 || run.schemaVersion === 6) &&
      'setupV3' in run &&
      'productionContentV3' in run &&
      'rulesV3' in run &&
      'modifiersV3' in run &&
      'externalDependenciesV3' in run &&
      'materializedChoicesV3' in run &&
      'migrationV3' in run &&
      'migrationV4' in run &&
      'jokerRuntimeV5' in run &&
      'migrationV5' in run &&
      (run.schemaVersion !== 6 || ('jokerRuntimeV6' in run && 'migrationV6' in run)))
  );
}

export function isCatalogRunState(run: RunStateV2): run is CatalogRunState {
  return isLegacyRunStateV3(run) || isAbilityStateRun(run);
}

/** Compatibility guard used by V3-era engine services; includes V4 runs. */
export function isRunStateV3(run: RunStateV2): run is CatalogRunState {
  return isCatalogRunState(run);
}

function isJokerModifierStateV4(
  modifier: JokerModifierStateV3 | JokerModifierStateV4,
): modifier is JokerModifierStateV4 {
  return 'abilityState' in modifier;
}

function defaultJokerModifier(
  run: CatalogRunState,
  instanceId: JokerInstanceId,
): JokerModifierStateV3 | JokerModifierStateV4 {
  const joker = run.inventory.jokers.find(
    (candidate) => candidate.instanceId === instanceId,
  );
  const base: JokerModifierStateV3 = {
    instanceId,
    stickerIds: [],
    perishableRoundsRemaining: null,
    rentalRoundCost: 0,
    saleAllowed: true,
    slotContribution: joker?.slotContribution ?? 1,
  };
  if (!isAbilityStateRun(run)) return base;
  const definition = joker
    ? run.content.items.find(
        (item) => item.kind === 'joker' && item.contentId === joker.contentId,
      )
    : undefined;
  return {
    ...base,
    abilityState: {
      ...(definition?.kind === 'joker' ? (definition.initialAbilityState ?? {}) : {}),
    },
  };
}

/** Keep the V3 modifier mirror aligned after a V2-compatible command updates cards. */
export function synchronizeRunStateV3(run: RunStateV2): RunStateV2 {
  if (!isCatalogRunState(run)) return run;
  const cardModifiers = new Map(
    run.modifiersV3.playingCards.map((modifier) => [modifier.cardId, modifier]),
  );
  const jokerModifiers = new Map(
    run.modifiersV3.jokers.map((modifier) => [modifier.instanceId, modifier]),
  );
  const playingCards = run.deck.cards.map((card) => ({
    cardId: card.id,
    enhancementId: card.enhancementId,
    sealId: card.sealId,
    editionId: card.editionId,
    debuffed: cardModifiers.get(card.id)?.debuffed ?? false,
  }));
  if (isAbilityStateRun(run)) {
    const synchronized: AbilityStateRun = {
      ...run,
      modifiersV3: {
        playingCards,
        jokers: run.inventory.jokers.map((joker) => {
          const existing =
            jokerModifiers.get(joker.instanceId) ??
            defaultJokerModifier(run, joker.instanceId);
          const modifier = isJokerModifierStateV4(existing)
            ? existing
            : defaultJokerModifier(run, joker.instanceId);
          if (!isJokerModifierStateV4(modifier)) {
            throw new Error('V4 奇牌缺少能力状态');
          }
          return { ...modifier, slotContribution: joker.slotContribution };
        }),
      },
    };
    return synchronized;
  }
  const synchronized: CatalogRunState = {
    ...run,
    modifiersV3: {
      playingCards,
      jokers: run.inventory.jokers.map((joker) => {
        const existing =
          jokerModifiers.get(joker.instanceId) ??
          defaultJokerModifier(run, joker.instanceId);
        return { ...existing, slotContribution: joker.slotContribution };
      }),
    },
  };
  return synchronized;
}

const STICKER_ROLL_DENOMINATOR = 10;
const STICKER_ROLL_NUMERATOR = 3;

/** Materialize cumulative stake sticker rolls exactly once when a Joker enters a run. */
export function materializeJokerStickersV3(
  run: RunStateV2,
  instanceId: JokerInstanceId,
  identity: string,
): RunStateV2 {
  if (!isCatalogRunState(run)) return run;
  const joker = run.inventory.jokers.find(
    (candidate) => candidate.instanceId === instanceId,
  );
  const definition = joker
    ? run.content.items.find(
        (item) => item.kind === 'joker' && item.contentId === joker.contentId,
      )
    : undefined;
  const stickerEligible = (stickerId: string): boolean => {
    if (!definition || definition.kind !== 'joker' || !definition.stickerEligibility) {
      return true;
    }
    if (stickerId === 'bxqp:sticker:permanent') {
      return definition.stickerEligibility.permanent;
    }
    if (stickerId === 'bxqp:sticker:perishable') {
      return definition.stickerEligibility.perishable;
    }
    return definition.stickerEligibility.rental;
  };
  const permanentOnAcquire =
    run.rulesV3.excludedRuleKeys.includes('permanent-jokers') &&
    run.rulesV3.excludedRuleKeys.includes('all-acquired');
  if (run.rulesV3.stickerRuleIds.length === 0 && !permanentOnAcquire) {
    return synchronizeRunStateV3(run);
  }
  const existing = run.modifiersV3.jokers.find(
    (modifier) => modifier.instanceId === instanceId,
  );
  if (existing) return run;

  let rngState = run.rngState;
  const stickerIds: string[] = [];
  const rolls: number[] = [];
  for (const stickerId of run.rulesV3.stickerRuleIds.filter(stickerEligible)) {
    const roll = nextInteger(rngState, STICKER_ROLL_DENOMINATOR);
    rolls.push(roll.value);
    rngState = roll.state;
    if (roll.value < STICKER_ROLL_NUMERATOR) stickerIds.push(stickerId);
  }
  if (permanentOnAcquire && stickerEligible('bxqp:sticker:permanent')) {
    stickerIds.push('bxqp:sticker:permanent');
  }
  const uniqueStickerIds = [...new Set(stickerIds)];
  const modifierBase: JokerModifierStateV3 = {
    instanceId,
    stickerIds: uniqueStickerIds,
    perishableRoundsRemaining: uniqueStickerIds.includes('bxqp:sticker:perishable')
      ? 5
      : null,
    rentalRoundCost: uniqueStickerIds.includes('bxqp:sticker:rental') ? 3 : 0,
    saleAllowed: !uniqueStickerIds.includes('bxqp:sticker:permanent'),
    slotContribution: joker?.slotContribution ?? 1,
  };
  const materializedChoicesV3: readonly MaterializedChoiceV3[] = [
    ...run.materializedChoicesV3,
    {
      id: `bxqp:choice:joker-stickers:${identity}`,
      kind: 'joker-sticker-roll',
      valueIds: uniqueStickerIds,
      valueNumbers: rolls,
      checkpointId: run.checkpointId + 1,
    },
  ];
  if (isAbilityStateRun(run)) {
    const modifier: JokerModifierStateV4 = {
      ...modifierBase,
      abilityState: {
        ...(definition?.kind === 'joker' ? (definition.initialAbilityState ?? {}) : {}),
      },
    };
    const materialized: AbilityStateRun = {
      ...run,
      rngState,
      materializedChoicesV3,
      modifiersV3: {
        ...run.modifiersV3,
        jokers: [...run.modifiersV3.jokers, modifier],
      },
    };
    return materialized;
  }
  const materialized: CatalogRunState = {
    ...run,
    rngState,
    materializedChoicesV3,
    modifiersV3: {
      ...run.modifiersV3,
      jokers: [...run.modifiersV3.jokers, modifierBase],
    },
  };
  return materialized;
}
