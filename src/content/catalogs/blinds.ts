import type { CatalogOperation, CatalogRow } from '../schema/catalog';
import { defineRow, twoDigit } from './builders';

interface BlindSeed {
  readonly slug: string;
  readonly minimumAnte: number;
  readonly operations: readonly CatalogOperation[];
}

const seeds: readonly BlindSeed[] = [
  {
    slug: 'opening-whistle',
    minimumAnte: 1,
    operations: [
      { type: 'blind-rule', key: 'target-multiplier', value: 1 },
      { type: 'money', mode: 'add', amount: 3, cap: null, historyKey: null },
    ],
  },
  {
    slug: 'second-whistle',
    minimumAnte: 1,
    operations: [
      { type: 'blind-rule', key: 'target-multiplier', value: 1.5 },
      { type: 'money', mode: 'add', amount: 4, cap: null, historyKey: null },
    ],
  },
  {
    slug: 'hook-master',
    minimumAnte: 1,
    operations: [{ type: 'blind-rule', key: 'random-held-discard', value: 2 }],
  },
  {
    slug: 'coin-ox',
    minimumAnte: 6,
    operations: [{ type: 'blind-rule', key: 'money-reset-on-most-played', value: true }],
  },
  {
    slug: 'dark-house',
    minimumAnte: 2,
    operations: [{ type: 'blind-rule', key: 'first-hand-face-down', value: true }],
  },
  {
    slug: 'high-wall',
    minimumAnte: 2,
    operations: [{ type: 'blind-rule', key: 'target-multiplier', value: 4 }],
  },
  {
    slug: 'turning-wheel',
    minimumAnte: 2,
    operations: [{ type: 'blind-rule', key: 'random-draw-face-down', value: 7 }],
  },
  {
    slug: 'weakening-arm',
    minimumAnte: 2,
    operations: [{ type: 'blind-rule', key: 'decrease-hand-level', value: 1 }],
  },
  {
    slug: 'club-warden',
    minimumAnte: 1,
    operations: [
      {
        type: 'card-transform',
        field: 'debuff',
        value: 'clubs',
        selection: 'all',
        count: 0,
      },
    ],
  },
  {
    slug: 'covered-fish',
    minimumAnte: 2,
    operations: [{ type: 'blind-rule', key: 'draw-replacements-face-down', value: true }],
  },
  {
    slug: 'five-word-oracle',
    minimumAnte: 1,
    operations: [{ type: 'blind-rule', key: 'require-play-count', value: 5 }],
  },
  {
    slug: 'spade-rod',
    minimumAnte: 1,
    operations: [
      {
        type: 'card-transform',
        field: 'debuff',
        value: 'spades',
        selection: 'all',
        count: 0,
      },
    ],
  },
  {
    slug: 'dry-water-bowl',
    minimumAnte: 2,
    operations: [{ type: 'blind-rule', key: 'zero-discards', value: true }],
  },
  {
    slug: 'diamond-window',
    minimumAnte: 1,
    operations: [
      {
        type: 'card-transform',
        field: 'debuff',
        value: 'diamonds',
        selection: 'all',
        count: 0,
      },
    ],
  },
  {
    slug: 'tight-shackle',
    minimumAnte: 1,
    operations: [{ type: 'rule-patch', key: 'hand-size', mode: 'add', value: -1 }],
  },
  {
    slug: 'watchful-eye',
    minimumAnte: 3,
    operations: [{ type: 'blind-rule', key: 'hand-type-no-repeat', value: true }],
  },
  {
    slug: 'single-mouth',
    minimumAnte: 2,
    operations: [{ type: 'blind-rule', key: 'first-hand-type-only', value: true }],
  },
  {
    slug: 'face-eating-flower',
    minimumAnte: 4,
    operations: [
      {
        type: 'card-transform',
        field: 'debuff',
        value: 'face-card',
        selection: 'all',
        count: 0,
      },
    ],
  },
  {
    slug: 'three-card-serpent',
    minimumAnte: 5,
    operations: [{ type: 'blind-rule', key: 'draw-exactly', value: 3 }],
  },
  {
    slug: 'memory-pillar',
    minimumAnte: 1,
    operations: [
      {
        type: 'card-transform',
        field: 'debuff',
        value: true,
        selection: 'played-this-ante',
        count: 0,
      },
    ],
  },
  {
    slug: 'one-stitch-needle',
    minimumAnte: 2,
    operations: [
      { type: 'blind-rule', key: 'one-hand', value: true },
      { type: 'blind-rule', key: 'target-multiplier', value: 1 },
    ],
  },
  {
    slug: 'heart-mask',
    minimumAnte: 1,
    operations: [
      {
        type: 'card-transform',
        field: 'debuff',
        value: 'hearts',
        selection: 'all',
        count: 0,
      },
    ],
  },
  {
    slug: 'coin-tooth',
    minimumAnte: 3,
    operations: [{ type: 'blind-rule', key: 'played-card-cost', value: 1 }],
  },
  {
    slug: 'split-flint',
    minimumAnte: 2,
    operations: [
      {
        type: 'score-rule',
        key: 'halve-base',
        amount: 0.5,
        numerator: null,
        denominator: null,
      },
    ],
  },
  {
    slug: 'masked-court',
    minimumAnte: 2,
    operations: [
      {
        type: 'card-transform',
        field: 'face-down',
        value: 'face-card',
        selection: 'drawn',
        count: 0,
      },
    ],
  },
  {
    slug: 'hidden-troupe',
    minimumAnte: 8,
    operations: [{ type: 'blind-rule', key: 'conceal-reorder-jokers', value: true }],
  },
  {
    slug: 'sale-bell',
    minimumAnte: 8,
    operations: [{ type: 'blind-rule', key: 'debuff-until-joker-sold', value: true }],
  },
  {
    slug: 'sixfold-curtain',
    minimumAnte: 8,
    operations: [{ type: 'blind-rule', key: 'target-multiplier', value: 6 }],
  },
  {
    slug: 'wandering-spotlight',
    minimumAnte: 8,
    operations: [{ type: 'blind-rule', key: 'disable-random-joker', value: 1 }],
  },
  {
    slug: 'held-thread',
    minimumAnte: 8,
    operations: [{ type: 'blind-rule', key: 'force-selected-card', value: 1 }],
  },
];

export const BLIND_ROWS: readonly CatalogRow[] = seeds.map((seed, index) =>
  defineRow({
    family: 'blind',
    ordinal: index + 1,
    slug: seed.slug,
    referenceIndex: `B${twoDigit(index + 1)}`,
    operations: seed.operations,
    trigger: index < 2 ? 'passive' : 'round-start',
    availability: { kind: 'minimum-ante', value: seed.minimumAnte },
    weightUnits: 100,
  }),
);
