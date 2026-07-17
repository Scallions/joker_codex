import { validateRunState } from '../game-core/invariants/validateRunState';
import {
  CONTENT_VERSION,
  RUN_SCHEMA_VERSION,
  type RunState,
} from '../game-core/model/run';
import type { ProfileRecord } from './profiles';
import { profileTransferEnvelopeSchema } from './schemas';

const MAX_IMPORT_CHARACTERS = 2_000_000;

interface ProfileTransferPayload {
  readonly schemaVersion: typeof RUN_SCHEMA_VERSION;
  readonly contentVersion: typeof CONTENT_VERSION;
  readonly profile: ProfileRecord;
  readonly run: RunState | null;
}

export interface ImportedProfile {
  readonly profile: ProfileRecord;
  readonly run: RunState | null;
}

function makePayload(
  profile: ProfileRecord,
  run: RunState | null,
): ProfileTransferPayload {
  return {
    schemaVersion: RUN_SCHEMA_VERSION,
    contentVersion: CONTENT_VERSION,
    profile,
    run,
  };
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, canonicalize(item)]),
    );
  }
  return value;
}

function checksum(payload: ProfileTransferPayload): string {
  const text = JSON.stringify(canonicalize(payload));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function assertProfileRunPair(profile: ProfileRecord, run: RunState | null): void {
  if (profile.id !== `profile:${profile.slot}`) {
    throw new Error('档案编号与档位不匹配');
  }
  if ((profile.activeRunId === null) !== (run === null)) {
    throw new Error('档案与进行中的牌局不匹配');
  }
  if (run && profile.activeRunId !== run.runId) {
    throw new Error('档案引用了另一局牌');
  }
  if (run) {
    const validation = validateRunState(run);
    if (!validation.ok)
      throw new Error(`牌局状态无效：${validation.violations.join('；')}`);
  }
}

export function exportProfileToJson(
  profile: ProfileRecord,
  run: RunState | null,
): string {
  assertProfileRunPair(profile, run);
  const payload = makePayload(profile, run);
  return JSON.stringify({ ...payload, checksum: checksum(payload) });
}

export function importProfileFromJson(text: string): ImportedProfile {
  if (text.length > MAX_IMPORT_CHARACTERS) throw new Error('档案文件过大');

  let unknownEnvelope: unknown;
  try {
    unknownEnvelope = JSON.parse(text) as unknown;
  } catch {
    throw new Error('档案不是有效的 JSON');
  }

  const parsed = profileTransferEnvelopeSchema.safeParse(unknownEnvelope);
  if (!parsed.success) throw new Error('档案格式无效');

  const profile = parsed.data.profile as ProfileRecord;
  const run = parsed.data.run as RunState | null;
  const payload = makePayload(profile, run);
  if (checksum(payload) !== parsed.data.checksum) throw new Error('档案校验失败');

  assertProfileRunPair(profile, run);
  return { profile, run };
}
