import { z } from 'zod';

export const CATALOG_CONTENT_VERSION = 'catalog-baseline-3' as const;
export const PRODUCTION_CATALOG_VERSION = 'joker-catalog-3' as const;
export type CatalogContentVersion =
  | typeof CATALOG_CONTENT_VERSION
  | 'joker-catalog-1'
  | 'joker-catalog-2'
  | typeof PRODUCTION_CATALOG_VERSION;

export const NON_JOKER_CATALOG_FAMILIES = [
  'deck',
  'stake',
  'challenge',
  'voucher',
  'tarot',
  'planet',
  'spectral',
  'tag',
  'blind',
  'booster',
  'enhancement',
  'seal',
  'edition',
] as const;

export const CATALOG_FAMILIES = [...NON_JOKER_CATALOG_FAMILIES, 'joker'] as const;

export type NonJokerCatalogFamily = (typeof NON_JOKER_CATALOG_FAMILIES)[number];
export type CatalogFamily = (typeof CATALOG_FAMILIES)[number];

export const EXPECTED_NON_JOKER_CATALOG_COUNTS: Readonly<
  Record<NonJokerCatalogFamily, number>
> = {
  deck: 15,
  stake: 8,
  challenge: 20,
  voucher: 32,
  tarot: 22,
  planet: 12,
  spectral: 18,
  tag: 24,
  blind: 30,
  booster: 32,
  enhancement: 8,
  seal: 4,
  edition: 5,
};

export const EXPECTED_JOKER_CATALOG_COUNT = 150;
export const EXPECTED_CATALOG_COUNTS: Readonly<Record<CatalogFamily, number>> = {
  ...EXPECTED_NON_JOKER_CATALOG_COUNTS,
  joker: EXPECTED_JOKER_CATALOG_COUNT,
};

export const EXPECTED_NON_JOKER_CATALOG_TOTAL = 230;
export const EXPECTED_JOKER_CATALOG_TOTAL = 150;
export const EXPECTED_CATALOG_TOTAL = 380;

export type AvailabilityRule =
  | { readonly kind: 'always'; readonly value: null }
  | { readonly kind: 'minimum-ante'; readonly value: number }
  | { readonly kind: 'prerequisite'; readonly value: string }
  | { readonly kind: 'hand-played'; readonly value: string }
  | { readonly kind: 'challenge-only'; readonly value: string }
  | { readonly kind: 'profile-objective'; readonly value: string }
  | { readonly kind: 'deck-contains-modifier'; readonly value: string };

export type DiscoveryRule =
  | { readonly kind: 'visible'; readonly value: null }
  | { readonly kind: 'first-acquisition'; readonly value: null }
  | { readonly kind: 'after-use'; readonly value: string }
  | { readonly kind: 'profile-objective'; readonly value: string };

export type CatalogTrigger =
  | 'run-setup'
  | 'blind-selected'
  | 'round-start'
  | 'before-hand'
  | 'scored-card'
  | 'held-card'
  | 'joker-independent'
  | 'after-hand'
  | 'discard'
  | 'round-end'
  | 'blind-skipped'
  | 'shop-entered'
  | 'shop-rerolled'
  | 'item-acquired'
  | 'pack-opened'
  | 'pack-skipped'
  | 'item-sold'
  | 'playing-card-added'
  | 'playing-card-modifier-succeeded'
  | 'other-joker-resolved'
  | 'ante-ended'
  | 'consumable-used'
  | 'playing-card-destroyed'
  | 'boss-ability-triggered'
  | 'blind-survival'
  | 'shop-left'
  | 'passive';

export type RulePatchKey =
  | 'hands-per-round'
  | 'discards-per-round'
  | 'hand-size'
  | 'joker-slots'
  | 'consumable-slots'
  | 'interest-cap'
  | 'interest-enabled'
  | 'remaining-hand-reward'
  | 'remaining-discard-reward'
  | 'blind-reward'
  | 'target-scale'
  | 'shop-offer-slots'
  | 'pack-offer-slots'
  | 'reroll-cost'
  | 'allowed-debt'
  | 'discard-cost'
  | 'price-inflation'
  | 'maximum-selected-cards';

export type JokerHandFact =
  'pair' | 'three-of-a-kind' | 'four-of-a-kind' | 'two-pair' | 'straight' | 'flush';
export type JokerSuit = 'hearts' | 'diamonds' | 'clubs' | 'spades';
export type JokerRank =
  | '2'
  | '3'
  | '4'
  | '5'
  | '6'
  | '7'
  | '8'
  | '9'
  | '10'
  | 'jack'
  | 'queen'
  | 'king'
  | 'ace';
export type JokerCopyFacet = 'output' | 'trigger' | 'none';

export type JokerPredicate =
  | { readonly kind: 'always' }
  | {
      readonly kind: 'all' | 'any';
      readonly predicates: readonly JokerPredicate[];
    }
  | { readonly kind: 'not'; readonly predicate: JokerPredicate }
  | { readonly kind: 'hand-contains'; readonly fact: JokerHandFact }
  | { readonly kind: 'played-card-count-at-most'; readonly count: number }
  | { readonly kind: 'played-card-count-exactly'; readonly count: number }
  | { readonly kind: 'first-hand-of-round' }
  | { readonly kind: 'first-discard-of-round' }
  | {
      readonly kind: 'displayed-hand';
      readonly source: 'fixed' | 'source-target';
      readonly hand?: string | undefined;
    }
  | { readonly kind: 'played-effective-rank-in'; readonly ranks: readonly JokerRank[] }
  | { readonly kind: 'hand-played-earlier-this-round' }
  | { readonly kind: 'event-family'; readonly family: string }
  | {
      readonly kind: 'event-card-count-at-least';
      readonly selector:
        | 'all'
        | 'face'
        | 'target-rank'
        | 'castle-target-suit'
        | 'jack'
        | 'glass'
        | 'effective-face';
      readonly count: number;
    }
  | {
      readonly kind: 'event-card-count-exactly';
      readonly selector:
        | 'all'
        | 'face'
        | 'target-rank'
        | 'castle-target-suit'
        | 'jack'
        | 'glass'
        | 'effective-face';
      readonly count: number;
    }
  | { readonly kind: 'money-at-most'; readonly amount: number }
  | { readonly kind: 'blind-position-in'; readonly positions: readonly string[] }
  | { readonly kind: 'scored-card-target-suit' }
  | { readonly kind: 'scored-card-idol-target' }
  | { readonly kind: 'scored-card-enhancement'; readonly modifierId: string }
  | { readonly kind: 'scored-card-enhanced' }
  | { readonly kind: 'first-scoring-card' }
  | { readonly kind: 'first-scoring-face' }
  | { readonly kind: 'displayed-hand-is-global-maximum' }
  | { readonly kind: 'other-joker-rarity'; readonly rarity: JokerRarity }
  | { readonly kind: 'scored-card-suit'; readonly suit: JokerSuit }
  | { readonly kind: 'scored-card-rank-in'; readonly ranks: readonly JokerRank[] }
  | { readonly kind: 'scored-card-face' }
  | {
      readonly kind: 'scoring-cards-face';
      readonly comparison: 'any' | 'none';
    }
  | { readonly kind: 'held-lowest-rank' }
  | { readonly kind: 'all-held-suits'; readonly suits: readonly JokerSuit[] }
  | {
      readonly kind: 'remaining-discards';
      readonly comparison: 'zero' | 'any';
    }
  | { readonly kind: 'final-hand' }
  | {
      readonly kind: 'scoring-suit-assignment';
      readonly assignment: 'four-suits' | 'club-and-other';
    }
  | { readonly kind: 'full-deck-enhanced-count-at-least'; readonly count: number }
  | { readonly kind: 'no-discards-used' }
  | {
      readonly kind: 'run-hand-modulo';
      readonly divisor: number;
      readonly equals: number;
    }
  | {
      readonly kind: 'source-state-comparison';
      readonly key: string;
      readonly comparison: 'equal' | 'at-most' | 'at-least';
      readonly value: number;
    }
  | {
      readonly kind: 'chance';
      readonly numerator: number;
      readonly denominator: number;
    };

export type JokerValue =
  | { readonly kind: 'fixed'; readonly value: number }
  | { readonly kind: 'remaining-discards'; readonly scale: number }
  | { readonly kind: 'empty-joker-slots-with-stencils' }
  | {
      readonly kind: 'full-deck-modifier-count';
      readonly modifierId: string;
      readonly scale: number;
      readonly base: number;
    }
  | { readonly kind: 'owned-joker-count'; readonly scale: number }
  | { readonly kind: 'draw-pile-count'; readonly scale: number }
  | {
      readonly kind: 'event-card-count';
      readonly selector:
        | 'all'
        | 'face'
        | 'target-rank'
        | 'castle-target-suit'
        | 'jack'
        | 'glass'
        | 'effective-face';
      readonly scale: number;
    }
  | {
      readonly kind: 'full-deck-rank-count';
      readonly rank: JokerRank;
      readonly identity: 'printed' | 'effective';
      readonly scale: number;
    }
  | {
      readonly kind: 'initial-deck-size-delta';
      readonly scale: number;
      readonly floor: number;
    }
  | {
      readonly kind: 'history-event-count';
      readonly event: 'tarot-used' | 'blind-skipped';
      readonly scale: number;
      readonly base?: number | undefined;
    }
  | {
      readonly kind: 'distinct-history-content-count';
      readonly family: 'planet';
      readonly scale: number;
    }
  | { readonly kind: 'other-joker-sale-value-sum' }
  | {
      readonly kind: 'money-complete-groups';
      readonly groupSize: number;
      readonly scale: number;
      readonly floor: number;
    }
  | { readonly kind: 'money'; readonly scale: number; readonly floor: number }
  | {
      readonly kind: 'source-state-ratio';
      readonly key: string;
      readonly divisor: number;
    }
  | { readonly kind: 'matching-hand-history'; readonly includeCurrent: boolean }
  | { readonly kind: 'selected-held-rank'; readonly scale: number }
  | { readonly kind: 'source-state'; readonly key: string }
  | {
      readonly kind: 'uniform-integer';
      readonly minimum: number;
      readonly maximum: number;
    };

export type CatalogOperation =
  | {
      readonly type: 'baseline';
      readonly key: string;
    }
  | {
      readonly type: 'passive-capability';
      readonly capability: 'straight-flush-size' | 'allowed-debt';
      readonly value: number;
    }
  | {
      readonly type: 'passive-capability';
      readonly capability: 'free-reroll-per-shop' | 'all-cards-face';
      readonly value: boolean;
    }
  | {
      readonly type: 'joker-score';
      readonly metric: 'chips' | 'mult' | 'mult-factor' | 'money';
      readonly predicate: JokerPredicate;
      readonly value: JokerValue;
      readonly copyFacet: JokerCopyFacet;
    }
  | {
      readonly type: 'joker-retrigger-card';
      readonly target: 'scored-card' | 'held-card';
      readonly predicate: JokerPredicate;
      readonly count: number;
      readonly copyFacet: JokerCopyFacet;
    }
  | {
      readonly type: 'joker-create-content';
      readonly family: 'joker' | 'tarot' | 'planet' | 'spectral' | 'playing-card';
      readonly count: number;
      readonly rarity: 'any' | 'common' | 'uncommon' | 'rare' | 'legendary';
      readonly predicate: JokerPredicate;
      readonly capacityRequired: boolean;
      readonly stickerPolicy: 'normal' | 'none' | 'copy-source';
      readonly copyFacet: JokerCopyFacet;
    }
  | {
      readonly type: 'joker-create-playing-card';
      readonly enhancementId: string;
      readonly predicate: JokerPredicate;
      readonly copyFacet: JokerCopyFacet;
    }
  | {
      readonly type: 'joker-destroy-right-grow';
      readonly stateKey: string;
      readonly saleValueScale: number;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-destroy-source';
      readonly predicate: JokerPredicate;
      readonly observationKey: string | null;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-state-change';
      readonly key: string;
      readonly mode: 'set' | 'add' | 'decrement';
      readonly value: JokerValue;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-level-current-hand';
      readonly levels: number;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'trigger';
    }
  | {
      readonly type: 'joker-sell-value-add';
      readonly amount: number;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-round-resource';
      readonly resource: 'hands' | 'discards';
      readonly mode: 'add' | 'set';
      readonly value: number;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'trigger';
    }
  | {
      readonly type: 'joker-clone-played-card';
      readonly predicate: JokerPredicate;
      readonly snapshot: 'command-entry';
      readonly destination: 'hand';
      readonly copyFacet: 'trigger';
    }
  | {
      readonly type: 'joker-add-card-bonus';
      readonly amount: number;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'trigger';
    }
  | {
      readonly type: 'joker-transform-enhancement';
      readonly enhancementId: string | null;
      readonly predicate: JokerPredicate;
      readonly copyFacet: JokerCopyFacet;
    }
  | {
      readonly type: 'joker-destroy-event-card';
      readonly target: 'played-singleton' | 'discarded-singleton';
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-random-destroy-other';
      readonly excludePermanent: boolean;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-state-change-clamped';
      readonly key: string;
      readonly mode: 'set' | 'add';
      readonly value: JokerValue;
      readonly minimum: number | null;
      readonly maximum: number | null;
      readonly destroyAtOrBelow: number | null;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-set-target';
      readonly scope: 'source' | 'shared';
      readonly target: 'hand' | 'rank' | 'suit';
      readonly policy: 'eligible-hand' | 'weighted-full-deck-rank' | 'nonrepeating-suit';
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-inventory-sell-value-add';
      readonly family: 'joker' | 'consumable' | 'both';
      readonly amount: number;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-create-fixed-tag';
      readonly tagContentId: string;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'trigger';
    }
  | {
      readonly type: 'joker-disable-current-boss';
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'trigger';
    }
  | {
      readonly type: 'joker-passive-capability';
      readonly capability:
        | 'all-played-cards-score'
        | 'straight-maximum-step'
        | 'hand-size-delta'
        | 'hands-per-round-delta'
        | 'discards-per-round-delta'
        | 'extra-interest'
        | 'suit-color-equivalence'
        | 'duplicate-shop-families'
        | 'listed-chance-power'
        | 'zero-price-planet'
        | 'boss-disable';
      readonly value: JokerValue;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'joker-runtime-action';
      readonly action:
        | 'create-random-sealed-card'
        | 'blind-survival'
        | 'set-castle-target'
        | 'set-idol-target'
        | 'sale-clone-ready-joker'
        | 'accumulate-discard-threshold'
        | 'level-discarded-hand'
        | 'clone-random-consumable-negative';
      readonly predicate: JokerPredicate;
      readonly parameters: Readonly<Record<string, string | number | boolean | null>>;
      readonly copyFacet: JokerCopyFacet;
    }
  | {
      readonly type: 'joker-after-rarity';
      readonly rarity: JokerRarity;
      readonly factor: number;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'trigger';
    }
  | {
      readonly type: 'joker-record-observation';
      readonly key: string;
      readonly predicate: JokerPredicate;
      readonly copyFacet: 'none';
    }
  | {
      readonly type: 'rule-patch';
      readonly key: RulePatchKey;
      readonly mode: 'set' | 'add' | 'multiply';
      readonly value: number | boolean;
    }
  | {
      readonly type: 'deck-recipe';
      readonly recipe:
        | 'standard'
        | 'no-face'
        | 'hearts-spades'
        | 'rank-two-through-nine'
        | 'double-face-no-low'
        | 'randomized'
        | 'custom';
      readonly count: number;
    }
  | {
      readonly type: 'target-curve';
      readonly curveId: 'baseline' | 'green' | 'purple';
      readonly anteOneThroughEight: readonly number[];
    }
  | {
      readonly type: 'sticker-roll';
      readonly stickerId: string;
      readonly numerator: number;
      readonly denominator: number;
      readonly purchaseCost: number | null;
      readonly roundCost: number | null;
      readonly expiryRounds: number | null;
    }
  | {
      readonly type: 'card-modifier';
      readonly family: 'enhancement' | 'seal' | 'edition' | 'sticker';
      readonly modifierId: string;
      readonly selection: 'selected' | 'random' | 'all' | 'face-cards' | 'generated';
      readonly count: number;
      readonly minimumTargets?: number;
      readonly numerator?: number;
      readonly denominator?: number;
    }
  | {
      readonly type: 'card-transform';
      readonly field: 'suit' | 'rank' | 'full-state' | 'debuff' | 'face-down';
      readonly value: string | boolean;
      readonly selection: 'selected' | 'random' | 'all' | 'drawn' | 'played-this-ante';
      readonly count: number;
      readonly minimumTargets?: number;
    }
  | {
      readonly type: 'card-destroy';
      readonly selection: 'selected' | 'random-held' | 'other-jokers';
      readonly count: number;
      readonly destructibleOnly: boolean;
      readonly minimumTargets?: number;
    }
  | {
      readonly type: 'card-copy';
      readonly source: 'selected-right' | 'selected' | 'random-joker';
      readonly destination: 'selected-left' | 'new-playing-cards' | 'new-joker';
      readonly count: number;
    }
  | {
      readonly type: 'playing-card-create';
      readonly count: number;
      readonly rankPool: 'face' | 'ace' | 'number';
      readonly enhancementPolicy: 'random';
    }
  | {
      readonly type: 'content-create';
      readonly family: 'joker' | 'tarot' | 'planet' | 'spectral' | 'playing-card';
      readonly count: number;
      readonly rarity: 'any' | 'common' | 'uncommon' | 'rare' | 'legendary';
      readonly capacityRequired: boolean;
      readonly stickerPolicy: 'normal' | 'none' | 'copy-source';
    }
  | {
      readonly type: 'money';
      readonly mode: 'add' | 'set-zero' | 'cap-add' | 'per-history' | 'per-card';
      readonly amount: number;
      readonly cap: number | null;
      readonly historyKey: string | null;
    }
  | {
      readonly type: 'hand-level';
      readonly hand: string | null;
      readonly levels: number;
      readonly chips: number;
      readonly mult: number;
    }
  | {
      readonly type: 'score-rule';
      readonly key:
        | 'add-chips'
        | 'add-mult'
        | 'multiply-mult'
        | 'average-chips-mult'
        | 'money-chip-cap'
        | 'halve-base'
        | 'played-card-always-scores'
        | 'chance-money';
      readonly amount: number;
      readonly numerator: number | null;
      readonly denominator: number | null;
    }
  | {
      readonly type: 'shop-rule';
      readonly key:
        | 'discount-basis-points'
        | 'edition-weight'
        | 'reroll-discount'
        | 'family-weight'
        | 'playing-cards-enabled'
        | 'joker-offers-enabled'
        | 'boss-reroll'
        | 'free-next-offer'
        | 'free-initial-shop'
        | 'price-increase-per-purchase';
      readonly value: number | boolean | string;
    }
  | {
      readonly type: 'pack-rule';
      readonly profileId: string;
      readonly optionCount: number;
      readonly pickCount: number;
      readonly temporarySlots: number;
      readonly rareReplacementBasisPoints: number;
    }
  | {
      readonly type: 'blind-rule';
      readonly key:
        | 'target-multiplier'
        | 'random-held-discard'
        | 'money-reset-on-most-played'
        | 'first-hand-face-down'
        | 'random-draw-face-down'
        | 'decrease-hand-level'
        | 'require-play-count'
        | 'draw-replacements-face-down'
        | 'zero-discards'
        | 'hand-type-no-repeat'
        | 'first-hand-type-only'
        | 'draw-exactly'
        | 'one-hand'
        | 'played-card-cost'
        | 'conceal-reorder-jokers'
        | 'debuff-until-joker-sold'
        | 'disable-random-joker'
        | 'force-selected-card';
      readonly value: number | boolean | string;
    }
  | {
      readonly type: 'tag-rule';
      readonly timing: 'immediate' | 'next-shop' | 'next-round' | 'next-boss';
      readonly key:
        | 'free-joker'
        | 'edition-joker'
        | 'money'
        | 'voucher'
        | 'boss-reroll'
        | 'free-pack'
        | 'history-money'
        | 'free-shop'
        | 'copy-next-tag'
        | 'hand-size'
        | 'free-reroll'
        | 'hand-levels';
      readonly value: number | string;
    }
  | {
      readonly type: 'restriction';
      readonly key:
        | 'ban-content'
        | 'exclude-content'
        | 'permanent-jokers'
        | 'no-joker-routes'
        | 'debuff-after-score'
        | 'dynamic-hand-size'
        | 'capacity-after-ante-four'
        | 'challenge-stake-baseline';
      readonly values: readonly string[];
    };

export interface CatalogEffect {
  readonly id: string;
  readonly handlerId: string;
  readonly trigger: CatalogTrigger;
  readonly priority: number;
  readonly operations: readonly CatalogOperation[];
}

export interface CatalogRowBase {
  readonly id: string;
  readonly ordinal: number;
  readonly referenceIndex: string;
  readonly nameKey: string;
  readonly descriptionKey: string;
  readonly assetId: string;
  readonly ownershipId: string;
  readonly introducedIn: CatalogContentVersion;
  readonly availability: AvailabilityRule;
  readonly unlockObjectiveId: string | null;
  readonly discovery: DiscoveryRule;
  readonly cost: number;
  readonly weightUnits: number;
  readonly prerequisiteIds: readonly string[];
  readonly externalDependencyIds: readonly string[];
  readonly contractIds: readonly string[];
  readonly effects: readonly CatalogEffect[];
  readonly mechanicalProfileId: string | null;
}

export interface NonJokerCatalogRow extends CatalogRowBase {
  readonly family: NonJokerCatalogFamily;
}

export type JokerRarity = 'common' | 'uncommon' | 'rare' | 'legendary';
export type JokerEnsemble =
  | 'main-stage'
  | 'mask-illusion'
  | 'backstage-machinery'
  | 'music-acrobatics'
  | 'midnight-spirits'
  | 'creation-secret'
  | 'disordered-machine'
  | 'cloud-traveler'
  | 'night-market-ledger'
  | 'strange-beast-finale'
  | 'brass-dispatch'
  | 'four-color-procession'
  | 'mirror-stage'
  | 'grand-formation'
  | 'starfire-legend';
export type JokerCopyPolicy = 'output' | 'trigger' | 'route' | 'none';
export type JokerCopyTarget = 'none' | 'right-adjacent' | 'leftmost';
export type JokerAbilityStateValue = string | number | boolean;

export interface JokerCatalogRow extends CatalogRowBase {
  readonly family: 'joker';
  readonly rarity: JokerRarity;
  readonly flavorKey: string;
  readonly ensemble: JokerEnsemble;
  readonly copyPolicy: JokerCopyPolicy;
  readonly copyTarget: JokerCopyTarget;
  readonly stickerEligibility: {
    readonly permanent: boolean;
    readonly perishable: boolean;
    readonly rental: true;
  };
  readonly initialAbilityState: Readonly<Record<string, JokerAbilityStateValue>>;
}

export type CatalogRow = NonJokerCatalogRow | JokerCatalogRow;

export interface BoosterProfile {
  readonly id: string;
  readonly family: 'standard' | 'tarot' | 'planet' | 'joker' | 'spectral';
  readonly size: 'normal' | 'jumbo' | 'mega';
  readonly cost: number;
  readonly optionCount: number;
  readonly pickCount: number;
  readonly temporaryJokerSlots: number;
  readonly temporaryConsumableSlots: number;
}

export interface ExternalContentDependency {
  readonly id: string;
  readonly ownerTask:
    | '07-17-joker-catalog-001-050'
    | '07-17-joker-catalog-051-100'
    | '07-17-joker-catalog-101-150';
  readonly capabilities: readonly string[];
  readonly consumerIds: readonly string[];
}

interface AssetOwnershipRecordBase {
  readonly id: string;
  readonly contentId: string;
  readonly assetId: string;
  readonly assetPath: string;
  readonly focalKey: string;
  readonly sourceFileOrPrompt: string;
  readonly author: '百戏奇牌项目';
  readonly reviewed: boolean;
  readonly notes: string;
}

export interface ProjectSvgAssetOwnershipRecord extends AssetOwnershipRecordBase {
  readonly source: 'project-svg';
}

export interface GeneratedRasterAssetOwnershipRecord extends AssetOwnershipRecordBase {
  readonly source: 'generated-raster';
  readonly ensemble: JokerEnsemble;
  readonly width: 768;
  readonly height: 1024;
  readonly inspectionStatus: 'approved';
}

export type AssetOwnershipRecord =
  ProjectSvgAssetOwnershipRecord | GeneratedRasterAssetOwnershipRecord;

export interface ContractCoverageRecord {
  readonly contentId: string;
  readonly contractIds: readonly string[];
}

export interface ProductionCatalog {
  readonly contentVersion: typeof CATALOG_CONTENT_VERSION;
  readonly productionVersion: typeof PRODUCTION_CATALOG_VERSION;
  readonly rows: readonly CatalogRow[];
  readonly boosterProfiles: readonly BoosterProfile[];
  readonly localization: Readonly<Record<string, string>>;
  readonly assets: readonly AssetOwnershipRecord[];
  readonly dependencies: readonly ExternalContentDependency[];
  readonly contracts: readonly ContractCoverageRecord[];
}

const nonemptyId = z.string().min(1).max(180);
const safeNonnegative = z.number().int().nonnegative().safe();
const primitiveValue = z.union([z.string(), z.number().finite(), z.boolean()]);
const jokerSuitSchema = z.enum(['hearts', 'diamonds', 'clubs', 'spades']);
const jokerRankSchema = z.enum([
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

export const jokerPredicateSchema: z.ZodType<JokerPredicate> = z.lazy(() =>
  z.discriminatedUnion('kind', [
    z.object({ kind: z.literal('always') }).strict(),
    z
      .object({
        kind: z.literal('all'),
        predicates: z.array(jokerPredicateSchema).min(1).max(8),
      })
      .strict(),
    z
      .object({
        kind: z.literal('any'),
        predicates: z.array(jokerPredicateSchema).min(1).max(8),
      })
      .strict(),
    z
      .object({
        kind: z.literal('not'),
        predicate: jokerPredicateSchema,
      })
      .strict(),
    z
      .object({
        kind: z.literal('hand-contains'),
        fact: z.enum([
          'pair',
          'three-of-a-kind',
          'four-of-a-kind',
          'two-pair',
          'straight',
          'flush',
        ]),
      })
      .strict(),
    z
      .object({
        kind: z.literal('played-card-count-at-most'),
        count: safeNonnegative,
      })
      .strict(),
    z
      .object({
        kind: z.literal('played-card-count-exactly'),
        count: safeNonnegative,
      })
      .strict(),
    z.object({ kind: z.literal('first-hand-of-round') }).strict(),
    z.object({ kind: z.literal('first-discard-of-round') }).strict(),
    z
      .object({
        kind: z.literal('displayed-hand'),
        source: z.enum(['fixed', 'source-target']),
        hand: nonemptyId.optional(),
      })
      .strict(),
    z
      .object({
        kind: z.literal('played-effective-rank-in'),
        ranks: z.array(jokerRankSchema).min(1).max(13),
      })
      .strict(),
    z.object({ kind: z.literal('hand-played-earlier-this-round') }).strict(),
    z.object({ kind: z.literal('event-family'), family: nonemptyId }).strict(),
    z
      .object({
        kind: z.literal('event-card-count-at-least'),
        selector: z.enum([
          'all',
          'face',
          'target-rank',
          'castle-target-suit',
          'jack',
          'glass',
          'effective-face',
        ]),
        count: safeNonnegative,
      })
      .strict(),
    z
      .object({
        kind: z.literal('event-card-count-exactly'),
        selector: z.enum([
          'all',
          'face',
          'target-rank',
          'castle-target-suit',
          'jack',
          'glass',
          'effective-face',
        ]),
        count: safeNonnegative,
      })
      .strict(),
    z
      .object({ kind: z.literal('money-at-most'), amount: z.number().int().safe() })
      .strict(),
    z
      .object({
        kind: z.literal('blind-position-in'),
        positions: z
          .array(z.enum(['small', 'big', 'boss']))
          .min(1)
          .max(3),
      })
      .strict(),
    z.object({ kind: z.literal('scored-card-target-suit') }).strict(),
    z.object({ kind: z.literal('scored-card-idol-target') }).strict(),
    z
      .object({ kind: z.literal('scored-card-enhancement'), modifierId: nonemptyId })
      .strict(),
    z.object({ kind: z.literal('scored-card-enhanced') }).strict(),
    z.object({ kind: z.literal('first-scoring-card') }).strict(),
    z.object({ kind: z.literal('first-scoring-face') }).strict(),
    z.object({ kind: z.literal('displayed-hand-is-global-maximum') }).strict(),
    z
      .object({
        kind: z.literal('other-joker-rarity'),
        rarity: z.enum(['common', 'uncommon', 'rare', 'legendary']),
      })
      .strict(),
    z.object({ kind: z.literal('scored-card-suit'), suit: jokerSuitSchema }).strict(),
    z
      .object({
        kind: z.literal('scored-card-rank-in'),
        ranks: z.array(jokerRankSchema).min(1).max(13),
      })
      .strict(),
    z.object({ kind: z.literal('scored-card-face') }).strict(),
    z
      .object({
        kind: z.literal('scoring-cards-face'),
        comparison: z.enum(['any', 'none']),
      })
      .strict(),
    z.object({ kind: z.literal('held-lowest-rank') }).strict(),
    z
      .object({
        kind: z.literal('all-held-suits'),
        suits: z.array(jokerSuitSchema).min(1).max(4),
      })
      .strict(),
    z
      .object({
        kind: z.literal('remaining-discards'),
        comparison: z.enum(['zero', 'any']),
      })
      .strict(),
    z.object({ kind: z.literal('final-hand') }).strict(),
    z
      .object({
        kind: z.literal('scoring-suit-assignment'),
        assignment: z.enum(['four-suits', 'club-and-other']),
      })
      .strict(),
    z
      .object({
        kind: z.literal('full-deck-enhanced-count-at-least'),
        count: safeNonnegative,
      })
      .strict(),
    z.object({ kind: z.literal('no-discards-used') }).strict(),
    z
      .object({
        kind: z.literal('run-hand-modulo'),
        divisor: safeNonnegative.min(1),
        equals: safeNonnegative,
      })
      .strict()
      .refine(({ divisor, equals }) => equals < divisor),
    z
      .object({
        kind: z.literal('source-state-comparison'),
        key: nonemptyId,
        comparison: z.enum(['equal', 'at-most', 'at-least']),
        value: z.number().finite(),
      })
      .strict(),
    z
      .object({
        kind: z.literal('chance'),
        numerator: safeNonnegative,
        denominator: safeNonnegative.min(1),
      })
      .strict()
      .refine(({ numerator, denominator }) => numerator <= denominator),
  ]),
);

export function validateJokerPredicateDepth(
  predicate: JokerPredicate,
  maximumDepth = 4,
): boolean {
  const visit = (node: JokerPredicate, depth: number): boolean =>
    depth <= maximumDepth &&
    (node.kind === 'all' || node.kind === 'any'
      ? node.predicates.every((child) => visit(child, depth + 1))
      : node.kind === 'not'
        ? visit(node.predicate, depth + 1)
        : true);
  return visit(predicate, 0);
}

export const jokerValueSchema: z.ZodType<JokerValue> = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('fixed'), value: z.number().finite() }).strict(),
  z
    .object({ kind: z.literal('remaining-discards'), scale: z.number().finite() })
    .strict(),
  z.object({ kind: z.literal('empty-joker-slots-with-stencils') }).strict(),
  z
    .object({
      kind: z.literal('full-deck-modifier-count'),
      modifierId: nonemptyId,
      scale: z.number().finite(),
      base: z.number().finite(),
    })
    .strict(),
  z.object({ kind: z.literal('owned-joker-count'), scale: z.number().finite() }).strict(),
  z.object({ kind: z.literal('draw-pile-count'), scale: z.number().finite() }).strict(),
  z
    .object({
      kind: z.literal('event-card-count'),
      selector: z.enum([
        'all',
        'face',
        'target-rank',
        'castle-target-suit',
        'jack',
        'glass',
        'effective-face',
      ]),
      scale: z.number().finite(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('full-deck-rank-count'),
      rank: jokerRankSchema,
      identity: z.enum(['printed', 'effective']),
      scale: z.number().finite(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('initial-deck-size-delta'),
      scale: z.number().finite(),
      floor: z.number().finite(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('history-event-count'),
      event: z.enum(['tarot-used', 'blind-skipped']),
      scale: z.number().finite(),
      base: z.number().finite().optional(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('distinct-history-content-count'),
      family: z.literal('planet'),
      scale: z.number().finite(),
    })
    .strict(),
  z.object({ kind: z.literal('other-joker-sale-value-sum') }).strict(),
  z
    .object({
      kind: z.literal('money-complete-groups'),
      groupSize: safeNonnegative.min(1),
      scale: z.number().finite(),
      floor: z.number().finite(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('money'),
      scale: z.number().finite(),
      floor: z.number().finite(),
    })
    .strict(),
  z
    .object({
      kind: z.literal('source-state-ratio'),
      key: nonemptyId,
      divisor: z.number().finite().positive(),
    })
    .strict(),
  z
    .object({ kind: z.literal('matching-hand-history'), includeCurrent: z.boolean() })
    .strict(),
  z
    .object({ kind: z.literal('selected-held-rank'), scale: z.number().finite() })
    .strict(),
  z.object({ kind: z.literal('source-state'), key: nonemptyId }).strict(),
  z
    .object({
      kind: z.literal('uniform-integer'),
      minimum: z.number().int().safe(),
      maximum: z.number().int().safe(),
    })
    .strict()
    .refine(({ minimum, maximum }) => maximum >= minimum),
]);

const availabilityRuleSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('always'), value: z.null() }).strict(),
  z.object({ kind: z.literal('minimum-ante'), value: safeNonnegative }).strict(),
  z.object({ kind: z.literal('prerequisite'), value: nonemptyId }).strict(),
  z.object({ kind: z.literal('hand-played'), value: nonemptyId }).strict(),
  z.object({ kind: z.literal('challenge-only'), value: nonemptyId }).strict(),
  z.object({ kind: z.literal('profile-objective'), value: nonemptyId }).strict(),
  z.object({ kind: z.literal('deck-contains-modifier'), value: nonemptyId }).strict(),
]);

const discoveryRuleSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('visible'), value: z.null() }).strict(),
  z.object({ kind: z.literal('first-acquisition'), value: z.null() }).strict(),
  z.object({ kind: z.literal('after-use'), value: nonemptyId }).strict(),
  z.object({ kind: z.literal('profile-objective'), value: nonemptyId }).strict(),
]);

const catalogEffectSchema = z
  .object({
    id: nonemptyId,
    handlerId: nonemptyId,
    trigger: z.enum([
      'run-setup',
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
      'pack-skipped',
      'item-sold',
      'playing-card-added',
      'playing-card-modifier-succeeded',
      'other-joker-resolved',
      'ante-ended',
      'consumable-used',
      'playing-card-destroyed',
      'boss-ability-triggered',
      'blind-survival',
      'shop-left',
      'passive',
    ]),
    priority: z.number().int().safe(),
    operations: z.array(z.object({ type: nonemptyId }).catchall(z.unknown())).min(1),
  })
  .strict();

const catalogRowBaseShape = {
  id: nonemptyId,
  ordinal: safeNonnegative.min(1),
  referenceIndex: nonemptyId,
  nameKey: nonemptyId,
  descriptionKey: nonemptyId,
  assetId: nonemptyId,
  ownershipId: nonemptyId,
  introducedIn: z.enum([
    CATALOG_CONTENT_VERSION,
    'joker-catalog-1',
    'joker-catalog-2',
    PRODUCTION_CATALOG_VERSION,
  ]),
  availability: availabilityRuleSchema,
  unlockObjectiveId: nonemptyId.nullable(),
  discovery: discoveryRuleSchema,
  cost: safeNonnegative,
  weightUnits: safeNonnegative,
  prerequisiteIds: z.array(nonemptyId),
  externalDependencyIds: z.array(nonemptyId),
  contractIds: z.array(nonemptyId).min(1),
  effects: z.array(catalogEffectSchema).min(1),
  mechanicalProfileId: nonemptyId.nullable(),
} as const;

const nonJokerCatalogRowSchema = z
  .object({
    ...catalogRowBaseShape,
    family: z.enum(NON_JOKER_CATALOG_FAMILIES),
  })
  .strict();

const jokerCatalogRowSchema = z
  .object({
    ...catalogRowBaseShape,
    family: z.literal('joker'),
    rarity: z.enum(['common', 'uncommon', 'rare', 'legendary']),
    flavorKey: nonemptyId,
    ensemble: z.enum([
      'main-stage',
      'mask-illusion',
      'backstage-machinery',
      'music-acrobatics',
      'midnight-spirits',
      'creation-secret',
      'disordered-machine',
      'cloud-traveler',
      'night-market-ledger',
      'strange-beast-finale',
      'brass-dispatch',
      'four-color-procession',
      'mirror-stage',
      'grand-formation',
      'starfire-legend',
    ]),
    copyPolicy: z.enum(['output', 'trigger', 'route', 'none']),
    copyTarget: z.enum(['none', 'right-adjacent', 'leftmost']),
    stickerEligibility: z
      .object({
        permanent: z.boolean(),
        perishable: z.boolean(),
        rental: z.literal(true),
      })
      .strict(),
    initialAbilityState: z.record(z.string().min(1), primitiveValue),
  })
  .strict();

export const catalogRowSchema: z.ZodType<CatalogRow> = z.union([
  nonJokerCatalogRowSchema,
  jokerCatalogRowSchema,
]) as unknown as z.ZodType<CatalogRow>;
