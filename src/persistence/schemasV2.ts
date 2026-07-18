import { z } from 'zod';

import { RANKS, SUITS } from '../game-core/model/cards';
import { stableId } from '../game-core/model/ids';
import { POKER_HAND_TYPES } from '../game-core/poker/evaluate';
import {
  CONTENT_VERSION_V2,
  EFFECT_WINDOWS,
  RUN_SCHEMA_VERSION_V2,
  type RunStateV2,
} from '../game-core/model/runV2';

const idSchema = z.string().min(1).max(200);
const brandedIdSchema = <Kind extends string>() =>
  idSchema.transform((value) => stableId<Kind>(value));
const cardIdSchema = brandedIdSchema<'playing-card'>();
const runIdSchema = brandedIdSchema<'run'>();
const jokerInstanceIdSchema = brandedIdSchema<'joker-instance'>();
const consumableInstanceIdSchema = brandedIdSchema<'consumable-instance'>();
const shopOfferIdSchema = brandedIdSchema<'shop-offer'>();
const shopIdSchema = brandedIdSchema<'shop'>();
const packOfferIdSchema = brandedIdSchema<'pack-offer'>();
const voucherOfferIdSchema = brandedIdSchema<'voucher-offer'>();
const choiceIdSchema = brandedIdSchema<'choice'>();
const rewardReceiptIdSchema = brandedIdSchema<'reward-receipt'>();
const scoreSchema = z.custom<number>(
  (value) =>
    typeof value === 'number' &&
    value >= 0 &&
    (Number.isFinite(value) || value === Number.POSITIVE_INFINITY),
);
const safeIntegerSchema = z.number().int().safe();
const nonnegativeIntegerSchema = safeIntegerSchema.nonnegative();
const effectParameterSchema = z.union([
  z.string(),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);
const effectWindowSchema = z.enum(EFFECT_WINDOWS);
const effectReferenceSchema = z
  .object({
    id: idSchema,
    handlerId: idSchema,
    windows: z.array(effectWindowSchema),
    priority: safeIntegerSchema,
    parameters: z.record(z.string(), effectParameterSchema),
  })
  .strict();
const pokerHandTypeSchema = z.enum(POKER_HAND_TYPES);

const cardSchema = z
  .object({
    id: cardIdSchema,
    suit: z.enum(SUITS),
    rank: z.enum(RANKS),
    enhancementId: idSchema.nullable(),
    sealId: idSchema.nullable(),
    editionId: idSchema.nullable(),
    bonusChips: safeIntegerSchema,
  })
  .strict();

const blindKindSchema = z.enum(['small', 'big', 'boss', 'finisher']);
const blindDefinitionSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(60),
    description: z.string().max(360),
    kind: blindKindSchema,
    minimumAnte: safeIntegerSchema.min(-1),
    targetMultiplier: z.number().positive().finite(),
    reward: nonnegativeIntegerSchema,
    effects: z.array(effectReferenceSchema),
  })
  .strict();
const tagDefinitionSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(60),
    description: z.string().max(360),
    effects: z.array(effectReferenceSchema),
  })
  .strict();
const voucherDefinitionSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(60),
    description: z.string().max(360),
    cost: nonnegativeIntegerSchema,
    prerequisiteId: idSchema.nullable(),
    effects: z.array(effectReferenceSchema),
  })
  .strict();

const targetKindSchema = z.enum(['none', 'playing-card', 'joker', 'consumable']);
const itemBaseShape = {
  contentId: idSchema,
  name: z.string().min(1).max(60),
  description: z.string().max(360),
  baseCost: nonnegativeIntegerSchema,
  weightUnits: nonnegativeIntegerSchema,
  effects: z.array(effectReferenceSchema),
  targetKind: targetKindSchema,
  minimumTargets: nonnegativeIntegerSchema.max(20),
  maximumTargets: nonnegativeIntegerSchema.max(20),
};
const jokerDefinitionSchema = z
  .object({
    ...itemBaseShape,
    kind: z.literal('joker'),
    rarity: z.enum(['common', 'uncommon', 'rare', 'legendary']),
    slotContribution: safeIntegerSchema,
  })
  .strict();
const consumableDefinitionSchema = z
  .object({
    ...itemBaseShape,
    kind: z.literal('consumable'),
    family: z.enum(['tarot', 'planet', 'spectral', 'fixture']),
  })
  .strict();
const playingCardDefinitionSchema = z
  .object({ ...itemBaseShape, kind: z.literal('playing-card') })
  .strict();
const itemDefinitionSchema = z.discriminatedUnion('kind', [
  jokerDefinitionSchema,
  consumableDefinitionSchema,
  playingCardDefinitionSchema,
]);

const packDefinitionSchema = z
  .object({
    id: idSchema,
    name: z.string().min(1).max(60),
    description: z.string().max(360),
    family: z.enum(['standard', 'arcana', 'celestial', 'buffoon', 'spectral']),
    size: z.enum(['normal', 'jumbo', 'mega']),
    cost: nonnegativeIntegerSchema,
    optionCount: nonnegativeIntegerSchema.max(20),
    pickCount: nonnegativeIntegerSchema.max(20),
    temporaryJokerSlots: nonnegativeIntegerSchema.max(20),
    temporaryConsumableSlots: nonnegativeIntegerSchema.max(20),
    weightUnits: nonnegativeIntegerSchema,
    allowedItemKinds: z.array(z.enum(['joker', 'consumable', 'playing-card'])),
    effects: z.array(effectReferenceSchema),
  })
  .strict();

const materializedBlindSchema = z
  .object({
    definitionId: idSchema,
    name: z.string().min(1).max(60),
    description: z.string().max(360),
    kind: blindKindSchema,
    targetMultiplier: z.number().positive().finite(),
    reward: nonnegativeIntegerSchema,
    effects: z.array(effectReferenceSchema),
  })
  .strict();

const ownedJokerSchema = z
  .object({
    instanceId: jokerInstanceIdSchema,
    contentId: idSchema,
    name: z.string().min(1).max(60),
    description: z.string().max(360),
    baseCost: nonnegativeIntegerSchema,
    editionCost: nonnegativeIntegerSchema,
    editionId: idSchema.nullable(),
    effects: z.array(effectReferenceSchema),
    slotContribution: safeIntegerSchema,
    sellValueOverride: nonnegativeIntegerSchema.nullable(),
    debuffed: z.boolean(),
  })
  .strict();
const ownedConsumableSchema = z
  .object({
    instanceId: consumableInstanceIdSchema,
    contentId: idSchema,
    name: z.string().min(1).max(60),
    description: z.string().max(360),
    baseCost: nonnegativeIntegerSchema,
    editionCost: nonnegativeIntegerSchema,
    editionId: idSchema.nullable(),
    effects: z.array(effectReferenceSchema),
    targetKind: targetKindSchema,
    minimumTargets: nonnegativeIntegerSchema.max(20),
    maximumTargets: nonnegativeIntegerSchema.max(20),
    sellValueOverride: nonnegativeIntegerSchema.nullable(),
  })
  .strict();
const ownedTagSchema = z
  .object({
    instanceId: idSchema,
    contentId: idSchema,
    consumed: z.boolean(),
    deferredWindow: effectWindowSchema.nullable(),
  })
  .strict();

const scoreBreakdownSchema = z
  .object({
    handType: pokerHandTypeSchema,
    handName: z.string().min(1).max(60),
    handLevel: nonnegativeIntegerSchema.min(1),
    baseChips: scoreSchema,
    cardChips: scoreSchema,
    multiplier: scoreSchema,
    score: scoreSchema,
    playedCardIds: z.array(cardIdSchema).max(20),
    scoringCardIds: z.array(cardIdSchema).max(20),
    trace: z.array(z.string().max(240)).max(10_000),
  })
  .strict();

const rewardLineSchema = z
  .object({
    id: idSchema,
    label: z.string().min(1).max(80),
    amount: safeIntegerSchema,
    sourceId: idSchema,
  })
  .strict();
const rewardReceiptSchema = z
  .object({
    id: rewardReceiptIdSchema,
    blindReward: nonnegativeIntegerSchema,
    remainingHandReward: nonnegativeIntegerSchema,
    interestReward: nonnegativeIntegerSchema,
    effectLines: z.array(rewardLineSchema),
    total: safeIntegerSchema,
    claimed: z.boolean(),
  })
  .strict();

const materializedItemSchema = z
  .object({
    contentId: idSchema,
    kind: z.enum(['joker', 'consumable', 'playing-card']),
    name: z.string().min(1).max(60),
    description: z.string().max(360),
    baseCost: nonnegativeIntegerSchema,
    editionCost: nonnegativeIntegerSchema,
    editionId: idSchema.nullable(),
    effects: z.array(effectReferenceSchema),
    targetKind: targetKindSchema,
    minimumTargets: nonnegativeIntegerSchema.max(20),
    maximumTargets: nonnegativeIntegerSchema.max(20),
    slotContribution: safeIntegerSchema,
    generatedCard: cardSchema.nullable(),
  })
  .strict();
const shopCardOfferSchema = z
  .object({
    id: shopOfferIdSchema,
    item: materializedItemSchema,
    price: nonnegativeIntegerSchema,
  })
  .strict();
const shopPackOfferSchema = z
  .object({
    id: packOfferIdSchema,
    packId: idSchema,
    name: z.string().min(1).max(60),
    description: z.string().max(360),
    price: nonnegativeIntegerSchema,
  })
  .strict();
const shopVoucherOfferSchema = z
  .object({
    id: voucherOfferIdSchema,
    voucherId: idSchema,
    name: z.string().min(1).max(60),
    description: z.string().max(360),
    price: nonnegativeIntegerSchema,
  })
  .strict();
const shopSchema = z
  .object({
    id: shopIdSchema,
    ante: safeIntegerSchema.min(-1),
    afterBlind: z.enum(['small', 'big', 'boss']),
    cardOffers: z.array(shopCardOfferSchema).max(20),
    packOffers: z.array(shopPackOfferSchema).max(20),
    voucherOffer: shopVoucherOfferSchema.nullable(),
    extraVoucherOffers: z.array(shopVoucherOfferSchema).max(20).optional(),
    rerollCount: nonnegativeIntegerSchema,
    rerollCost: nonnegativeIntegerSchema,
    purchasedOfferIds: z.array(idSchema),
    freeRerollAvailable: z.boolean(),
  })
  .strict();

const packChoiceOptionSchema = z
  .object({ id: idSchema, item: materializedItemSchema, consumed: z.boolean() })
  .strict();
const packChoiceFrameSchema = z
  .object({
    id: choiceIdSchema,
    kind: z.literal('pack'),
    optional: z.literal(true),
    returnPhase: z.enum(['shop', 'blind-select']),
    packId: idSchema,
    packOfferId: packOfferIdSchema,
    options: z.array(packChoiceOptionSchema).max(20),
    remainingPicks: nonnegativeIntegerSchema.max(20),
    temporaryJokerSlots: nonnegativeIntegerSchema.max(20),
    temporaryConsumableSlots: nonnegativeIntegerSchema.max(20),
  })
  .strict();
const targetChoiceFrameSchema = z
  .object({
    id: choiceIdSchema,
    kind: z.literal('targets'),
    optional: z.boolean(),
    returnPhase: z.enum(['round', 'shop', 'blind-select']),
    sourceInstanceId: idSchema,
    effectId: idSchema,
    targetKind: z.enum(['playing-card', 'joker', 'consumable']),
    eligibleIds: z.array(idSchema).max(200),
    selectedIds: z.array(idSchema).max(20),
    minimumTargets: nonnegativeIntegerSchema.max(20),
    maximumTargets: nonnegativeIntegerSchema.max(20),
  })
  .strict();
const bossRerollChoiceFrameSchema = z
  .object({
    id: choiceIdSchema,
    kind: z.literal('boss-reroll'),
    optional: z.literal(true),
    returnPhase: z.literal('blind-select'),
    cost: nonnegativeIntegerSchema,
    eligibleBlindIds: z.array(idSchema).max(100),
  })
  .strict();
const forcedCardChoiceFrameSchema = z
  .object({
    id: choiceIdSchema,
    kind: z.literal('forced-card'),
    optional: z.literal(false),
    returnPhase: z.literal('round'),
    eligibleIds: z.array(cardIdSchema).max(100),
    selectedIds: z.array(cardIdSchema).max(20),
    minimumTargets: nonnegativeIntegerSchema.max(20),
    maximumTargets: nonnegativeIntegerSchema.max(20),
  })
  .strict();
const choiceFrameSchema = z.discriminatedUnion('kind', [
  packChoiceFrameSchema,
  targetChoiceFrameSchema,
  bossRerollChoiceFrameSchema,
  forcedCardChoiceFrameSchema,
]);

const phaseSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('blind-select') }).strict(),
  z.object({ kind: z.literal('round') }).strict(),
  z
    .object({ kind: z.literal('round-reward'), receiptId: rewardReceiptIdSchema })
    .strict(),
  z.object({ kind: z.literal('shop') }).strict(),
  z.object({ kind: z.literal('choice'), choiceId: choiceIdSchema }).strict(),
  z.object({ kind: z.literal('run-won') }).strict(),
  z.object({ kind: z.literal('run-lost') }).strict(),
  z.object({ kind: z.literal('finished') }).strict(),
]);

const rawRunStateV2Schema = z
  .object({
    schemaVersion: z.literal(RUN_SCHEMA_VERSION_V2),
    contentVersion: z.literal(CONTENT_VERSION_V2),
    runId: runIdSchema,
    checkpointId: nonnegativeIntegerSchema,
    mode: z.enum(['fixture-campaign', 'migrated-foundation']),
    seed: z.string().min(1).max(256),
    rngState: z.number().int().min(1).max(0xffff_ffff),
    phase: phaseSchema,
    progress: z
      .object({
        ante: safeIntegerSchema.min(-1),
        blindPosition: z.enum(['small', 'big', 'boss']),
        campaignWon: z.boolean(),
        endless: z.boolean(),
        lineup: z
          .object({
            smallTagId: idSchema,
            bigTagId: idSchema,
            boss: materializedBlindSchema,
          })
          .strict(),
        seenNormalBossIds: z.array(idSchema),
        seenFinisherBossIds: z.array(idSchema),
        bossRerollCount: nonnegativeIntegerSchema,
        anteVoucherId: idSchema.nullable(),
      })
      .strict(),
    rules: z
      .object({
        handsPerRound: nonnegativeIntegerSchema,
        discardsPerRound: nonnegativeIntegerSchema,
        handSize: nonnegativeIntegerSchema.max(100),
        maximumSelectedCards: nonnegativeIntegerSchema.max(20),
        jokerSlots: nonnegativeIntegerSchema.max(100),
        consumableSlots: nonnegativeIntegerSchema.max(100),
        interestStep: nonnegativeIntegerSchema.min(1),
        interestRate: nonnegativeIntegerSchema,
        interestCap: nonnegativeIntegerSchema,
        allowedDebt: nonnegativeIntegerSchema,
        cardOfferSlots: nonnegativeIntegerSchema.max(100),
        packOfferSlots: nonnegativeIntegerSchema.max(100),
        baseRerollCost: nonnegativeIntegerSchema,
        priceDiscountBasisPoints: nonnegativeIntegerSchema.max(10_000),
        targetScaleBasisPoints: nonnegativeIntegerSchema.min(1).max(1_000_000),
        straightSize: nonnegativeIntegerSchema.min(1).max(20),
        flushSize: nonnegativeIntegerSchema.min(1).max(20),
        handLevels: z.record(pokerHandTypeSchema, nonnegativeIntegerSchema.min(1)),
      })
      .strict(),
    content: z
      .object({
        blinds: z.array(blindDefinitionSchema),
        tags: z.array(tagDefinitionSchema),
        vouchers: z.array(voucherDefinitionSchema),
        items: z.array(itemDefinitionSchema),
        packs: z.array(packDefinitionSchema),
      })
      .strict(),
    deck: z.object({ cards: z.array(cardSchema).max(1000) }).strict(),
    round: z
      .object({
        blind: materializedBlindSchema,
        targetScore: scoreSchema,
        score: scoreSchema,
        handsRemaining: nonnegativeIntegerSchema,
        discardsRemaining: nonnegativeIntegerSchema,
        drawPileIds: z.array(cardIdSchema).max(1000),
        handIds: z.array(cardIdSchema).max(100),
        playedIds: z.array(cardIdSchema).max(1000),
        discardPileIds: z.array(cardIdSchema).max(1000),
        selectedCardIds: z.array(cardIdSchema).max(20),
        forcedSelectedCardIds: z.array(cardIdSchema).max(20),
        faceDownCardIds: z.array(cardIdSchema).max(1000),
        sortMode: z.enum(['rank', 'suit']),
        handsPlayed: nonnegativeIntegerSchema,
        discardsUsed: nonnegativeIntegerSchema,
        lastHandType: scoreBreakdownSchema.shape.handType.nullable(),
      })
      .strict()
      .nullable(),
    inventory: z
      .object({
        jokers: z.array(ownedJokerSchema),
        consumables: z.array(ownedConsumableSchema),
        voucherIds: z.array(idSchema),
        tags: z.array(ownedTagSchema),
      })
      .strict(),
    economy: z
      .object({
        money: safeIntegerSchema,
        pendingReward: rewardReceiptSchema.nullable(),
        claimedRewardIds: z.array(rewardReceiptIdSchema),
      })
      .strict(),
    shop: shopSchema.nullable(),
    pendingChoice: z
      .object({
        current: choiceFrameSchema,
        suspended: z.array(choiceFrameSchema).max(8),
      })
      .strict()
      .nullable(),
    history: z
      .object({
        completedBlindIds: z.array(idSchema),
        skippedBlindIds: z.array(idSchema),
        playedCardIdsThisAnte: z.array(cardIdSchema),
        playedHandTypes: z.array(scoreBreakdownSchema.shape.handType),
        claimedRewardIds: z.array(rewardReceiptIdSchema),
        effectObservations: z.array(
          z
            .object({
              window: effectWindowSchema,
              key: z.string().min(1).max(120),
              value: effectParameterSchema,
              sourceInstanceId: idSchema,
              effectId: idSchema,
              checkpointId: nonnegativeIntegerSchema,
            })
            .strict(),
        ),
      })
      .strict(),
    lastHand: scoreBreakdownSchema.nullable(),
    result: z
      .object({
        kind: z.enum(['won', 'lost', 'finished']),
        ante: safeIntegerSchema.min(-1),
        score: scoreSchema,
        reason: z.string().min(1).max(240),
      })
      .strict()
      .nullable(),
  })
  .strict();

export const runStateV2Schema = rawRunStateV2Schema as unknown as z.ZodType<RunStateV2>;
