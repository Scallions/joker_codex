import type {
  CardId,
  ChoiceId,
  ConsumableInstanceId,
  JokerInstanceId,
  PackOfferId,
  ShopOfferId,
  VoucherOfferId,
} from '../model/ids';
import type { BlindPosition, HandSortModeV2, RunStateV2 } from '../model/runV2';

interface CommandBaseV2 {
  readonly checkpointId: number;
}

export interface SelectBlindCommandV2 extends CommandBaseV2 {
  readonly type: 'select-blind';
  readonly position: BlindPosition;
}

export interface SkipBlindCommandV2 extends CommandBaseV2 {
  readonly type: 'skip-blind';
  readonly position: BlindPosition;
}

export interface RequestBossRerollCommandV2 extends CommandBaseV2 {
  readonly type: 'request-boss-reroll';
}

export interface ToggleCardCommandV2 extends CommandBaseV2 {
  readonly type: 'toggle-card';
  readonly cardId: CardId;
}

export interface SortHandCommandV2 extends CommandBaseV2 {
  readonly type: 'sort-hand';
  readonly mode: HandSortModeV2;
}

export interface PlaySelectedCommandV2 extends CommandBaseV2 {
  readonly type: 'play-selected';
}

export interface DiscardSelectedCommandV2 extends CommandBaseV2 {
  readonly type: 'discard-selected';
}

export interface ClaimRoundRewardCommandV2 extends CommandBaseV2 {
  readonly type: 'claim-round-reward';
}

export interface RerollShopCommandV2 extends CommandBaseV2 {
  readonly type: 'reroll-shop';
}

export interface BuyShopOfferCommandV2 extends CommandBaseV2 {
  readonly type: 'buy-shop-offer';
  readonly offerId: ShopOfferId;
}

export interface BuyPackCommandV2 extends CommandBaseV2 {
  readonly type: 'buy-pack';
  readonly offerId: PackOfferId;
}

export interface BuyVoucherCommandV2 extends CommandBaseV2 {
  readonly type: 'buy-voucher';
  readonly offerId: VoucherOfferId;
}

export interface SellJokerCommandV2 extends CommandBaseV2 {
  readonly type: 'sell-joker';
  readonly jokerInstanceId: JokerInstanceId;
}

export interface SellConsumableCommandV2 extends CommandBaseV2 {
  readonly type: 'sell-consumable';
  readonly consumableInstanceId: ConsumableInstanceId;
}

export interface ReorderJokerCommandV2 extends CommandBaseV2 {
  readonly type: 'reorder-joker';
  readonly jokerInstanceId: JokerInstanceId;
  readonly toIndex: number;
}

export interface BeginConsumableChoiceCommandV2 extends CommandBaseV2 {
  readonly type: 'begin-consumable-choice';
  readonly consumableInstanceId: ConsumableInstanceId;
}

export interface ChoosePackOptionCommandV2 extends CommandBaseV2 {
  readonly type: 'choose-pack-option';
  readonly choiceId: ChoiceId;
  readonly optionId: string;
}

export interface ToggleChoiceTargetCommandV2 extends CommandBaseV2 {
  readonly type: 'toggle-choice-target';
  readonly choiceId: ChoiceId;
  readonly targetId: string;
}

export interface ConfirmChoiceCommandV2 extends CommandBaseV2 {
  readonly type: 'confirm-choice';
  readonly choiceId: ChoiceId;
}

export interface CancelChoiceCommandV2 extends CommandBaseV2 {
  readonly type: 'cancel-choice';
  readonly choiceId: ChoiceId;
}

export interface SkipPackCommandV2 extends CommandBaseV2 {
  readonly type: 'skip-pack';
  readonly choiceId: ChoiceId;
}

export interface LeaveShopCommandV2 extends CommandBaseV2 {
  readonly type: 'leave-shop';
}

export interface FinishRunCommandV2 extends CommandBaseV2 {
  readonly type: 'finish-run';
}

export interface EnterEndlessCommandV2 extends CommandBaseV2 {
  readonly type: 'enter-endless';
}

export type RunCommandV2 =
  | SelectBlindCommandV2
  | SkipBlindCommandV2
  | RequestBossRerollCommandV2
  | ToggleCardCommandV2
  | SortHandCommandV2
  | PlaySelectedCommandV2
  | DiscardSelectedCommandV2
  | ClaimRoundRewardCommandV2
  | RerollShopCommandV2
  | BuyShopOfferCommandV2
  | BuyPackCommandV2
  | BuyVoucherCommandV2
  | SellJokerCommandV2
  | SellConsumableCommandV2
  | ReorderJokerCommandV2
  | BeginConsumableChoiceCommandV2
  | ChoosePackOptionCommandV2
  | ToggleChoiceTargetCommandV2
  | ConfirmChoiceCommandV2
  | CancelChoiceCommandV2
  | SkipPackCommandV2
  | LeaveShopCommandV2
  | FinishRunCommandV2
  | EnterEndlessCommandV2;

export type RejectionCodeV2 =
  | 'stale-checkpoint'
  | 'illegal-phase'
  | 'wrong-blind'
  | 'blind-not-skippable'
  | 'boss-reroll-unavailable'
  | 'card-not-in-hand'
  | 'selection-limit'
  | 'forced-card'
  | 'empty-selection'
  | 'no-discards'
  | 'no-hands'
  | 'hand-restricted'
  | 'choice-mismatch'
  | 'invalid-target'
  | 'offer-not-found'
  | 'insufficient-funds'
  | 'inventory-full'
  | 'pool-empty'
  | 'item-not-owned'
  | 'invalid-order'
  | 'effect-cycle'
  | 'effect-budget'
  | 'effect-handler-missing'
  | 'joker-context'
  | 'joker-state-key'
  | 'joker-value-range'
  | 'score-overflow-terminal';

export interface CommandRejectionV2 {
  readonly code: RejectionCodeV2;
  readonly message: string;
}

export type DomainEventV2 =
  | { readonly type: 'blind-selected'; readonly blindId: string }
  | { readonly type: 'blind-skipped'; readonly blindId: string; readonly tagId: string }
  | { readonly type: 'selection-changed'; readonly cardIds: readonly CardId[] }
  | { readonly type: 'hand-sorted'; readonly mode: HandSortModeV2 }
  | { readonly type: 'cards-discarded'; readonly cardIds: readonly CardId[] }
  | { readonly type: 'hand-scored'; readonly score: number; readonly handName: string }
  | { readonly type: 'blind-won'; readonly blindId: string; readonly score: number }
  | { readonly type: 'reward-claimed'; readonly amount: number }
  | {
      readonly type: 'shop-left';
      readonly ante: number;
      readonly position: BlindPosition;
    }
  | { readonly type: 'run-won'; readonly ante: number }
  | { readonly type: 'run-lost'; readonly ante: number }
  | { readonly type: 'endless-entered'; readonly ante: number }
  | { readonly type: 'run-finished'; readonly ante: number }
  | { readonly type: 'choice-opened'; readonly choiceId: ChoiceId }
  | { readonly type: 'choice-cancelled'; readonly choiceId: ChoiceId }
  | { readonly type: 'boss-rerolled'; readonly blindId: string; readonly cost: number }
  | { readonly type: 'shop-rerolled'; readonly cost: number }
  | { readonly type: 'item-purchased'; readonly contentId: string }
  | { readonly type: 'item-consumed'; readonly contentId: string }
  | { readonly type: 'item-sold'; readonly contentId: string }
  | { readonly type: 'pack-opened'; readonly packId: string }
  | { readonly type: 'voucher-redeemed'; readonly voucherId: string };

export type PresentationEventV2 =
  | { readonly type: 'blind-curtain'; readonly name: string }
  | { readonly type: 'tag-received'; readonly name: string }
  | { readonly type: 'card-selection'; readonly cardId: CardId }
  | { readonly type: 'cards-reordered'; readonly mode: HandSortModeV2 }
  | { readonly type: 'cards-swept'; readonly cardIds: readonly CardId[] }
  | { readonly type: 'hand-reveal'; readonly name: string }
  | { readonly type: 'score-stamp'; readonly score: number }
  | { readonly type: 'blind-cleared' }
  | { readonly type: 'run-failed' }
  | { readonly type: 'reward-receipt'; readonly amount: number }
  | { readonly type: 'curtain-call' }
  | { readonly type: 'coin-spent'; readonly amount: number }
  | { readonly type: 'coin-received'; readonly amount: number }
  | { readonly type: 'item-arrived'; readonly contentId: string };

export type CommandResultV2 =
  | {
      readonly ok: true;
      readonly state: RunStateV2;
      readonly domainEvents: readonly DomainEventV2[];
      readonly presentationEvents: readonly PresentationEventV2[];
    }
  | { readonly ok: false; readonly rejection: CommandRejectionV2 };
