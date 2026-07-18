import type { CatalogOperation, CatalogRow } from '../schema/catalog';
import { catalogId, defineRow, twoDigit } from './builders';

interface VoucherSeed {
  readonly slug: string;
  readonly operations: readonly CatalogOperation[];
}

const seeds: readonly VoucherSeed[] = [
  {
    slug: 'third-stall',
    operations: [{ type: 'rule-patch', key: 'shop-offer-slots', mode: 'set', value: 3 }],
  },
  {
    slug: 'fourth-stall',
    operations: [{ type: 'rule-patch', key: 'shop-offer-slots', mode: 'set', value: 4 }],
  },
  {
    slug: 'quarter-price',
    operations: [{ type: 'shop-rule', key: 'discount-basis-points', value: 7_500 }],
  },
  {
    slug: 'half-price',
    operations: [{ type: 'shop-rule', key: 'discount-basis-points', value: 5_000 }],
  },
  {
    slug: 'bright-pigment',
    operations: [{ type: 'shop-rule', key: 'edition-weight', value: 2 }],
  },
  {
    slug: 'brilliant-pigment',
    operations: [{ type: 'shop-rule', key: 'edition-weight', value: 4 }],
  },
  {
    slug: 'short-bargain',
    operations: [{ type: 'shop-rule', key: 'reroll-discount', value: 2 }],
  },
  {
    slug: 'deep-bargain',
    operations: [{ type: 'shop-rule', key: 'reroll-discount', value: 4 }],
  },
  {
    slug: 'wide-satchel',
    operations: [{ type: 'rule-patch', key: 'consumable-slots', mode: 'add', value: 1 }],
  },
  {
    slug: 'spirit-in-paper',
    operations: [
      {
        type: 'pack-rule',
        profileId: 'bxqp:profile:tarot-spectral-replacement',
        optionCount: 0,
        pickCount: 0,
        temporarySlots: 0,
        rareReplacementBasisPoints: 2_000,
      },
    ],
  },
  {
    slug: 'favored-star',
    operations: [{ type: 'baseline', key: 'planet-pack-guarantees-most-played-hand' }],
  },
  {
    slug: 'held-star',
    operations: [{ type: 'baseline', key: 'held-matching-planet-multiplies-1.5' }],
  },
  {
    slug: 'extra-beat',
    operations: [{ type: 'rule-patch', key: 'hands-per-round', mode: 'add', value: 1 }],
  },
  {
    slug: 'double-encore',
    operations: [{ type: 'rule-patch', key: 'hands-per-round', mode: 'add', value: 1 }],
  },
  {
    slug: 'extra-breath',
    operations: [
      { type: 'rule-patch', key: 'discards-per-round', mode: 'add', value: 1 },
    ],
  },
  {
    slug: 'double-breath',
    operations: [
      { type: 'rule-patch', key: 'discards-per-round', mode: 'add', value: 1 },
    ],
  },
  {
    slug: 'paper-scent',
    operations: [{ type: 'shop-rule', key: 'family-weight', value: 'tarot:2' }],
  },
  {
    slug: 'paper-tide',
    operations: [{ type: 'shop-rule', key: 'family-weight', value: 'tarot:4' }],
  },
  {
    slug: 'star-scent',
    operations: [{ type: 'shop-rule', key: 'family-weight', value: 'planet:2' }],
  },
  {
    slug: 'star-tide',
    operations: [{ type: 'shop-rule', key: 'family-weight', value: 'planet:4' }],
  },
  {
    slug: 'ten-coin-interest',
    operations: [{ type: 'rule-patch', key: 'interest-cap', mode: 'set', value: 10 }],
  },
  {
    slug: 'twenty-coin-interest',
    operations: [{ type: 'rule-patch', key: 'interest-cap', mode: 'set', value: 20 }],
  },
  {
    slug: 'empty-plaque',
    operations: [{ type: 'baseline', key: 'intentionally-inert-voucher' }],
  },
  {
    slug: 'hidden-rail',
    operations: [{ type: 'rule-patch', key: 'joker-slots', mode: 'add', value: 1 }],
  },
  {
    slug: 'card-stall',
    operations: [{ type: 'shop-rule', key: 'playing-cards-enabled', value: true }],
  },
  {
    slug: 'decorated-card-stall',
    operations: [
      { type: 'baseline', key: 'shop-playing-card-modifier-rolls-including-seals' },
    ],
  },
  {
    slug: 'rewind-hand',
    operations: [
      { type: 'baseline', key: 'move-back-one-ante' },
      { type: 'rule-patch', key: 'hands-per-round', mode: 'add', value: -1 },
    ],
  },
  {
    slug: 'rewind-discard',
    operations: [
      { type: 'baseline', key: 'move-back-one-ante' },
      { type: 'rule-patch', key: 'discards-per-round', mode: 'add', value: -1 },
    ],
  },
  {
    slug: 'single-cast-change',
    operations: [
      { type: 'shop-rule', key: 'boss-reroll', value: 'cost-10-once-per-ante' },
    ],
  },
  {
    slug: 'unlimited-cast-change',
    operations: [{ type: 'shop-rule', key: 'boss-reroll', value: 'cost-10-unlimited' }],
  },
  {
    slug: 'wide-hand',
    operations: [{ type: 'rule-patch', key: 'hand-size', mode: 'add', value: 1 }],
  },
  {
    slug: 'wider-hand',
    operations: [{ type: 'rule-patch', key: 'hand-size', mode: 'add', value: 1 }],
  },
];

export const VOUCHER_ROWS: readonly CatalogRow[] = seeds.map((seed, index) => {
  const isDependent = index % 2 === 1;
  const prerequisite = isDependent ? seeds[index - 1] : undefined;
  const prerequisiteId = prerequisite ? catalogId('voucher', prerequisite.slug) : null;
  return defineRow({
    family: 'voucher',
    ordinal: index + 1,
    slug: seed.slug,
    referenceIndex: `V${twoDigit(index + 1)}`,
    operations: seed.operations,
    trigger: 'item-acquired',
    cost: 10,
    weightUnits: 100,
    prerequisiteIds: prerequisiteId ? [prerequisiteId] : [],
    availability: prerequisiteId
      ? { kind: 'prerequisite', value: prerequisiteId }
      : undefined,
    unlockObjectiveId: `bxqp:objective:voucher:${twoDigit(index + 1)}`,
  });
});
