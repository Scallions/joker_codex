import type { JokerRarity } from '../../content/schema/catalog';
import type { CardId, JokerInstanceId } from '../model/ids';
import type { BlindPosition, ConsumableDefinitionV2 } from '../model/runV2';
import type { EffectivePlayingCardV3 } from '../poker/effectiveCardV3';
import type { PokerHandType } from '../poker/evaluate';

export type JokerEventFactsV5 =
  | { readonly kind: 'none' }
  | {
      readonly kind: 'played-hand';
      readonly playedCardIds: readonly CardId[];
      readonly firstHandOfRound: boolean;
      readonly displayedHand: PokerHandType;
      readonly previousRoundHandTypes: readonly PokerHandType[];
    }
  | {
      readonly kind: 'discard';
      readonly discardedCardIds: readonly CardId[];
      readonly firstDiscardOfRound: boolean;
      readonly forced: boolean;
      readonly discardedHandType?: PokerHandType | null;
    }
  | {
      readonly kind: 'consumable-use';
      readonly family: ConsumableDefinitionV2['family'];
      readonly contentId: string;
    }
  | {
      readonly kind: 'pack';
      readonly packId: string;
      readonly action: 'opened' | 'skipped';
    }
  | {
      readonly kind: 'item-sale';
      readonly family: 'joker' | 'consumable';
      readonly instanceId: string;
    }
  | {
      readonly kind: 'playing-card-added';
      readonly cardIds: readonly CardId[];
      readonly reason: string;
    }
  | {
      readonly kind: 'modifier-success';
      readonly cardId: CardId;
      readonly modifierId: string;
      readonly successfulBranches: number;
      readonly passIndex: number;
    }
  | {
      readonly kind: 'other-joker';
      readonly instanceId: JokerInstanceId;
      readonly rarity: JokerRarity;
      readonly debuffed: boolean;
      readonly position: number;
    }
  | {
      readonly kind: 'blind-result';
      readonly position: BlindPosition;
      readonly defeated: boolean;
    }
  | {
      readonly kind: 'playing-card-destroyed';
      readonly cardIds: readonly CardId[];
      readonly reason: string;
    }
  | {
      readonly kind: 'boss-ability-triggered';
      readonly bossId: string;
      readonly ruleIds: readonly string[];
      readonly affectedCardIds: readonly CardId[];
    }
  | {
      readonly kind: 'shop-left';
      readonly consumableInstanceIds: readonly string[];
    }
  | {
      readonly kind: 'blind-survival';
      readonly score: number;
      readonly targetScore: number;
      readonly deckExhausted: boolean;
    };

export interface JokerEventContextV5 {
  readonly eventFacts: JokerEventFactsV5;
  readonly eventCardIdentities: Readonly<Record<CardId, EffectivePlayingCardV3>>;
  readonly eventCardEnhancementIds?: Readonly<Record<CardId, string | null>>;
}

export const NO_JOKER_EVENT_FACTS_V5: JokerEventFactsV5 = Object.freeze({
  kind: 'none',
});
