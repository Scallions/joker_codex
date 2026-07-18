import { reservedJokerId } from '../dependencies/jokerIds';
import type { CatalogOperation, CatalogRow } from '../schema/catalog';
import { defineRow, twoDigit } from './builders';

interface ChallengeSeed {
  readonly slug: string;
  readonly operations: readonly CatalogOperation[];
  readonly jokerDependencies?: readonly number[];
}

const seeds: readonly ChallengeSeed[] = [
  {
    slug: 'empty-house',
    operations: [
      { type: 'deck-recipe', recipe: 'standard', count: 52 },
      { type: 'rule-patch', key: 'blind-reward', mode: 'set', value: 0 },
      { type: 'rule-patch', key: 'remaining-hand-reward', mode: 'set', value: 0 },
      { type: 'rule-patch', key: 'interest-enabled', mode: 'set', value: false },
      { type: 'restriction', key: 'ban-content', values: ['passive-economy'] },
    ],
    jokerDependencies: [1, 1, 1, 1, 1],
  },
  {
    slug: 'court-of-faces',
    operations: [
      { type: 'deck-recipe', recipe: 'double-face-no-low', count: 52 },
      { type: 'restriction', key: 'permanent-jokers', values: ['starting'] },
    ],
    jokerDependencies: [2, 3],
  },
  {
    slug: 'coin-ceiling',
    operations: [
      { type: 'money', mode: 'add', amount: 100, cap: null, historyKey: null },
      {
        type: 'score-rule',
        key: 'money-chip-cap',
        amount: 0,
        numerator: null,
        denominator: null,
      },
      { type: 'baseline', key: 'start-with-interest-cap-voucher-pair' },
    ],
  },
  {
    slug: 'leftmost-oath',
    operations: [
      { type: 'restriction', key: 'permanent-jokers', values: ['leftmost', 'immovable'] },
    ],
    jokerDependencies: [4],
  },
  {
    slug: 'veiled-draw',
    operations: [
      {
        type: 'card-transform',
        field: 'face-down',
        value: true,
        selection: 'drawn',
        count: 4,
      },
    ],
  },
  {
    slug: 'small-court',
    operations: [
      { type: 'deck-recipe', recipe: 'rank-two-through-nine', count: 32 },
      { type: 'rule-patch', key: 'remaining-hand-reward', mode: 'set', value: 0 },
      { type: 'rule-patch', key: 'interest-enabled', mode: 'set', value: false },
      { type: 'restriction', key: 'ban-content', values: ['face-debuff-boss'] },
    ],
    jokerDependencies: [5, 6],
  },
  {
    slug: 'shrinking-purse',
    operations: [
      { type: 'rule-patch', key: 'hand-size', mode: 'set', value: 10 },
      {
        type: 'restriction',
        key: 'dynamic-hand-size',
        values: ['minus-one-per-five-money'],
      },
    ],
  },
  {
    slug: 'sealed-property',
    operations: [
      { type: 'restriction', key: 'permanent-jokers', values: ['all-acquired'] },
      {
        type: 'restriction',
        key: 'exclude-content',
        values: ['self-expiring', 'self-destructive', 'sell-to-enable-finisher'],
      },
    ],
  },
  {
    slug: 'stone-court',
    operations: [
      { type: 'deck-recipe', recipe: 'standard', count: 52 },
      {
        type: 'card-modifier',
        family: 'enhancement',
        modifierId: 'bxqp:enhancement:stone-mask',
        selection: 'face-cards',
        count: 12,
      },
      { type: 'restriction', key: 'permanent-jokers', values: ['starting'] },
    ],
    jokerDependencies: [7],
  },
  {
    slug: 'echoing-seal',
    operations: [
      { type: 'deck-recipe', recipe: 'standard', count: 52 },
      {
        type: 'card-modifier',
        family: 'seal',
        modifierId: 'bxqp:seal:echo-knot',
        selection: 'all',
        count: 52,
      },
      { type: 'restriction', key: 'debuff-after-score', values: ['playing-card'] },
    ],
  },
  {
    slug: 'closed-balcony',
    operations: [
      {
        type: 'restriction',
        key: 'capacity-after-ante-four',
        values: ['joker-slots-zero', 'existing-permanent'],
      },
      { type: 'restriction', key: 'ban-content', values: ['sell-to-enable-finisher'] },
    ],
  },
  {
    slug: 'rising-prices',
    operations: [
      { type: 'shop-rule', key: 'price-increase-per-purchase', value: 1 },
      { type: 'restriction', key: 'ban-content', values: ['discount-voucher-pair'] },
    ],
    jokerDependencies: [8],
  },
  {
    slug: 'jokerless-market',
    operations: [
      { type: 'shop-rule', key: 'joker-offers-enabled', value: false },
      { type: 'baseline', key: 'start-with-two-tarot-and-card-shop-vouchers' },
    ],
    jokerDependencies: [9],
  },
  {
    slug: 'glass-troupe',
    operations: [
      { type: 'deck-recipe', recipe: 'standard', count: 52 },
      {
        type: 'card-modifier',
        family: 'enhancement',
        modifierId: 'bxqp:enhancement:glass-ribbon',
        selection: 'all',
        count: 52,
      },
      {
        type: 'restriction',
        key: 'ban-content',
        values: ['add-non-glass-card', 'overwrite-glass'],
      },
    ],
    jokerDependencies: [10, 10],
  },
  {
    slug: 'long-memory',
    operations: [{ type: 'restriction', key: 'permanent-jokers', values: ['starting'] }],
    jokerDependencies: [11, 12],
  },
  {
    slug: 'two-beat-orbit',
    operations: [
      { type: 'rule-patch', key: 'hands-per-round', mode: 'set', value: 2 },
      { type: 'rule-patch', key: 'discards-per-round', mode: 'set', value: 2 },
      { type: 'rule-patch', key: 'joker-slots', mode: 'set', value: 4 },
      { type: 'baseline', key: 'start-with-planet-frequency-voucher-pair' },
      { type: 'restriction', key: 'ban-content', values: ['hand-count-increase'] },
    ],
    jokerDependencies: [13, 14],
  },
  {
    slug: 'narrow-hand-wide-rail',
    operations: [
      { type: 'rule-patch', key: 'discards-per-round', mode: 'set', value: 6 },
      { type: 'rule-patch', key: 'hand-size', mode: 'set', value: 5 },
      { type: 'rule-patch', key: 'joker-slots', mode: 'set', value: 7 },
      { type: 'restriction', key: 'ban-content', values: ['hand-size-joker'] },
    ],
    jokerDependencies: [15, 16],
  },
  {
    slug: 'paid-discard',
    operations: [
      { type: 'rule-patch', key: 'hands-per-round', mode: 'set', value: 1 },
      { type: 'rule-patch', key: 'discards-per-round', mode: 'set', value: 6 },
      { type: 'money', mode: 'add', amount: 10, cap: null, historyKey: null },
      { type: 'rule-patch', key: 'discard-cost', mode: 'set', value: 1 },
      { type: 'restriction', key: 'ban-content', values: ['hand-count-increase'] },
    ],
    jokerDependencies: [8],
  },
  {
    slug: 'quiet-blinds',
    operations: [
      { type: 'rule-patch', key: 'blind-reward', mode: 'set', value: 0 },
      { type: 'rule-patch', key: 'joker-slots', mode: 'set', value: 3 },
    ],
  },
  {
    slug: 'empty-rail',
    operations: [
      { type: 'rule-patch', key: 'joker-slots', mode: 'set', value: 0 },
      { type: 'shop-rule', key: 'joker-offers-enabled', value: false },
      {
        type: 'restriction',
        key: 'no-joker-routes',
        values: ['tarot', 'spectral', 'tag', 'blind', 'pack'],
      },
    ],
  },
];

export const CHALLENGE_ROWS: readonly CatalogRow[] = seeds.map((seed, index) => {
  const dependencyIds = (seed.jokerDependencies ?? []).map(reservedJokerId);
  return defineRow({
    family: 'challenge',
    ordinal: index + 1,
    slug: seed.slug,
    referenceIndex: `C${twoDigit(index + 1)}`,
    operations: [
      { type: 'restriction', key: 'challenge-stake-baseline', values: ['S01'] },
      ...seed.operations,
    ],
    trigger: 'run-setup',
    externalDependencyIds: dependencyIds,
    unlockObjectiveId: `bxqp:objective:challenge:${twoDigit(index + 1)}`,
  });
});
