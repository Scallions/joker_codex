import 'fake-indexeddb/auto';

import { deleteDB, openDB } from 'idb';

import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { IndexedDbGameRepository } from '../../src/persistence/indexedDbRepository';
import { createProfile } from '../../src/persistence/profiles';

describe('IndexedDB 档案仓库', () => {
  it('原子提交当前检查点并为每个档案保留独立恢复点', async () => {
    const databaseName = 'baixiqipai-test-checkpoints';
    await deleteDB(databaseName);
    const repository = new IndexedDbGameRepository(databaseName);
    await repository.initialize();

    const firstRun = createRunEconomyFixtureRun({ seed: 'profile-one' });
    const firstProfile = {
      ...createProfile(1, '甲档', 100),
      activeRunId: firstRun.runId,
    };
    const secondProfile = createProfile(2, '乙档', 200);
    await repository.saveProfile(firstProfile);
    await repository.saveProfile(secondProfile);
    await repository.commitCheckpoint(firstProfile, firstRun);

    const command = executeCommandV2(firstRun, {
      type: 'select-blind',
      checkpointId: 0,
      position: 'small',
    });
    if (!command.ok) throw new Error(command.rejection.message);
    await repository.commitCheckpoint(firstProfile, command.state);

    expect(await repository.loadRun(firstProfile.id)).toEqual(command.state);
    expect(await repository.loadRecoveryRun(firstProfile.id)).toEqual(firstRun);
    expect(await repository.loadRun(secondProfile.id)).toBeUndefined();
    expect(
      (await repository.listProfiles()).map((profile) => profile.displayName),
    ).toEqual(['甲档', '乙档']);

    repository.close();
    await deleteDB(databaseName);
  });

  it('导入覆盖在同一事务中保存旧牌局为恢复点', async () => {
    const databaseName = 'baixiqipai-test-import';
    await deleteDB(databaseName);
    const repository = new IndexedDbGameRepository(databaseName);
    await repository.initialize();
    const oldRun = createRunEconomyFixtureRun({ seed: 'before-import' });
    const oldProfile = {
      ...createProfile(1, '原档', 100),
      activeRunId: oldRun.runId,
    };
    await repository.commitCheckpoint(oldProfile, oldRun);

    const importedRun = createRunEconomyFixtureRun({ seed: 'after-import' });
    const importedProfile = {
      ...createProfile(1, '新档', 200),
      activeRunId: importedRun.runId,
    };
    await repository.replaceProfile(importedProfile, importedRun);

    expect(await repository.getProfile(importedProfile.id)).toEqual(importedProfile);
    expect(await repository.loadRun(importedProfile.id)).toEqual(importedRun);
    expect(await repository.loadRecoveryRun(importedProfile.id)).toEqual(oldRun);

    repository.close();
    await deleteDB(databaseName);
  });

  it('首次读取 V1 牌局时原子保留恢复点并写回 V2', async () => {
    const databaseName = 'baixiqipai-test-v1-migration';
    await deleteDB(databaseName);
    const repository = new IndexedDbGameRepository(databaseName);
    await repository.initialize();
    const legacy = createFixtureRun('repository-migration');
    const profile = {
      ...createProfile(1, '旧档', 100),
      activeRunId: legacy.runId,
    };
    await repository.saveProfile(profile);
    const rawDatabase = await openDB(databaseName, 1);
    await rawDatabase.put('runs', legacy, profile.id);
    rawDatabase.close();

    const migrated = await repository.loadRun(profile.id);
    expect(migrated).toMatchObject({
      schemaVersion: 2,
      mode: 'migrated-foundation',
      runId: legacy.runId,
      checkpointId: legacy.checkpointId,
    });
    expect(await repository.loadRecoveryRun(profile.id)).toMatchObject({
      schemaVersion: 2,
      mode: 'migrated-foundation',
      runId: legacy.runId,
    });

    const storedDatabase = await openDB(databaseName, 1);
    const stored = (await storedDatabase.get('runs', profile.id)) as unknown;
    expect(stored).toMatchObject({ schemaVersion: 2 });
    storedDatabase.close();
    repository.close();
    await deleteDB(databaseName);
  });
});
