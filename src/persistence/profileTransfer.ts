import { stableId } from '../game-core/model/ids';
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
import {
  RUN_SCHEMA_VERSION_V6,
  isRunStateV6,
  type RunStateV6,
} from '../game-core/model/runV6';
import {
  RUN_SCHEMA_VERSION_V7,
  isRunStateV7,
  type RunStateV7,
} from '../game-core/model/runV7';
import { migrateRunV1ToV2 } from './migrations/migrateRunV1ToV2';
import { migrateRunV2ToV3 } from './migrations/migrateRunV2ToV3';
import { migrateRunV3ToV4 } from './migrations/migrateRunV3ToV4';
import { migrateRunV4ToV5 } from './migrations/migrateRunV4ToV5';
import { migrateRunV5ToV6 } from './migrations/migrateRunV5ToV6';
import { migrateRunV6ToV7 } from './migrations/migrateRunV6ToV7';
import { PROFILE_SCHEMA_VERSION, type ProfileRecord, type ProfileSlot } from './profiles';
import { assertValidProfileRunPair } from './profileRunPair';
import { profileRecordSchema, profileTransferEnvelopeSchema } from './schemas';
import {
  decodeRunStateV2FromTransfer,
  decodeRunStateV3FromTransfer,
  decodeRunStateV4FromTransfer,
  decodeRunStateV5FromTransfer,
  decodeRunStateV6FromTransfer,
  decodeRunStateV7FromTransfer,
  decodeProfileRecordFromTransfer,
  encodeProfileRecordForTransfer,
  encodeRunStateV7ForTransfer,
} from './scoreWire';

const MAX_IMPORT_BYTES = 2_000_000;

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

interface ProfileTransferPayloadV6 {
  readonly schemaVersion: typeof RUN_SCHEMA_VERSION_V6;
  readonly envelopeVersion: 'profile-transfer-6';
  readonly runContentVersion: RunStateV6['contentVersion'] | null;
  readonly profile: ProfileRecord;
  readonly run: unknown;
}

interface ProfileTransferPayloadV7 {
  readonly envelopeVersion: 'profile-transfer-7';
  readonly profileSchemaVersion: typeof PROFILE_SCHEMA_VERSION;
  readonly runSchemaVersion: typeof RUN_SCHEMA_VERSION_V7 | null;
  readonly runContentVersion: RunStateV7['contentVersion'] | null;
  readonly profile: unknown;
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
  assertValidProfileRunPair(profile, run, '档案状态无效');
}

function normalizeTransferRun(run: RunStateV2 | null): RunStateV7 | null {
  if (run === null) return null;
  if (isRunStateV7(run)) return run;
  if (isRunStateV6(run)) return migrateRunV6ToV7(run);
  if (isRunStateV5(run)) return migrateRunV6ToV7(migrateRunV5ToV6(run));
  if (isRunStateV4(run)) {
    return migrateRunV6ToV7(migrateRunV5ToV6(migrateRunV4ToV5(run)));
  }
  return migrateRunV6ToV7(
    migrateRunV5ToV6(
      migrateRunV4ToV5(migrateRunV3ToV4(isRunStateV3(run) ? run : migrateRunV2ToV3(run))),
    ),
  );
}

export function exportProfileToJson(
  profile: ProfileRecord,
  run: RunStateV2 | null,
): string {
  const normalizedRun = normalizeTransferRun(run);
  assertProfileRunPair(profile, normalizedRun);
  const payload: ProfileTransferPayloadV7 = {
    envelopeVersion: 'profile-transfer-7',
    profileSchemaVersion: PROFILE_SCHEMA_VERSION,
    runSchemaVersion: normalizedRun ? RUN_SCHEMA_VERSION_V7 : null,
    runContentVersion: normalizedRun?.contentVersion ?? null,
    profile: encodeProfileRecordForTransfer(profile),
    run: normalizedRun ? encodeRunStateV7ForTransfer(normalizedRun) : null,
  };
  return JSON.stringify({ ...payload, checksum: checksum(payload) });
}

function importV7(envelope: Record<string, unknown>): ImportedProfile {
  if (
    envelope.envelopeVersion !== 'profile-transfer-7' ||
    envelope.profileSchemaVersion !== PROFILE_SCHEMA_VERSION ||
    (envelope.runSchemaVersion !== RUN_SCHEMA_VERSION_V7 &&
      envelope.runSchemaVersion !== null) ||
    typeof envelope.checksum !== 'string' ||
    !/^[a-f0-9]{8}$/.test(envelope.checksum)
  ) {
    throw new Error('档案格式无效');
  }
  let profile: ProfileRecord;
  try {
    profile = decodeProfileRecordFromTransfer(envelope.profile);
  } catch {
    throw new Error('档案格式无效');
  }
  const runContentVersion =
    typeof envelope.runContentVersion === 'string' || envelope.runContentVersion === null
      ? (envelope.runContentVersion as RunStateV7['contentVersion'] | null)
      : undefined;
  if (runContentVersion === undefined) throw new Error('档案格式无效');
  const payload: ProfileTransferPayloadV7 = {
    envelopeVersion: 'profile-transfer-7',
    profileSchemaVersion: PROFILE_SCHEMA_VERSION,
    runSchemaVersion: envelope.runSchemaVersion,
    runContentVersion,
    profile: envelope.profile,
    run: envelope.run ?? null,
  };
  if (checksum(payload) !== envelope.checksum) throw new Error('档案校验失败');
  if ((payload.runSchemaVersion === null) !== (payload.run === null)) {
    throw new Error('档案格式无效');
  }
  const run = payload.run === null ? null : decodeRunStateV7FromTransfer(payload.run);
  if (
    (run === null && payload.runContentVersion !== null) ||
    (run !== null && run.contentVersion !== payload.runContentVersion)
  ) {
    throw new Error('档案内容版本不匹配');
  }
  assertProfileRunPair(profile, run);
  return { profile, run };
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
    v2Run === null
      ? null
      : migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(migrateRunV2ToV3(v2Run))));
  const normalizedRun = normalizeTransferRun(run);
  assertProfileRunPair(profile, normalizedRun);
  return { profile, run: normalizedRun };
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
  const run =
    runV3 === null ? null : migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(runV3)));
  const normalizedRun = normalizeTransferRun(run);
  assertProfileRunPair(profile, normalizedRun);
  return { profile, run: normalizedRun };
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
  const run = runV4 === null ? null : migrateRunV5ToV6(migrateRunV4ToV5(runV4));
  const normalizedRun = normalizeTransferRun(run);
  assertProfileRunPair(profile, normalizedRun);
  return { profile, run: normalizedRun };
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
  const runV5 = payload.run === null ? null : decodeRunStateV5FromTransfer(payload.run);
  if (runV5?.contentVersion !== payload.runContentVersion) {
    throw new Error('档案内容版本不匹配');
  }
  const run = runV5 === null ? null : migrateRunV5ToV6(runV5);
  const normalizedRun = normalizeTransferRun(run);
  assertProfileRunPair(profile, normalizedRun);
  return { profile, run: normalizedRun };
}

function importV6(envelope: Record<string, unknown>): ImportedProfile {
  if (
    envelope.schemaVersion !== RUN_SCHEMA_VERSION_V6 ||
    envelope.envelopeVersion !== 'profile-transfer-6' ||
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
    envelope.runContentVersion === 'joker-catalog-3' ||
    envelope.runContentVersion === null
      ? envelope.runContentVersion
      : undefined;
  if (runContentVersion === undefined) throw new Error('档案格式无效');
  const payload: ProfileTransferPayloadV6 = {
    schemaVersion: RUN_SCHEMA_VERSION_V6,
    envelopeVersion: 'profile-transfer-6',
    runContentVersion,
    profile,
    run: envelope.run ?? null,
  };
  if (checksum(payload) !== envelope.checksum) throw new Error('档案校验失败');
  const run = payload.run === null ? null : decodeRunStateV6FromTransfer(payload.run);
  if (run?.contentVersion !== payload.runContentVersion) {
    throw new Error('档案内容版本不匹配');
  }
  const normalizedRun = normalizeTransferRun(run);
  assertProfileRunPair(profile, normalizedRun);
  return { profile, run: normalizedRun };
}

function importV1(value: unknown): ImportedProfile {
  const parsed = profileTransferEnvelopeSchema.safeParse(value);
  if (!parsed.success) throw new Error('档案格式无效');
  const { checksum: suppliedChecksum, ...payload } = parsed.data;
  if (checksum(payload) !== suppliedChecksum) throw new Error('档案校验失败');
  const profile = parsed.data.profile;
  const legacy = parsed.data.run;
  const run = legacy
    ? migrateRunV5ToV6(
        migrateRunV4ToV5(migrateRunV3ToV4(migrateRunV2ToV3(migrateRunV1ToV2(legacy)))),
      )
    : null;
  const normalizedRun = normalizeTransferRun(run);
  assertProfileRunPair(profile, normalizedRun);
  return { profile, run: normalizedRun };
}

export function importProfileFromJson(text: string): ImportedProfile {
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) {
    throw new Error('档案文件过大');
  }
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
  if (envelope.envelopeVersion === 'profile-transfer-7') return importV7(envelope);
  if (envelope.schemaVersion === RUN_SCHEMA_VERSION_V6) return importV6(envelope);
  if (envelope.schemaVersion === RUN_SCHEMA_VERSION_V5) return importV5(envelope);
  if (envelope.schemaVersion === RUN_SCHEMA_VERSION_V4) return importV4(envelope);
  if (envelope.schemaVersion === RUN_SCHEMA_VERSION_V3) return importV3(envelope);
  if (envelope.schemaVersion === RUN_SCHEMA_VERSION_V2) return importV2(envelope);
  return importV1(unknownEnvelope);
}

export function remapImportedProfileToSlot(
  imported: ImportedProfile,
  targetSlot: ProfileSlot,
  nowEpochMs: number,
): ImportedProfile {
  if (
    !Number.isSafeInteger(nowEpochMs) ||
    nowEpochMs < imported.profile.updatedAtEpochMs
  ) {
    throw new Error('导入时间无效');
  }
  const profileId = stableId<'profile'>(`profile:${targetSlot}`);
  const normalizedRun = normalizeTransferRun(imported.run);
  const run =
    normalizedRun && normalizedRun.sessionV7.runSequence > 0
      ? {
          ...normalizedRun,
          sessionV7: { ...normalizedRun.sessionV7, profileId },
        }
      : normalizedRun;
  const profile: ProfileRecord = {
    ...imported.profile,
    id: profileId,
    slot: targetSlot,
    updatedAtEpochMs: nowEpochMs,
  };
  assertProfileRunPair(profile, run);
  return { profile, run };
}
