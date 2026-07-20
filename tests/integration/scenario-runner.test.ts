import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV7 } from '../../src/content/runtime/runSetupV7';
import { createProfile } from '../../src/persistence/profiles';
import { runScenarioV2 } from '../../src/test-support/runScenarioV2';

describe('V2 场景转录器', () => {
  it('通过公开命令推进状态并收集同一检查点的事件', () => {
    const initial = createRunEconomyFixtureRun({ seed: 'release-runner' });
    const result = runScenarioV2(initial, [
      {
        buildCommand: (state) => ({
          type: 'select-blind',
          checkpointId: state.checkpointId,
          position: 'small',
        }),
        expectedPhase: 'round',
      },
    ]);

    expect(result.state.checkpointId).toBe(initial.checkpointId + 1);
    expect(result.state.phase.kind).toBe('round');
    expect(result.domainEvents).toEqual([
      { type: 'blind-selected', blindId: 'fixture:run-economy:blind:small' },
    ]);
    expect(result.presentationEvents[0]?.type).toBe('blind-curtain');
  });

  it('接受预期拒绝并证明完整前像与事件列表都不变', () => {
    const initial = createRunEconomyFixtureRun({ seed: 'release-rejection' });
    const result = runScenarioV2(initial, [
      {
        buildCommand: (state) => ({
          type: 'select-blind',
          checkpointId: state.checkpointId + 1,
          position: 'small',
        }),
        expectedRejection: 'stale-checkpoint',
      },
    ]);

    expect(result.state).toEqual(initial);
    expect(result.domainEvents).toEqual([]);
    expect(result.presentationEvents).toEqual([]);
  });

  it('按实际逻辑版本执行 V7 专属不变量校验', () => {
    const profile = createProfile(1, '版本戏主', 100);
    const valid = createProductionRunV7(PRODUCTION_CATALOG, {
      seed: 'VERS0001',
      profileId: profile.id,
      runSequence: profile.nextRunSequence,
      runClass: 'campaign',
      eligibilityObjectiveIds: [],
      discoveredContentIds: [],
    });
    const invalid = {
      ...valid,
      sessionV7: { ...valid.sessionV7, runSequence: 0 },
    };

    expect(() =>
      runScenarioV2(invalid, [
        {
          buildCommand: (state) => ({
            type: 'select-blind',
            checkpointId: state.checkpointId,
            position: 'small',
          }),
        },
      ]),
    ).toThrow(/破坏不变量/);
  });
});
