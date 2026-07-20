import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

import { validateRunStateV2 } from '../game-core/invariants/validateRunStateV2';
import { validateRunStateV6 } from '../game-core/invariants/validateRunStateV6';
import { validateRunStateV7 } from '../game-core/invariants/validateRunStateV7';
import type { ProfileId } from '../game-core/model/ids';
import type { RunState as RunStateV1 } from '../game-core/model/run';
import type { RunStateV2 } from '../game-core/model/runV2';
import { isRunStateV3, type RunStateV3 } from '../game-core/model/runV3';
import { isRunStateV4 } from '../game-core/model/runV4';
import { isRunStateV5 } from '../game-core/model/runV5';
import { isRunStateV6, type RunStateV6 } from '../game-core/model/runV6';
import {
  CONTENT_VERSION_V7,
  RUN_SCHEMA_VERSION_V7,
  isRunStateV7,
  type RunStateV7,
} from '../game-core/model/runV7';
import { PROFILE_HAND_TYPES } from '../progression/definitions';
import {
  DEFAULT_DEVICE_SETTINGS,
  decodeDeviceSettings,
  validateDeviceSettings,
  type DeviceSettingsV1,
  type LegacyDeviceSettingsV0,
} from './deviceSettings';
import { migrateRunV1ToV2 } from './migrations/migrateRunV1ToV2';
import { migrateRunV2ToV3 } from './migrations/migrateRunV2ToV3';
import { migrateRunV3ToV4 } from './migrations/migrateRunV3ToV4';
import { migrateRunV4ToV5 } from './migrations/migrateRunV4ToV5';
import { migrateRunV5ToV6 } from './migrations/migrateRunV5ToV6';
import { migrateRunV6ToV7 } from './migrations/migrateRunV6ToV7';
import {
  migrateProfileV0ToV1,
  type LegacyProfileRecordV0,
} from './migrations/migrateProfileV0ToV1';
import { createProfile, validateProfileRecord, type ProfileRecord } from './profiles';
import { assertValidProfileRunPair } from './profileRunPair';
import type { GameRepository } from './repository';
import { profileRecordSchema, runStateSchema } from './schemas';
import { runStateV2Schema } from './schemasV2';
import { runStateV3Schema } from './schemasV3';
import { runStateV4Schema } from './schemasV4';
import { runStateV5Schema } from './schemasV5';
import { runStateV6Schema } from './schemasV6';
import { runStateV7Schema } from './schemasV7';

type StoredRun = RunStateV1 | RunStateV2;
type StoredProfile = ProfileRecord | LegacyProfileRecordV0;

interface DatabaseMeta {
  readonly schemaVersion: number;
  readonly contentVersion: string;
  readonly activeProfileId: ProfileId | null;
}

type RecoveryKind = 'checkpoint' | 'profile-action' | 'migration';

interface RecoveryRecord {
  readonly kind: RecoveryKind;
  readonly profileId: ProfileId;
  readonly profile: StoredProfile | null;
  readonly run: StoredRun | null;
}

interface LegacyRecoveryRecord {
  readonly profileId: ProfileId;
  readonly run: StoredRun;
}

interface BaixiDatabase extends DBSchema {
  meta: {
    key: string;
    value: DatabaseMeta;
  };
  settings: {
    key: string;
    value: DeviceSettingsV1 | LegacyDeviceSettingsV0;
  };
  profiles: {
    key: string;
    value: StoredProfile;
    indexes: { 'by-slot': number };
  };
  runs: {
    key: string;
    value: StoredRun;
  };
  recovery: {
    key: string;
    value: RecoveryRecord | LegacyRecoveryRecord;
  };
}

interface DecodedStoredRun {
  readonly run: RunStateV7;
  readonly migrated: boolean;
}

interface DecodedStoredProfile {
  readonly profile: ProfileRecord;
  readonly migrated: boolean;
}

export type PersistenceWriteStage =
  | 'settings:before-put'
  | 'meta:before-put'
  | 'profile:before-put'
  | 'profile:before-delete'
  | 'run:before-put'
  | 'run:before-delete'
  | 'recovery:before-put'
  | 'recovery:before-delete'
  | 'profile-action-recovery:before-put'
  | 'profile-action-recovery:before-delete'
  | 'before-transaction-done';

export type PersistenceFaultHook = (stage: PersistenceWriteStage) => boolean;

export interface IndexedDbGameRepositoryOptions {
  readonly faultHook?: PersistenceFaultHook;
}

interface AbortableTransaction {
  readonly done: Promise<unknown>;
  abort(): void;
}

function recoveryKey(kind: RecoveryKind, profileId: ProfileId): string {
  return `${kind}:${profileId}`;
}

function decodeLegacyProfile(raw: unknown): LegacyProfileRecordV0 | null {
  if (!raw || typeof raw !== 'object') return null;
  const value = raw as Record<string, unknown>;
  if ('schemaVersion' in value) return null;
  const slot = value.slot;
  if (
    (slot !== 1 && slot !== 2 && slot !== 3) ||
    value.id !== `profile:${slot}` ||
    typeof value.displayName !== 'string' ||
    !Number.isSafeInteger(value.createdAtEpochMs) ||
    !Number.isSafeInteger(value.updatedAtEpochMs) ||
    (value.activeRunId !== null && typeof value.activeRunId !== 'string')
  ) {
    return null;
  }
  return {
    id: value.id as ProfileId,
    slot,
    displayName: value.displayName,
    createdAtEpochMs: value.createdAtEpochMs as number,
    updatedAtEpochMs: value.updatedAtEpochMs as number,
    activeRunId: value.activeRunId as LegacyProfileRecordV0['activeRunId'],
  };
}

function decodeStoredProfile(raw: unknown, run: RunStateV7 | null): DecodedStoredProfile {
  const current = profileRecordSchema.safeParse(raw);
  if (current.success) {
    assertValidProfileRunPair(current.data, run, '本地档案状态无效');
    return { profile: current.data, migrated: false };
  }
  const legacy = decodeLegacyProfile(raw);
  if (!legacy) throw new Error('本地档案格式无效');
  const profile = migrateProfileV0ToV1(legacy, run);
  assertValidProfileRunPair(profile, run, '迁移档案状态无效');
  return { profile, migrated: true };
}

function assertValidV7(run: RunStateV7, prefix: string): RunStateV7 {
  const validation = validateRunStateV7(run);
  if (!validation.ok) {
    throw new Error(`${prefix}：${validation.violations.join('；')}`);
  }
  return run;
}

function assertValidV6(run: RunStateV6, prefix: string): RunStateV6 {
  const validation = validateRunStateV6(run);
  if (!validation.ok) {
    throw new Error(`${prefix}：${validation.violations.join('；')}`);
  }
  return run;
}

function decodeStoredRun(raw: unknown): DecodedStoredRun {
  const v7 = runStateV7Schema.safeParse(raw);
  if (v7.success) {
    return { run: assertValidV7(v7.data, '牌局状态无效'), migrated: false };
  }
  const latest = runStateV6Schema.safeParse(raw);
  if (latest.success) {
    return {
      run: assertValidV7(migrateRunV6ToV7(latest.data), '迁移牌局无效'),
      migrated: true,
    };
  }
  const current = runStateV5Schema.safeParse(raw);
  if (current.success) {
    return {
      run: assertValidV7(
        migrateRunV6ToV7(migrateRunV5ToV6(current.data)),
        '迁移牌局无效',
      ),
      migrated: true,
    };
  }
  const v4 = runStateV4Schema.safeParse(raw);
  if (v4.success) {
    return {
      run: assertValidV7(
        migrateRunV6ToV7(migrateRunV5ToV6(migrateRunV4ToV5(v4.data))),
        '迁移牌局无效',
      ),
      migrated: true,
    };
  }
  const v3 = runStateV3Schema.safeParse(raw);
  if (v3.success) {
    return {
      run: assertValidV7(
        migrateRunV6ToV7(migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(v3.data)))),
        '迁移牌局无效',
      ),
      migrated: true,
    };
  }
  const v2 = runStateV2Schema.safeParse(raw);
  if (v2.success) {
    return {
      run: assertValidV7(
        migrateRunV6ToV7(
          migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(migrateRunV2ToV3(v2.data)))),
        ),
        '迁移牌局无效',
      ),
      migrated: true,
    };
  }
  const v1 = runStateSchema.safeParse(raw);
  if (v1.success) {
    const migratedV3 = migrateRunV2ToV3(migrateRunV1ToV2(v1.data));
    const migratedWithSource: RunStateV3 = {
      ...migratedV3,
      migrationV3: {
        ...migratedV3.migrationV3,
        sourceSchemaVersion: 1,
        sourceContentVersion: v1.data.contentVersion,
      },
    };
    const migrated = migrateRunV6ToV7(
      migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(migratedWithSource))),
    );
    return {
      run: assertValidV7(migrated, '迁移牌局无效'),
      migrated: true,
    };
  }
  throw new Error('本地牌局格式无效');
}

function normalizeRunForStorage(run: RunStateV2): RunStateV7 {
  if (isRunStateV7(run)) {
    const parsed = runStateV7Schema.safeParse(run);
    if (!parsed.success) throw new Error('拒绝保存无效 V7 检查点');
    return assertValidV7(parsed.data, '拒绝保存');
  }
  if (isRunStateV6(run) && run.schemaVersion === 6) {
    const parsed = runStateV6Schema.safeParse(run);
    if (!parsed.success) throw new Error('拒绝保存无效 V6 检查点');
    return assertValidV7(
      migrateRunV6ToV7(assertValidV6(parsed.data, '拒绝保存')),
      '拒绝保存',
    );
  }
  if (isRunStateV5(run)) {
    const parsed = runStateV5Schema.safeParse(run);
    if (!parsed.success) throw new Error('拒绝保存无效 V5 检查点');
    return assertValidV7(migrateRunV6ToV7(migrateRunV5ToV6(parsed.data)), '拒绝保存');
  }
  if (isRunStateV4(run)) {
    const parsed = runStateV4Schema.safeParse(run);
    if (!parsed.success) throw new Error('拒绝保存无效 V4 检查点');
    return assertValidV7(
      migrateRunV6ToV7(migrateRunV5ToV6(migrateRunV4ToV5(parsed.data))),
      '拒绝保存',
    );
  }
  if (isRunStateV3(run)) {
    const parsed = runStateV3Schema.safeParse(run);
    if (!parsed.success) throw new Error('拒绝保存无效 V3 检查点');
    return assertValidV7(
      migrateRunV6ToV7(migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(parsed.data)))),
      '拒绝保存',
    );
  }
  const parsed = runStateV2Schema.safeParse(run);
  if (!parsed.success) throw new Error('拒绝保存无效 V2 检查点');
  const validation = validateRunStateV2(parsed.data);
  if (!validation.ok) throw new Error(`拒绝保存：${validation.violations.join('；')}`);
  return assertValidV7(
    migrateRunV6ToV7(
      migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(migrateRunV2ToV3(parsed.data)))),
    ),
    '拒绝保存',
  );
}

export class IndexedDbGameRepository implements GameRepository {
  readonly #databasePromise: Promise<IDBPDatabase<BaixiDatabase>>;
  readonly #faultHook: PersistenceFaultHook | undefined;

  constructor(databaseName = 'baixiqipai', options: IndexedDbGameRepositoryOptions = {}) {
    this.#faultHook = options.faultHook;
    this.#databasePromise = openDB<BaixiDatabase>(databaseName, 1, {
      upgrade(database) {
        database.createObjectStore('meta');
        database.createObjectStore('settings');
        const profiles = database.createObjectStore('profiles', { keyPath: 'id' });
        profiles.createIndex('by-slot', 'slot', { unique: true });
        database.createObjectStore('runs');
        database.createObjectStore('recovery');
      },
    });
  }

  #injectFault(stage: PersistenceWriteStage, transaction: AbortableTransaction): void {
    if (!this.#faultHook?.(stage)) return;
    void transaction.done.catch(() => undefined);
    try {
      transaction.abort();
    } catch {
      // The test hook is one-shot; an already-aborted transaction is equivalent.
    }
    throw new Error(`测试故障：${stage}`);
  }

  async #migrateStoredPairs(): Promise<void> {
    const database = await this.#databasePromise;
    const transaction = database.transaction(
      ['profiles', 'runs', 'recovery'],
      'readwrite',
    );
    const profiles = transaction.objectStore('profiles');
    const runs = transaction.objectStore('runs');
    const recovery = transaction.objectStore('recovery');
    const rawProfiles = await profiles.getAll();
    let wrote = false;
    try {
      for (const rawProfile of rawProfiles) {
        const profileId = rawProfile.id;
        const rawRun = await runs.get(profileId);
        const decodedRun = rawRun ? decodeStoredRun(rawRun) : null;
        const decodedProfile = decodeStoredProfile(rawProfile, decodedRun?.run ?? null);
        if (decodedProfile.migrated || decodedRun?.migrated) {
          const key = recoveryKey('migration', profileId);
          if (!(await recovery.get(key))) {
            this.#injectFault('recovery:before-put', transaction);
            await recovery.put(
              {
                kind: 'migration',
                profileId,
                profile: rawProfile,
                run: rawRun ?? null,
              },
              key,
            );
            wrote = true;
          }
          this.#injectFault('profile:before-put', transaction);
          await profiles.put(decodedProfile.profile);
          wrote = true;
          if (decodedRun) {
            this.#injectFault('run:before-put', transaction);
            await runs.put(decodedRun.run, profileId);
          }
        }
      }
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // The injected fault may already have aborted the transaction.
      }
      await transaction.done.catch(() => undefined);
      throw error;
    }
    if (wrote) this.#injectFault('before-transaction-done', transaction);
    await transaction.done;
  }

  #decodeRecoveryPair(record: RecoveryRecord | LegacyRecoveryRecord): {
    readonly profile: ProfileRecord;
    readonly run: RunStateV7 | null;
  } {
    if (!('profile' in record) || !record.profile) {
      throw new Error('恢复点缺少完整档案');
    }
    const run = record.run ? decodeStoredRun(record.run).run : null;
    const profile = decodeStoredProfile(record.profile, run).profile;
    return { profile, run };
  }

  async initialize(): Promise<void> {
    const database = await this.#databasePromise;
    const transaction = database.transaction(['meta', 'settings'], 'readwrite');
    const metaStore = transaction.objectStore('meta');
    const settingsStore = transaction.objectStore('settings');

    if (!(await metaStore.get('state'))) {
      this.#injectFault('meta:before-put', transaction);
      await metaStore.put(
        {
          schemaVersion: RUN_SCHEMA_VERSION_V7,
          contentVersion: CONTENT_VERSION_V7,
          activeProfileId: null,
        },
        'state',
      );
    } else {
      const meta = await metaStore.get('state');
      if (
        meta &&
        (meta.schemaVersion !== RUN_SCHEMA_VERSION_V7 ||
          meta.contentVersion !== CONTENT_VERSION_V7)
      ) {
        this.#injectFault('meta:before-put', transaction);
        await metaStore.put(
          {
            ...meta,
            schemaVersion: RUN_SCHEMA_VERSION_V7,
            contentVersion: CONTENT_VERSION_V7,
          },
          'state',
        );
      }
    }
    if (!(await settingsStore.get('device'))) {
      this.#injectFault('settings:before-put', transaction);
      await settingsStore.put(DEFAULT_DEVICE_SETTINGS, 'device');
    }

    this.#injectFault('before-transaction-done', transaction);
    await transaction.done;
    await this.#migrateStoredPairs();
  }

  async listProfiles(): Promise<ProfileRecord[]> {
    await this.#migrateStoredPairs();
    const database = await this.#databasePromise;
    const profiles = (await database.getAll('profiles')) as ProfileRecord[];
    return profiles.sort((left, right) => left.slot - right.slot);
  }

  async getProfile(profileId: ProfileId): Promise<ProfileRecord | undefined> {
    await this.#migrateStoredPairs();
    const database = await this.#databasePromise;
    return (await database.get('profiles', profileId)) as ProfileRecord | undefined;
  }

  async saveProfile(profile: ProfileRecord): Promise<void> {
    const parsed = profileRecordSchema.safeParse(profile);
    if (!parsed.success) throw new Error('档案记录无效');
    const validation = validateProfileRecord(parsed.data);
    if (!validation.ok) {
      throw new Error(`档案记录无效：${validation.violations.join('；')}`);
    }
    const database = await this.#databasePromise;
    const transaction = database.transaction(['profiles', 'runs'], 'readwrite');
    try {
      const rawRun = await transaction.objectStore('runs').get(profile.id);
      const run = rawRun ? decodeStoredRun(rawRun).run : null;
      assertValidProfileRunPair(parsed.data, run, '拒绝保存无效档案');
      this.#injectFault('profile:before-put', transaction);
      await transaction.objectStore('profiles').put(parsed.data);
      this.#injectFault('before-transaction-done', transaction);
      await transaction.done;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // The injected fault may already have aborted the transaction.
      }
      await transaction.done.catch(() => undefined);
      throw error;
    }
  }

  async deleteProfile(profileId: ProfileId): Promise<void> {
    const database = await this.#databasePromise;
    const transaction = database.transaction(
      ['meta', 'profiles', 'runs', 'recovery'],
      'readwrite',
    );
    const metaStore = transaction.objectStore('meta');
    const meta = await metaStore.get('state');

    this.#injectFault('profile:before-delete', transaction);
    await transaction.objectStore('profiles').delete(profileId);
    this.#injectFault('run:before-delete', transaction);
    await transaction.objectStore('runs').delete(profileId);
    const recovery = transaction.objectStore('recovery');
    for (const key of await recovery.getAllKeys()) {
      if (key === profileId || String(key).endsWith(`:${profileId}`)) {
        this.#injectFault('recovery:before-delete', transaction);
        await recovery.delete(key);
      }
    }
    if (meta?.activeProfileId === profileId) {
      this.#injectFault('meta:before-put', transaction);
      await metaStore.put({ ...meta, activeProfileId: null }, 'state');
    }
    this.#injectFault('before-transaction-done', transaction);
    await transaction.done;
  }

  async setActiveProfile(profileId: ProfileId | null): Promise<void> {
    const database = await this.#databasePromise;
    const transaction = database.transaction(['meta', 'profiles'], 'readwrite');
    if (profileId && !(await transaction.objectStore('profiles').get(profileId))) {
      transaction.abort();
      throw new Error('无法选择不存在的档案');
    }
    const metaStore = transaction.objectStore('meta');
    const meta = await metaStore.get('state');
    if (!meta) {
      transaction.abort();
      throw new Error('数据库尚未初始化');
    }
    this.#injectFault('meta:before-put', transaction);
    await metaStore.put({ ...meta, activeProfileId: profileId }, 'state');
    this.#injectFault('before-transaction-done', transaction);
    await transaction.done;
  }

  async getActiveProfileId(): Promise<ProfileId | null> {
    const database = await this.#databasePromise;
    return (await database.get('meta', 'state'))?.activeProfileId ?? null;
  }

  async loadRun(profileId: ProfileId): Promise<RunStateV2 | undefined> {
    await this.#migrateStoredPairs();
    const database = await this.#databasePromise;
    const transaction = database.transaction(
      ['profiles', 'runs', 'recovery'],
      'readwrite',
    );
    const runs = transaction.objectStore('runs');
    const raw = await runs.get(profileId);
    if (!raw) {
      await transaction.done;
      return undefined;
    }
    let decoded: DecodedStoredRun;
    try {
      decoded = decodeStoredRun(raw);
    } catch (error) {
      transaction.abort();
      throw error;
    }
    if (decoded.migrated) {
      const rawProfile = await transaction.objectStore('profiles').get(profileId);
      const key = recoveryKey('migration', profileId);
      if (!(await transaction.objectStore('recovery').get(key))) {
        this.#injectFault('recovery:before-put', transaction);
        await transaction.objectStore('recovery').put(
          {
            kind: 'migration',
            profileId,
            profile: rawProfile ?? null,
            run: raw,
          },
          key,
        );
      }
      this.#injectFault('run:before-put', transaction);
      await runs.put(decoded.run, profileId);
    }
    if (decoded.migrated) this.#injectFault('before-transaction-done', transaction);
    await transaction.done;
    return decoded.run;
  }

  async loadRecoveryRun(profileId: ProfileId): Promise<RunStateV2 | undefined> {
    const database = await this.#databasePromise;
    const records = await Promise.all([
      database.get('recovery', recoveryKey('checkpoint', profileId)),
      database.get('recovery', recoveryKey('profile-action', profileId)),
      database.get('recovery', recoveryKey('migration', profileId)),
      database.get('recovery', profileId),
    ]);
    const raw = records.find((record) => record?.run)?.run;
    if (!raw) return undefined;
    return decodeStoredRun(raw).run;
  }

  async loadProfileActionRecovery(
    profileId: ProfileId,
  ): Promise<
    { readonly profile: ProfileRecord; readonly run: RunStateV2 | null } | undefined
  > {
    const database = await this.#databasePromise;
    const record = await database.get(
      'recovery',
      recoveryKey('profile-action', profileId),
    );
    if (!record) return undefined;
    return this.#decodeRecoveryPair(record);
  }

  async restoreProfileAction(profileId: ProfileId): Promise<{
    readonly profile: ProfileRecord;
    readonly run: RunStateV2 | null;
  }> {
    await this.#migrateStoredPairs();
    const database = await this.#databasePromise;
    const transaction = database.transaction(
      ['profiles', 'runs', 'recovery'],
      'readwrite',
    );
    const profiles = transaction.objectStore('profiles');
    const runs = transaction.objectStore('runs');
    const recovery = transaction.objectStore('recovery');
    const key = recoveryKey('profile-action', profileId);
    try {
      const record = await recovery.get(key);
      if (!record) throw new Error('没有可恢复的档案操作');
      const restored = this.#decodeRecoveryPair(record);
      const currentProfile = await profiles.get(profileId);
      const currentRun = await runs.get(profileId);
      if (!currentProfile) throw new Error('当前档案不存在');
      this.#injectFault('profile-action-recovery:before-put', transaction);
      await recovery.put(
        {
          kind: 'profile-action',
          profileId,
          profile: currentProfile,
          run: currentRun ?? null,
        },
        key,
      );
      this.#injectFault('profile:before-put', transaction);
      await profiles.put(restored.profile);
      if (restored.run) {
        this.#injectFault('run:before-put', transaction);
        await runs.put(restored.run, profileId);
      } else {
        this.#injectFault('run:before-delete', transaction);
        await runs.delete(profileId);
      }
      this.#injectFault('before-transaction-done', transaction);
      await transaction.done;
      return restored;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // The injected fault may already have aborted the transaction.
      }
      await transaction.done.catch(() => undefined);
      throw error;
    }
  }

  async resetProfile(profileId: ProfileId, nowEpochMs: number): Promise<ProfileRecord> {
    await this.#migrateStoredPairs();
    const database = await this.#databasePromise;
    const transaction = database.transaction(
      ['profiles', 'runs', 'recovery'],
      'readwrite',
    );
    const profiles = transaction.objectStore('profiles');
    const runs = transaction.objectStore('runs');
    const recovery = transaction.objectStore('recovery');
    try {
      const current = await profiles.get(profileId);
      if (!current) throw new Error('当前档案不存在');
      const currentRun = await runs.get(profileId);
      const decodedRun = currentRun ? decodeStoredRun(currentRun).run : null;
      const decodedProfile = decodeStoredProfile(current, decodedRun).profile;
      if (
        !Number.isSafeInteger(nowEpochMs) ||
        nowEpochMs < decodedProfile.updatedAtEpochMs
      ) {
        throw new Error('重置时间无效');
      }
      const fresh = createProfile(
        decodedProfile.slot,
        decodedProfile.displayName,
        decodedProfile.createdAtEpochMs,
      );
      const reset: ProfileRecord = { ...fresh, updatedAtEpochMs: nowEpochMs };
      this.#injectFault('profile-action-recovery:before-put', transaction);
      await recovery.put(
        {
          kind: 'profile-action',
          profileId,
          profile: decodedProfile,
          run: currentRun ?? null,
        },
        recoveryKey('profile-action', profileId),
      );
      this.#injectFault('profile:before-put', transaction);
      await profiles.put(reset);
      this.#injectFault('run:before-delete', transaction);
      await runs.delete(profileId);
      this.#injectFault('before-transaction-done', transaction);
      await transaction.done;
      return reset;
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // The injected fault may already have aborted the transaction.
      }
      await transaction.done.catch(() => undefined);
      throw error;
    }
  }

  async commitCheckpoint(profile: ProfileRecord, run: RunStateV2): Promise<void> {
    const parsedProfile = profileRecordSchema.safeParse(profile);
    if (!parsedProfile.success) throw new Error('拒绝保存无效检查点');
    const normalizedRun = normalizeRunForStorage(run);
    assertValidProfileRunPair(parsedProfile.data, normalizedRun, '拒绝保存无效检查点');

    const database = await this.#databasePromise;
    const transaction = database.transaction(
      ['profiles', 'runs', 'recovery'],
      'readwrite',
    );
    const runs = transaction.objectStore('runs');
    const recovery = transaction.objectStore('recovery');
    const previous = await runs.get(profile.id);
    const previousProfile = await transaction.objectStore('profiles').get(profile.id);

    if (previous) {
      this.#injectFault('recovery:before-put', transaction);
      await recovery.put(
        {
          kind: 'checkpoint',
          profileId: profile.id,
          profile: previousProfile ?? null,
          run: previous,
        },
        recoveryKey('checkpoint', profile.id),
      );
    } else {
      this.#injectFault('recovery:before-delete', transaction);
      await recovery.delete(recoveryKey('checkpoint', profile.id));
    }
    this.#injectFault('profile:before-put', transaction);
    await transaction.objectStore('profiles').put(profile);
    if (profile.activeRunId === null) {
      this.#injectFault('run:before-delete', transaction);
      await runs.delete(profile.id);
    } else {
      this.#injectFault('run:before-put', transaction);
      await runs.put(normalizedRun, profile.id);
    }
    this.#injectFault('before-transaction-done', transaction);
    await transaction.done;
  }

  async replaceProfile(profile: ProfileRecord, run: RunStateV2 | null): Promise<void> {
    const parsedProfile = profileRecordSchema.safeParse(profile);
    if (!parsedProfile.success) {
      throw new Error('拒绝导入无效档案');
    }
    const normalizedRun = run === null ? null : normalizeRunForStorage(run);
    assertValidProfileRunPair(parsedProfile.data, normalizedRun, '拒绝导入无效档案');

    const database = await this.#databasePromise;
    const transaction = database.transaction(
      ['profiles', 'runs', 'recovery'],
      'readwrite',
    );
    const runs = transaction.objectStore('runs');
    const recovery = transaction.objectStore('recovery');
    const previous = await runs.get(profile.id);
    const previousProfile = await transaction.objectStore('profiles').get(profile.id);

    if (previousProfile) {
      this.#injectFault('profile-action-recovery:before-put', transaction);
      await recovery.put(
        {
          kind: 'profile-action',
          profileId: profile.id,
          profile: previousProfile,
          run: previous ?? null,
        },
        recoveryKey('profile-action', profile.id),
      );
    } else {
      this.#injectFault('profile-action-recovery:before-delete', transaction);
      await recovery.delete(recoveryKey('profile-action', profile.id));
    }
    this.#injectFault('profile:before-put', transaction);
    await transaction.objectStore('profiles').put(profile);
    if (normalizedRun) {
      this.#injectFault('run:before-put', transaction);
      await runs.put(normalizedRun, profile.id);
    } else {
      this.#injectFault('run:before-delete', transaction);
      await runs.delete(profile.id);
    }
    this.#injectFault('before-transaction-done', transaction);
    await transaction.done;
  }

  async clearRun(profile: ProfileRecord): Promise<void> {
    const clearedProfile: ProfileRecord = {
      ...profile,
      activeRunId: null,
      activeProjectionCursor: null,
      currentRunProgress: {
        ...profile.currentRunProgress,
        runId: null,
        campaignVictorySettled: false,
        interestEarned: 0,
        handsPlayedByType: Object.fromEntries(
          PROFILE_HAND_TYPES.map((handType) => [handType, 0]),
        ) as ProfileRecord['currentRunProgress']['handsPlayedByType'],
        currentBlindHandsPlayed: 0,
        currentBlindDiscardsUsed: 0,
        resultDelta: null,
      },
    };
    const validation = validateProfileRecord(clearedProfile);
    if (!validation.ok) {
      throw new Error(`拒绝清除无效档案：${validation.violations.join('；')}`);
    }
    const database = await this.#databasePromise;
    const transaction = database.transaction(
      ['profiles', 'runs', 'recovery'],
      'readwrite',
    );
    const previous = await transaction.objectStore('runs').get(profile.id);
    const previousProfile = await transaction.objectStore('profiles').get(profile.id);
    if (previous) {
      this.#injectFault('recovery:before-put', transaction);
      await transaction.objectStore('recovery').put(
        {
          kind: 'checkpoint',
          profileId: profile.id,
          profile: previousProfile ?? null,
          run: previous,
        },
        recoveryKey('checkpoint', profile.id),
      );
    }
    this.#injectFault('run:before-delete', transaction);
    await transaction.objectStore('runs').delete(profile.id);
    this.#injectFault('profile:before-put', transaction);
    await transaction.objectStore('profiles').put(clearedProfile);
    this.#injectFault('before-transaction-done', transaction);
    await transaction.done;
  }

  async getSettings(): Promise<DeviceSettingsV1> {
    const database = await this.#databasePromise;
    const stored = await database.get('settings', 'device');
    const decoded = decodeDeviceSettings(stored);
    if (!stored || !('schemaVersion' in stored)) {
      const transaction = database.transaction('settings', 'readwrite');
      this.#injectFault('settings:before-put', transaction);
      await transaction.objectStore('settings').put(decoded, 'device');
      this.#injectFault('before-transaction-done', transaction);
      await transaction.done;
    }
    return decoded;
  }

  async saveSettings(settings: DeviceSettingsV1): Promise<void> {
    const validation = validateDeviceSettings(settings);
    if (!validation.ok) throw new RangeError(validation.violations.join('；'));
    const database = await this.#databasePromise;
    const transaction = database.transaction('settings', 'readwrite');
    this.#injectFault('settings:before-put', transaction);
    await transaction.objectStore('settings').put(settings, 'device');
    this.#injectFault('before-transaction-done', transaction);
    await transaction.done;
  }

  close(): void {
    void this.#databasePromise.then((database) => database.close());
  }
}
