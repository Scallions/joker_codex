import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

import { validateRunStateV2 } from '../game-core/invariants/validateRunStateV2';
import { validateRunStateV6 } from '../game-core/invariants/validateRunStateV6';
import type { ProfileId } from '../game-core/model/ids';
import type { RunState as RunStateV1 } from '../game-core/model/run';
import type { RunStateV2 } from '../game-core/model/runV2';
import { isRunStateV3, type RunStateV3 } from '../game-core/model/runV3';
import { isRunStateV4 } from '../game-core/model/runV4';
import { isRunStateV5 } from '../game-core/model/runV5';
import {
  CONTENT_VERSION_V6,
  RUN_SCHEMA_VERSION_V6,
  isRunStateV6,
  type RunStateV6,
} from '../game-core/model/runV6';
import { migrateRunV1ToV2 } from './migrations/migrateRunV1ToV2';
import { migrateRunV2ToV3 } from './migrations/migrateRunV2ToV3';
import { migrateRunV3ToV4 } from './migrations/migrateRunV3ToV4';
import { migrateRunV4ToV5 } from './migrations/migrateRunV4ToV5';
import { migrateRunV5ToV6 } from './migrations/migrateRunV5ToV6';
import type { ProfileRecord } from './profiles';
import type { GameRepository } from './repository';
import { profileRecordSchema, runStateSchema } from './schemas';
import { runStateV2Schema } from './schemasV2';
import { runStateV3Schema } from './schemasV3';
import { runStateV4Schema } from './schemasV4';
import { runStateV5Schema } from './schemasV5';
import { runStateV6Schema } from './schemasV6';

type StoredRun = RunStateV1 | RunStateV2;

export interface DeviceSettings {
  readonly masterVolume: number;
  readonly musicVolume: number;
  readonly sfxVolume: number;
  readonly muted: boolean;
}

interface DatabaseMeta {
  readonly schemaVersion: number;
  readonly contentVersion: string;
  readonly activeProfileId: ProfileId | null;
}

interface RecoveryRecord {
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
    value: DeviceSettings;
  };
  profiles: {
    key: string;
    value: ProfileRecord;
    indexes: { 'by-slot': number };
  };
  runs: {
    key: string;
    value: StoredRun;
  };
  recovery: {
    key: string;
    value: RecoveryRecord;
  };
}

const DEFAULT_SETTINGS: DeviceSettings = {
  masterVolume: 0.8,
  musicVolume: 0.7,
  sfxVolume: 0.9,
  muted: false,
};

interface DecodedStoredRun {
  readonly run: RunStateV6;
  readonly migrated: boolean;
}

function assertValidV6(run: RunStateV6, prefix: string): RunStateV6 {
  const validation = validateRunStateV6(run);
  if (!validation.ok) {
    throw new Error(`${prefix}：${validation.violations.join('；')}`);
  }
  return run;
}

function decodeStoredRun(raw: unknown): DecodedStoredRun {
  const latest = runStateV6Schema.safeParse(raw);
  if (latest.success) {
    return { run: assertValidV6(latest.data, '牌局状态无效'), migrated: false };
  }
  const current = runStateV5Schema.safeParse(raw);
  if (current.success) {
    return {
      run: assertValidV6(migrateRunV5ToV6(current.data), '迁移牌局无效'),
      migrated: true,
    };
  }
  const v4 = runStateV4Schema.safeParse(raw);
  if (v4.success) {
    return {
      run: assertValidV6(migrateRunV5ToV6(migrateRunV4ToV5(v4.data)), '迁移牌局无效'),
      migrated: true,
    };
  }
  const v3 = runStateV3Schema.safeParse(raw);
  if (v3.success) {
    return {
      run: assertValidV6(
        migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(v3.data))),
        '迁移牌局无效',
      ),
      migrated: true,
    };
  }
  const v2 = runStateV2Schema.safeParse(raw);
  if (v2.success) {
    return {
      run: assertValidV6(
        migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(migrateRunV2ToV3(v2.data)))),
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
    const migrated = migrateRunV5ToV6(
      migrateRunV4ToV5(migrateRunV3ToV4(migratedWithSource)),
    );
    return {
      run: assertValidV6(migrated, '迁移牌局无效'),
      migrated: true,
    };
  }
  throw new Error('本地牌局格式无效');
}

function normalizeRunForStorage(run: RunStateV2): RunStateV6 {
  if (isRunStateV6(run)) {
    const parsed = runStateV6Schema.safeParse(run);
    if (!parsed.success) throw new Error('拒绝保存无效 V6 检查点');
    return assertValidV6(parsed.data, '拒绝保存');
  }
  if (isRunStateV5(run)) {
    const parsed = runStateV5Schema.safeParse(run);
    if (!parsed.success) throw new Error('拒绝保存无效 V5 检查点');
    return assertValidV6(migrateRunV5ToV6(parsed.data), '拒绝保存');
  }
  if (isRunStateV4(run)) {
    const parsed = runStateV4Schema.safeParse(run);
    if (!parsed.success) throw new Error('拒绝保存无效 V4 检查点');
    return assertValidV6(migrateRunV5ToV6(migrateRunV4ToV5(parsed.data)), '拒绝保存');
  }
  if (isRunStateV3(run)) {
    const parsed = runStateV3Schema.safeParse(run);
    if (!parsed.success) throw new Error('拒绝保存无效 V3 检查点');
    return assertValidV6(
      migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(parsed.data))),
      '拒绝保存',
    );
  }
  const parsed = runStateV2Schema.safeParse(run);
  if (!parsed.success) throw new Error('拒绝保存无效 V2 检查点');
  const validation = validateRunStateV2(parsed.data);
  if (!validation.ok) throw new Error(`拒绝保存：${validation.violations.join('；')}`);
  return assertValidV6(
    migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(migrateRunV2ToV3(parsed.data)))),
    '拒绝保存',
  );
}

export class IndexedDbGameRepository implements GameRepository {
  readonly #databasePromise: Promise<IDBPDatabase<BaixiDatabase>>;

  constructor(databaseName = 'baixiqipai') {
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

  async initialize(): Promise<void> {
    const database = await this.#databasePromise;
    const transaction = database.transaction(['meta', 'settings'], 'readwrite');
    const metaStore = transaction.objectStore('meta');
    const settingsStore = transaction.objectStore('settings');

    if (!(await metaStore.get('state'))) {
      await metaStore.put(
        {
          schemaVersion: RUN_SCHEMA_VERSION_V6,
          contentVersion: CONTENT_VERSION_V6,
          activeProfileId: null,
        },
        'state',
      );
    } else {
      const meta = await metaStore.get('state');
      if (
        meta &&
        (meta.schemaVersion !== RUN_SCHEMA_VERSION_V6 ||
          meta.contentVersion !== CONTENT_VERSION_V6)
      ) {
        await metaStore.put(
          {
            ...meta,
            schemaVersion: RUN_SCHEMA_VERSION_V6,
            contentVersion: CONTENT_VERSION_V6,
          },
          'state',
        );
      }
    }
    if (!(await settingsStore.get('device'))) {
      await settingsStore.put(DEFAULT_SETTINGS, 'device');
    }

    await transaction.done;
  }

  async listProfiles(): Promise<ProfileRecord[]> {
    const database = await this.#databasePromise;
    const profiles = await database.getAll('profiles');
    return profiles.sort((left, right) => left.slot - right.slot);
  }

  async getProfile(profileId: ProfileId): Promise<ProfileRecord | undefined> {
    const database = await this.#databasePromise;
    return database.get('profiles', profileId);
  }

  async saveProfile(profile: ProfileRecord): Promise<void> {
    const parsed = profileRecordSchema.safeParse(profile);
    if (!parsed.success) throw new Error('档案记录无效');
    const database = await this.#databasePromise;
    await database.put('profiles', profile);
  }

  async deleteProfile(profileId: ProfileId): Promise<void> {
    const database = await this.#databasePromise;
    const transaction = database.transaction(
      ['meta', 'profiles', 'runs', 'recovery'],
      'readwrite',
    );
    const metaStore = transaction.objectStore('meta');
    const meta = await metaStore.get('state');

    await transaction.objectStore('profiles').delete(profileId);
    await transaction.objectStore('runs').delete(profileId);
    await transaction.objectStore('recovery').delete(profileId);
    if (meta?.activeProfileId === profileId) {
      await metaStore.put({ ...meta, activeProfileId: null }, 'state');
    }
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
    await metaStore.put({ ...meta, activeProfileId: profileId }, 'state');
    await transaction.done;
  }

  async getActiveProfileId(): Promise<ProfileId | null> {
    const database = await this.#databasePromise;
    return (await database.get('meta', 'state'))?.activeProfileId ?? null;
  }

  async loadRun(profileId: ProfileId): Promise<RunStateV2 | undefined> {
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
      await transaction.objectStore('recovery').put({ profileId, run: raw }, profileId);
      await runs.put(decoded.run, profileId);
    }
    await transaction.done;
    return decoded.run;
  }

  async loadRecoveryRun(profileId: ProfileId): Promise<RunStateV2 | undefined> {
    const database = await this.#databasePromise;
    const raw = (await database.get('recovery', profileId))?.run;
    if (!raw) return undefined;
    return decodeStoredRun(raw).run;
  }

  async commitCheckpoint(profile: ProfileRecord, run: RunStateV2): Promise<void> {
    const parsedProfile = profileRecordSchema.safeParse(profile);
    if (!parsedProfile.success) throw new Error('拒绝保存无效检查点');
    const normalizedRun = normalizeRunForStorage(run);
    if (profile.activeRunId !== normalizedRun.runId) throw new Error('档案与牌局不匹配');

    const database = await this.#databasePromise;
    const transaction = database.transaction(
      ['profiles', 'runs', 'recovery'],
      'readwrite',
    );
    const runs = transaction.objectStore('runs');
    const recovery = transaction.objectStore('recovery');
    const previous = await runs.get(profile.id);

    if (previous) {
      await recovery.put({ profileId: profile.id, run: previous }, profile.id);
    } else {
      await recovery.delete(profile.id);
    }
    await transaction.objectStore('profiles').put(profile);
    await runs.put(normalizedRun, profile.id);
    await transaction.done;
  }

  async replaceProfile(profile: ProfileRecord, run: RunStateV2 | null): Promise<void> {
    const parsedProfile = profileRecordSchema.safeParse(profile);
    if (!parsedProfile.success) {
      throw new Error('拒绝导入无效档案');
    }
    const normalizedRun = run === null ? null : normalizeRunForStorage(run);
    if ((profile.activeRunId === null) !== (run === null)) {
      throw new Error('导入档案与牌局不匹配');
    }
    if (normalizedRun && profile.activeRunId !== normalizedRun.runId) {
      throw new Error('导入档案引用了另一局牌');
    }

    const database = await this.#databasePromise;
    const transaction = database.transaction(
      ['profiles', 'runs', 'recovery'],
      'readwrite',
    );
    const runs = transaction.objectStore('runs');
    const recovery = transaction.objectStore('recovery');
    const previous = await runs.get(profile.id);

    if (previous) {
      await recovery.put({ profileId: profile.id, run: previous }, profile.id);
    } else {
      await recovery.delete(profile.id);
    }
    await transaction.objectStore('profiles').put(profile);
    if (normalizedRun) {
      await runs.put(normalizedRun, profile.id);
    } else {
      await runs.delete(profile.id);
    }
    await transaction.done;
  }

  async clearRun(profile: ProfileRecord): Promise<void> {
    const database = await this.#databasePromise;
    const transaction = database.transaction(
      ['profiles', 'runs', 'recovery'],
      'readwrite',
    );
    const previous = await transaction.objectStore('runs').get(profile.id);
    if (previous) {
      await transaction
        .objectStore('recovery')
        .put({ profileId: profile.id, run: previous }, profile.id);
    }
    await transaction.objectStore('runs').delete(profile.id);
    await transaction.objectStore('profiles').put({ ...profile, activeRunId: null });
    await transaction.done;
  }

  async getSettings(): Promise<DeviceSettings> {
    const database = await this.#databasePromise;
    return (await database.get('settings', 'device')) ?? DEFAULT_SETTINGS;
  }

  async saveSettings(settings: DeviceSettings): Promise<void> {
    const volumes = [settings.masterVolume, settings.musicVolume, settings.sfxVolume];
    if (volumes.some((volume) => !Number.isFinite(volume) || volume < 0 || volume > 1)) {
      throw new RangeError('音量必须在 0 到 1 之间');
    }
    const database = await this.#databasePromise;
    await database.put('settings', settings, 'device');
  }

  close(): void {
    void this.#databasePromise.then((database) => database.close());
  }
}
