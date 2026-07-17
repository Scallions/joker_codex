import type { PlayingCard, Rank } from './cards';
import type {
  CardId,
  ConsumableInstanceId,
  JokerInstanceId,
  RunId,
  ShopOfferId,
} from './ids';
import type { PokerHandType } from '../poker/evaluate';
import type { RandomState } from '../rng/random';

export type RunPhase = 'round' | 'shop' | 'won' | 'lost';
export type HandSortMode = 'rank' | 'suit';
export const RUN_SCHEMA_VERSION = 1 as const;
export const CONTENT_VERSION = 'foundation-1' as const;

export interface SetRankConsumableEffect {
  readonly type: 'set-rank';
  readonly rank: Rank;
}

export type ConsumableEffect = SetRankConsumableEffect;

export interface OwnedJoker {
  readonly instanceId: JokerInstanceId;
  readonly contentId: string;
  readonly name: string;
  readonly description: string;
  readonly handMultiplier: number;
  readonly sellPrice: number;
}

export interface OwnedConsumable {
  readonly instanceId: ConsumableInstanceId;
  readonly contentId: string;
  readonly name: string;
  readonly description: string;
  readonly effect: ConsumableEffect;
  readonly sellPrice: number;
}

interface ShopItemDefinitionBase {
  readonly contentId: string;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly sellPrice: number;
}

export interface ShopJokerDefinition extends ShopItemDefinitionBase {
  readonly kind: 'joker';
  readonly handMultiplier: number;
}

export interface ShopConsumableDefinition extends ShopItemDefinitionBase {
  readonly kind: 'consumable';
  readonly effect: ConsumableEffect;
}

export type ShopItemDefinition = ShopJokerDefinition | ShopConsumableDefinition;
export type ShopOffer = ShopItemDefinition & { readonly id: ShopOfferId };

export interface FixtureShopState {
  readonly offers: readonly ShopOffer[];
  readonly rerollCost: number;
  readonly rerollCount: number;
}

export interface ScoreBreakdown {
  readonly handType: PokerHandType;
  readonly handName: string;
  readonly baseChips: number;
  readonly cardChips: number;
  readonly multiplier: number;
  readonly score: number;
  readonly playedCardIds: readonly CardId[];
  readonly scoringCardIds: readonly CardId[];
}

export interface RunState {
  readonly schemaVersion: typeof RUN_SCHEMA_VERSION;
  readonly contentVersion: typeof CONTENT_VERSION;
  readonly runId: RunId;
  readonly checkpointId: number;
  readonly seed: string;
  readonly rngState: RandomState;
  readonly phase: RunPhase;
  readonly targetScore: number;
  readonly roundScore: number;
  readonly handsRemaining: number;
  readonly discardsRemaining: number;
  readonly money: number;
  readonly handSize: number;
  readonly drawPile: readonly PlayingCard[];
  readonly hand: readonly PlayingCard[];
  readonly discardPile: readonly PlayingCard[];
  readonly selectedCardIds: readonly CardId[];
  readonly sortMode: HandSortMode;
  readonly jokers: readonly OwnedJoker[];
  readonly consumables: readonly OwnedConsumable[];
  readonly shopPool: readonly ShopItemDefinition[];
  readonly shop: FixtureShopState | null;
  readonly lastHand: ScoreBreakdown | null;
}
