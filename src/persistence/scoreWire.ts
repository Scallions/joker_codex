import type { RunStateV2 } from '../game-core/model/runV2';
import type { RunStateV3 } from '../game-core/model/runV3';
import type { RunStateV4 } from '../game-core/model/runV4';
import type { RunStateV5 } from '../game-core/model/runV5';
import type { RunStateV6 } from '../game-core/model/runV6';
import { runStateV2Schema } from './schemasV2';
import { runStateV3Schema } from './schemasV3';
import { runStateV4Schema } from './schemasV4';
import { runStateV5Schema } from './schemasV5';
import { runStateV6Schema } from './schemasV6';

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

export function encodeRunStateV3ForTransfer(run: RunStateV3): unknown {
  return encode(run, null);
}

export function encodeRunStateV4ForTransfer(run: RunStateV4): unknown {
  return encode(run, null);
}

export function encodeRunStateV5ForTransfer(run: RunStateV5): unknown {
  return encode(run, null);
}

export function encodeRunStateV6ForTransfer(run: RunStateV6): unknown {
  return encode(run, null);
}

export function decodeRunStateV2FromTransfer(value: unknown): RunStateV2 {
  const decoded = decode(value, null);
  const parsed = runStateV2Schema.safeParse(decoded);
  if (!parsed.success) throw new Error('牌局传输格式无效');
  return parsed.data;
}

export function decodeRunStateV3FromTransfer(value: unknown): RunStateV3 {
  const decoded = decode(value, null);
  const parsed = runStateV3Schema.safeParse(decoded);
  if (!parsed.success) throw new Error('V3 牌局传输格式无效');
  return parsed.data;
}

export function decodeRunStateV4FromTransfer(value: unknown): RunStateV4 {
  const decoded = decode(value, null);
  const parsed = runStateV4Schema.safeParse(decoded);
  if (!parsed.success) throw new Error('V4 牌局传输格式无效');
  return parsed.data;
}

export function decodeRunStateV5FromTransfer(value: unknown): RunStateV5 {
  const decoded = decode(value, null);
  const parsed = runStateV5Schema.safeParse(decoded);
  if (!parsed.success) throw new Error('V5 牌局传输格式无效');
  return parsed.data;
}

export function decodeRunStateV6FromTransfer(value: unknown): RunStateV6 {
  const decoded = decode(value, null);
  const parsed = runStateV6Schema.safeParse(decoded);
  if (!parsed.success) throw new Error('V6 牌局传输格式无效');
  return parsed.data;
}
