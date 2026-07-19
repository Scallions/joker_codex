import type { PokerHandType } from '../poker/evaluate';
import type { RandomState } from '../rng/random';
import type { Rank, Suit } from './cards';
import type {
  CardId,
  ChoiceId,
  ConsumableInstanceId,
  JokerInstanceId,
  PackOfferId,
  RewardReceiptId,
  RunId,
  ShopId,
  ShopOfferId,
  VoucherOfferId,
} from './ids';

export const RUN_SCHEMA_VERSION_V2 = 2 as const;
export const CONTENT_VERSION_V2 = 'run-economy-2' as const;

export type ExecutableRunSchemaVersion = 2 | 3 | 4;
export type ExecutableRunContentVersion =
  'run-economy-2' | 'catalog-baseline-3' | 'joker-catalog-1';
export type RunModeV2 =
  | 'fixture-campaign'
  | 'migrated-foundation'
  | 'migrated-run-economy'
  | 'production-campaign'
  | 'production-challenge';
export type HandSortModeV2 = 'rank' | 'suit';
export type BlindPosition = 'small' | 'big' | 'boss';
export type BlindKind = BlindPosition | 'finisher';

export const EFFECT_WINDOWS = [
  'blind-selected',
  'round-start',
  'before-hand',
  'scored-card',
  'held-card',
  'joker-independent',
  'after-hand',
  'discard',
  'round-end',
  'blind-skipped',
  'shop-entered',
  'shop-rerolled',
  'item-acquired',
  'pack-opened',
  'ante-ended',
  'passive',
] as const;

export type EffectWindow = (typeof EFFECT_WINDOWS)[number];

export type EffectParameterValue = string | number | boolean | null;

export interface EffectReference {
  readonly id: string;
  readonly handlerId: string;
  readonly windows: readonly EffectWindow[];
  readonly priority: number;
  readonly parameters: Readonly<Record<string, EffectParameterValue>>;
}

export interface RunPlayingCard {
  readonly id: CardId;
  readonly suit: Suit;
  readonly rank: Rank;
  readonly enhancementId: string | null;
  readonly sealId: string | null;
  readonly editionId: string | null;
  readonly bonusChips: number;
}

export interface BlindDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly kind: BlindKind;
  readonly minimumAnte: number;
  readonly targetMultiplier: number;
  readonly reward: number;
  readonly effects: readonly EffectReference[];
}

export interface TagDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly effects: readonly EffectReference[];
}

export interface VoucherDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly prerequisiteId: string | null;
  readonly effects: readonly EffectReference[];
}

export type TargetKind = 'none' | 'playing-card' | 'joker' | 'consumable';

interface ItemDefinitionBase {
  readonly contentId: string;
  readonly name: string;
  readonly description: string;
  readonly baseCost: number;
  readonly weightUnits: number;
  readonly effects: readonly EffectReference[];
  readonly targetKind: TargetKind;
  readonly minimumTargets: number;
  readonly maximumTargets: number;
}

export interface JokerDefinitionV2 extends ItemDefinitionBase {
  readonly kind: 'joker';
  readonly rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
  readonly slotContribution: number;
  /** Present on production catalog Jokers; omitted by legacy fixture snapshots. */
  readonly copyPolicy?: 'output' | 'trigger' | 'none';
  /** Present on production catalog Jokers; omitted by legacy fixture snapshots. */
  readonly stickerEligibility?: {
    readonly permanent: boolean;
    readonly perishable: boolean;
    readonly rental: true;
  };
  /** Present on production catalog Jokers; V4 acquisition materializes a copy. */
  readonly initialAbilityState?: Readonly<Record<string, string | number | boolean>>;
}

export interface ConsumableDefinitionV2 extends ItemDefinitionBase {
  readonly kind: 'consumable';
  readonly family: 'tarot' | 'planet' | 'spectral' | 'fixture';
}

export interface PlayingCardDefinitionV2 extends ItemDefinitionBase {
  readonly kind: 'playing-card';
}

export type ItemDefinitionV2 =
  JokerDefinitionV2 | ConsumableDefinitionV2 | PlayingCardDefinitionV2;

export type PackFamily = 'standard' | 'arcana' | 'celestial' | 'buffoon' | 'spectral';
export type PackSize = 'normal' | 'jumbo' | 'mega';

export interface PackDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly family: PackFamily;
  readonly size: PackSize;
  readonly cost: number;
  readonly optionCount: number;
  readonly pickCount: number;
  readonly temporaryJokerSlots: number;
  readonly temporaryConsumableSlots: number;
  readonly weightUnits: number;
  readonly allowedItemKinds: readonly ItemDefinitionV2['kind'][];
  readonly effects: readonly EffectReference[];
}

export interface RunContentSnapshot {
  readonly blinds: readonly BlindDefinition[];
  readonly tags: readonly TagDefinition[];
  readonly vouchers: readonly VoucherDefinition[];
  readonly items: readonly ItemDefinitionV2[];
  readonly packs: readonly PackDefinition[];
}

export interface OwnedJokerV2 {
  readonly instanceId: JokerInstanceId;
  readonly contentId: string;
  readonly name: string;
  readonly description: string;
  readonly baseCost: number;
  readonly editionCost: number;
  readonly editionId: string | null;
  readonly effects: readonly EffectReference[];
  readonly slotContribution: number;
  readonly sellValueOverride: number | null;
  readonly debuffed: boolean;
}

export interface OwnedConsumableV2 {
  readonly instanceId: ConsumableInstanceId;
  readonly contentId: string;
  readonly name: string;
  readonly description: string;
  readonly baseCost: number;
  readonly editionCost: number;
  readonly editionId: string | null;
  readonly effects: readonly EffectReference[];
  readonly targetKind: TargetKind;
  readonly minimumTargets: number;
  readonly maximumTargets: number;
  readonly sellValueOverride: number | null;
}

export interface InventoryStateV2 {
  readonly jokers: readonly OwnedJokerV2[];
  readonly consumables: readonly OwnedConsumableV2[];
  readonly voucherIds: readonly string[];
  readonly tags: readonly OwnedTagV2[];
}

export interface OwnedTagV2 {
  readonly instanceId: string;
  readonly contentId: string;
  readonly consumed: boolean;
  readonly deferredWindow: EffectWindow | null;
}

export interface RunRuleStateV2 {
  readonly handsPerRound: number;
  readonly discardsPerRound: number;
  readonly handSize: number;
  readonly maximumSelectedCards: number;
  readonly jokerSlots: number;
  readonly consumableSlots: number;
  readonly interestStep: number;
  readonly interestRate: number;
  readonly interestCap: number;
  readonly allowedDebt: number;
  readonly cardOfferSlots: number;
  readonly packOfferSlots: number;
  readonly baseRerollCost: number;
  readonly priceDiscountBasisPoints: number;
  readonly targetScaleBasisPoints: number;
  readonly straightSize: number;
  readonly flushSize: number;
  readonly handLevels: Readonly<Record<PokerHandType, number>>;
}

export interface MaterializedBlind {
  readonly definitionId: string;
  readonly name: string;
  readonly description: string;
  readonly kind: BlindKind;
  readonly targetMultiplier: number;
  readonly reward: number;
  readonly effects: readonly EffectReference[];
}

export interface AnteLineup {
  readonly smallTagId: string;
  readonly bigTagId: string;
  readonly boss: MaterializedBlind;
}

export interface RunProgressV2 {
  readonly ante: number;
  readonly blindPosition: BlindPosition;
  readonly campaignWon: boolean;
  readonly endless: boolean;
  readonly lineup: AnteLineup;
  readonly seenNormalBossIds: readonly string[];
  readonly seenFinisherBossIds: readonly string[];
  readonly bossRerollCount: number;
  readonly anteVoucherId: string | null;
}

export interface DeckStateV2 {
  readonly cards: readonly RunPlayingCard[];
}

export interface ScoreBreakdownV2 {
  readonly handType: PokerHandType;
  readonly handName: string;
  readonly handLevel: number;
  readonly baseChips: number;
  readonly cardChips: number;
  readonly multiplier: number;
  readonly score: number;
  readonly playedCardIds: readonly CardId[];
  readonly scoringCardIds: readonly CardId[];
  readonly trace: readonly string[];
}

export interface RoundStateV2 {
  readonly blind: MaterializedBlind;
  readonly targetScore: number;
  readonly score: number;
  readonly handsRemaining: number;
  readonly discardsRemaining: number;
  readonly drawPileIds: readonly CardId[];
  readonly handIds: readonly CardId[];
  readonly playedIds: readonly CardId[];
  readonly discardPileIds: readonly CardId[];
  readonly selectedCardIds: readonly CardId[];
  readonly forcedSelectedCardIds: readonly CardId[];
  readonly faceDownCardIds: readonly CardId[];
  readonly sortMode: HandSortModeV2;
  readonly handsPlayed: number;
  readonly discardsUsed: number;
  readonly lastHandType: PokerHandType | null;
}

export interface RewardLine {
  readonly id: string;
  readonly label: string;
  readonly amount: number;
  readonly sourceId: string;
}

export interface RewardReceipt {
  readonly id: RewardReceiptId;
  readonly blindReward: number;
  readonly remainingHandReward: number;
  readonly interestReward: number;
  readonly effectLines: readonly RewardLine[];
  readonly total: number;
  readonly claimed: boolean;
}

export interface EconomyStateV2 {
  readonly money: number;
  readonly pendingReward: RewardReceipt | null;
  readonly claimedRewardIds: readonly RewardReceiptId[];
}

export interface MaterializedItem {
  readonly contentId: string;
  readonly kind: ItemDefinitionV2['kind'];
  readonly name: string;
  readonly description: string;
  readonly baseCost: number;
  readonly editionCost: number;
  readonly editionId: string | null;
  readonly effects: readonly EffectReference[];
  readonly targetKind: TargetKind;
  readonly minimumTargets: number;
  readonly maximumTargets: number;
  readonly slotContribution: number;
  readonly generatedCard: RunPlayingCard | null;
}

export interface ShopCardOfferV2 {
  readonly id: ShopOfferId;
  readonly item: MaterializedItem;
  readonly price: number;
}

export interface ShopPackOfferV2 {
  readonly id: PackOfferId;
  readonly packId: string;
  readonly name: string;
  readonly description: string;
  readonly price: number;
}

export interface ShopVoucherOfferV2 {
  readonly id: VoucherOfferId;
  readonly voucherId: string;
  readonly name: string;
  readonly description: string;
  readonly price: number;
}

export interface ShopStateV2 {
  readonly id: ShopId;
  readonly ante: number;
  readonly afterBlind: BlindPosition;
  readonly cardOffers: readonly ShopCardOfferV2[];
  readonly packOffers: readonly ShopPackOfferV2[];
  readonly voucherOffer: ShopVoucherOfferV2 | null;
  readonly extraVoucherOffers?: readonly ShopVoucherOfferV2[];
  readonly rerollCount: number;
  readonly rerollCost: number;
  readonly purchasedOfferIds: readonly string[];
  readonly freeRerollAvailable: boolean;
}

export interface PackChoiceOption {
  readonly id: string;
  readonly item: MaterializedItem;
  readonly consumed: boolean;
}

export interface PackChoiceFrame {
  readonly id: ChoiceId;
  readonly kind: 'pack';
  readonly optional: true;
  readonly returnPhase: 'shop' | 'blind-select';
  readonly packId: string;
  readonly packOfferId: PackOfferId;
  readonly options: readonly PackChoiceOption[];
  readonly remainingPicks: number;
  readonly temporaryJokerSlots: number;
  readonly temporaryConsumableSlots: number;
}

export interface TargetChoiceFrame {
  readonly id: ChoiceId;
  readonly kind: 'targets';
  readonly optional: boolean;
  readonly returnPhase: 'round' | 'shop' | 'blind-select';
  readonly sourceInstanceId: string;
  readonly effectId: string;
  readonly targetKind: Exclude<TargetKind, 'none'>;
  readonly eligibleIds: readonly string[];
  readonly selectedIds: readonly string[];
  readonly minimumTargets: number;
  readonly maximumTargets: number;
}

export interface BossRerollChoiceFrame {
  readonly id: ChoiceId;
  readonly kind: 'boss-reroll';
  readonly optional: true;
  readonly returnPhase: 'blind-select';
  readonly cost: number;
  readonly eligibleBlindIds: readonly string[];
}

export interface ForcedCardChoiceFrame {
  readonly id: ChoiceId;
  readonly kind: 'forced-card';
  readonly optional: false;
  readonly returnPhase: 'round';
  readonly eligibleIds: readonly CardId[];
  readonly selectedIds: readonly CardId[];
  readonly minimumTargets: number;
  readonly maximumTargets: number;
}

export type ChoiceFrame =
  PackChoiceFrame | TargetChoiceFrame | BossRerollChoiceFrame | ForcedCardChoiceFrame;

export interface PendingChoiceV2 {
  readonly current: ChoiceFrame;
  readonly suspended: readonly ChoiceFrame[];
}

export type RunPhaseStateV2 =
  | { readonly kind: 'blind-select' }
  | { readonly kind: 'round' }
  | { readonly kind: 'round-reward'; readonly receiptId: RewardReceiptId }
  | { readonly kind: 'shop' }
  | { readonly kind: 'choice'; readonly choiceId: ChoiceId }
  | { readonly kind: 'run-won' }
  | { readonly kind: 'run-lost' }
  | { readonly kind: 'finished' };

export interface RunHistoryV2 {
  readonly completedBlindIds: readonly string[];
  readonly skippedBlindIds: readonly string[];
  readonly playedCardIdsThisAnte: readonly CardId[];
  readonly playedHandTypes: readonly PokerHandType[];
  readonly claimedRewardIds: readonly RewardReceiptId[];
  readonly effectObservations: readonly EffectObservationV2[];
}

export interface EffectObservationV2 {
  readonly window: EffectWindow;
  readonly key: string;
  readonly value: EffectParameterValue;
  readonly sourceInstanceId: string;
  readonly effectId: string;
  readonly checkpointId: number;
}

export interface RunResultV2 {
  readonly kind: 'won' | 'lost' | 'finished';
  readonly ante: number;
  readonly score: number;
  readonly reason: string;
}

export interface RunStateV2 {
  readonly schemaVersion: ExecutableRunSchemaVersion;
  readonly contentVersion: ExecutableRunContentVersion;
  readonly runId: RunId;
  readonly checkpointId: number;
  readonly mode: RunModeV2;
  readonly seed: string;
  readonly rngState: RandomState;
  readonly phase: RunPhaseStateV2;
  readonly progress: RunProgressV2;
  readonly rules: RunRuleStateV2;
  readonly content: RunContentSnapshot;
  readonly deck: DeckStateV2;
  readonly round: RoundStateV2 | null;
  readonly inventory: InventoryStateV2;
  readonly economy: EconomyStateV2;
  readonly shop: ShopStateV2 | null;
  readonly pendingChoice: PendingChoiceV2 | null;
  readonly history: RunHistoryV2;
  readonly lastHand: ScoreBreakdownV2 | null;
  readonly result: RunResultV2 | null;
}
