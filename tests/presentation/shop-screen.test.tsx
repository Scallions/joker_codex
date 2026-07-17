// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../../src/app/App';
import { createGameStore } from '../../src/app/store';
import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { executeCommand } from '../../src/game-core/commands/executeCommand';
import { createProfile } from '../../src/persistence/profiles';
import { createMemoryRepository } from '../helpers/memoryRepository';

function shopFixture() {
  let run = { ...createFixtureRun('shop-ui-seed'), targetScore: 1 };
  const selected = executeCommand(run, {
    type: 'toggle-card',
    checkpointId: 0,
    cardId: run.hand[0]!.id,
  });
  if (!selected.ok) throw new Error(selected.rejection.message);
  run = selected.state;
  const played = executeCommand(run, { type: 'play-selected', checkpointId: 1 });
  if (!played.ok) throw new Error(played.rejection.message);
  run = played.state;
  const profile = {
    ...createProfile(1, '逛夜市的人', 100),
    activeRunId: run.runId,
  };
  return { profile, run };
}

describe('百戏夜市', () => {
  it('重掷并购买奇牌，所有动作即时写入检查点', async () => {
    const user = userEvent.setup();
    const { profile, run } = shopFixture();
    const repository = createMemoryRepository({
      profiles: [profile],
      runs: [[profile.id, run]],
      activeProfileId: profile.id,
    });
    const store = createGameStore(repository);
    render(<App store={store} />);

    expect(await screen.findByText('百戏夜市 · 试演摊位')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '重掷商品' }));
    await user.click(screen.getByRole('button', { name: '购买 压轴鼓师' }));

    expect(await screen.findByText('持有奇牌 2 / 5')).toBeInTheDocument();
    expect(store.getState().app.run?.checkpointId).toBe(4);
    expect(store.getState().app.run?.money).toBe(9);
  });
});
