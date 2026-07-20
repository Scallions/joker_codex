import { reservedJokerId } from '../dependencies/jokerIds';
import type { AvailabilityRule, CatalogOperation, CatalogRow } from '../schema/catalog';
import { defineRow, twoDigit } from './builders';

interface ConsumableSeed {
  readonly slug: string;
  readonly operations: readonly CatalogOperation[];
  readonly externalDependencyIds?: readonly string[];
  readonly availability?: AvailabilityRule;
}

const tarotSeeds: readonly ConsumableSeed[] = [
  {
    slug: 'afterimage',
    operations: [{ type: 'baseline', key: 'copy-last-tarot-or-planet-excluding-self' }],
  },
  {
    slug: 'lucky-thread',
    operations: [
      {
        type: 'card-modifier',
        family: 'enhancement',
        modifierId: 'bxqp:enhancement:lucky-knot',
        selection: 'selected',
        count: 2,
      },
    ],
  },
  {
    slug: 'star-pair',
    operations: [
      {
        type: 'content-create',
        family: 'planet',
        count: 2,
        rarity: 'any',
        capacityRequired: true,
        stickerPolicy: 'none',
      },
    ],
  },
  {
    slug: 'red-script',
    operations: [
      {
        type: 'card-modifier',
        family: 'enhancement',
        modifierId: 'bxqp:enhancement:red-ink',
        selection: 'selected',
        count: 2,
      },
    ],
  },
  {
    slug: 'paper-pair',
    operations: [
      {
        type: 'content-create',
        family: 'tarot',
        count: 2,
        rarity: 'any',
        capacityRequired: true,
        stickerPolicy: 'none',
      },
    ],
  },
  {
    slug: 'brass-pair',
    operations: [
      {
        type: 'card-modifier',
        family: 'enhancement',
        modifierId: 'bxqp:enhancement:brass-inlay',
        selection: 'selected',
        count: 2,
      },
    ],
  },
  {
    slug: 'four-wind-stamp',
    operations: [
      {
        type: 'card-modifier',
        family: 'enhancement',
        modifierId: 'bxqp:enhancement:four-winds',
        selection: 'selected',
        count: 1,
      },
    ],
  },
  {
    slug: 'silk-stamp',
    operations: [
      {
        type: 'card-modifier',
        family: 'enhancement',
        modifierId: 'bxqp:enhancement:silk-shadow',
        selection: 'selected',
        count: 1,
      },
    ],
  },
  {
    slug: 'glass-stamp',
    operations: [
      {
        type: 'card-modifier',
        family: 'enhancement',
        modifierId: 'bxqp:enhancement:glass-ribbon',
        selection: 'selected',
        count: 1,
      },
    ],
  },
  {
    slug: 'open-purse',
    operations: [
      {
        type: 'money',
        mode: 'cap-add',
        amount: 1,
        cap: 20,
        historyKey: 'current-nonnegative-money',
      },
    ],
  },
  {
    slug: 'three-lights',
    operations: [
      {
        type: 'card-modifier',
        family: 'edition',
        modifierId:
          'weighted:bxqp:edition:gilt-edge=50,bxqp:edition:phantom-ink=35,bxqp:edition:rainbow-lacquer=15',
        selection: 'random',
        count: 1,
        numerator: 1,
        denominator: 4,
      },
    ],
    externalDependencyIds: [reservedJokerId(17)],
  },
  {
    slug: 'turning-rank',
    operations: [
      {
        type: 'card-transform',
        field: 'rank',
        value: 'next-with-king-ace-two-wrap',
        selection: 'selected',
        count: 2,
        minimumTargets: 1,
      },
    ],
  },
  {
    slug: 'paper-scissors',
    operations: [
      {
        type: 'card-destroy',
        selection: 'selected',
        count: 2,
        destructibleOnly: true,
        minimumTargets: 1,
      },
    ],
  },
  {
    slug: 'mirror-transfer',
    operations: [
      {
        type: 'card-copy',
        source: 'selected-right',
        destination: 'selected-left',
        count: 1,
      },
    ],
  },
  {
    slug: 'prop-ledger',
    operations: [
      {
        type: 'money',
        mode: 'per-history',
        amount: 1,
        cap: 50,
        historyKey: 'joker-sell-value',
      },
    ],
  },
  {
    slug: 'gold-leaf-stamp',
    operations: [
      {
        type: 'card-modifier',
        family: 'enhancement',
        modifierId: 'bxqp:enhancement:gold-leaf',
        selection: 'selected',
        count: 1,
      },
    ],
  },
  {
    slug: 'stone-mask-stamp',
    operations: [
      {
        type: 'card-modifier',
        family: 'enhancement',
        modifierId: 'bxqp:enhancement:stone-mask',
        selection: 'selected',
        count: 1,
      },
    ],
  },
  {
    slug: 'diamond-turn',
    operations: [
      {
        type: 'card-transform',
        field: 'suit',
        value: 'diamonds',
        selection: 'selected',
        count: 3,
        minimumTargets: 1,
      },
    ],
  },
  {
    slug: 'club-turn',
    operations: [
      {
        type: 'card-transform',
        field: 'suit',
        value: 'clubs',
        selection: 'selected',
        count: 3,
        minimumTargets: 1,
      },
    ],
  },
  {
    slug: 'heart-turn',
    operations: [
      {
        type: 'card-transform',
        field: 'suit',
        value: 'hearts',
        selection: 'selected',
        count: 3,
        minimumTargets: 1,
      },
    ],
  },
  {
    slug: 'summon-mask',
    operations: [
      {
        type: 'content-create',
        family: 'joker',
        count: 1,
        rarity: 'any',
        capacityRequired: true,
        stickerPolicy: 'none',
      },
    ],
    externalDependencyIds: [reservedJokerId(18)],
  },
  {
    slug: 'spade-turn',
    operations: [
      {
        type: 'card-transform',
        field: 'suit',
        value: 'spades',
        selection: 'selected',
        count: 3,
        minimumTargets: 1,
      },
    ],
  },
];

export const TAROT_ROWS: readonly CatalogRow[] = tarotSeeds.map((seed, index) =>
  defineRow({
    family: 'tarot',
    ordinal: index + 1,
    slug: seed.slug,
    referenceIndex: `T${twoDigit(index + 1)}`,
    operations: seed.operations,
    trigger: 'consumable-used',
    cost: 3,
    weightUnits: 100,
    externalDependencyIds: seed.externalDependencyIds ?? [],
    availability: seed.availability,
  }),
);

const planetHands = [
  ['solo-lantern', 'high-card', 1, 10, false],
  ['paired-cymbal', 'pair', 1, 15, false],
  ['double-pair-ribbon', 'two-pair', 1, 20, false],
  ['triple-drum', 'three-of-a-kind', 2, 20, false],
  ['straight-rope', 'straight', 3, 30, false],
  ['flush-fan', 'flush', 2, 15, false],
  ['full-house-curtain', 'full-house', 2, 25, false],
  ['four-mask-pillar', 'four-of-a-kind', 3, 30, false],
  ['straight-flush-spark', 'straight-flush', 4, 40, false],
  ['five-mask-star', 'five-of-a-kind', 3, 35, true],
  ['flush-house-moon', 'flush-house', 4, 40, true],
  ['flush-five-sun', 'flush-five', 3, 50, true],
] as const;

export const PLANET_ROWS: readonly CatalogRow[] = planetHands.map(
  ([slug, hand, mult, chips, secret], index) =>
    defineRow({
      family: 'planet',
      ordinal: index + 1,
      slug,
      referenceIndex: `P${twoDigit(index + 1)}`,
      operations: [{ type: 'hand-level', hand, levels: 1, chips, mult }],
      trigger: 'consumable-used',
      cost: 3,
      weightUnits: 100,
      availability: secret ? { kind: 'hand-played', value: hand } : undefined,
    }),
);

const spectralSeeds: readonly ConsumableSeed[] = [
  {
    slug: 'court-casting',
    operations: [
      {
        type: 'card-destroy',
        selection: 'random-held',
        count: 1,
        destructibleOnly: true,
      },
      {
        type: 'playing-card-create',
        count: 3,
        rankPool: 'face',
        enhancementPolicy: 'random',
      },
    ],
  },
  {
    slug: 'ace-casting',
    operations: [
      {
        type: 'card-destroy',
        selection: 'random-held',
        count: 1,
        destructibleOnly: true,
      },
      {
        type: 'playing-card-create',
        count: 2,
        rankPool: 'ace',
        enhancementPolicy: 'random',
      },
    ],
  },
  {
    slug: 'number-casting',
    operations: [
      {
        type: 'card-destroy',
        selection: 'random-held',
        count: 1,
        destructibleOnly: true,
      },
      {
        type: 'playing-card-create',
        count: 4,
        rankPool: 'number',
        enhancementPolicy: 'random',
      },
    ],
  },
  {
    slug: 'coin-mark',
    operations: [
      {
        type: 'card-modifier',
        family: 'seal',
        modifierId: 'bxqp:seal:coin-seal',
        selection: 'selected',
        count: 1,
      },
    ],
  },
  {
    slug: 'painted-light',
    operations: [
      {
        type: 'card-modifier',
        family: 'edition',
        modifierId:
          'weighted:bxqp:edition:gilt-edge=50,bxqp:edition:phantom-ink=35,bxqp:edition:rainbow-lacquer=15',
        selection: 'selected',
        count: 1,
      },
    ],
  },
  {
    slug: 'rare-mask',
    operations: [
      {
        type: 'content-create',
        family: 'joker',
        count: 1,
        rarity: 'rare',
        capacityRequired: true,
        stickerPolicy: 'normal',
      },
      { type: 'money', mode: 'set-zero', amount: 0, cap: null, historyKey: null },
    ],
    externalDependencyIds: [reservedJokerId(19)],
  },
  {
    slug: 'one-suit-night',
    operations: [
      {
        type: 'card-transform',
        field: 'suit',
        value: 'random-materialized',
        selection: 'drawn',
        count: 0,
      },
    ],
  },
  {
    slug: 'one-rank-night',
    operations: [
      {
        type: 'card-transform',
        field: 'rank',
        value: 'random-materialized',
        selection: 'drawn',
        count: 0,
      },
      { type: 'rule-patch', key: 'hand-size', mode: 'add', value: -1 },
    ],
  },
  {
    slug: 'shadow-cut',
    operations: [
      {
        type: 'card-modifier',
        family: 'edition',
        modifierId: 'bxqp:edition:shadow-cutout',
        selection: 'random',
        count: 1,
      },
      { type: 'baseline', key: 'cumulative-hand-size-cost-one-plus-prior-use' },
    ],
    externalDependencyIds: [reservedJokerId(20)],
  },
  {
    slug: 'five-for-twenty',
    operations: [
      {
        type: 'card-destroy',
        selection: 'random-held',
        count: 5,
        destructibleOnly: true,
      },
      { type: 'money', mode: 'add', amount: 20, cap: null, historyKey: null },
    ],
  },
  {
    slug: 'single-double',
    operations: [
      { type: 'card-copy', source: 'random-joker', destination: 'new-joker', count: 1 },
      {
        type: 'card-destroy',
        selection: 'other-jokers',
        count: 150,
        destructibleOnly: true,
      },
    ],
    externalDependencyIds: [reservedJokerId(21)],
  },
  {
    slug: 'echo-mark',
    operations: [
      {
        type: 'card-modifier',
        family: 'seal',
        modifierId: 'bxqp:seal:echo-knot',
        selection: 'selected',
        count: 1,
      },
    ],
  },
  {
    slug: 'rainbow-sacrifice',
    operations: [
      {
        type: 'card-modifier',
        family: 'edition',
        modifierId: 'bxqp:edition:rainbow-lacquer',
        selection: 'random',
        count: 1,
      },
      {
        type: 'card-destroy',
        selection: 'other-jokers',
        count: 150,
        destructibleOnly: true,
      },
    ],
    externalDependencyIds: [reservedJokerId(22)],
  },
  {
    slug: 'star-mark',
    operations: [
      {
        type: 'card-modifier',
        family: 'seal',
        modifierId: 'bxqp:seal:star-seal',
        selection: 'selected',
        count: 1,
      },
    ],
  },
  {
    slug: 'script-mark',
    operations: [
      {
        type: 'card-modifier',
        family: 'seal',
        modifierId: 'bxqp:seal:script-seal',
        selection: 'selected',
        count: 1,
      },
    ],
  },
  {
    slug: 'paper-twins',
    operations: [
      {
        type: 'card-copy',
        source: 'selected',
        destination: 'new-playing-cards',
        count: 2,
      },
    ],
  },
  {
    slug: 'legend-call',
    operations: [
      {
        type: 'content-create',
        family: 'joker',
        count: 1,
        rarity: 'legendary',
        capacityRequired: true,
        stickerPolicy: 'normal',
      },
    ],
    availability: { kind: 'prerequisite', value: 'bxqp:pool:spectral-rare-replacement' },
  },
  {
    slug: 'all-stars-rise',
    operations: [{ type: 'hand-level', hand: null, levels: 1, chips: 0, mult: 0 }],
    availability: { kind: 'prerequisite', value: 'bxqp:pool:spectral-rare-replacement' },
  },
];

export const SPECTRAL_ROWS: readonly CatalogRow[] = spectralSeeds.map((seed, index) =>
  defineRow({
    family: 'spectral',
    ordinal: index + 1,
    slug: seed.slug,
    referenceIndex: `X${twoDigit(index + 1)}`,
    operations: seed.operations,
    trigger: 'consumable-used',
    cost: 4,
    weightUnits: index >= 16 ? 3 : 100,
    externalDependencyIds: seed.externalDependencyIds ?? [],
    availability: seed.availability,
  }),
);
