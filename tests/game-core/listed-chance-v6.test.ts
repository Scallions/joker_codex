import { createRandomState } from '../../src/game-core/rng/random';
import { resolveListedChanceV6 } from '../../src/game-core/rules/listedChanceV6';

describe('V6 明示概率服务', () => {
  it('按 2 的幂饱和放大成功分子并只抽一次', () => {
    const rngState = createRandomState('listed-chance');
    const result = resolveListedChanceV6(
      { numerator: 1, denominator: 5, sourceId: 'j126', reason: 'test' },
      2,
      rngState,
    );

    expect(result.effectiveNumerator).toBe(4);
    expect(result.denominator).toBe(5);
    expect(result.roll).not.toBeNull();
    expect(result.rngState).not.toBe(rngState);
  });

  it('零概率与饱和必定分支不消耗 RNG', () => {
    const rngState = createRandomState('listed-chance-no-draw');
    expect(
      resolveListedChanceV6(
        { numerator: 0, denominator: 4, sourceId: 'zero', reason: 'test' },
        10,
        rngState,
      ),
    ).toMatchObject({
      succeeded: false,
      effectiveNumerator: 0,
      roll: null,
      rngState,
    });
    expect(
      resolveListedChanceV6(
        { numerator: 1, denominator: 2, sourceId: 'certain', reason: 'test' },
        1,
        rngState,
      ),
    ).toMatchObject({
      succeeded: true,
      effectiveNumerator: 2,
      roll: null,
      rngState,
    });
  });
});
