import { nextInteger, type RandomResult, type RandomState } from './random';

export interface WeightedEntry<T> {
  readonly id: string;
  readonly weightUnits: number;
  readonly value: T;
}

export function pickStable<T>(
  values: readonly T[],
  getId: (value: T) => string,
  state: RandomState,
): RandomResult<T> {
  if (values.length === 0) throw new RangeError('随机候选池不能为空');
  const sorted = [...values].sort((left, right) =>
    getId(left).localeCompare(getId(right)),
  );
  const draw = nextInteger(state, sorted.length);
  return { value: sorted[draw.value]!, state: draw.state };
}

export function pickWeightedStable<T>(
  entries: readonly WeightedEntry<T>[],
  state: RandomState,
): RandomResult<T> {
  const eligible = entries
    .filter((entry) => entry.weightUnits > 0)
    .sort((left, right) => left.id.localeCompare(right.id));
  const total = eligible.reduce((sum, entry) => sum + entry.weightUnits, 0);
  if (!Number.isSafeInteger(total) || total <= 0) {
    throw new RangeError('随机权重总和必须是正安全整数');
  }
  const draw = nextInteger(state, total);
  let cursor = draw.value;
  for (const entry of eligible) {
    if (cursor < entry.weightUnits) return { value: entry.value, state: draw.state };
    cursor -= entry.weightUnits;
  }
  throw new Error('随机权重解析失败');
}
