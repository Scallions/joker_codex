import type {
  CardId,
  ConsumableInstanceId,
  JokerInstanceId,
  ShopOfferId,
} from '../model/ids';
import type { HandSortMode, RunState } from '../model/run';

interface CommandBase {
  readonly checkpointId: number;
}

export interface ToggleCardCommand extends CommandBase {
  readonly type: 'toggle-card';
  readonly cardId: CardId;
}

export interface DiscardSelectedCommand extends CommandBase {
  readonly type: 'discard-selected';
}

export interface PlaySelectedCommand extends CommandBase {
  readonly type: 'play-selected';
}

export interface UseConsumableCommand extends CommandBase {
  readonly type: 'use-consumable';
  readonly consumableInstanceId: ConsumableInstanceId;
  readonly cardId: CardId;
}

export interface SortHandCommand extends CommandBase {
  readonly type: 'sort-hand';
  readonly mode: HandSortMode;
}

export interface RerollShopCommand extends CommandBase {
  readonly type: 'reroll-shop';
}

export interface BuyShopOfferCommand extends CommandBase {
  readonly type: 'buy-shop-offer';
  readonly offerId: ShopOfferId;
}

export interface SellJokerCommand extends CommandBase {
  readonly type: 'sell-joker';
  readonly jokerInstanceId: JokerInstanceId;
}

export interface ReorderJokerCommand extends CommandBase {
  readonly type: 'reorder-joker';
  readonly jokerInstanceId: JokerInstanceId;
  readonly toIndex: number;
}

export interface LeaveShopCommand extends CommandBase {
  readonly type: 'leave-shop';
}

export type RunCommand =
  | ToggleCardCommand
  | DiscardSelectedCommand
  | PlaySelectedCommand
  | UseConsumableCommand
  | SortHandCommand
  | RerollShopCommand
  | BuyShopOfferCommand
  | SellJokerCommand
  | ReorderJokerCommand
  | LeaveShopCommand;

export type RejectionCode =
  | 'stale-checkpoint'
  | 'illegal-phase'
  | 'card-not-in-hand'
  | 'selection-limit'
  | 'empty-selection'
  | 'no-discards'
  | 'no-hands'
  | 'consumable-not-owned'
  | 'unsupported-effect'
  | 'offer-not-found'
  | 'insufficient-funds'
  | 'inventory-full'
  | 'joker-not-owned'
  | 'invalid-order';

export interface CommandRejection {
  readonly code: RejectionCode;
  readonly message: string;
}

export type DomainEvent =
  | { readonly type: 'selection-changed'; readonly cardIds: readonly CardId[] }
  | { readonly type: 'cards-discarded'; readonly cardIds: readonly CardId[] }
  | { readonly type: 'hand-scored'; readonly score: number; readonly handName: string }
  | { readonly type: 'blind-won'; readonly score: number }
  | { readonly type: 'run-lost'; readonly score: number }
  | { readonly type: 'card-transformed'; readonly cardId: CardId }
  | { readonly type: 'hand-sorted'; readonly mode: HandSortMode }
  | { readonly type: 'shop-rerolled'; readonly cost: number }
  | { readonly type: 'item-purchased'; readonly contentId: string }
  | { readonly type: 'joker-reordered'; readonly instanceId: JokerInstanceId }
  | { readonly type: 'joker-sold'; readonly instanceId: JokerInstanceId }
  | { readonly type: 'run-won'; readonly score: number };

export type PresentationEvent =
  | { readonly type: 'card-selection'; readonly cardId: CardId }
  | { readonly type: 'cards-swept'; readonly cardIds: readonly CardId[] }
  | { readonly type: 'hand-reveal'; readonly name: string }
  | { readonly type: 'score-stamp'; readonly score: number }
  | { readonly type: 'blind-cleared' }
  | { readonly type: 'run-failed' }
  | { readonly type: 'card-overprint'; readonly cardId: CardId }
  | { readonly type: 'cards-reordered'; readonly mode: HandSortMode }
  | { readonly type: 'coin-spent'; readonly amount: number }
  | { readonly type: 'item-arrived'; readonly contentId: string }
  | { readonly type: 'placard-moved'; readonly instanceId: JokerInstanceId }
  | { readonly type: 'coin-received'; readonly amount: number }
  | { readonly type: 'curtain-call' };

export type CommandResult =
  | {
      readonly ok: true;
      readonly state: RunState;
      readonly domainEvents: readonly DomainEvent[];
      readonly presentationEvents: readonly PresentationEvent[];
    }
  | {
      readonly ok: false;
      readonly rejection: CommandRejection;
    };
