import type { CatalogOperation, CatalogRow } from '../schema/catalog';
import { defineRow, twoDigit } from './builders';

const deckOperations: readonly (readonly CatalogOperation[])[] = [
  [
    { type: 'deck-recipe', recipe: 'standard', count: 52 },
    { type: 'rule-patch', key: 'discards-per-round', mode: 'add', value: 1 },
  ],
  [
    { type: 'deck-recipe', recipe: 'standard', count: 52 },
    { type: 'rule-patch', key: 'hands-per-round', mode: 'add', value: 1 },
  ],
  [
    { type: 'deck-recipe', recipe: 'standard', count: 52 },
    { type: 'money', mode: 'add', amount: 10, cap: null, historyKey: null },
  ],
  [
    { type: 'deck-recipe', recipe: 'standard', count: 52 },
    { type: 'rule-patch', key: 'interest-enabled', mode: 'set', value: false },
    { type: 'rule-patch', key: 'remaining-hand-reward', mode: 'set', value: 2 },
    { type: 'rule-patch', key: 'remaining-discard-reward', mode: 'set', value: 1 },
  ],
  [
    { type: 'deck-recipe', recipe: 'standard', count: 52 },
    { type: 'rule-patch', key: 'joker-slots', mode: 'add', value: 1 },
    { type: 'rule-patch', key: 'hands-per-round', mode: 'add', value: -1 },
  ],
  [
    { type: 'deck-recipe', recipe: 'standard', count: 52 },
    { type: 'baseline', key: 'start-with-consumable-slot-voucher' },
    { type: 'baseline', key: 'start-with-two-last-use-copies' },
  ],
  [
    { type: 'deck-recipe', recipe: 'standard', count: 52 },
    { type: 'baseline', key: 'start-with-most-played-hand-voucher' },
    { type: 'rule-patch', key: 'consumable-slots', mode: 'add', value: -1 },
  ],
  [
    { type: 'deck-recipe', recipe: 'standard', count: 52 },
    { type: 'shop-rule', key: 'family-weight', value: 'spectral-enabled' },
    { type: 'baseline', key: 'start-with-polychrome-sacrifice-consumable' },
  ],
  [{ type: 'deck-recipe', recipe: 'no-face', count: 40 }],
  [{ type: 'deck-recipe', recipe: 'hearts-spades', count: 52 }],
  [
    { type: 'deck-recipe', recipe: 'standard', count: 52 },
    { type: 'baseline', key: 'start-with-tarot-frequency-voucher' },
    { type: 'baseline', key: 'start-with-planet-frequency-voucher' },
    { type: 'baseline', key: 'start-with-shop-slot-voucher' },
  ],
  [
    { type: 'deck-recipe', recipe: 'standard', count: 52 },
    { type: 'rule-patch', key: 'hand-size', mode: 'add', value: 2 },
    { type: 'rule-patch', key: 'joker-slots', mode: 'add', value: -1 },
  ],
  [
    { type: 'deck-recipe', recipe: 'standard', count: 52 },
    { type: 'tag-rule', timing: 'next-boss', key: 'copy-next-tag', value: 1 },
  ],
  [
    { type: 'deck-recipe', recipe: 'standard', count: 52 },
    {
      type: 'score-rule',
      key: 'average-chips-mult',
      amount: 1,
      numerator: null,
      denominator: null,
    },
    { type: 'rule-patch', key: 'target-scale', mode: 'multiply', value: 2 },
  ],
  [{ type: 'deck-recipe', recipe: 'randomized', count: 52 }],
];

const deckSlugs = [
  'echo-ledger',
  'encore-drum',
  'brass-purse',
  'empty-till',
  'crowded-rail',
  'memory-box',
  'star-chart',
  'spirit-stall',
  'faceless-troupe',
  'twin-curtain',
  'three-signs',
  'wide-sleeve',
  'copy-token',
  'balanced-seal',
  'shifting-cast',
] as const;

export const DECK_ROWS: readonly CatalogRow[] = deckOperations.map((operations, index) =>
  defineRow({
    family: 'deck',
    ordinal: index + 1,
    slug: deckSlugs[index] as string,
    referenceIndex: `D${twoDigit(index + 1)}`,
    operations,
    trigger: 'run-setup',
    unlockObjectiveId: index === 0 ? null : `bxqp:objective:deck:${twoDigit(index + 1)}`,
  }),
);
