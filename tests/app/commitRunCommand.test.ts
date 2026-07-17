import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { commitRunCommand } from '../../src/app/commitRunCommand';
import { createProfile } from '../../src/persistence/profiles';

describe('持久化优先的指令提交', () => {
  it('落盘失败时保留旧检查点，不把提议状态暴露给界面', async () => {
    const state = createFixtureRun('commit-failure');
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
      checkpointId: 0,
      cardId: state.hand[0]!.id,
    });

    expect(proposedCheckpoint).toBe(1);
    expect(result.ok).toBe(false);
    expect(result.state).toBe(state);
    if (result.ok) throw new Error('故障提交不应成功');
    expect(result.code).toBe('persistence-failed');
    expect(result.message).toContain('模拟磁盘故障');
  });
});
