import type { CatalogOperation, CatalogRow } from '../schema/catalog';
import { defineRow, twoDigit } from './builders';

const BASELINE_TARGETS = [300, 800, 2_000, 5_000, 11_000, 20_000, 35_000, 50_000];
const GREEN_TARGETS = [300, 900, 2_600, 8_000, 20_000, 36_000, 60_000, 100_000];
const PURPLE_TARGETS = [300, 1_000, 3_200, 9_000, 25_000, 60_000, 110_000, 200_000];

const stakeOperations: readonly (readonly CatalogOperation[])[] = [
  [{ type: 'target-curve', curveId: 'baseline', anteOneThroughEight: BASELINE_TARGETS }],
  [{ type: 'rule-patch', key: 'blind-reward', mode: 'set', value: 0 }],
  [{ type: 'target-curve', curveId: 'green', anteOneThroughEight: GREEN_TARGETS }],
  [
    {
      type: 'sticker-roll',
      stickerId: 'bxqp:sticker:permanent',
      numerator: 3,
      denominator: 10,
      purchaseCost: null,
      roundCost: null,
      expiryRounds: null,
    },
  ],
  [{ type: 'rule-patch', key: 'discards-per-round', mode: 'add', value: -1 }],
  [{ type: 'target-curve', curveId: 'purple', anteOneThroughEight: PURPLE_TARGETS }],
  [
    {
      type: 'sticker-roll',
      stickerId: 'bxqp:sticker:perishable',
      numerator: 3,
      denominator: 10,
      purchaseCost: null,
      roundCost: null,
      expiryRounds: 5,
    },
  ],
  [
    {
      type: 'sticker-roll',
      stickerId: 'bxqp:sticker:rental',
      numerator: 3,
      denominator: 10,
      purchaseCost: 1,
      roundCost: 3,
      expiryRounds: null,
    },
  ],
];

const slugs = [
  'first-bell',
  'silent-applause',
  'green-curtain',
  'wax-seal',
  'short-breath',
  'purple-curtain',
  'wilting-paper',
  'borrowed-mask',
] as const;

export const STAKE_ROWS: readonly CatalogRow[] = stakeOperations.map(
  (operations, index) =>
    defineRow({
      family: 'stake',
      ordinal: index + 1,
      slug: slugs[index] as string,
      referenceIndex: `S${twoDigit(index + 1)}`,
      operations,
      trigger: 'run-setup',
      unlockObjectiveId:
        index === 0 ? null : `bxqp:objective:stake:${twoDigit(index + 1)}`,
    }),
);
