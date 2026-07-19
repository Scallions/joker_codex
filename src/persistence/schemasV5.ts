import { z } from 'zod';

import { validateRunStateV5 } from '../game-core/invariants/validateRunStateV5';
import { RANKS, SUITS } from '../game-core/model/cards';
import { RUN_SCHEMA_VERSION_V5, type RunStateV5 } from '../game-core/model/runV5';
import { runStateV4Schema } from './schemasV4';

const idSchema = z.string().min(1).max(200);
const safeNonnegative = z.number().int().nonnegative().safe();

function projectAsV4(value: Record<string, unknown>): Record<string, unknown> {
  const contentVersion =
    value.contentVersion === 'joker-catalog-2' ? 'joker-catalog-1' : value.contentVersion;
  const productionContent = value.productionContentV3 as
    { readonly rows?: readonly unknown[]; readonly [key: string]: unknown } | undefined;
  const projected = {
    ...value,
    schemaVersion: 4,
    contentVersion,
    productionContentV3: productionContent
      ? {
          ...productionContent,
          contentVersion,
          rows:
            value.contentVersion === 'joker-catalog-2' &&
            Array.isArray(productionContent.rows)
              ? productionContent.rows.filter((entry) => {
                  if (!entry || typeof entry !== 'object') return true;
                  const definition = (entry as { readonly definition?: unknown })
                    .definition;
                  if (!definition || typeof definition !== 'object') return true;
                  const row = definition as {
                    readonly family?: unknown;
                    readonly ordinal?: unknown;
                  };
                  return (
                    row.family !== 'joker' ||
                    (typeof row.ordinal === 'number' && row.ordinal <= 50)
                  );
                })
              : productionContent.rows,
        }
      : productionContent,
  };
  delete (projected as Record<string, unknown>).jokerRuntimeV5;
  delete (projected as Record<string, unknown>).migrationV5;
  return projected;
}

const rawRunStateV5Schema = z
  .object({
    schemaVersion: z.literal(RUN_SCHEMA_VERSION_V5),
    contentVersion: z.enum([
      'run-economy-2',
      'catalog-baseline-3',
      'joker-catalog-1',
      'joker-catalog-2',
    ]),
    jokerRuntimeV5: z
      .object({
        initialDeckSize: safeNonnegative,
        sharedRoundTargetRank: z.enum(RANKS).nullable(),
        sharedRoundTargetSuit: z.enum(SUITS).nullable(),
        bossDisabledForRound: z.boolean(),
      })
      .strict(),
    migrationV5: z
      .object({
        sourceSchemaVersion: z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
          z.literal(5),
        ]),
        sourceContentVersion: idSchema,
        sourceCheckpointId: safeNonnegative,
        recoveryFingerprint: z.string().regex(/^[a-f0-9]{8}$/),
      })
      .strict(),
  })
  .passthrough()
  .superRefine((value, context) => {
    const base = runStateV4Schema.safeParse(projectAsV4(value));
    if (!base.success) {
      context.addIssue({ code: 'custom', message: 'V5 基础与 V4 扩展字段无效' });
      return;
    }
    const productionContent = value.productionContentV3 as
      { readonly contentVersion?: unknown } | undefined;
    if (productionContent?.contentVersion !== value.contentVersion) {
      context.addIssue({ code: 'custom', message: 'V5 内容版本未闭合' });
      return;
    }
    const invariant = validateRunStateV5(value as unknown as RunStateV5);
    if (!invariant.ok) {
      context.addIssue({
        code: 'custom',
        message: `V5 牌局不变量无效：${invariant.violations.join('；')}`,
      });
    }
  });

export const runStateV5Schema = rawRunStateV5Schema as unknown as z.ZodType<RunStateV5>;
