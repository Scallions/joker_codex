import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

import { validateRunStateV2 } from '../game-core/invariants/validateRunStateV2';
import type { ProfileId } from '../game-core/model/ids';
import type { RunState as RunStateV1 } from '../game-core/model/run';
import {
  CONTENT_VERSION_V2,
  RUN_SCHEMA_VERSION_V2,
  type RunStateV2,
} from '../game-core/model/runV2';
import { migrateRunV1ToV2 } from './migrations/migrateRunV1ToV2';
import type { ProfileRecord } from './profiles';
import type { GameRepository } from './repository';
import { profileRecordSchema, runStateSchema } from './schemas';
import { runStateV2Schema } from './schemasV2';

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
          schemaVersion: RUN_SCHEMA_VERSION_V2,
          contentVersion: CONTENT_VERSION_V2,
          activeProfileId: null,
        },
        'state',
      );
    } else {
      const meta = await metaStore.get('state');
      if (
        meta &&
        (meta.schemaVersion !== RUN_SCHEMA_VERSION_V2 ||
          meta.contentVersion !== CONTENT_VERSION_V2)
      ) {
        await metaStore.put(
          {
            ...meta,
            schemaVersion: RUN_SCHEMA_VERSION_V2,
            contentVersion: CONTENT_VERSION_V2,
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
    const current = runStateV2Schema.safeParse(raw);
    if (current.success) {
      const run = current.data;
      const validation = validateRunStateV2(run);
      if (!validation.ok) {
        transaction.abort();
        throw new Error(`牌局状态无效：${validation.violations.join('；')}`);
      }
      await transaction.done;
      return run;
    }
    const legacy = runStateSchema.safeParse(raw);
    if (!legacy.success) {
      transaction.abort();
      throw new Error('本地牌局格式无效');
    }
    const legacyRun = legacy.data;
    const migrated = migrateRunV1ToV2(legacyRun);
    const validation = validateRunStateV2(migrated);
    if (!validation.ok) {
      transaction.abort();
      throw new Error(`迁移牌局无效：${validation.violations.join('；')}`);
    }
    await transaction
      .objectStore('recovery')
      .put({ profileId, run: legacyRun }, profileId);
    await runs.put(migrated, profileId);
    await transaction.done;
    return migrated;
  }

  async loadRecoveryRun(profileId: ProfileId): Promise<RunStateV2 | undefined> {
    const database = await this.#databasePromise;
    const raw = (await database.get('recovery', profileId))?.run;
    if (!raw) return undefined;
    const current = runStateV2Schema.safeParse(raw);
    if (current.success) return current.data;
    const legacy = runStateSchema.safeParse(raw);
    return legacy.success ? migrateRunV1ToV2(legacy.data) : undefined;
  }

  async commitCheckpoint(profile: ProfileRecord, run: RunStateV2): Promise<void> {
    const parsedProfile = profileRecordSchema.safeParse(profile);
    const parsedRun = runStateV2Schema.safeParse(run);
    if (!parsedProfile.success || !parsedRun.success)
      throw new Error('拒绝保存无效检查点');
    if (profile.activeRunId !== run.runId) throw new Error('档案与牌局不匹配');
    const validation = validateRunStateV2(run);
    if (!validation.ok) throw new Error(`拒绝保存：${validation.violations.join('；')}`);

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
    await runs.put(run, profile.id);
    await transaction.done;
  }

  async replaceProfile(profile: ProfileRecord, run: RunStateV2 | null): Promise<void> {
    const parsedProfile = profileRecordSchema.safeParse(profile);
    const parsedRun = run === null ? null : runStateV2Schema.safeParse(run);
    if (!parsedProfile.success || (parsedRun && !parsedRun.success)) {
      throw new Error('拒绝导入无效档案');
    }
    if ((profile.activeRunId === null) !== (run === null)) {
      throw new Error('导入档案与牌局不匹配');
    }
    if (run && profile.activeRunId !== run.runId) {
      throw new Error('导入档案引用了另一局牌');
    }
    if (run) {
      const validation = validateRunStateV2(run);
      if (!validation.ok)
        throw new Error(`拒绝导入：${validation.violations.join('；')}`);
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
    if (run) {
      await runs.put(run, profile.id);
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
