// @vitest-environment jsdom

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../../src/app/App';
import { createGameStore } from '../../src/app/store';
import { createRunEconomyFixtureRun } from '../../src/content/fixtures/runEconomy';
import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV7 } from '../../src/content/runtime/runSetupV7';
import type { RunStateV7 } from '../../src/game-core/model/runV7';
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
    lastResultSummary: {
      runId: run.runId,
      objectiveIds: ['bxqp:objective:voucher:01'],
      discoveredJokerIds: [],
      achievementIds: ['bxqp:achievement:001'],
      victoryMarkContentIds: [],
      statisticKeys: ['campaignWins'],
    },
  };
  return { profile, run };
}

describe('八幕落幕', () => {
  it('展示胜局并清除已结束牌局后回到主菜单', async () => {
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
    expect(screen.getByRole('heading', { name: '本局永久进度' })).toBeInTheDocument();
    expect(screen.getByText('内容解锁 1')).toBeInTheDocument();
    expect(screen.getByText('成就题名 1')).toBeInTheDocument();
    expect(screen.getByText('bxqp:objective:voucher:01')).toBeInTheDocument();
    expect(screen.getByText('bxqp:achievement:001')).toBeInTheDocument();
    expect(screen.getByText('campaignWins')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '返回主菜单' }));

    expect(await screen.findByText('今晚演哪一出')).toBeInTheDocument();
    expect(store.getState().app.run).toBeNull();
  });

  it('在种子结果中展示冻结设置、精确内容版本和可复制分享码', async () => {
    const baseProfile = createProfile(1, '复演谢幕人', 100);
    const deck = PRODUCTION_CATALOG.rows.find(
      (row) => row.family === 'deck' && row.ordinal === 1,
    );
    const stake = PRODUCTION_CATALOG.rows.find(
      (row) => row.family === 'stake' && row.ordinal === 1,
    );
    if (!deck || !stake) throw new Error('测试目录缺少 D01/S01');
    const initial = createProductionRunV7(PRODUCTION_CATALOG, {
      seed: 'RESULT01',
      profileId: baseProfile.id,
      runSequence: baseProfile.nextRunSequence,
      runClass: 'seeded',
      deckId: deck.id,
      stakeId: stake.id,
      challengeId: null,
      eligibilityObjectiveIds: baseProfile.objectives
        .filter(({ completedAtEpochMs }) => completedAtEpochMs !== null)
        .map(({ objectiveId }) => objectiveId),
      discoveredContentIds: [],
    });
    const run: RunStateV7 = {
      ...initial,
      phase: { kind: 'finished' },
      result: {
        kind: 'finished',
        ante: 8,
        score: 98_765,
        reason: '种子牌局收卷',
      },
    };
    const profile = {
      ...baseProfile,
      activeRunId: run.runId,
      currentRunProgress: {
        ...baseProfile.currentRunProgress,
        runId: run.runId,
      },
    };
    const repository = createMemoryRepository({
      profiles: [profile],
      runs: [[profile.id, run]],
      activeProfileId: profile.id,
    });
    render(<App store={createGameStore(repository)} />);

    expect(
      await screen.findByRole('heading', { name: '今夜压轴，满堂喝彩' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/牌组：D01/)).toBeInTheDocument();
    expect(screen.getByText(/筹码：S01/)).toBeInTheDocument();
    expect(screen.getByText('种子：RESULT01')).toBeInTheDocument();
    expect(screen.getByText('内容版本：progression-modes-1')).toBeInTheDocument();
    expect(
      screen.getByText('BXQP1|progression-modes-1|RESULT01|D01|S01'),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '复制本局分享码' })).toBeInTheDocument();
  });
});
