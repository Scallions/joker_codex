// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../../src/app/App';
import { createGameStore } from '../../src/app/store';
import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { materializeBlind } from '../../src/game-core/rules/ante';
import { createProfile } from '../../src/persistence/profiles';
import { createMemoryRepository } from '../helpers/memoryRepository';

function wonStore(seed: string) {
  const initial = createRunEconomyFixtureRun({ seed });
  const finisher = initial.content.blinds.find(
    (blind) => blind.kind === 'finisher' && blind.minimumAnte <= 8,
  );
  if (!finisher) throw new Error('缺少第八幕压轴班主');
  const run = {
    ...initial,
    phase: { kind: 'run-won' } as const,
    progress: {
      ...initial.progress,
      ante: 8,
      blindPosition: 'boss' as const,
      campaignWon: true,
      lineup: { ...initial.progress.lineup, boss: materializeBlind(finisher) },
      seenFinisherBossIds: [finisher.id],
    },
    result: {
      kind: 'won' as const,
      ante: 8,
      score: 99_999,
      reason: '击败第八幕压轴班主',
    },
  };
  const profile = {
    ...createProfile(1, '压轴戏主', 100),
    activeRunId: run.runId,
  };
  return createGameStore(
    createMemoryRepository({
      profiles: [profile],
      runs: [[profile.id, run]],
      activeProfileId: profile.id,
    }),
  );
}

describe('八幕胜利选择', () => {
  it('可从胜利页进入第九幕无尽加演', async () => {
    const user = userEvent.setup();
    const store = wonStore('ui-endless');
    render(<App store={store} />);

    expect(
      await screen.findByRole('heading', { name: '百戏压轴，今夜留名' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '进入无尽加演' }));

    expect(
      await screen.findByRole('heading', { name: '第 9 幕 · 择幕登台' }),
    ).toBeInTheDocument();
    expect(store.getState().app.run?.progress).toMatchObject({
      ante: 9,
      endless: true,
      blindPosition: 'small',
    });
  });

  it('可选择收卷并保存完成结局', async () => {
    const user = userEvent.setup();
    const store = wonStore('ui-finish');
    render(<App store={store} />);

    await user.click(await screen.findByRole('button', { name: '收卷谢幕' }));
    expect(
      await screen.findByRole('heading', { name: '今夜压轴，满堂喝彩' }),
    ).toBeInTheDocument();
    expect(store.getState().app.run?.phase).toEqual({ kind: 'finished' });
  });
});
