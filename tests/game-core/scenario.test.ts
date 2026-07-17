import { createFixtureRun } from '../../src/content/fixtures/foundation';
import type { RunCommand } from '../../src/game-core/commands/types';
import { runScenario } from '../../src/test-support/runScenario';

describe('确定性场景回放', () => {
  it('相同初态与指令脚本产生逐字节一致的最终状态', () => {
    const initial = createFixtureRun('replay-seed');
    const commands: RunCommand[] = [
      {
        type: 'toggle-card',
        checkpointId: 0,
        cardId: initial.hand[0]!.id,
      },
      { type: 'discard-selected', checkpointId: 1 },
      {
        type: 'toggle-card',
        checkpointId: 2,
        cardId: initial.hand[1]!.id,
      },
      { type: 'play-selected', checkpointId: 3 },
    ];

    const first = runScenario(initial, commands);
    const second = runScenario(createFixtureRun('replay-seed'), commands);

    expect(first).toEqual(second);
    expect(JSON.stringify(first.state)).toBe(JSON.stringify(second.state));
    expect(first.state.checkpointId).toBe(4);
  });
});
