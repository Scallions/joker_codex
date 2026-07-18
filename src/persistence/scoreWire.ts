import type { RunStateV2 } from '../game-core/model/runV2';
import { runStateV2Schema } from './schemasV2';

const SCORE_KEYS = new Set([
  'targetScore',
  'score',
  'baseChips',
  'cardChips',
  'multiplier',
]);

function encode(value: unknown, key: string | null): unknown {
  if (key && SCORE_KEYS.has(key) && typeof value === 'number') {
    if (value === Number.POSITIVE_INFINITY) return 'Infinity';
    if (!Number.isFinite(value) || value < 0) throw new Error('牌局传输分数无效');
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => encode(item, null));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        encode(entryValue, entryKey),
      ]),
    );
  }
  return value;
}

function decode(value: unknown, key: string | null): unknown {
  if (key && SCORE_KEYS.has(key)) {
    if (value === 'Infinity') return Number.POSITIVE_INFINITY;
    if (
      typeof value !== 'number' ||
      value < 0 ||
      (!Number.isFinite(value) && value !== Number.POSITIVE_INFINITY)
    ) {
      throw new Error('牌局传输分数无效');
    }
    return value;
  }
  if (Array.isArray(value)) return value.map((item) => decode(item, null));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([entryKey, entryValue]) => [
        entryKey,
        decode(entryValue, entryKey),
      ]),
    );
  }
  return value;
}

export function encodeRunStateV2ForTransfer(run: RunStateV2): unknown {
  return encode(run, null);
}

export function decodeRunStateV2FromTransfer(value: unknown): RunStateV2 {
  const decoded = decode(value, null);
  const parsed = runStateV2Schema.safeParse(decoded);
  if (!parsed.success) throw new Error('牌局传输格式无效');
  return parsed.data;
}
