import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { commitRunCommand } from '../../src/app/commitRunCommand';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { createProfile } from '../../src/persistence/profiles';

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

    const result = await commitRunCommand(repository, profile, state, {
      type: 'toggle-card',
      checkpointId: state.checkpointId,
      cardId: state.round!.handIds[0]!,
    });

    expect(proposedCheckpoint).toBe(2);
    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    if (result.ok) throw new Error('故障提交不应成功');
    expect(result.code).toBe('persistence-failed');
    expect(result.message).toContain('模拟磁盘故障');
  });
});
