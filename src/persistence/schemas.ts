import { z } from 'zod';

import { stableId } from '../game-core/model/ids';
import { POKER_HAND_TYPES } from '../game-core/poker/evaluate';
import {
  CONTENT_VERSION,
  RUN_SCHEMA_VERSION,
  type RunState,
} from '../game-core/model/run';
import { PROFILE_SCHEMA_VERSION, type ProfileRecord } from './profiles';
import {
  PROGRESSION_RULES_VERSION,
  TUTORIAL_SCRIPT_VERSION,
} from '../progression/definitions';

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

const safeNonnegativeSchema = z.number().int().nonnegative().safe();
const nullableTimestampSchema = safeNonnegativeSchema.nullable();
const profileScoreSchema = z.union([
  z.number().nonnegative().finite(),
  z.literal(Infinity),
]);
const pokerHandTypeSchema = z.enum(POKER_HAND_TYPES);
const objectiveProgressSchema = z
  .object({
    objectiveId: stableIdSchema,
    current: safeNonnegativeSchema,
    target: safeNonnegativeSchema.positive(),
    completedAtEpochMs: nullableTimestampSchema,
    source: z.enum(['baseline', 'campaign', 'challenge']).nullable(),
  })
  .strict();
const deckProgressSchema = z
  .object({
    deckId: stableIdSchema,
    highestClearedStakeOrdinal: safeNonnegativeSchema.max(8),
  })
  .strict();
const challengeProgressRecordSchema = z
  .object({
    challengeId: stableIdSchema,
    attempts: safeNonnegativeSchema,
    completions: safeNonnegativeSchema,
    completedAtEpochMs: nullableTimestampSchema,
  })
  .strict();
const jokerVictoryMarkSchema = z
  .object({
    contentId: stableIdSchema,
    highestStakeOrdinal: safeNonnegativeSchema.max(8),
  })
  .strict();
const achievementProgressSchema = z
  .object({
    achievementId: stableIdSchema,
    category: z.enum(['入场', '牌技', '经营', '收藏', '挑战', '终局']),
    current: safeNonnegativeSchema,
    target: safeNonnegativeSchema.positive(),
    completedAtEpochMs: nullableTimestampSchema,
  })
  .strict();
const handTypeStatisticsSchema = z
  .object({
    handType: pokerHandTypeSchema,
    playCount: safeNonnegativeSchema,
    bestScore: profileScoreSchema,
  })
  .strict();
const deckStatisticsSchema = z
  .object({
    deckId: stableIdSchema,
    starts: safeNonnegativeSchema,
    wins: safeNonnegativeSchema,
    highestClearedStakeOrdinal: safeNonnegativeSchema.max(8),
  })
  .strict();
const challengeStatisticsSchema = challengeProgressRecordSchema;
const profileStatisticsSchema = z
  .object({
    campaignStarts: safeNonnegativeSchema,
    campaignWins: safeNonnegativeSchema,
    campaignLosses: safeNonnegativeSchema,
    currentWinStreak: safeNonnegativeSchema,
    bestWinStreak: safeNonnegativeSchema,
    highestEndlessAnte: safeNonnegativeSchema,
    totalScore: profileScoreSchema,
    bestHandScore: profileScoreSchema,
    handsPlayed: safeNonnegativeSchema,
    cardsPlayed: safeNonnegativeSchema,
    cardsDiscarded: safeNonnegativeSchema,
    blindsDefeated: safeNonnegativeSchema,
    blindsSkipped: safeNonnegativeSchema,
    moneyEarned: safeNonnegativeSchema,
    moneySpent: safeNonnegativeSchema,
    maximumMoneyHeld: safeNonnegativeSchema,
    interestEarned: safeNonnegativeSchema,
    itemsPurchased: safeNonnegativeSchema,
    itemsSold: safeNonnegativeSchema,
    shopRerolls: safeNonnegativeSchema,
    bossRerolls: safeNonnegativeSchema,
    packsOpened: safeNonnegativeSchema,
    vouchersRedeemed: safeNonnegativeSchema,
    consumablesUsed: safeNonnegativeSchema,
    tarotUsed: safeNonnegativeSchema,
    planetUsed: safeNonnegativeSchema,
    spectralUsed: safeNonnegativeSchema,
    playingCardsPurchased: safeNonnegativeSchema,
    editionJokersAcquired: safeNonnegativeSchema,
    distinctVoucherIds: z.array(stableIdSchema).max(32),
    handTypes: z.array(handTypeStatisticsSchema).length(12),
    decks: z.array(deckStatisticsSchema).length(15),
    challenges: z.array(challengeStatisticsSchema).length(20),
  })
  .strict();
const tutorialProgressSchema = z
  .object({
    status: z.enum(['not-started', 'in-progress', 'completed', 'skipped']),
    currentStepId: stableIdSchema.nullable(),
    scriptVersion: z.literal(TUTORIAL_SCRIPT_VERSION),
    startedAtEpochMs: nullableTimestampSchema,
    completedAtEpochMs: nullableTimestampSchema,
    skippedAtEpochMs: nullableTimestampSchema,
    replayCount: safeNonnegativeSchema,
  })
  .strict();
const progressionCursorSchema = z
  .object({
    runId: runIdSchema,
    checkpointId: safeNonnegativeSchema,
  })
  .strict();
const progressionNoticeSchema = z
  .object({
    noticeId: stableIdSchema,
    kind: z.enum(['unlock', 'discovery', 'achievement', 'victory-mark']),
    title: z.string().min(1).max(80),
    detail: z.string().min(1).max(240),
    createdAtEpochMs: safeNonnegativeSchema,
  })
  .strict();
const resultDeltaSummarySchema = z
  .object({
    runId: runIdSchema,
    objectiveIds: z.array(stableIdSchema).max(78),
    discoveredJokerIds: z.array(stableIdSchema).max(150),
    achievementIds: z.array(stableIdSchema).max(31),
    victoryMarkContentIds: z.array(stableIdSchema).max(150),
    statisticKeys: z.array(stableIdSchema).max(80),
  })
  .strict();
const currentRunProgressSchema = z
  .object({
    runId: runIdSchema.nullable(),
    campaignVictorySettled: z.boolean(),
    interestEarned: safeNonnegativeSchema,
    handsPlayedByType: z.record(pokerHandTypeSchema, safeNonnegativeSchema),
    currentBlindHandsPlayed: safeNonnegativeSchema,
    currentBlindDiscardsUsed: safeNonnegativeSchema,
    resultDelta: resultDeltaSummarySchema.nullable().default(null),
  })
  .strict();

const rawProfileRecordSchema = z
  .object({
    schemaVersion: z.literal(PROFILE_SCHEMA_VERSION),
    id: profileIdSchema,
    slot: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    displayName: z.string().trim().min(1).max(12),
    createdAtEpochMs: z.number().int().nonnegative(),
    updatedAtEpochMs: z.number().int().nonnegative(),
    activeRunId: runIdSchema.nullable(),
    progressionRulesVersion: z.literal(PROGRESSION_RULES_VERSION),
    nextRunSequence: safeNonnegativeSchema.positive(),
    activeProjectionCursor: progressionCursorSchema.nullable(),
    tutorial: tutorialProgressSchema,
    objectives: z.array(objectiveProgressSchema).length(78),
    deckProgress: z.array(deckProgressSchema).length(15),
    challengeProgress: z
      .object({
        nextAvailableOrdinal: safeNonnegativeSchema.max(20),
        records: z.array(challengeProgressRecordSchema).length(20),
      })
      .strict(),
    collection: z
      .object({
        discoveredJokerIds: z.array(stableIdSchema).max(150),
        jokerVictoryMarks: z.array(jokerVictoryMarkSchema).length(150),
      })
      .strict(),
    achievements: z.array(achievementProgressSchema).length(31),
    statistics: profileStatisticsSchema,
    currentRunProgress: currentRunProgressSchema,
    unreadNotices: z.array(progressionNoticeSchema).max(50),
    lastResultSummary: resultDeltaSummarySchema.nullable(),
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
