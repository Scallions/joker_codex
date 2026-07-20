import 'fake-indexeddb/auto';

import { deleteDB, openDB, type DBSchema } from 'idb';

import { commitRunCommand } from '../../src/app/commitRunCommand';
import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { isRunStateV7 } from '../../src/game-core/model/runV7';
import { DEFAULT_DEVICE_SETTINGS } from '../../src/persistence/deviceSettings';
import {
  IndexedDbGameRepository,
  type PersistenceWriteStage,
} from '../../src/persistence/indexedDbRepository';
import { createReleaseReplayFixture } from '../../src/test-support/releaseReplayV7';

type StoreName = 'meta' | 'settings' | 'profiles' | 'runs' | 'recovery';

interface SnapshotDatabase extends DBSchema {
  meta: { key: string; value: unknown };
  settings: { key: string; value: unknown };
  profiles: {
    key: string;
    value: unknown;
    indexes: { 'by-slot': number };
  };
  runs: { key: string; value: unknown };
  recovery: { key: string; value: unknown };
}

interface StoreSnapshot {
  readonly keys: readonly string[];
  readonly values: readonly unknown[];
}

type DatabaseSnapshot = Readonly<Record<StoreName, StoreSnapshot>>;

async function snapshotDatabase(databaseName: string): Promise<DatabaseSnapshot> {
  const database = await openDB<SnapshotDatabase>(databaseName, 1);
  const readStore = async (storeName: StoreName): Promise<StoreSnapshot> => ({
    keys: await database.getAllKeys(storeName),
    values: await database.getAll(storeName),
  });
  const [meta, settings, profiles, runs, recovery] = await Promise.all([
    readStore('meta'),
    readStore('settings'),
    readStore('profiles'),
    readStore('runs'),
    readStore('recovery'),
  ]);
  database.close();
  return { meta, settings, profiles, runs, recovery };
}

async function nextCheckpoint() {
  const fixture = createReleaseReplayFixture('campaign');
  const committed = await commitRunCommand(
    {
      commitCheckpoint: async () => undefined,
    },
    fixture.profile,
    fixture.run,
    fixture.steps[0]!.buildCommand(fixture.run),
    300,
  );
  if (!committed.ok || !isRunStateV7(committed.state)) {
    throw new Error('无法建立故障矩阵检查点');
  }
  return {
    fixture,
    next: { profile: committed.profile, run: committed.state },
  };
}

type WriteSurface =
  | 'initialize'
  | 'settings'
  | 'active-profile'
  | 'save-profile'
  | 'migration'
  | 'replace-new-profile'
  | 'replace-profile'
  | 'clear-run'
  | 'reset-profile'
  | 'restore-profile'
  | 'delete-profile';

const WRITE_SURFACE_CASES: readonly {
  readonly surface: WriteSurface;
  readonly stages: readonly PersistenceWriteStage[];
}[] = [
  {
    surface: 'initialize',
    stages: ['meta:before-put', 'settings:before-put', 'before-transaction-done'],
  },
  {
    surface: 'settings',
    stages: ['settings:before-put', 'before-transaction-done'],
  },
  {
    surface: 'active-profile',
    stages: ['meta:before-put', 'before-transaction-done'],
  },
  {
    surface: 'save-profile',
    stages: ['profile:before-put', 'before-transaction-done'],
  },
  {
    surface: 'migration',
    stages: [
      'recovery:before-put',
      'profile:before-put',
      'run:before-put',
      'before-transaction-done',
    ],
  },
  {
    surface: 'replace-new-profile',
    stages: [
      'profile-action-recovery:before-delete',
      'profile:before-put',
      'run:before-put',
      'before-transaction-done',
    ],
  },
  {
    surface: 'replace-profile',
    stages: [
      'profile-action-recovery:before-put',
      'profile:before-put',
      'run:before-put',
      'before-transaction-done',
    ],
  },
  {
    surface: 'clear-run',
    stages: [
      'recovery:before-put',
      'run:before-delete',
      'profile:before-put',
      'before-transaction-done',
    ],
  },
  {
    surface: 'reset-profile',
    stages: [
      'profile-action-recovery:before-put',
      'profile:before-put',
      'run:before-delete',
      'before-transaction-done',
    ],
  },
  {
    surface: 'restore-profile',
    stages: [
      'profile-action-recovery:before-put',
      'profile:before-put',
      'run:before-put',
      'before-transaction-done',
    ],
  },
  {
    surface: 'delete-profile',
    stages: [
      'profile:before-delete',
      'run:before-delete',
      'recovery:before-delete',
      'meta:before-put',
      'before-transaction-done',
    ],
  },
];

async function prepareWriteSurface(
  surface: WriteSurface,
  databaseName: string,
): Promise<(repository: IndexedDbGameRepository) => Promise<unknown>> {
  if (surface === 'initialize') {
    const database = await openDB<SnapshotDatabase>(databaseName, 1, {
      upgrade(current) {
        current.createObjectStore('meta');
        current.createObjectStore('settings');
        const profiles = current.createObjectStore('profiles', { keyPath: 'id' });
        profiles.createIndex('by-slot', 'slot', { unique: true });
        current.createObjectStore('runs');
        current.createObjectStore('recovery');
      },
    });
    database.close();
    return (repository) => repository.initialize();
  }

  const baseline = new IndexedDbGameRepository(databaseName);
  await baseline.initialize();
  if (surface === 'settings') {
    baseline.close();
    return (repository) =>
      repository.saveSettings({ ...DEFAULT_DEVICE_SETTINGS, musicVolume: 0.25 });
  }

  if (surface === 'active-profile' || surface === 'save-profile') {
    const profile = createReleaseReplayFixture('campaign').profile;
    const detached = {
      ...profile,
      activeRunId: null,
      activeProjectionCursor: null,
      nextRunSequence: 1,
      currentRunProgress: {
        ...profile.currentRunProgress,
        runId: null,
        resultDelta: null,
      },
    };
    await baseline.saveProfile(detached);
    baseline.close();
    if (surface === 'active-profile') {
      return (repository) => repository.setActiveProfile(detached.id);
    }
    return (repository) =>
      repository.saveProfile({
        ...detached,
        displayName: '故障后改名',
        updatedAtEpochMs: detached.updatedAtEpochMs + 1,
      });
  }

  if (surface === 'migration') {
    const legacyRun = createFixtureRun('fault-migration');
    const legacyProfile = {
      id: 'profile:1',
      slot: 1,
      displayName: '迁移故障档',
      createdAtEpochMs: 100,
      updatedAtEpochMs: 200,
      activeRunId: legacyRun.runId,
    };
    const rawDatabase = await openDB<SnapshotDatabase>(databaseName, 1);
    await rawDatabase.put('profiles', legacyProfile);
    await rawDatabase.put('runs', legacyRun, legacyProfile.id);
    rawDatabase.close();
    baseline.close();
    return (repository) => repository.listProfiles();
  }

  if (surface === 'replace-new-profile') {
    const replacement = createReleaseReplayFixture('seeded');
    baseline.close();
    return (repository) =>
      repository.replaceProfile(replacement.profile, replacement.run);
  }

  const first = createReleaseReplayFixture('campaign');
  await baseline.commitCheckpoint(first.profile, first.run);
  if (surface === 'replace-profile') {
    const replacement = createReleaseReplayFixture('seeded');
    baseline.close();
    return (repository) =>
      repository.replaceProfile(replacement.profile, replacement.run);
  }
  if (surface === 'clear-run') {
    baseline.close();
    return (repository) => repository.clearRun(first.profile);
  }
  if (surface === 'reset-profile') {
    baseline.close();
    return (repository) => repository.resetProfile(first.profile.id, 500);
  }
  if (surface === 'restore-profile') {
    const replacement = createReleaseReplayFixture('seeded');
    await baseline.replaceProfile(replacement.profile, replacement.run);
    baseline.close();
    return (repository) => repository.restoreProfileAction(first.profile.id);
  }

  const { next } = await nextCheckpoint();
  await baseline.commitCheckpoint(next.profile, next.run);
  await baseline.setActiveProfile(first.profile.id);
  baseline.close();
  return (repository) => repository.deleteProfile(first.profile.id);
}

describe('IndexedDB 事务故障矩阵', () => {
  it.each([
    'recovery:before-put',
    'profile:before-put',
    'run:before-put',
    'before-transaction-done',
  ] as const satisfies readonly PersistenceWriteStage[])(
    '检查点在 %s 故障时完整回滚，解除故障后只提交一次',
    async (faultStage) => {
      const databaseName = `baixiqipai-fault-checkpoint-${faultStage}`;
      await deleteDB(databaseName);
      const { fixture, next } = await nextCheckpoint();
      const baseline = new IndexedDbGameRepository(databaseName);
      await baseline.initialize();
      await baseline.commitCheckpoint(fixture.profile, fixture.run);
      baseline.close();
      const before = await snapshotDatabase(databaseName);

      let armed = true;
      const repository = new IndexedDbGameRepository(databaseName, {
        faultHook: (stage) => {
          if (!armed || stage !== faultStage) return false;
          armed = false;
          return true;
        },
      });
      await expect(repository.commitCheckpoint(next.profile, next.run)).rejects.toThrow(
        `测试故障：${faultStage}`,
      );
      expect(await snapshotDatabase(databaseName)).toEqual(before);

      await repository.commitCheckpoint(next.profile, next.run);
      expect(await repository.getProfile(next.profile.id)).toEqual(next.profile);
      expect(await repository.loadRun(next.profile.id)).toEqual(next.run);
      repository.close();
      await deleteDB(databaseName);
    },
  );

  for (const { surface, stages } of WRITE_SURFACE_CASES) {
    it.each(stages)(`${surface} 在 %s 故障时回滚并可干净重试`, async (faultStage) => {
      const databaseName = `baixiqipai-fault-${surface}-${faultStage}`;
      await deleteDB(databaseName);
      const action = await prepareWriteSurface(surface, databaseName);
      const before = await snapshotDatabase(databaseName);
      let armed = true;
      const repository = new IndexedDbGameRepository(databaseName, {
        faultHook: (stage) => {
          if (!armed || stage !== faultStage) return false;
          armed = false;
          return true;
        },
      });

      await expect(action(repository)).rejects.toThrow(`测试故障：${faultStage}`);
      expect(await snapshotDatabase(databaseName)).toEqual(before);
      await action(repository);
      expect(await snapshotDatabase(databaseName)).not.toEqual(before);

      repository.close();
      await deleteDB(databaseName);
    });
  }
});
