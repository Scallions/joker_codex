import { z } from 'zod';

import { validateRunStateV4 } from '../game-core/invariants/validateRunStateV4';
import type { RunStateV4 } from '../game-core/model/runV4';
import { RUN_SCHEMA_VERSION_V4 } from '../game-core/model/runV4';
import { runStateV3Schema } from './schemasV3';

const idSchema = z.string().min(1).max(200);
const safeNonnegative = z.number().int().nonnegative().safe();
const abilityValueSchema = z.union([z.string(), z.number().int().safe(), z.boolean()]);

const jokerModifierV4Schema = z
  .object({
    instanceId: idSchema,
    stickerIds: z.array(idSchema).max(3),
    perishableRoundsRemaining: safeNonnegative.max(5).nullable(),
    rentalRoundCost: safeNonnegative,
    saleAllowed: z.boolean(),
    slotContribution: z.number().int().safe(),
    abilityState: z.record(z.string().min(1), abilityValueSchema),
  })
  .strict();

function projectAsV3(value: Record<string, unknown>): Record<string, unknown> {
  const contentVersion =
    value.contentVersion === 'joker-catalog-1'
      ? 'catalog-baseline-3'
      : value.contentVersion;
  const productionContent = value.productionContentV3 as
    Record<string, unknown> | undefined;
  const modifiers = value.modifiersV3 as Record<string, unknown> | undefined;
  const jokerModifiers: readonly unknown[] = Array.isArray(modifiers?.jokers)
    ? (modifiers.jokers as readonly unknown[])
    : [];
  const projected = {
    ...value,
    schemaVersion: 3,
    contentVersion,
    productionContentV3: productionContent
      ? { ...productionContent, contentVersion }
      : productionContent,
    modifiersV3: modifiers
      ? {
          ...modifiers,
          jokers: jokerModifiers.map((entry: unknown) => {
            if (!entry || typeof entry !== 'object') return entry;
            const legacy = { ...(entry as Record<string, unknown>) };
            delete legacy.abilityState;
            return legacy;
          }),
        }
      : modifiers,
  };
  delete (projected as Record<string, unknown>).migrationV4;
  return projected;
}

const rawRunStateV4Schema = z
  .object({
    schemaVersion: z.literal(RUN_SCHEMA_VERSION_V4),
    contentVersion: z.enum(['run-economy-2', 'catalog-baseline-3', 'joker-catalog-1']),
    modifiersV3: z
      .object({
        playingCards: z.array(z.unknown()),
        jokers: z.array(jokerModifierV4Schema),
      })
      .strict(),
    migrationV4: z
      .object({
        sourceSchemaVersion: z.union([
          z.literal(1),
          z.literal(2),
          z.literal(3),
          z.literal(4),
        ]),
        sourceContentVersion: idSchema,
        sourceCheckpointId: safeNonnegative,
        recoveryFingerprint: z.string().regex(/^[a-f0-9]{8}$/),
      })
      .strict(),
  })
  .passthrough()
  .superRefine((value, context) => {
    const base = runStateV3Schema.safeParse(projectAsV3(value));
    if (!base.success) {
      context.addIssue({ code: 'custom', message: 'V4 基础与 V3 扩展字段无效' });
      return;
    }
    const productionContent = value.productionContentV3 as
      { readonly contentVersion?: unknown } | undefined;
    if (productionContent?.contentVersion !== value.contentVersion) {
      context.addIssue({ code: 'custom', message: 'V4 内容版本未闭合' });
    }
    const invariant = validateRunStateV4(value as unknown as RunStateV4);
    if (!invariant.ok) {
      context.addIssue({
        code: 'custom',
        message: `V4 牌局不变量无效：${invariant.violations.join('；')}`,
      });
    }
  });

export const runStateV4Schema = rawRunStateV4Schema as unknown as z.ZodType<RunStateV4>;
