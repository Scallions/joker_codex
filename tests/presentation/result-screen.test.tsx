// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../../src/app/App';
import { createGameStore } from '../../src/app/store';
import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { createProfile } from '../../src/persistence/profiles';
import { createMemoryRepository } from '../helpers/memoryRepository';

function completedFixture() {
  const initial = createRunEconomyFixtureRun({ seed: 'result-ui-seed' });
  const run = {
    ...initial,
    phase: { kind: 'finished' } as const,
    progress: { ...initial.progress, campaignWon: true },
    result: {
      kind: 'finished' as const,
      ante: 8,
      score: 12_345,
      reason: '完成八幕演出并选择谢幕',
    },
  };
  const profile = {
    ...createProfile(1, '谢幕人', 100),
    activeRunId: run.runId,
  };
  return { profile, run };
}

describe('八幕落幕', () => {
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
