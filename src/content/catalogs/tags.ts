import { reservedJokerId } from '../dependencies/jokerIds';
import type { AvailabilityRule, CatalogOperation, CatalogRow } from '../schema/catalog';
import { defineRow, twoDigit } from './builders';

interface TagSeed {
  readonly slug: string;
  readonly operations: readonly CatalogOperation[];
  readonly minimumAnte?: number;
  readonly dependencyIds?: readonly string[];
  readonly discovery?: AvailabilityRule;
}

const seeds: readonly TagSeed[] = [
  {
    slug: 'uncommon-call',
    operations: [
      { type: 'tag-rule', timing: 'next-shop', key: 'free-joker', value: 'uncommon' },
    ],
    dependencyIds: [reservedJokerId(24)],
  },
  {
    slug: 'rare-call',
    operations: [
      { type: 'tag-rule', timing: 'next-shop', key: 'free-joker', value: 'rare' },
    ],
    dependencyIds: [reservedJokerId(25)],
  },
  {
    slug: 'shadow-edition',
    operations: [
      {
        type: 'tag-rule',
        timing: 'next-shop',
        key: 'edition-joker',
        value: 'bxqp:edition:shadow-cutout',
      },
    ],
    minimumAnte: 2,
    dependencyIds: [reservedJokerId(26)],
  },
  {
    slug: 'gilt-edition',
    operations: [
      {
        type: 'tag-rule',
        timing: 'next-shop',
        key: 'edition-joker',
        value: 'bxqp:edition:gilt-edge',
      },
    ],
    dependencyIds: [reservedJokerId(27)],
  },
  {
    slug: 'phantom-edition',
    operations: [
      {
        type: 'tag-rule',
        timing: 'next-shop',
        key: 'edition-joker',
        value: 'bxqp:edition:phantom-ink',
      },
    ],
    dependencyIds: [reservedJokerId(28)],
  },
  {
    slug: 'rainbow-edition',
    operations: [
      {
        type: 'tag-rule',
        timing: 'next-shop',
        key: 'edition-joker',
        value: 'bxqp:edition:rainbow-lacquer',
      },
    ],
    dependencyIds: [reservedJokerId(29)],
  },
  {
    slug: 'boss-purse',
    operations: [{ type: 'tag-rule', timing: 'next-boss', key: 'money', value: 25 }],
    minimumAnte: 2,
  },
  {
    slug: 'extra-plaque',
    operations: [{ type: 'tag-rule', timing: 'next-shop', key: 'voucher', value: 1 }],
  },
  {
    slug: 'change-cast',
    operations: [{ type: 'tag-rule', timing: 'immediate', key: 'boss-reroll', value: 1 }],
  },
  {
    slug: 'mega-card-case',
    operations: [
      { type: 'tag-rule', timing: 'immediate', key: 'free-pack', value: 'standard-mega' },
    ],
    minimumAnte: 2,
  },
  {
    slug: 'mega-paper-case',
    operations: [
      { type: 'tag-rule', timing: 'immediate', key: 'free-pack', value: 'tarot-mega' },
    ],
  },
  {
    slug: 'mega-star-case',
    operations: [
      { type: 'tag-rule', timing: 'immediate', key: 'free-pack', value: 'planet-mega' },
    ],
    minimumAnte: 2,
  },
  {
    slug: 'mega-mask-case',
    operations: [
      { type: 'tag-rule', timing: 'immediate', key: 'free-pack', value: 'joker-mega' },
    ],
    minimumAnte: 2,
    dependencyIds: [reservedJokerId(30)],
  },
  {
    slug: 'played-hand-ledger',
    operations: [
      {
        type: 'tag-rule',
        timing: 'immediate',
        key: 'history-money',
        value: 'hands-played',
      },
    ],
    minimumAnte: 2,
  },
  {
    slug: 'unused-discard-ledger',
    operations: [
      {
        type: 'tag-rule',
        timing: 'immediate',
        key: 'history-money',
        value: 'unused-discards',
      },
    ],
    minimumAnte: 2,
  },
  {
    slug: 'spirit-case',
    operations: [
      {
        type: 'tag-rule',
        timing: 'immediate',
        key: 'free-pack',
        value: 'spectral-normal',
      },
    ],
    minimumAnte: 2,
  },
  {
    slug: 'free-stall',
    operations: [{ type: 'tag-rule', timing: 'next-shop', key: 'free-shop', value: 1 }],
  },
  {
    slug: 'copy-sign',
    operations: [
      { type: 'tag-rule', timing: 'immediate', key: 'copy-next-tag', value: 1 },
    ],
  },
  {
    slug: 'wide-hand-sign',
    operations: [{ type: 'tag-rule', timing: 'next-round', key: 'hand-size', value: 3 }],
  },
  {
    slug: 'free-reroll-sign',
    operations: [{ type: 'tag-rule', timing: 'next-shop', key: 'free-reroll', value: 1 }],
  },
  {
    slug: 'common-pair-call',
    operations: [
      {
        type: 'content-create',
        family: 'joker',
        count: 2,
        rarity: 'common',
        capacityRequired: true,
        stickerPolicy: 'none',
      },
    ],
    minimumAnte: 2,
    dependencyIds: [reservedJokerId(31), reservedJokerId(32)],
  },
  {
    slug: 'skipped-blind-ledger',
    operations: [
      {
        type: 'money',
        mode: 'per-history',
        amount: 5,
        cap: null,
        historyKey: 'skipped-blinds-including-current',
      },
    ],
  },
  {
    slug: 'three-star-rise',
    operations: [{ type: 'tag-rule', timing: 'immediate', key: 'hand-levels', value: 3 }],
    minimumAnte: 2,
  },
  {
    slug: 'double-purse',
    operations: [
      {
        type: 'money',
        mode: 'cap-add',
        amount: 1,
        cap: 40,
        historyKey: 'current-nonnegative-money',
      },
    ],
  },
];

export const TAG_ROWS: readonly CatalogRow[] = seeds.map((seed, index) =>
  defineRow({
    family: 'tag',
    ordinal: index + 1,
    slug: seed.slug,
    referenceIndex: `G${twoDigit(index + 1)}`,
    operations: seed.operations,
    trigger:
      index === 8 || (index >= 9 && index <= 15) || index === 17 || index >= 20
        ? 'blind-skipped'
        : 'passive',
    weightUnits: 100,
    availability:
      seed.minimumAnte === undefined
        ? undefined
        : { kind: 'minimum-ante', value: seed.minimumAnte },
    externalDependencyIds: seed.dependencyIds ?? [],
    unlockObjectiveId:
      index >= 1 && index <= 5 ? `bxqp:objective:tag:${twoDigit(index + 1)}` : null,
  }),
);
