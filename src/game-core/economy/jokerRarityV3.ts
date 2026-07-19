import type { JokerDefinitionV2 } from '../model/runV2';
import type { RandomState } from '../rng/random';
import { pickWeightedStable } from '../rng/weighted';

export type OrdinaryJokerRarityV3 = Exclude<JokerDefinitionV2['rarity'], 'legendary'>;
export type JokerRarityDrawPolicyV3 = 'ordinary' | JokerDefinitionV2['rarity'];

export interface JokerRarityDrawCandidateV3<T> {
  readonly contentId: string;
  readonly rarity: JokerDefinitionV2['rarity'];
  readonly weightUnits: number;
  readonly value: T;
}

export type JokerRarityDrawResultV3<T> =
  | { readonly ok: true; readonly value: T; readonly rngState: RandomState }
  | {
      readonly ok: false;
      readonly code: 'pool-empty';
      readonly message: string;
      readonly rngState: RandomState;
    };

const ORDINARY_RARITY_WEIGHTS: Readonly<Record<OrdinaryJokerRarityV3, number>> = {
  common: 70,
  uncommon: 25,
  rare: 5,
};

function validCandidates<T>(
  candidates: readonly JokerRarityDrawCandidateV3<T>[],
): readonly JokerRarityDrawCandidateV3<T>[] {
  return candidates.filter(
    ({ weightUnits }) => Number.isSafeInteger(weightUnits) && weightUnits > 0,
  );
}

/**
 * Draw a Joker without allowing row counts to distort rarity odds.
 * Ordinary sources roll a non-empty rarity first, then a stable row within it.
 * Forced-rarity sources skip the first roll and preserve RNG when their pool is empty.
 */
export function drawJokerDefinitionV3<T>(
  candidates: readonly JokerRarityDrawCandidateV3<T>[],
  rngState: RandomState,
  policy: JokerRarityDrawPolicyV3,
): JokerRarityDrawResultV3<T> {
  const valid = validCandidates(candidates);
  let selectedRarity: JokerDefinitionV2['rarity'];
  let currentRng = rngState;

  if (policy === 'ordinary') {
    const rarityEntries = (
      Object.keys(ORDINARY_RARITY_WEIGHTS) as OrdinaryJokerRarityV3[]
    )
      .filter((rarity) => valid.some((candidate) => candidate.rarity === rarity))
      .map((rarity) => ({
        id: `rarity:${rarity}`,
        weightUnits: ORDINARY_RARITY_WEIGHTS[rarity],
        value: rarity,
      }));
    if (rarityEntries.length === 0) {
      return {
        ok: false,
        code: 'pool-empty',
        message: '普通奇牌候选池为空',
        rngState,
      };
    }
    const rarityDraw = pickWeightedStable(rarityEntries, currentRng);
    selectedRarity = rarityDraw.value;
    currentRng = rarityDraw.state;
  } else {
    selectedRarity = policy;
  }

  const rarityPool = valid.filter(({ rarity }) => rarity === selectedRarity);
  if (rarityPool.length === 0) {
    return {
      ok: false,
      code: 'pool-empty',
      message: '指定稀有度的奇牌候选池为空',
      rngState,
    };
  }
  const rowDraw = pickWeightedStable(
    rarityPool.map((candidate) => ({
      id: candidate.contentId,
      weightUnits: candidate.weightUnits,
      value: candidate.value,
    })),
    currentRng,
  );
  return { ok: true, value: rowDraw.value, rngState: rowDraw.state };
}
