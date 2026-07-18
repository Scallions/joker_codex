export const RESERVED_JOKER_IDS = Array.from(
  { length: 150 },
  (_, index) => `bxqp:joker:${(index + 1).toString().padStart(3, '0')}`,
) as readonly string[];

export function reservedJokerId(ordinal: number): string {
  if (!Number.isInteger(ordinal) || ordinal < 1 || ordinal > 150) {
    throw new RangeError('奇牌保留编号必须在 1 到 150 之间');
  }
  return RESERVED_JOKER_IDS[ordinal - 1] as string;
}
