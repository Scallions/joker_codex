import 'fake-indexeddb/auto';

import { deleteDB, openDB } from 'idb';

import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV3 } from '../../src/content/runtime/runSetupV3';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { isRunStateV6 } from '../../src/game-core/model/runV6';
import { IndexedDbGameRepository } from '../../src/persistence/indexedDbRepository';
import { migrateRunV2ToV3 } from '../../src/persistence/migrations/migrateRunV2ToV3';
import { migrateRunV3ToV4 } from '../../src/persistence/migrations/migrateRunV3ToV4';
import { migrateRunV4ToV5 } from '../../src/persistence/migrations/migrateRunV4ToV5';
import { migrateRunV5ToV6 } from '../../src/persistence/migrations/migrateRunV5ToV6';
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

    expect(isRunStateV6((await repository.loadRun(firstProfile.id))!)).toBe(true);
    expect(await repository.loadRun(firstProfile.id)).toEqual(
      migrateRunV5ToV6(
        migrateRunV4ToV5(migrateRunV3ToV4(migrateRunV2ToV3(command.state))),
      ),
    );
    expect(await repository.loadRecoveryRun(firstProfile.id)).toEqual(
      migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(migrateRunV2ToV3(firstRun)))),
    );
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
    expect(await repository.loadRun(importedProfile.id)).toEqual(
      migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(migrateRunV2ToV3(importedRun)))),
    );
    expect(await repository.loadRecoveryRun(importedProfile.id)).toEqual(
      migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(migrateRunV2ToV3(oldRun)))),
    );

    repository.close();
    await deleteDB(databaseName);
  });

  it('首次读取 V1 牌局时原子保留恢复点并写回 V3', async () => {
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
      schemaVersion: 6,
      mode: 'migrated-run-economy',
      runId: legacy.runId,
      checkpointId: legacy.checkpointId,
    });
    expect(await repository.loadRecoveryRun(profile.id)).toMatchObject({
      schemaVersion: 6,
      mode: 'migrated-run-economy',
      runId: legacy.runId,
      migrationV3: { sourceSchemaVersion: 1 },
    });

    const storedDatabase = await openDB(databaseName, 1);
    const stored = (await storedDatabase.get('runs', profile.id)) as unknown;
    expect(stored).toMatchObject({
      schemaVersion: 6,
      migrationV3: { sourceSchemaVersion: 1 },
    });
    storedDatabase.close();
    repository.close();
    await deleteDB(databaseName);
  });

  it('生产 V3 检查点与上一恢复点都按完整 230 项快照精确往返', async () => {
    const databaseName = 'baixiqipai-test-production-v3';
    await deleteDB(databaseName);
    const repository = new IndexedDbGameRepository(databaseName);
    await repository.initialize();
    const initial = createProductionRunV3(PRODUCTION_CATALOG, {
      seed: 'repository-production-v3',
      deckId: 'bxqp:deck:shifting-cast',
    });
    const profile = {
      ...createProfile(1, '生产档', 300),
      activeRunId: initial.runId,
    };
    await repository.commitCheckpoint(profile, initial);
    const selected = executeCommandV2(initial, {
      type: 'select-blind',
      checkpointId: initial.checkpointId,
      position: 'small',
    });
    if (!selected.ok) throw new Error(selected.rejection.message);
    await repository.commitCheckpoint(profile, selected.state);

    expect(await repository.loadRun(profile.id)).toEqual(
      migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(selected.state))),
    );
    expect(await repository.loadRecoveryRun(profile.id)).toEqual(
      migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(initial))),
    );
    expect(
      ((await repository.loadRun(profile.id)) as typeof initial).productionContentV3.rows,
    ).toHaveLength(230);

    repository.close();
    await deleteDB(databaseName);
  });
});
