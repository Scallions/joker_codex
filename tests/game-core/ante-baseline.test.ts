import {
  formatScore,
  getAnteBaseTarget,
  getBlindTarget,
  meetsTarget,
} from '../../src/game-core/score/score';

describe('幕次与分数基准', () => {
  it('冻结普通八幕、无尽关键点与溢出终幕', () => {
    expect(
      [-1, 0, 1, 2, 3, 4, 5, 6, 7, 8].map((ante) => getAnteBaseTarget(ante)),
    ).toEqual([100, 100, 300, 800, 2_000, 5_000, 11_000, 20_000, 35_000, 50_000]);
    expect(getAnteBaseTarget(9)).toBe(110_000);
    expect(getAnteBaseTarget(16)).toBe(8.6e20);
    expect(getAnteBaseTarget(38)).toBe(4.5e288);
    expect(getAnteBaseTarget(39)).toBe(Number.POSITIVE_INFINITY);
  });

  it('使用盲注倍率和难度比例，并把无穷目标视为不可达', () => {
    expect(getBlindTarget(1, 1, 10_000)).toBe(300);
    expect(getBlindTarget(1, 1.5, 10_000)).toBe(450);
    expect(getBlindTarget(8, 2, 10_000)).toBe(100_000);
    expect(getBlindTarget(8, 2, 1)).toBe(10);
    expect(getBlindTarget(39, 1, 10_000)).toBe(Number.POSITIVE_INFINITY);
    expect(meetsTarget(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY)).toBe(false);
    expect(meetsTarget(Number.POSITIVE_INFINITY, 1e300)).toBe(true);
    expect(formatScore(Number.POSITIVE_INFINITY)).toBe('无穷终幕');
    expect(formatScore(7.7e16)).toBe('7.70e16');
  });
});
