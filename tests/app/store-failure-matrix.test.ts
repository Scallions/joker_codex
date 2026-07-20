import 'fake-indexeddb/auto';

import { deleteDB, openDB, type DBSchema } from 'idb';

import { createGameStore } from '../../src/app/store';
import {
  abandonActiveRun,
  importLocalProfile,
  initializeApplication,
  resetActiveProfile,
  restoreActiveProfile,
  saveDeviceSettings,
  submitRunCommand,
} from '../../src/app/store/appSlice';
import { DEFAULT_DEVICE_SETTINGS } from '../../src/persistence/deviceSettings';
import {
  IndexedDbGameRepository,
  type PersistenceWriteStage,
} from '../../src/persistence/indexedDbRepository';
import { exportProfileToJson } from '../../src/persistence/profileTransfer';
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

function oneShotFaultRepository(databaseName: string, faultStage: PersistenceWriteStage) {
  let armed = true;
  return new IndexedDbGameRepository(databaseName, {
    faultHook: (stage) => {
      if (!armed || stage !== faultStage) return false;
      armed = false;
      return true;
    },
  });
}

function visibleCommittedState(
  state: ReturnType<ReturnType<typeof createGameStore>['getState']>,
) {
  return {
    profiles: state.app.profiles,
    activeProfileId: state.app.activeProfileId,
    run: state.app.run,
    status: state.app.status,
    presentationSequence: state.app.presentationSequence,
    settings: state.app.settings,
  };
}

async function prepareActivePair(databaseName: string, kind: 'campaign' | 'seeded') {
  const fixture = createReleaseReplayFixture(kind);
  const baseline = new IndexedDbGameRepository(databaseName);
  await baseline.initialize();
  await baseline.commitCheckpoint(fixture.profile, fixture.run);
  await baseline.setActiveProfile(fixture.profile.id);
  baseline.close();
  return fixture;
}

describe('应用写入故障矩阵', () => {
  it('检查点失败保留 Redux 前像、无演出泄漏，并显示中文错误后可重试', async () => {
    const databaseName = 'baixiqipai-app-fault-checkpoint';
    await deleteDB(databaseName);
    const fixture = await prepareActivePair(databaseName, 'campaign');
    const durableBefore = await snapshotDatabase(databaseName);
    const repository = oneShotFaultRepository(databaseName, 'run:before-put');
    const store = createGameStore(repository, () => 300);
    await store.dispatch(initializeApplication()).unwrap();
    const before = visibleCommittedState(store.getState());
    const command = fixture.steps[0]!.buildCommand(fixture.run);

    const rejected = await store.dispatch(submitRunCommand(command));
    expect(submitRunCommand.rejected.match(rejected)).toBe(true);
    expect(visibleCommittedState(store.getState())).toEqual(before);
    expect(store.getState().app.error).toContain(
      '自动保存失败：测试故障：run:before-put',
    );
    expect(await snapshotDatabase(databaseName)).toEqual(durableBefore);

    await store.dispatch(submitRunCommand(command)).unwrap();
    expect(store.getState().app.run?.checkpointId).toBe(fixture.run.checkpointId + 1);
    expect(store.getState().app.presentationSequence).not.toBeNull();
    repository.close();
    await deleteDB(databaseName);
  });

  it('声场设置写入失败时回滚乐观值并保留设备设置前像', async () => {
    const databaseName = 'baixiqipai-app-fault-settings';
    await deleteDB(databaseName);
    const baseline = new IndexedDbGameRepository(databaseName);
    await baseline.initialize();
    baseline.close();
    const durableBefore = await snapshotDatabase(databaseName);
    const repository = oneShotFaultRepository(databaseName, 'settings:before-put');
    const store = createGameStore(repository);
    await store.dispatch(initializeApplication()).unwrap();
    const changed = { ...DEFAULT_DEVICE_SETTINGS, musicVolume: 0.25 };

    const rejected = await store.dispatch(saveDeviceSettings(changed));
    expect(saveDeviceSettings.rejected.match(rejected)).toBe(true);
    expect(store.getState().app.settings).toEqual(DEFAULT_DEVICE_SETTINGS);
    expect(store.getState().app.settingsError).toContain(
      '声场设置保存失败：测试故障：settings:before-put',
    );
    expect(await snapshotDatabase(databaseName)).toEqual(durableBefore);

    await store.dispatch(saveDeviceSettings(changed)).unwrap();
    expect(store.getState().app.settings).toEqual(changed);
    repository.close();
    await deleteDB(databaseName);
  });

  it('导入覆盖失败时不切换档案或牌局，干净重试后再一次性切换', async () => {
    const databaseName = 'baixiqipai-app-fault-import';
    await deleteDB(databaseName);
    await prepareActivePair(databaseName, 'campaign');
    const replacement = createReleaseReplayFixture('seeded');
    const json = exportProfileToJson(replacement.profile, replacement.run);
    const durableBefore = await snapshotDatabase(databaseName);
    const repository = oneShotFaultRepository(
      databaseName,
      'profile-action-recovery:before-put',
    );
    const store = createGameStore(repository);
    await store.dispatch(initializeApplication()).unwrap();
    const before = visibleCommittedState(store.getState());

    const rejected = await store.dispatch(importLocalProfile(json));
    expect(importLocalProfile.rejected.match(rejected)).toBe(true);
    expect(visibleCommittedState(store.getState())).toEqual(before);
    expect(store.getState().app.error).toContain('导入失败：测试故障');
    expect(await snapshotDatabase(databaseName)).toEqual(durableBefore);

    await store.dispatch(importLocalProfile(json)).unwrap();
    expect(store.getState().app.run?.seed).toBe(replacement.run.seed);
    repository.close();
    await deleteDB(databaseName);
  });

  it('弃局和重置失败时继续显示原牌局，成功重试后才清除', async () => {
    for (const operation of ['abandon', 'reset'] as const) {
      const databaseName = `baixiqipai-app-fault-${operation}`;
      await deleteDB(databaseName);
      const fixture = await prepareActivePair(databaseName, 'campaign');
      const durableBefore = await snapshotDatabase(databaseName);
      const repository = oneShotFaultRepository(
        databaseName,
        operation === 'abandon'
          ? 'run:before-delete'
          : 'profile-action-recovery:before-put',
      );
      const store = createGameStore(repository, () => 500);
      await store.dispatch(initializeApplication()).unwrap();
      const before = visibleCommittedState(store.getState());
      const rejected =
        operation === 'abandon'
          ? await store.dispatch(abandonActiveRun({ nowEpochMs: 500 }))
          : await store.dispatch(resetActiveProfile({ nowEpochMs: 500 }));

      expect(rejected.meta.requestStatus).toBe('rejected');
      expect(visibleCommittedState(store.getState())).toEqual(before);
      expect(store.getState().app.run?.runId).toBe(fixture.run.runId);
      expect(store.getState().app.error).toContain('测试故障');
      expect(await snapshotDatabase(databaseName)).toEqual(durableBefore);

      if (operation === 'abandon') {
        await store.dispatch(abandonActiveRun({ nowEpochMs: 500 })).unwrap();
      } else {
        await store.dispatch(resetActiveProfile({ nowEpochMs: 500 })).unwrap();
      }
      expect(store.getState().app.run).toBeNull();
      repository.close();
      await deleteDB(databaseName);
    }
  });

  it('恢复失败时继续使用当前导入档，成功重试后才交换恢复对', async () => {
    const databaseName = 'baixiqipai-app-fault-restore';
    await deleteDB(databaseName);
    const original = await prepareActivePair(databaseName, 'campaign');
    const replacement = createReleaseReplayFixture('seeded');
    const preparation = new IndexedDbGameRepository(databaseName);
    await preparation.replaceProfile(replacement.profile, replacement.run);
    preparation.close();
    const durableBefore = await snapshotDatabase(databaseName);
    const repository = oneShotFaultRepository(
      databaseName,
      'profile-action-recovery:before-put',
    );
    const store = createGameStore(repository);
    await store.dispatch(initializeApplication()).unwrap();
    const before = visibleCommittedState(store.getState());

    const rejected = await store.dispatch(restoreActiveProfile());
    expect(restoreActiveProfile.rejected.match(rejected)).toBe(true);
    expect(visibleCommittedState(store.getState())).toEqual(before);
    expect(store.getState().app.error).toContain('恢复失败：测试故障');
    expect(await snapshotDatabase(databaseName)).toEqual(durableBefore);

    await store.dispatch(restoreActiveProfile()).unwrap();
    expect(store.getState().app.run?.runId).toBe(original.run.runId);
    repository.close();
    await deleteDB(databaseName);
  });
});
