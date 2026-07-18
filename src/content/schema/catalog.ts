import { z } from 'zod';

export const CATALOG_CONTENT_VERSION = 'catalog-baseline-3' as const;

export const CATALOG_FAMILIES = [
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

export type CatalogFamily = (typeof CATALOG_FAMILIES)[number];

export const EXPECTED_CATALOG_COUNTS: Readonly<Record<CatalogFamily, number>> = {
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

export const EXPECTED_CATALOG_TOTAL = 230;

export type AvailabilityRule =
  | { readonly kind: 'always'; readonly value: null }
  | { readonly kind: 'minimum-ante'; readonly value: number }
  | { readonly kind: 'prerequisite'; readonly value: string }
  | { readonly kind: 'hand-played'; readonly value: string }
  | { readonly kind: 'challenge-only'; readonly value: string }
  | { readonly kind: 'profile-objective'; readonly value: string };

export type DiscoveryRule =
  | { readonly kind: 'visible'; readonly value: null }
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
  | 'ante-ended'
  | 'consumable-used'
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

export type CatalogOperation =
  | {
      readonly type: 'baseline';
      readonly key: string;
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

export interface CatalogRow {
  readonly id: string;
  readonly family: CatalogFamily;
  readonly ordinal: number;
  readonly referenceIndex: string;
  readonly nameKey: string;
  readonly descriptionKey: string;
  readonly assetId: string;
  readonly ownershipId: string;
  readonly introducedIn: typeof CATALOG_CONTENT_VERSION;
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

export interface AssetOwnershipRecord {
  readonly id: string;
  readonly contentId: string;
  readonly assetId: string;
  readonly assetPath: string;
  readonly focalKey: string;
  readonly source: 'project-svg';
  readonly sourceFileOrPrompt: string;
  readonly author: '百戏奇牌项目';
  readonly reviewed: boolean;
  readonly notes: string;
}

export interface ContractCoverageRecord {
  readonly contentId: string;
  readonly contractIds: readonly string[];
}

export interface ProductionCatalog {
  readonly contentVersion: typeof CATALOG_CONTENT_VERSION;
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

export const catalogRowSchema: z.ZodType<CatalogRow> = z
  .object({
    id: nonemptyId,
    family: z.enum(CATALOG_FAMILIES),
    ordinal: safeNonnegative.min(1),
    referenceIndex: nonemptyId,
    nameKey: nonemptyId,
    descriptionKey: nonemptyId,
    assetId: nonemptyId,
    ownershipId: nonemptyId,
    introducedIn: z.literal(CATALOG_CONTENT_VERSION),
    availability: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('always'), value: z.null() }).strict(),
      z.object({ kind: z.literal('minimum-ante'), value: safeNonnegative }).strict(),
      z.object({ kind: z.literal('prerequisite'), value: nonemptyId }).strict(),
      z.object({ kind: z.literal('hand-played'), value: nonemptyId }).strict(),
      z.object({ kind: z.literal('challenge-only'), value: nonemptyId }).strict(),
      z.object({ kind: z.literal('profile-objective'), value: nonemptyId }).strict(),
    ]),
    unlockObjectiveId: nonemptyId.nullable(),
    discovery: z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('visible'), value: z.null() }).strict(),
      z.object({ kind: z.literal('after-use'), value: nonemptyId }).strict(),
      z.object({ kind: z.literal('profile-objective'), value: nonemptyId }).strict(),
    ]),
    cost: safeNonnegative,
    weightUnits: safeNonnegative,
    prerequisiteIds: z.array(nonemptyId),
    externalDependencyIds: z.array(nonemptyId),
    contractIds: z.array(nonemptyId).min(1),
    effects: z
      .array(
        z
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
              'ante-ended',
              'consumable-used',
              'passive',
            ]),
            priority: z.number().int().safe(),
            operations: z.array(
              z
                .object({ type: nonemptyId })
                .catchall(z.union([primitiveValue, z.null(), z.array(primitiveValue)])),
            ),
          })
          .strict(),
      )
      .min(1),
    mechanicalProfileId: nonemptyId.nullable(),
  })
  .strict() as unknown as z.ZodType<CatalogRow>;
