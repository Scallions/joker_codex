import { validateRunStateV2 } from '../game-core/invariants/validateRunStateV2';
import {
  CONTENT_VERSION_V2,
  RUN_SCHEMA_VERSION_V2,
  type RunStateV2,
} from '../game-core/model/runV2';
import { migrateRunV1ToV2 } from './migrations/migrateRunV1ToV2';
import type { ProfileRecord } from './profiles';
import { profileRecordSchema, profileTransferEnvelopeSchema } from './schemas';
import { decodeRunStateV2FromTransfer, encodeRunStateV2ForTransfer } from './scoreWire';

const MAX_IMPORT_CHARACTERS = 2_000_000;

interface ProfileTransferPayloadV2 {
  readonly schemaVersion: typeof RUN_SCHEMA_VERSION_V2;
  readonly contentVersion: typeof CONTENT_VERSION_V2;
  readonly profile: ProfileRecord;
  readonly run: unknown;
}

export interface ImportedProfile {
  readonly profile: ProfileRecord;
  readonly run: RunStateV2 | null;
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

function checksum(payload: unknown): string {
  const text = JSON.stringify(canonicalize(payload));
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

function assertProfileRunPair(profile: ProfileRecord, run: RunStateV2 | null): void {
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
    const validation = validateRunStateV2(run);
    if (!validation.ok) {
      throw new Error(`牌局状态无效：${validation.violations.join('；')}`);
    }
  }
}

function payloadV2(
  profile: ProfileRecord,
  run: RunStateV2 | null,
): ProfileTransferPayloadV2 {
  return {
    schemaVersion: RUN_SCHEMA_VERSION_V2,
    contentVersion: CONTENT_VERSION_V2,
    profile,
    run: run ? encodeRunStateV2ForTransfer(run) : null,
  };
}

export function exportProfileToJson(
  profile: ProfileRecord,
  run: RunStateV2 | null,
): string {
  assertProfileRunPair(profile, run);
  const payload = payloadV2(profile, run);
  return JSON.stringify({ ...payload, checksum: checksum(payload) });
}

function importV2(envelope: Record<string, unknown>): ImportedProfile {
  if (
    envelope.schemaVersion !== RUN_SCHEMA_VERSION_V2 ||
    envelope.contentVersion !== CONTENT_VERSION_V2 ||
    typeof envelope.checksum !== 'string' ||
    !/^[a-f0-9]{8}$/.test(envelope.checksum)
  ) {
    throw new Error('档案格式无效');
  }
  const parsedProfile = profileRecordSchema.safeParse(envelope.profile);
  if (!parsedProfile.success) throw new Error('档案格式无效');
  const profile = parsedProfile.data;
  const payload: ProfileTransferPayloadV2 = {
    schemaVersion: RUN_SCHEMA_VERSION_V2,
    contentVersion: CONTENT_VERSION_V2,
    profile,
    run: envelope.run ?? null,
  };
  if (checksum(payload) !== envelope.checksum) throw new Error('档案校验失败');
  const run = payload.run === null ? null : decodeRunStateV2FromTransfer(payload.run);
  assertProfileRunPair(profile, run);
  return { profile, run };
}

function importV1(value: unknown): ImportedProfile {
  const parsed = profileTransferEnvelopeSchema.safeParse(value);
  if (!parsed.success) throw new Error('档案格式无效');
  const { checksum: suppliedChecksum, ...payload } = parsed.data;
  if (checksum(payload) !== suppliedChecksum) throw new Error('档案校验失败');
  const profile = parsed.data.profile;
  const legacy = parsed.data.run;
  const run = legacy ? migrateRunV1ToV2(legacy) : null;
  assertProfileRunPair(profile, run);
  return { profile, run };
}

export function importProfileFromJson(text: string): ImportedProfile {
  if (text.length > MAX_IMPORT_CHARACTERS) throw new Error('档案文件过大');
  let unknownEnvelope: unknown;
  try {
    unknownEnvelope = JSON.parse(text) as unknown;
  } catch {
    throw new Error('档案不是有效的 JSON');
  }
  if (!unknownEnvelope || typeof unknownEnvelope !== 'object') {
    throw new Error('档案格式无效');
  }
  const envelope = unknownEnvelope as Record<string, unknown>;
  return envelope.schemaVersion === RUN_SCHEMA_VERSION_V2
    ? importV2(envelope)
    : importV1(unknownEnvelope);
}
