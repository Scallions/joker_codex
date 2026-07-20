import { z } from 'zod';

import { validateRunStateV7 } from '../game-core/invariants/validateRunStateV7';
import {
  CONTENT_VERSION_V7,
  RUN_SCHEMA_VERSION_V7,
  type RunStateV7,
} from '../game-core/model/runV7';
import {
  PROGRESSION_RULES_VERSION,
  TUTORIAL_SCRIPT_VERSION,
} from '../progression/definitions';
import { runStateV6Schema } from './schemasV6';

const idSchema = z.string().min(1).max(200);
const safeNonnegative = z.number().int().nonnegative().safe();

function projectAsV6(value: Record<string, unknown>): Record<string, unknown> {
  const contentVersion =
    value.contentVersion === CONTENT_VERSION_V7
      ? 'joker-catalog-3'
      : value.contentVersion;
  const productionContent = value.productionContentV3 as
    { readonly [key: string]: unknown } | undefined;
  const projected = {
    ...value,
    schemaVersion: 6,
    contentVersion,
    productionContentV3: productionContent
      ? { ...productionContent, contentVersion }
      : productionContent,
  };
  delete (projected as Record<string, unknown>).sessionV7;
  delete (projected as Record<string, unknown>).migrationV7;
  return projected;
}

const rawRunStateV7Schema = z
  .object({
    schemaVersion: z.literal(RUN_SCHEMA_VERSION_V7),
    contentVersion: z.enum([
      'run-economy-2',
      'catalog-baseline-3',
      'joker-catalog-1',
      'joker-catalog-2',
      'joker-catalog-3',
      CONTENT_VERSION_V7,
    ]),
    sessionV7: z
      .object({
        runClass: z.enum([
          'campaign',
          'seeded',
          'challenge',
          'tutorial',
          'migrated-legacy',
        ]),
        profileId: idSchema.nullable(),
        runSequence: safeNonnegative,
        progressionRulesVersion: z.literal(PROGRESSION_RULES_VERSION),
        eligibilityObjectiveIds: z.array(idSchema).max(78),
        discoveredContentIds: z.array(idSchema).max(150),
        tutorialScriptVersion: z.literal(TUTORIAL_SCRIPT_VERSION).nullable(),
      })
      .strict(),
    migrationV7: z
      .object({
        sourceSchemaVersion: z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
          z.literal(5),
          z.literal(6),
          z.literal(7),
        ]),
        sourceContentVersion: idSchema,
        sourceCheckpointId: safeNonnegative,
        recoveryFingerprint: z.string().regex(/^[a-f0-9]{8}$/),
      })
      .strict(),
  })
  .passthrough()
  .superRefine((value, context) => {
    if (!runStateV6Schema.safeParse(projectAsV6(value)).success) {
      context.addIssue({ code: 'custom', message: 'V7 基础与 V6 扩展字段无效' });
      return;
    }
    const productionContent = value.productionContentV3 as
      { readonly contentVersion?: unknown } | undefined;
    if (productionContent?.contentVersion !== value.contentVersion) {
      context.addIssue({ code: 'custom', message: 'V7 内容版本未闭合' });
      return;
    }
    const invariant = validateRunStateV7(value as unknown as RunStateV7);
    if (!invariant.ok) {
      context.addIssue({
        code: 'custom',
        message: `V7 牌局不变量无效：${invariant.violations.join('；')}`,
      });
    }
  });

export const runStateV7Schema = rawRunStateV7Schema as unknown as z.ZodType<RunStateV7>;
