const ANTE_BASE_TARGETS = new Map<number, number>([
  [-1, 100],
  [0, 100],
  [1, 300],
  [2, 800],
  [3, 2_000],
  [4, 5_000],
  [5, 11_000],
  [6, 20_000],
  [7, 35_000],
  [8, 50_000],
  [9, 110_000],
  [10, 560_000],
  [11, 7_200_000],
  [12, 300_000_000],
  [13, 4.7e10],
  [14, 2.9e13],
  [15, 7.7e16],
  [16, 8.6e20],
  [17, 4.2e25],
  [18, 9.2e30],
  [19, 9.2e36],
  [20, 4.3e43],
  [21, 9.7e50],
  [22, 1e59],
  [23, 5.8e67],
  [24, 1.6e77],
  [25, 2.4e87],
  [26, 1.9e98],
  [27, 8.4e109],
  [28, 2e122],
  [29, 2.7e135],
  [30, 2.1e149],
  [31, 9.9e163],
  [32, 2.7e179],
  [33, 4.4e195],
  [34, 4.4e212],
  [35, 2.8e230],
  [36, 1.1e249],
  [37, 2.7e268],
  [38, 4.5e288],
  [39, Number.POSITIVE_INFINITY],
]);

export function getAnteBaseTarget(ante: number): number {
  if (!Number.isSafeInteger(ante)) throw new RangeError('幕次必须是安全整数');
  if (ante >= 39) return Number.POSITIVE_INFINITY;
  const target = ANTE_BASE_TARGETS.get(ante);
  if (target === undefined) throw new RangeError('幕次低于可支持范围');
  return target;
}

export function getBlindTarget(
  ante: number,
  blindMultiplier: number,
  targetScaleBasisPoints: number,
): number {
  if (!Number.isFinite(blindMultiplier) || blindMultiplier <= 0) {
    throw new RangeError('盲注目标倍率必须为正有限数');
  }
  if (!Number.isSafeInteger(targetScaleBasisPoints) || targetScaleBasisPoints <= 0) {
    throw new RangeError('目标缩放必须是正安全整数');
  }
  const base = getAnteBaseTarget(ante);
  if (base === Number.POSITIVE_INFINITY) return base;
  const scaled = Math.floor((base * blindMultiplier * targetScaleBasisPoints) / 10_000);
  return Number.isFinite(scaled) ? Math.max(1, scaled) : Number.POSITIVE_INFINITY;
}

export function meetsTarget(score: number, target: number): boolean {
  if (target === Number.POSITIVE_INFINITY) return false;
  return score >= target;
}

export function addScore(left: number, right: number): number {
  if (left < 0 || right < 0 || Number.isNaN(left) || Number.isNaN(right)) {
    throw new RangeError('分数不能为负数或 NaN');
  }
  const value = left + right;
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

export function multiplyScore(left: number, right: number): number {
  if (left < 0 || right < 0 || Number.isNaN(left) || Number.isNaN(right)) {
    throw new RangeError('分数不能为负数或 NaN');
  }
  const value = left * right;
  return Number.isFinite(value) ? value : Number.POSITIVE_INFINITY;
}

export function formatScore(score: number): string {
  if (score === Number.POSITIVE_INFINITY) return '无穷终幕';
  if (!Number.isFinite(score) || score < 0) return '无效分数';
  if (score >= 1e12) return score.toExponential(2).replace('e+', 'e');
  const rounded = Math.floor(score).toString();
  return rounded.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
