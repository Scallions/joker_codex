import { validateRunStateV2 } from '../game-core/invariants/validateRunStateV2';
import { validateRunStateV3 } from '../game-core/invariants/validateRunStateV3';
import { validateRunStateV4 } from '../game-core/invariants/validateRunStateV4';
import { validateRunStateV5 } from '../game-core/invariants/validateRunStateV5';
import {
  CONTENT_VERSION_V2,
  RUN_SCHEMA_VERSION_V2,
  type RunStateV2,
} from '../game-core/model/runV2';
import {
  RUN_SCHEMA_VERSION_V3,
  isRunStateV3,
  type RunStateV3,
} from '../game-core/model/runV3';
import {
  RUN_SCHEMA_VERSION_V4,
  isRunStateV4,
  type RunStateV4,
} from '../game-core/model/runV4';
import {
  RUN_SCHEMA_VERSION_V5,
  isRunStateV5,
  type RunStateV5,
} from '../game-core/model/runV5';
import { migrateRunV1ToV2 } from './migrations/migrateRunV1ToV2';
import { migrateRunV2ToV3 } from './migrations/migrateRunV2ToV3';
import { migrateRunV3ToV4 } from './migrations/migrateRunV3ToV4';
import { migrateRunV4ToV5 } from './migrations/migrateRunV4ToV5';
import type { ProfileRecord } from './profiles';
import { profileRecordSchema, profileTransferEnvelopeSchema } from './schemas';
import {
  decodeRunStateV2FromTransfer,
  decodeRunStateV3FromTransfer,
  decodeRunStateV4FromTransfer,
  decodeRunStateV5FromTransfer,
  encodeRunStateV5ForTransfer,
} from './scoreWire';

const MAX_IMPORT_CHARACTERS = 2_000_000;

interface ProfileTransferPayloadV2 {
  readonly schemaVersion: typeof RUN_SCHEMA_VERSION_V2;
  readonly contentVersion: typeof CONTENT_VERSION_V2;
  readonly profile: ProfileRecord;
  readonly run: unknown;
}

interface ProfileTransferPayloadV3 {
  readonly schemaVersion: typeof RUN_SCHEMA_VERSION_V3;
  readonly envelopeVersion: 'profile-transfer-3';
  readonly runContentVersion: RunStateV3['contentVersion'] | null;
  readonly profile: ProfileRecord;
  readonly run: unknown;
}

interface ProfileTransferPayloadV4 {
  readonly schemaVersion: typeof RUN_SCHEMA_VERSION_V4;
  readonly envelopeVersion: 'profile-transfer-4';
  readonly runContentVersion: RunStateV4['contentVersion'] | null;
  readonly profile: ProfileRecord;
  readonly run: unknown;
}

interface ProfileTransferPayloadV5 {
  readonly schemaVersion: typeof RUN_SCHEMA_VERSION_V5;
  readonly envelopeVersion: 'profile-transfer-5';
  readonly runContentVersion: RunStateV5['contentVersion'] | null;
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
    const validation = isRunStateV5(run)
      ? validateRunStateV5(run)
      : isRunStateV4(run)
        ? validateRunStateV4(run)
        : isRunStateV3(run)
          ? validateRunStateV3(run)
          : validateRunStateV2(run);
    if (!validation.ok) {
      throw new Error(`牌局状态无效：${validation.violations.join('；')}`);
    }
  }
}

function normalizeTransferRun(run: RunStateV2 | null): RunStateV5 | null {
  if (run === null) return null;
  if (isRunStateV5(run)) return run;
  if (isRunStateV4(run)) return migrateRunV4ToV5(run);
  return migrateRunV4ToV5(
    migrateRunV3ToV4(isRunStateV3(run) ? run : migrateRunV2ToV3(run)),
  );
}

export function exportProfileToJson(
  profile: ProfileRecord,
  run: RunStateV2 | null,
): string {
  const normalizedRun = normalizeTransferRun(run);
  assertProfileRunPair(profile, normalizedRun);
  const payload: ProfileTransferPayloadV5 = {
    schemaVersion: RUN_SCHEMA_VERSION_V5,
    envelopeVersion: 'profile-transfer-5',
    runContentVersion: normalizedRun?.contentVersion ?? null,
    profile,
    run: normalizedRun ? encodeRunStateV5ForTransfer(normalizedRun) : null,
  };
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
  const v2Run = payload.run === null ? null : decodeRunStateV2FromTransfer(payload.run);
  const run =
    v2Run === null ? null : migrateRunV4ToV5(migrateRunV3ToV4(migrateRunV2ToV3(v2Run)));
  assertProfileRunPair(profile, run);
  return { profile, run };
}

function importV3(envelope: Record<string, unknown>): ImportedProfile {
  if (
    envelope.schemaVersion !== RUN_SCHEMA_VERSION_V3 ||
    envelope.envelopeVersion !== 'profile-transfer-3' ||
    typeof envelope.checksum !== 'string' ||
    !/^[a-f0-9]{8}$/.test(envelope.checksum)
  ) {
    throw new Error('档案格式无效');
  }
  const parsedProfile = profileRecordSchema.safeParse(envelope.profile);
  if (!parsedProfile.success) throw new Error('档案格式无效');
  const profile = parsedProfile.data;
  const payload: ProfileTransferPayloadV3 = {
    schemaVersion: RUN_SCHEMA_VERSION_V3,
    envelopeVersion: 'profile-transfer-3',
    runContentVersion:
      envelope.runContentVersion === 'run-economy-2' ||
      envelope.runContentVersion === 'catalog-baseline-3' ||
      envelope.runContentVersion === null
        ? envelope.runContentVersion
        : null,
    profile,
    run: envelope.run ?? null,
  };
  if (payload.runContentVersion !== envelope.runContentVersion) {
    throw new Error('档案格式无效');
  }
  if (checksum(payload) !== envelope.checksum) throw new Error('档案校验失败');
  const runV3 = payload.run === null ? null : decodeRunStateV3FromTransfer(payload.run);
  if (runV3?.contentVersion !== payload.runContentVersion) {
    throw new Error('档案内容版本不匹配');
  }
  const run = runV3 === null ? null : migrateRunV4ToV5(migrateRunV3ToV4(runV3));
  assertProfileRunPair(profile, run);
  return { profile, run };
}

function importV4(envelope: Record<string, unknown>): ImportedProfile {
  if (
    envelope.schemaVersion !== RUN_SCHEMA_VERSION_V4 ||
    envelope.envelopeVersion !== 'profile-transfer-4' ||
    typeof envelope.checksum !== 'string' ||
    !/^[a-f0-9]{8}$/.test(envelope.checksum)
  ) {
    throw new Error('档案格式无效');
  }
  const parsedProfile = profileRecordSchema.safeParse(envelope.profile);
  if (!parsedProfile.success) throw new Error('档案格式无效');
  const profile = parsedProfile.data;
  const runContentVersion =
    envelope.runContentVersion === 'run-economy-2' ||
    envelope.runContentVersion === 'catalog-baseline-3' ||
    envelope.runContentVersion === 'joker-catalog-1' ||
    envelope.runContentVersion === null
      ? envelope.runContentVersion
      : undefined;
  if (runContentVersion === undefined) throw new Error('档案格式无效');
  const payload: ProfileTransferPayloadV4 = {
    schemaVersion: RUN_SCHEMA_VERSION_V4,
    envelopeVersion: 'profile-transfer-4',
    runContentVersion,
    profile,
    run: envelope.run ?? null,
  };
  if (checksum(payload) !== envelope.checksum) throw new Error('档案校验失败');
  const runV4 = payload.run === null ? null : decodeRunStateV4FromTransfer(payload.run);
  if (runV4?.contentVersion !== payload.runContentVersion) {
    throw new Error('档案内容版本不匹配');
  }
  const run = runV4 === null ? null : migrateRunV4ToV5(runV4);
  assertProfileRunPair(profile, run);
  return { profile, run };
}

function importV5(envelope: Record<string, unknown>): ImportedProfile {
  if (
    envelope.schemaVersion !== RUN_SCHEMA_VERSION_V5 ||
    envelope.envelopeVersion !== 'profile-transfer-5' ||
    typeof envelope.checksum !== 'string' ||
    !/^[a-f0-9]{8}$/.test(envelope.checksum)
  ) {
    throw new Error('档案格式无效');
  }
  const parsedProfile = profileRecordSchema.safeParse(envelope.profile);
  if (!parsedProfile.success) throw new Error('档案格式无效');
  const profile = parsedProfile.data;
  const runContentVersion =
    envelope.runContentVersion === 'run-economy-2' ||
    envelope.runContentVersion === 'catalog-baseline-3' ||
    envelope.runContentVersion === 'joker-catalog-1' ||
    envelope.runContentVersion === 'joker-catalog-2' ||
    envelope.runContentVersion === null
      ? envelope.runContentVersion
      : undefined;
  if (runContentVersion === undefined) throw new Error('档案格式无效');
  const payload: ProfileTransferPayloadV5 = {
    schemaVersion: RUN_SCHEMA_VERSION_V5,
    envelopeVersion: 'profile-transfer-5',
    runContentVersion,
    profile,
    run: envelope.run ?? null,
  };
  if (checksum(payload) !== envelope.checksum) throw new Error('档案校验失败');
  const run = payload.run === null ? null : decodeRunStateV5FromTransfer(payload.run);
  if (run?.contentVersion !== payload.runContentVersion) {
    throw new Error('档案内容版本不匹配');
  }
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
  const run = legacy
    ? migrateRunV4ToV5(migrateRunV3ToV4(migrateRunV2ToV3(migrateRunV1ToV2(legacy))))
    : null;
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
  if (envelope.schemaVersion === RUN_SCHEMA_VERSION_V5) return importV5(envelope);
  if (envelope.schemaVersion === RUN_SCHEMA_VERSION_V4) return importV4(envelope);
  if (envelope.schemaVersion === RUN_SCHEMA_VERSION_V3) return importV3(envelope);
  if (envelope.schemaVersion === RUN_SCHEMA_VERSION_V2) return importV2(envelope);
  return importV1(unknownEnvelope);
}
