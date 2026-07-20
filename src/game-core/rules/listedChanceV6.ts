import { nextInteger, type RandomState } from '../rng/random';

export interface ListedChanceRequestV6 {
  readonly numerator: number;
  readonly denominator: number;
  readonly sourceId: string;
  readonly reason: string;
}

export interface ListedChanceResultV6 {
  readonly succeeded: boolean;
  readonly effectiveNumerator: number;
  readonly denominator: number;
  readonly roll: number | null;
  readonly rngState: RandomState;
}

function saturatingDoubledNumerator(
  numerator: number,
  denominator: number,
  power: number,
): number {
  if (numerator <= 0 || denominator <= 0) return 0;
  let effective = Math.min(numerator, denominator);
  const safePower = Math.max(0, Math.min(52, Math.floor(power)));
  for (let index = 0; index < safePower && effective < denominator; index += 1) {
    effective = Math.min(denominator, effective * 2);
  }
  return effective;
}

/** Resolve an explicitly printed gameplay probability. */
export function resolveListedChanceV6(
  request: ListedChanceRequestV6,
  listedChancePower: number,
  rngState: RandomState,
): ListedChanceResultV6 {
  const denominator = Math.max(1, Math.floor(request.denominator));
  const effectiveNumerator = saturatingDoubledNumerator(
    Math.max(0, Math.floor(request.numerator)),
    denominator,
    listedChancePower,
  );
  if (effectiveNumerator <= 0) {
    return {
      succeeded: false,
      effectiveNumerator,
      denominator,
      roll: null,
      rngState,
    };
  }
  if (effectiveNumerator >= denominator) {
    return {
      succeeded: true,
      effectiveNumerator: denominator,
      denominator,
      roll: null,
      rngState,
    };
  }
  const draw = nextInteger(rngState, denominator);
  return {
    succeeded: draw.value < effectiveNumerator,
    effectiveNumerator,
    denominator,
    roll: draw.value,
    rngState: draw.state,
  };
}
