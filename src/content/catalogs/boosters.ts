import { RESERVED_JOKER_IDS } from '../dependencies/jokerIds';
import type { BoosterProfile, CatalogRow } from '../schema/catalog';
import { defineRow, twoDigit } from './builders';

const familyProfiles = [
  ['standard', 4, 3, 1, 6, 5, 1, 8, 5, 2, 0, 0],
  ['tarot', 4, 3, 1, 6, 5, 1, 8, 5, 2, 0, 1],
  ['planet', 4, 3, 1, 6, 5, 1, 8, 5, 2, 0, 1],
  ['joker', 4, 2, 1, 6, 4, 1, 8, 4, 2, 1, 0],
  ['spectral', 4, 2, 1, 6, 4, 1, 8, 4, 2, 0, 1],
] as const;

export const BOOSTER_PROFILES: readonly BoosterProfile[] = familyProfiles.flatMap(
  ([
    family,
    normalCost,
    normalOptions,
    normalPicks,
    jumboCost,
    jumboOptions,
    jumboPicks,
    megaCost,
    megaOptions,
    megaPicks,
    temporaryJokerSlots,
    temporaryConsumableSlots,
  ]) => [
    {
      id: `bxqp:booster-profile:${family}:normal`,
      family,
      size: 'normal' as const,
      cost: normalCost,
      optionCount: normalOptions,
      pickCount: normalPicks,
      temporaryJokerSlots,
      temporaryConsumableSlots,
    },
    {
      id: `bxqp:booster-profile:${family}:jumbo`,
      family,
      size: 'jumbo' as const,
      cost: jumboCost,
      optionCount: jumboOptions,
      pickCount: jumboPicks,
      temporaryJokerSlots,
      temporaryConsumableSlots,
    },
    {
      id: `bxqp:booster-profile:${family}:mega`,
      family,
      size: 'mega' as const,
      cost: megaCost,
      optionCount: megaOptions,
      pickCount: megaPicks,
      temporaryJokerSlots,
      temporaryConsumableSlots,
    },
  ],
);

interface BoosterSeed {
  readonly family: BoosterProfile['family'];
  readonly size: BoosterProfile['size'];
  readonly variant: number;
  readonly weightUnits: number;
}

function variants(
  family: BoosterProfile['family'],
  normal: number,
  jumbo: number,
  mega: number,
  weights: readonly [number, number, number],
): BoosterSeed[] {
  return [
    ...Array.from({ length: normal }, (_, index) => ({
      family,
      size: 'normal' as const,
      variant: index + 1,
      weightUnits: weights[0],
    })),
    ...Array.from({ length: jumbo }, (_, index) => ({
      family,
      size: 'jumbo' as const,
      variant: index + 1,
      weightUnits: weights[1],
    })),
    ...Array.from({ length: mega }, (_, index) => ({
      family,
      size: 'mega' as const,
      variant: index + 1,
      weightUnits: weights[2],
    })),
  ];
}

const seeds: readonly BoosterSeed[] = [
  ...variants('standard', 4, 2, 2, [100, 100, 25]),
  ...variants('tarot', 4, 2, 2, [100, 100, 25]),
  ...variants('planet', 4, 2, 2, [100, 100, 25]),
  ...variants('joker', 2, 1, 1, [60, 60, 15]),
  ...variants('spectral', 2, 1, 1, [30, 30, 7]),
];

export const BOOSTER_ROWS: readonly CatalogRow[] = seeds.map((seed, index) => {
  const profile = BOOSTER_PROFILES.find(
    (candidate) => candidate.family === seed.family && candidate.size === seed.size,
  );
  if (!profile) throw new Error(`缺少卡包机械档案：${seed.family}/${seed.size}`);
  return defineRow({
    family: 'booster',
    ordinal: index + 1,
    slug: `${seed.family}-${seed.size}-${seed.variant}`,
    referenceIndex: `K${twoDigit(index + 1)}`,
    operations: [
      {
        type: 'pack-rule',
        profileId: profile.id,
        optionCount: profile.optionCount,
        pickCount: profile.pickCount,
        temporarySlots: profile.temporaryJokerSlots + profile.temporaryConsumableSlots,
        rareReplacementBasisPoints: seed.family === 'spectral' ? 30 : 0,
      },
    ],
    trigger: 'pack-opened',
    cost: profile.cost,
    weightUnits: seed.weightUnits,
    mechanicalProfileId: profile.id,
    externalDependencyIds: seed.family === 'joker' ? RESERVED_JOKER_IDS : [],
  });
});
