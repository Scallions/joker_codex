import { z } from 'zod';

import { stableId } from '../game-core/model/ids';
import {
  CONTENT_VERSION,
  RUN_SCHEMA_VERSION,
  type RunState,
} from '../game-core/model/run';
import type { ProfileRecord } from './profiles';

const stableIdSchema = z.string().min(1).max(160);
const brandedIdSchema = <Kind extends string>() =>
  stableIdSchema.transform((value) => stableId<Kind>(value));
const cardIdSchema = brandedIdSchema<'playing-card'>();
const runIdSchema = brandedIdSchema<'run'>();
const jokerInstanceIdSchema = brandedIdSchema<'joker-instance'>();
const consumableInstanceIdSchema = brandedIdSchema<'consumable-instance'>();
const shopOfferIdSchema = brandedIdSchema<'shop-offer'>();
const profileIdSchema = brandedIdSchema<'profile'>();
const rankSchema = z.enum([
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  '9',
  '10',
  'jack',
  'queen',
  'king',
  'ace',
]);

const cardSchema = z
  .object({
    id: cardIdSchema,
    suit: z.enum(['spades', 'hearts', 'clubs', 'diamonds']),
    rank: rankSchema,
    enhancement: z.enum(['none', 'wild', 'stone']),
  })
  .strict();

const jokerSchema = z
  .object({
    instanceId: jokerInstanceIdSchema,
    contentId: stableIdSchema,
    name: z.string().min(1).max(40),
    description: z.string().min(1).max(240),
    handMultiplier: z.number().positive().finite(),
    sellPrice: z.number().int().nonnegative(),
  })
  .strict();

const consumableEffectSchema = z
  .object({
    type: z.literal('set-rank'),
    rank: rankSchema,
  })
  .strict();

const consumableSchema = z
  .object({
    instanceId: consumableInstanceIdSchema,
    contentId: stableIdSchema,
    name: z.string().min(1).max(40),
    description: z.string().min(1).max(240),
    effect: consumableEffectSchema,
    sellPrice: z.number().int().nonnegative(),
  })
  .strict();

const shopBaseShape = {
  contentId: stableIdSchema,
  name: z.string().min(1).max(40),
  description: z.string().min(1).max(240),
  cost: z.number().int().nonnegative(),
  sellPrice: z.number().int().nonnegative(),
};

const shopJokerDefinitionSchema = z
  .object({
    ...shopBaseShape,
    kind: z.literal('joker'),
    handMultiplier: z.number().positive().finite(),
  })
  .strict();

const shopConsumableDefinitionSchema = z
  .object({
    ...shopBaseShape,
    kind: z.literal('consumable'),
    effect: consumableEffectSchema,
  })
  .strict();

const shopItemDefinitionSchema = z.discriminatedUnion('kind', [
  shopJokerDefinitionSchema,
  shopConsumableDefinitionSchema,
]);

const shopJokerOfferSchema = shopJokerDefinitionSchema
  .extend({ id: shopOfferIdSchema })
  .strict();
const shopConsumableOfferSchema = shopConsumableDefinitionSchema
  .extend({ id: shopOfferIdSchema })
  .strict();
const shopOfferSchema = z.discriminatedUnion('kind', [
  shopJokerOfferSchema,
  shopConsumableOfferSchema,
]);

const scoreBreakdownSchema = z
  .object({
    handType: z.enum([
      'high-card',
      'pair',
      'two-pair',
      'three-of-a-kind',
      'straight',
      'flush',
      'full-house',
      'four-of-a-kind',
      'straight-flush',
      'five-of-a-kind',
      'flush-house',
      'flush-five',
    ]),
    handName: z.string().min(1),
    baseChips: z.number().nonnegative().finite(),
    cardChips: z.number().nonnegative().finite(),
    multiplier: z.number().positive().finite(),
    score: z.number().nonnegative().finite(),
    playedCardIds: z.array(cardIdSchema).max(5),
    scoringCardIds: z.array(cardIdSchema).max(5),
  })
  .strict();

const rawRunStateSchema = z
  .object({
    schemaVersion: z.literal(RUN_SCHEMA_VERSION),
    contentVersion: z.literal(CONTENT_VERSION),
    runId: runIdSchema,
    checkpointId: z.number().int().nonnegative(),
    seed: z.string().min(1).max(256),
    rngState: z.number().int().min(1).max(0xffff_ffff),
    phase: z.enum(['round', 'shop', 'won', 'lost']),
    targetScore: z.number().positive().finite(),
    roundScore: z.number().nonnegative().finite(),
    handsRemaining: z.number().int().nonnegative(),
    discardsRemaining: z.number().int().nonnegative(),
    money: z.number().int(),
    handSize: z.number().int().positive().max(20),
    drawPile: z.array(cardSchema).max(52),
    hand: z.array(cardSchema).max(20),
    discardPile: z.array(cardSchema).max(52),
    selectedCardIds: z.array(cardIdSchema).max(5),
    sortMode: z.enum(['rank', 'suit']),
    jokers: z.array(jokerSchema).max(5),
    consumables: z.array(consumableSchema).max(2),
    shopPool: z.array(shopItemDefinitionSchema).min(1).max(20),
    shop: z
      .object({
        offers: z.array(shopOfferSchema).max(8),
        rerollCost: z.number().int().nonnegative(),
        rerollCount: z.number().int().nonnegative(),
      })
      .strict()
      .nullable(),
    lastHand: scoreBreakdownSchema.nullable(),
  })
  .strict();

export const runStateSchema: z.ZodType<RunState> = rawRunStateSchema;

const rawProfileRecordSchema = z
  .object({
    id: profileIdSchema,
    slot: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    displayName: z.string().trim().min(1).max(12),
    createdAtEpochMs: z.number().int().nonnegative(),
    updatedAtEpochMs: z.number().int().nonnegative(),
    activeRunId: runIdSchema.nullable(),
  })
  .strict();

export const profileRecordSchema: z.ZodType<ProfileRecord> = rawProfileRecordSchema;

export const profileTransferEnvelopeSchema = z
  .object({
    schemaVersion: z.literal(RUN_SCHEMA_VERSION),
    contentVersion: z.literal(CONTENT_VERSION),
    profile: profileRecordSchema,
    run: runStateSchema.nullable(),
    checksum: z.string().regex(/^[a-f0-9]{8}$/),
  })
  .strict();
