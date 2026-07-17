import { nextInteger, type RandomResult, type RandomState } from './random';

export function shuffle<T>(
  values: readonly T[],
  initialState: RandomState,
): RandomResult<T[]> {
  const shuffled = [...values];
  let state = initialState;

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const draw = nextInteger(state, index + 1);
    state = draw.state;
    [shuffled[index], shuffled[draw.value]] = [shuffled[draw.value]!, shuffled[index]!];
  }

  return { value: shuffled, state };
}
