import type { CatalogOperation, CatalogRow } from '../schema/catalog';
import { defineRow, twoDigit } from './builders';

const enhancementSeeds: ReadonlyArray<{
  readonly slug: string;
  readonly operations: readonly CatalogOperation[];
}> = [
  {
    slug: 'brass-inlay',
    operations: [
      {
        type: 'score-rule',
        key: 'add-chips',
        amount: 30,
        numerator: null,
        denominator: null,
      },
    ],
  },
  {
    slug: 'red-ink',
    operations: [
      {
        type: 'score-rule',
        key: 'add-mult',
        amount: 4,
        numerator: null,
        denominator: null,
      },
    ],
  },
  {
    slug: 'four-winds',
    operations: [{ type: 'baseline', key: 'playing-card-counts-as-all-suits' }],
  },
  {
    slug: 'glass-ribbon',
    operations: [
      {
        type: 'score-rule',
        key: 'multiply-mult',
        amount: 2,
        numerator: null,
        denominator: null,
      },
      { type: 'baseline', key: 'post-score-independent-destroy-1-in-4' },
    ],
  },
  {
    slug: 'silk-shadow',
    operations: [
      {
        type: 'score-rule',
        key: 'multiply-mult',
        amount: 1.5,
        numerator: null,
        denominator: null,
      },
    ],
  },
  {
    slug: 'stone-mask',
    operations: [
      {
        type: 'score-rule',
        key: 'played-card-always-scores',
        amount: 1,
        numerator: null,
        denominator: null,
      },
      {
        type: 'score-rule',
        key: 'add-chips',
        amount: 50,
        numerator: null,
        denominator: null,
      },
      { type: 'baseline', key: 'playing-card-has-no-effective-rank-or-suit' },
    ],
  },
  {
    slug: 'gold-leaf',
    operations: [{ type: 'money', mode: 'add', amount: 3, cap: null, historyKey: null }],
  },
  {
    slug: 'lucky-knot',
    operations: [
      { type: 'score-rule', key: 'add-mult', amount: 20, numerator: 1, denominator: 5 },
      {
        type: 'score-rule',
        key: 'chance-money',
        amount: 20,
        numerator: 1,
        denominator: 15,
      },
    ],
  },
];

export const ENHANCEMENT_ROWS: readonly CatalogRow[] = enhancementSeeds.map(
  (seed, index) =>
    defineRow({
      family: 'enhancement',
      ordinal: index + 1,
      slug: seed.slug,
      referenceIndex: `E${twoDigit(index + 1)}`,
      operations: seed.operations,
      trigger: index === 4 ? 'held-card' : index === 6 ? 'round-end' : 'scored-card',
    }),
);

const sealSeeds: ReadonlyArray<{
  readonly slug: string;
  readonly operations: readonly CatalogOperation[];
  readonly trigger: 'scored-card' | 'round-end' | 'discard';
}> = [
  {
    slug: 'coin-seal',
    operations: [{ type: 'money', mode: 'add', amount: 3, cap: null, historyKey: null }],
    trigger: 'scored-card',
  },
  {
    slug: 'echo-knot',
    operations: [{ type: 'baseline', key: 'retrigger-scored-or-held-card-once' }],
    trigger: 'scored-card',
  },
  {
    slug: 'star-seal',
    operations: [
      {
        type: 'baseline',
        key: 'create-planet-for-final-hand-if-capacity',
      },
    ],
    trigger: 'round-end',
  },
  {
    slug: 'script-seal',
    operations: [
      {
        type: 'content-create',
        family: 'tarot',
        count: 1,
        rarity: 'any',
        capacityRequired: true,
        stickerPolicy: 'none',
      },
    ],
    trigger: 'discard',
  },
];

export const SEAL_ROWS: readonly CatalogRow[] = sealSeeds.map((seed, index) =>
  defineRow({
    family: 'seal',
    ordinal: index + 1,
    slug: seed.slug,
    referenceIndex: `L${twoDigit(index + 1)}`,
    operations: seed.operations,
    trigger: seed.trigger,
  }),
);

const editionSeeds: ReadonlyArray<{
  readonly slug: string;
  readonly operations: readonly CatalogOperation[];
}> = [
  { slug: 'plain-paper', operations: [{ type: 'baseline', key: 'base-edition' }] },
  {
    slug: 'gilt-edge',
    operations: [
      {
        type: 'score-rule',
        key: 'add-chips',
        amount: 50,
        numerator: null,
        denominator: null,
      },
    ],
  },
  {
    slug: 'phantom-ink',
    operations: [
      {
        type: 'score-rule',
        key: 'add-mult',
        amount: 10,
        numerator: null,
        denominator: null,
      },
    ],
  },
  {
    slug: 'rainbow-lacquer',
    operations: [
      {
        type: 'score-rule',
        key: 'multiply-mult',
        amount: 1.5,
        numerator: null,
        denominator: null,
      },
    ],
  },
  {
    slug: 'shadow-cutout',
    operations: [{ type: 'baseline', key: 'instance-slot-contribution-minus-one' }],
  },
];

export const EDITION_ROWS: readonly CatalogRow[] = editionSeeds.map((seed, index) =>
  defineRow({
    family: 'edition',
    ordinal: index + 1,
    slug: seed.slug,
    referenceIndex: `N${twoDigit(index + 1)}`,
    operations: seed.operations,
    trigger: 'passive',
  }),
);

export const STICKER_DEFINITIONS = [
  {
    id: 'bxqp:sticker:permanent',
    saleAllowed: false,
    expiryRounds: null,
    purchaseCost: null,
    roundCost: null,
  },
  {
    id: 'bxqp:sticker:perishable',
    saleAllowed: true,
    expiryRounds: 5,
    purchaseCost: null,
    roundCost: null,
  },
  {
    id: 'bxqp:sticker:rental',
    saleAllowed: true,
    expiryRounds: null,
    purchaseCost: 1,
    roundCost: 3,
  },
] as const;
