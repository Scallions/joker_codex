// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../../src/app/App';
import { createGameStore } from '../../src/app/store';
import { createFixtureRun } from '../../src/content/fixtures/foundation';
import { executeCommand } from '../../src/game-core/commands/executeCommand';
import { createProfile } from '../../src/persistence/profiles';
import { createMemoryRepository } from '../helpers/memoryRepository';

function completedFixture() {
  let run = { ...createFixtureRun('result-ui-seed'), targetScore: 1 };
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
  const left = executeCommand(run, { type: 'leave-shop', checkpointId: 2 });
  if (!left.ok) throw new Error(left.rejection.message);
  run = left.state;
  const profile = {
    ...createProfile(1, '谢幕人', 100),
    activeRunId: run.runId,
  };
  return { profile, run };
}

describe('试玩落幕', () => {
  it('展示胜局并清除已结束牌局后回到档案页', async () => {
    const user = userEvent.setup();
    const { profile, run } = completedFixture();
    const repository = createMemoryRepository({
      profiles: [profile],
      runs: [[profile.id, run]],
      activeProfileId: profile.id,
    });
    const store = createGameStore(repository);
    render(<App store={store} />);

    expect(
      await screen.findByRole('heading', { name: '今夜压轴，满堂喝彩' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '回到戏主名簿' }));

    expect(await screen.findByText('三方戏台，三份命数')).toBeInTheDocument();
    expect(store.getState().app.run).toBeNull();
  });
});
