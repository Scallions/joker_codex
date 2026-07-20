import { z } from 'zod';

import { validateRunStateV6 } from '../game-core/invariants/validateRunStateV6';
import { RANKS, SUITS } from '../game-core/model/cards';
import { RUN_SCHEMA_VERSION_V6, type RunStateV6 } from '../game-core/model/runV6';
import { runStateV5Schema } from './schemasV5';

const idSchema = z.string().min(1).max(200);
const safeNonnegative = z.number().int().nonnegative().safe();

function projectAsV5(value: Record<string, unknown>): Record<string, unknown> {
  const contentVersion =
    value.contentVersion === 'joker-catalog-3' ? 'joker-catalog-2' : value.contentVersion;
  const productionContent = value.productionContentV3 as
    { readonly rows?: readonly unknown[]; readonly [key: string]: unknown } | undefined;
  const projected = {
    ...value,
    schemaVersion: 5,
    contentVersion,
    productionContentV3: productionContent
      ? {
          ...productionContent,
          contentVersion,
          rows:
            value.contentVersion === 'joker-catalog-3' &&
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
                    (typeof row.ordinal === 'number' && row.ordinal <= 100)
                  );
                })
              : productionContent.rows,
        }
      : productionContent,
  };
  delete (projected as Record<string, unknown>).jokerRuntimeV6;
  delete (projected as Record<string, unknown>).migrationV6;
  return projected;
}

const rawRunStateV6Schema = z
  .object({
    schemaVersion: z.literal(RUN_SCHEMA_VERSION_V6),
    contentVersion: z.enum([
      'run-economy-2',
      'catalog-baseline-3',
      'joker-catalog-1',
      'joker-catalog-2',
      'joker-catalog-3',
    ]),
    jokerRuntimeV6: z
      .object({
        castleTargetSuit: z.enum(SUITS).nullable(),
        idolTargetRank: z.enum(RANKS).nullable(),
        idolTargetSuit: z.enum(SUITS).nullable(),
        jokerCapacityDebt: safeNonnegative,
      })
      .strict(),
    migrationV6: z
      .object({
        sourceSchemaVersion: z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
          z.literal(5),
          z.literal(6),
        ]),
        sourceContentVersion: idSchema,
        sourceCheckpointId: safeNonnegative,
        recoveryFingerprint: z.string().regex(/^[a-f0-9]{8}$/),
      })
      .strict(),
  })
  .passthrough()
  .superRefine((value, context) => {
    const base = runStateV5Schema.safeParse(projectAsV5(value));
    if (!base.success) {
      context.addIssue({ code: 'custom', message: 'V6 基础与 V5 扩展字段无效' });
      return;
    }
    const productionContent = value.productionContentV3 as
      { readonly contentVersion?: unknown } | undefined;
    if (productionContent?.contentVersion !== value.contentVersion) {
      context.addIssue({ code: 'custom', message: 'V6 内容版本未闭合' });
      return;
    }
    const invariant = validateRunStateV6(value as unknown as RunStateV6);
    if (!invariant.ok) {
      context.addIssue({
        code: 'custom',
        message: `V6 牌局不变量无效：${invariant.violations.join('；')}`,
      });
    }
  });

export const runStateV6Schema = rawRunStateV6Schema as unknown as z.ZodType<RunStateV6>;
