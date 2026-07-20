import 'fake-indexeddb/auto';

import { deleteDB, openDB } from 'idb';

import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV3 } from '../../src/content/runtime/runSetupV3';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { stableId, type RunId } from '../../src/game-core/model/ids';
import { isRunStateV7 } from '../../src/game-core/model/runV7';
import { IndexedDbGameRepository } from '../../src/persistence/indexedDbRepository';
import { migrateRunV2ToV3 } from '../../src/persistence/migrations/migrateRunV2ToV3';
import { migrateRunV3ToV4 } from '../../src/persistence/migrations/migrateRunV3ToV4';
import { migrateRunV4ToV5 } from '../../src/persistence/migrations/migrateRunV4ToV5';
import { migrateRunV5ToV6 } from '../../src/persistence/migrations/migrateRunV5ToV6';
import { migrateRunV6ToV7 } from '../../src/persistence/migrations/migrateRunV6ToV7';
import { createProfile } from '../../src/persistence/profiles';
import { projectRunAbandon } from '../../src/progression/reducer';

function attachRun(
  profile: ReturnType<typeof createProfile>,
  run: { readonly runId: RunId },
) {
  return {
    ...profile,
    activeRunId: run.runId,
    currentRunProgress: {
      ...profile.currentRunProgress,
      runId: run.runId,
    },
  };
}

describe('IndexedDB 档案仓库', () => {
  it('初始化时把旧档案与旧牌局成对迁移，并保留原始迁移前像', async () => {
    const databaseName = 'baixiqipai-test-profile-v0-migration';
    await deleteDB(databaseName);
    const repository = new IndexedDbGameRepository(databaseName);
    await repository.initialize();
    const legacyRun = createFixtureRun('profile-v0-migration');
    const legacyProfile = {
      id: 'profile:1',
      slot: 1,
      displayName: '旧箱主',
      createdAtEpochMs: 100,
      updatedAtEpochMs: 200,
      activeRunId: legacyRun.runId,
    };
    const rawDatabase = await openDB(databaseName, 1);
    await rawDatabase.put('profiles', legacyProfile);
    await rawDatabase.put('runs', legacyRun, legacyProfile.id);
    rawDatabase.close();

    const [migratedProfile] = await repository.listProfiles();
    const migratedRun = await repository.loadRun(stableId<'profile'>('profile:1'));
    expect(migratedProfile).toMatchObject({
      schemaVersion: 1,
      displayName: '旧箱主',
      activeRunId: legacyRun.runId,
      currentRunProgress: { runId: legacyRun.runId },
      statistics: { campaignWins: 0 },
    });
    expect(migratedRun).toMatchObject({ schemaVersion: 7, runId: legacyRun.runId });

    const migratedDatabase = await openDB(databaseName, 1);
    expect(await migratedDatabase.get('recovery', 'migration:profile:1')).toEqual({
      kind: 'migration',
      profileId: 'profile:1',
      profile: legacyProfile,
      run: legacyRun,
    });
    migratedDatabase.close();
    repository.close();
    await deleteDB(databaseName);
  });

  it('原子提交当前检查点并为每个档案保留独立恢复点', async () => {
    const databaseName = 'baixiqipai-test-checkpoints';
    await deleteDB(databaseName);
    const repository = new IndexedDbGameRepository(databaseName);
    await repository.initialize();

    const firstRun = createRunEconomyFixtureRun({ seed: 'profile-one' });
    const firstProfile = attachRun(createProfile(1, '甲档', 100), firstRun);
    const secondProfile = createProfile(2, '乙档', 200);
    await repository.saveProfile(secondProfile);
    await repository.commitCheckpoint(firstProfile, firstRun);

    const command = executeCommandV2(firstRun, {
      type: 'select-blind',
      checkpointId: 0,
      position: 'small',
    });
    if (!command.ok) throw new Error(command.rejection.message);
    await repository.commitCheckpoint(firstProfile, command.state);

    expect(isRunStateV7((await repository.loadRun(firstProfile.id))!)).toBe(true);
    expect(await repository.loadRun(firstProfile.id)).toEqual(
      migrateRunV6ToV7(
        migrateRunV5ToV6(
          migrateRunV4ToV5(migrateRunV3ToV4(migrateRunV2ToV3(command.state))),
        ),
      ),
    );
    expect(await repository.loadRecoveryRun(firstProfile.id)).toEqual(
      migrateRunV6ToV7(
        migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(migrateRunV2ToV3(firstRun)))),
      ),
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
    const oldProfile = attachRun(createProfile(1, '原档', 100), oldRun);
    await repository.commitCheckpoint(oldProfile, oldRun);

    const importedRun = createRunEconomyFixtureRun({ seed: 'after-import' });
    const importedProfile = attachRun(createProfile(1, '新档', 200), importedRun);
    await repository.replaceProfile(importedProfile, importedRun);

    expect(await repository.getProfile(importedProfile.id)).toEqual(importedProfile);
    expect(await repository.loadRun(importedProfile.id)).toEqual(
      migrateRunV6ToV7(
        migrateRunV5ToV6(
          migrateRunV4ToV5(migrateRunV3ToV4(migrateRunV2ToV3(importedRun))),
        ),
      ),
    );
    expect(await repository.loadRecoveryRun(importedProfile.id)).toEqual(
      migrateRunV6ToV7(
        migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(migrateRunV2ToV3(oldRun)))),
      ),
    );

    const rawDatabase = await openDB(databaseName, 1);
    expect(await rawDatabase.getAllKeys('recovery')).toContain(
      'profile-action:profile:1',
    );
    rawDatabase.close();

    const recovery = await repository.loadProfileActionRecovery(importedProfile.id);
    expect(recovery?.profile.displayName).toBe('原档');
    expect(recovery?.run?.seed).toBe('before-import');
    await repository.restoreProfileAction(importedProfile.id);
    expect((await repository.getProfile(importedProfile.id))?.displayName).toBe('原档');
    expect((await repository.loadRun(importedProfile.id))?.seed).toBe('before-import');

    repository.close();
    await deleteDB(databaseName);
  });

  it('重置会保存完整恢复对并保留档位身份与名称', async () => {
    const databaseName = 'baixiqipai-test-reset';
    await deleteDB(databaseName);
    const repository = new IndexedDbGameRepository(databaseName);
    await repository.initialize();
    const run = createRunEconomyFixtureRun({ seed: 'before-reset' });
    const profile = attachRun(createProfile(3, '留名人', 100), run);
    await repository.commitCheckpoint(profile, run);

    const reset = await repository.resetProfile(profile.id, 500);
    expect(reset).toMatchObject({
      id: profile.id,
      slot: 3,
      displayName: '留名人',
      createdAtEpochMs: 100,
      updatedAtEpochMs: 500,
      activeRunId: null,
      statistics: { campaignWins: 0 },
    });
    expect(await repository.loadRun(profile.id)).toBeUndefined();
    expect((await repository.loadProfileActionRecovery(profile.id))?.run?.seed).toBe(
      'before-reset',
    );

    repository.close();
    await deleteDB(databaseName);
  });

  it('单独保存档案时拒绝拆散已有的档案与牌局对', async () => {
    const databaseName = 'baixiqipai-test-save-profile-pair';
    await deleteDB(databaseName);
    const repository = new IndexedDbGameRepository(databaseName);
    await repository.initialize();
    const run = createRunEconomyFixtureRun({ seed: 'paired-save' });
    const profile = attachRun(createProfile(1, '守档人', 100), run);
    await repository.commitCheckpoint(profile, run);

    await expect(repository.saveProfile(projectRunAbandon(profile, 200))).rejects.toThrow(
      '档案与进行中的牌局不匹配',
    );
    expect((await repository.getProfile(profile.id))?.activeRunId).toBe(run.runId);
    expect((await repository.loadRun(profile.id))?.runId).toBe(run.runId);

    repository.close();
    await deleteDB(databaseName);
  });

  it('首次读取 V1 牌局时原子保留恢复点并写回 V7', async () => {
    const databaseName = 'baixiqipai-test-v1-migration';
    await deleteDB(databaseName);
    const repository = new IndexedDbGameRepository(databaseName);
    await repository.initialize();
    const legacy = createFixtureRun('repository-migration');
    const profile = attachRun(createProfile(1, '旧档', 100), legacy);
    const rawDatabase = await openDB(databaseName, 1);
    await rawDatabase.put('profiles', profile);
    await rawDatabase.put('runs', legacy, profile.id);
    rawDatabase.close();

    const migrated = await repository.loadRun(profile.id);
    expect(migrated).toMatchObject({
      schemaVersion: 7,
      mode: 'migrated-run-economy',
      runId: legacy.runId,
      checkpointId: legacy.checkpointId,
    });
    expect(await repository.loadRecoveryRun(profile.id)).toMatchObject({
      schemaVersion: 7,
      mode: 'migrated-run-economy',
      runId: legacy.runId,
      migrationV3: { sourceSchemaVersion: 1 },
    });

    const storedDatabase = await openDB(databaseName, 1);
    const stored = (await storedDatabase.get('runs', profile.id)) as unknown;
    expect(stored).toMatchObject({
      schemaVersion: 7,
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
    const profile = attachRun(createProfile(1, '生产档', 300), initial);
    await repository.commitCheckpoint(profile, initial);
    const selected = executeCommandV2(initial, {
      type: 'select-blind',
      checkpointId: initial.checkpointId,
      position: 'small',
    });
    if (!selected.ok) throw new Error(selected.rejection.message);
    await repository.commitCheckpoint(profile, selected.state);

    expect(await repository.loadRun(profile.id)).toEqual(
      migrateRunV6ToV7(
        migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(selected.state))),
      ),
    );
    expect(await repository.loadRecoveryRun(profile.id)).toEqual(
      migrateRunV6ToV7(migrateRunV5ToV6(migrateRunV4ToV5(migrateRunV3ToV4(initial)))),
    );
    expect(
      ((await repository.loadRun(profile.id)) as typeof initial).productionContentV3.rows,
    ).toHaveLength(230);

    repository.close();
    await deleteDB(databaseName);
  });
});
