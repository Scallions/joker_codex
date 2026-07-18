import { z } from 'zod';

import { stableId } from '../game-core/model/ids';
import type { RunStateV2 } from '../game-core/model/runV2';
import { RUN_SCHEMA_VERSION_V3, type RunStateV3 } from '../game-core/model/runV3';
import { catalogRowSchema } from '../content/schema/catalog';
import { runStateV2Schema } from './schemasV2';

const idSchema = z.string().min(1).max(180);
const safeNonnegative = z.number().int().nonnegative().safe();

const boosterProfileSchema = z
  .object({
    id: idSchema,
    family: z.enum(['standard', 'tarot', 'planet', 'joker', 'spectral']),
    size: z.enum(['normal', 'jumbo', 'mega']),
    cost: safeNonnegative,
    optionCount: safeNonnegative.max(20),
    pickCount: safeNonnegative.max(20),
    temporaryJokerSlots: safeNonnegative.max(20),
    temporaryConsumableSlots: safeNonnegative.max(20),
  })
  .strict();

const runStateV3ExtensionSchema = z
  .object({
    schemaVersion: z.literal(RUN_SCHEMA_VERSION_V3),
    contentVersion: z.enum(['run-economy-2', 'catalog-baseline-3']),
    mode: z.enum(['migrated-run-economy', 'production-campaign', 'production-challenge']),
    setupV3: z
      .object({
        deckId: idSchema,
        stakeId: idSchema,
        appliedStakeIds: z.array(idSchema).min(1).max(8),
        challengeId: idSchema.nullable(),
        rulePatchEffectIds: z.array(idSchema),
      })
      .strict(),
    productionContentV3: z
      .object({
        contentVersion: z.enum(['run-economy-2', 'catalog-baseline-3']),
        rows: z.array(
          z
            .object({
              definition: catalogRowSchema,
              name: z.string().min(1).max(120),
              description: z.string().min(1).max(2_000),
            })
            .strict(),
        ),
        boosterProfiles: z.array(boosterProfileSchema).max(15),
      })
      .strict(),
    rulesV3: z
      .object({
        targetCurveId: z.enum(['baseline', 'green', 'purple']),
        anteOneThroughEightTargets: z.array(safeNonnegative.min(1)).length(8),
        blindRewardPolicy: z.enum(['normal', 'small-zero', 'small-big-zero', 'all-zero']),
        remainingHandReward: safeNonnegative,
        remainingDiscardReward: safeNonnegative,
        discardCost: safeNonnegative,
        priceInflationPerPurchase: safeNonnegative,
        purchasesMade: safeNonnegative,
        shopFamilyWeightMultipliers: z.record(idSchema, z.number().positive().finite()),
        playingCardsInShop: z.boolean(),
        jokersInShop: z.boolean(),
        bossRerollCost: safeNonnegative.nullable(),
        bossRerollLimitPerAnte: safeNonnegative.nullable(),
        bannedContentIds: z.array(idSchema),
        excludedRuleKeys: z.array(idSchema),
        stickerRuleIds: z.array(idSchema).max(3),
      })
      .strict(),
    modifiersV3: z
      .object({
        playingCards: z.array(
          z
            .object({
              cardId: idSchema.transform((value) => stableId<'playing-card'>(value)),
              enhancementId: idSchema.nullable(),
              sealId: idSchema.nullable(),
              editionId: idSchema.nullable(),
              debuffed: z.boolean(),
            })
            .strict(),
        ),
        jokers: z.array(
          z
            .object({
              instanceId: idSchema.transform((value) =>
                stableId<'joker-instance'>(value),
              ),
              stickerIds: z.array(idSchema).max(3),
              perishableRoundsRemaining: safeNonnegative.max(5).nullable(),
              rentalRoundCost: safeNonnegative,
              saleAllowed: z.boolean(),
              slotContribution: z.number().int().safe(),
            })
            .strict(),
        ),
      })
      .strict(),
    externalDependenciesV3: z
      .object({
        requiredIds: z.array(idSchema),
        resolvedIds: z.array(idSchema),
        validationMode: z.enum(['catalog-child', 'integration-strict']),
      })
      .strict(),
    materializedChoicesV3: z.array(
      z
        .object({
          id: idSchema,
          kind: idSchema,
          valueIds: z.array(idSchema),
          valueNumbers: z.array(z.number().finite()),
          checkpointId: safeNonnegative,
        })
        .strict(),
    ),
    migrationV3: z
      .object({
        sourceSchemaVersion: z.union([z.literal(1), z.literal(2), z.literal(3)]),
        sourceContentVersion: idSchema,
        sourceCheckpointId: safeNonnegative,
        recoveryFingerprint: z.string().regex(/^[a-f0-9]{8}$/),
      })
      .strict(),
  })
  .passthrough();

const BASE_KEYS = [
  'schemaVersion',
  'contentVersion',
  'runId',
  'checkpointId',
  'mode',
  'seed',
  'rngState',
  'phase',
  'progress',
  'rules',
  'content',
  'deck',
  'round',
  'inventory',
  'economy',
  'shop',
  'pendingChoice',
  'history',
  'lastHand',
  'result',
] as const;

const EXTENSION_KEYS = [
  'setupV3',
  'productionContentV3',
  'rulesV3',
  'modifiersV3',
  'externalDependenciesV3',
  'materializedChoicesV3',
  'migrationV3',
] as const;

function projectAsV2(value: Record<string, unknown>): Record<string, unknown> {
  const projected = Object.fromEntries(BASE_KEYS.map((key) => [key, value[key]]));
  return {
    ...projected,
    schemaVersion: 2,
    contentVersion: 'run-economy-2',
    mode: 'fixture-campaign',
  };
}

const rawRunStateV3Schema = runStateV3ExtensionSchema.superRefine((value, context) => {
  const knownKeys = new Set<string>([...BASE_KEYS, ...EXTENSION_KEYS]);
  const unknownKeys = Object.keys(value).filter((key) => !knownKeys.has(key));
  if (unknownKeys.length > 0) {
    context.addIssue({
      code: 'custom',
      message: `未知 V3 字段：${unknownKeys.join(', ')}`,
    });
  }
  const base = runStateV2Schema.safeParse(projectAsV2(value));
  if (!base.success) {
    context.addIssue({ code: 'custom', message: 'V3 基础牌局字段无效' });
  }
});

export const runStateV3Schema = rawRunStateV3Schema as unknown as z.ZodType<RunStateV3>;

export function projectRunStateV3ToExecutableBase(run: RunStateV3): RunStateV2 {
  return run;
}
