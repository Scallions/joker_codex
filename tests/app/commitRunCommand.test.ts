import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV7 } from '../../src/content/runtime/runSetupV7';
import { commitRunCommand } from '../../src/app/commitRunCommand';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { materializeBlind } from '../../src/game-core/rules/ante';
import { createProfile } from '../../src/persistence/profiles';
import { projectRunStart } from '../../src/progression/reducer';

describe('持久化优先的指令提交', () => {
  it('落盘失败时保留旧检查点，不把提议状态暴露给界面', async () => {
    const initial = createRunEconomyFixtureRun({ seed: 'commit-failure' });
    const started = executeCommandV2(initial, {
      type: 'select-blind',
      checkpointId: initial.checkpointId,
      position: 'small',
    });
    if (!started.ok) throw new Error(started.rejection.message);
    const state = started.state;
    const profile = {
      ...createProfile(1, '守夜人', 100),
      activeRunId: state.runId,
    };
    let proposedCheckpoint = -1;
    const repository = {
      commitCheckpoint: async (_profile: typeof profile, proposed: typeof state) => {
        proposedCheckpoint = proposed.checkpointId;
        throw new Error('模拟磁盘故障');
      },
    };

    const result = await commitRunCommand(
      repository,
      profile,
      state,
      {
        type: 'toggle-card',
        checkpointId: state.checkpointId,
        cardId: state.round!.handIds[0]!,
      },
      200,
    );

    expect(proposedCheckpoint).toBe(2);
    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    expect(result.profile).toBe(profile);
    if (result.ok) throw new Error('故障提交不应成功');
    expect(result.code).toBe('persistence-failed');
    expect(result.message).toContain('模拟磁盘故障');
  });

  it('V7 成功命令先投影档案，再把同一档案与检查点一起提交', async () => {
    const initialProfile = createProfile(2, '归档人', 100);
    const run = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: initialProfile.id,
      runSequence: 1,
      runClass: 'campaign',
      seed: 'COMMIT01',
      eligibilityObjectiveIds: [],
      discoveredContentIds: [],
    });
    const profile = projectRunStart(initialProfile, run, 150);
    let committedProfile = profile;
    let committedRun = run;
    const repository = {
      commitCheckpoint: async (
        projectedProfile: typeof profile,
        projectedRun: typeof run,
      ) => {
        committedProfile = projectedProfile;
        committedRun = projectedRun;
      },
    };

    const result = await commitRunCommand(
      repository,
      profile,
      run,
      {
        type: 'select-blind',
        checkpointId: run.checkpointId,
        position: 'small',
      },
      200,
    );

    if (!result.ok) throw new Error(result.message);
    expect(result.profile.activeProjectionCursor).toEqual({
      runId: run.runId,
      checkpointId: 1,
    });
    expect(committedProfile).toEqual(result.profile);
    expect(committedRun).toEqual(result.state);
  });

  it('结束演出后保留耐久终态，直到玩家确认离开结算页', async () => {
    const initialProfile = createProfile(1, '候场人', 100);
    const run = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: initialProfile.id,
      runSequence: 1,
      runClass: 'campaign',
      seed: 'RESULT01',
      eligibilityObjectiveIds: [],
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
    const profile = projectRunStart(initialProfile, run, 150);
    let committedProfile = profile;
    let committedRun = run;
    const repository = {
      commitCheckpoint: async (
        projectedProfile: typeof profile,
        projectedRun: typeof run,
      ) => {
        committedProfile = projectedProfile;
        committedRun = projectedRun;
      },
    };

    const result = await commitRunCommand(
      repository,
      profile,
      won,
      { type: 'finish-run', checkpointId: won.checkpointId },
      200,
    );

    if (!result.ok) throw new Error(result.message);
    expect(result.state.phase.kind).toBe('finished');
    expect(result.profile.activeRunId).toBe(run.runId);
    expect(result.profile.currentRunProgress.runId).toBe(run.runId);
    expect(result.profile.activeProjectionCursor).toEqual({
      runId: run.runId,
      checkpointId: 1,
    });
    expect(committedProfile).toEqual(result.profile);
    expect(committedRun).toEqual(result.state);
  });
});
