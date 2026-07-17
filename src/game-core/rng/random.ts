export type RandomState = number;

const FNV_OFFSET = 2166136261;
const FNV_PRIME = 16777619;
const ZERO_SEED_FALLBACK = 0x9e3779b9;

export interface RandomResult<T> {
  readonly value: T;
  readonly state: RandomState;
}

export function createRandomState(seed: string): RandomState {
  let hash = FNV_OFFSET;

  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, FNV_PRIME) >>> 0;
  }

  return hash === 0 ? ZERO_SEED_FALLBACK : hash;
}

export function nextUint32(state: RandomState): RandomResult<number> {
  let next = state >>> 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  next >>>= 0;

  return { value: next, state: next };
}

export function nextInteger(
  state: RandomState,
  exclusiveMaximum: number,
): RandomResult<number> {
  if (!Number.isSafeInteger(exclusiveMaximum) || exclusiveMaximum <= 0) {
    throw new RangeError('随机上限必须是正安全整数');
  }

  const result = nextUint32(state);
  return {
    value: Math.floor((result.value / 0x1_0000_0000) * exclusiveMaximum),
    state: result.state,
  };
}
