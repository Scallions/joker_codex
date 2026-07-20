import 'fake-indexeddb/auto';

import { deleteDB } from 'idb';

import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV7 } from '../../src/content/runtime/runSetupV7';
import { commitRunCommand } from '../../src/app/commitRunCommand';
import { materializeBlind } from '../../src/game-core/rules/ante';
import { IndexedDbGameRepository } from '../../src/persistence/indexedDbRepository';
import { createProfile } from '../../src/persistence/profiles';
import { projectRunStart } from '../../src/progression/reducer';

describe('V7 牌局持久化', () => {
  it('按 V7 原样提交并读取档案归属与模式快照', async () => {
    const databaseName = 'baixiqipai-test-run-v7';
    await deleteDB(databaseName);
    const repository = new IndexedDbGameRepository(databaseName);
    await repository.initialize();
    const baseProfile = createProfile(1, '守种人', 100);
    const run = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: baseProfile.id,
      runSequence: baseProfile.nextRunSequence,
      runClass: 'seeded',
      seed: 'V7STORE1',
      eligibilityObjectiveIds: baseProfile.objectives
        .filter(({ completedAtEpochMs }) => completedAtEpochMs !== null)
        .map(({ objectiveId }) => objectiveId),
      discoveredContentIds: [],
    });
    const profile = {
      ...baseProfile,
      activeRunId: run.runId,
      nextRunSequence: 2,
      activeProjectionCursor: { runId: run.runId, checkpointId: 0 },
      currentRunProgress: {
        ...baseProfile.currentRunProgress,
        runId: run.runId,
      },
    };

    await repository.commitCheckpoint(profile, run);
    expect(await repository.loadRun(profile.id)).toEqual(run);
    expect(await repository.getProfile(profile.id)).toEqual(profile);

    repository.close();
    await deleteDB(databaseName);
  });

  it('刷新后恢复尚未确认离开的完整终局结算', async () => {
    const databaseName = 'baixiqipai-test-durable-result';
    await deleteDB(databaseName);
    const repository = new IndexedDbGameRepository(databaseName);
    await repository.initialize();
    const baseProfile = createProfile(1, '候场人', 100);
    const eligibilityObjectiveIds = baseProfile.objectives
      .filter(({ completedAtEpochMs }) => completedAtEpochMs !== null)
      .map(({ objectiveId }) => objectiveId);
    const run = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: baseProfile.id,
      runSequence: 1,
      runClass: 'campaign',
      seed: 'RESULT02',
      eligibilityObjectiveIds,
      discoveredContentIds: [],
    });
    const finisher = run.content.blinds.find(
      ({ kind, minimumAnte }) => kind === 'finisher' && minimumAnte <= 8,
    );
    if (!finisher) throw new Error('测试牌局缺少第八幕班主');
    const won = {
      ...run,
      phase: { kind: 'run-won' as const },
      progress: {
        ...run.progress,
        ante: 8,
        campaignWon: true,
        lineup: { ...run.progress.lineup, boss: materializeBlind(finisher) },
      },
      result: { kind: 'won' as const, ante: 8, score: 1, reason: '测试胜利' },
    };
    const profile = projectRunStart(baseProfile, run, 150);
    await repository.commitCheckpoint(profile, won);

    const result = await commitRunCommand(
      repository,
      profile,
      won,
      { type: 'finish-run', checkpointId: won.checkpointId },
      200,
    );
    if (!result.ok) throw new Error(result.message);
    repository.close();

    const reloaded = new IndexedDbGameRepository(databaseName);
    await reloaded.initialize();
    expect(await reloaded.getProfile(profile.id)).toMatchObject({
      activeRunId: run.runId,
      activeProjectionCursor: { runId: run.runId, checkpointId: 1 },
    });
    expect(await reloaded.loadRun(profile.id)).toMatchObject({
      runId: run.runId,
      phase: { kind: 'finished' },
      result: { kind: 'finished' },
    });

    reloaded.close();
    await deleteDB(databaseName);
  });
});
