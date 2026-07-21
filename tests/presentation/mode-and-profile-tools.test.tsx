// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../../src/app/App';
import { createGameStore } from '../../src/app/store';
import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { isRunStateV7 } from '../../src/game-core/model/runV7';
import { createProfile } from '../../src/persistence/profiles';
import { CHALLENGE_CONTENT_IDS } from '../../src/progression/definitions';
import { projectTutorialSkip } from '../../src/progression/reducer';
import { createMemoryRepository } from '../helpers/memoryRepository';

describe('模式设置与档案工具', () => {
  it('可从普通战役设置用已解锁牌组开局', async () => {
    const user = userEvent.setup();
    const profile = createProfile(1, '开场人', 100);
    const store = createGameStore(
      createMemoryRepository({ profiles: [profile], activeProfileId: profile.id }),
      () => 200,
      () => 'CAMP0001',
    );
    render(<App store={store} />);

    expect(
      await screen.findByRole('heading', { name: '要先走一遍八步入门吗？' }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '暂时跳过教程' }));
    await waitFor(() =>
      expect(store.getState().app.profiles[0]?.tutorial.status).toBe('skipped'),
    );
    await user.click(await screen.findByRole('button', { name: '普通战役' }));
    expect(screen.getByRole('heading', { name: '普通战役设置' })).toBeInTheDocument();
    expect(screen.getByLabelText('牌组')).toHaveDisplayValue(/D01/);
    expect(screen.getByLabelText('筹码等级')).toHaveDisplayValue(/S01/);
    expect(screen.getByLabelText('演出种子')).toHaveValue('CAMP0001');
    expect(screen.getByText('内容版本：progression-modes-1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '开始普通战役' }));

    await waitFor(() => expect(store.getState().app.status).toBe('playing'));
    const run = store.getState().app.run;
    expect(run && isRunStateV7(run) ? run.sessionV7.runClass : null).toBe('campaign');
  });

  it('把小写纯种子预览为规范分享码并开始种子牌局', async () => {
    const user = userEvent.setup();
    const profile = createProfile(1, '复演人', 100);
    const store = createGameStore(
      createMemoryRepository({ profiles: [profile], activeProfileId: profile.id }),
      () => 200,
    );
    render(<App store={store} />);

    await user.click(await screen.findByRole('button', { name: '暂时跳过教程' }));
    await user.click(await screen.findByRole('button', { name: '种子牌局' }));
    await user.clear(screen.getByLabelText('种子或分享码'));
    await user.type(screen.getByLabelText('种子或分享码'), 'abcd1234');
    expect(
      screen.getByText('BXQP1|progression-modes-1|ABCD1234|D01|S01'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '种子牌局设置' }).closest('section'),
    ).toHaveAttribute('data-layout-size', 'content');
    await user.click(screen.getByRole('button', { name: '开始种子牌局' }));

    await waitFor(() => expect(store.getState().app.status).toBe('playing'));
    const run = store.getState().app.run;
    expect(run?.seed).toBe('ABCD1234');
    expect(run && isRunStateV7(run) ? run.sessionV7.runClass : null).toBe('seeded');
  });

  it('分享码只在剪贴板写入成功后原位确认，并在码变化或失败时如实复位', async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText },
    });
    const profile = projectTutorialSkip(createProfile(1, '抄码人', 100), 120);
    const store = createGameStore(
      createMemoryRepository({ profiles: [profile], activeProfileId: profile.id }),
      () => 200,
    );
    render(<App store={store} />);

    await user.click(await screen.findByRole('button', { name: '种子牌局' }));
    const input = screen.getByLabelText('种子或分享码');
    await user.clear(input);
    await user.type(input, 'copy0001');
    await user.click(screen.getByRole('button', { name: '复制分享码' }));
    expect(await screen.findByRole('button', { name: '已复制 ✓' })).toBeVisible();
    expect(screen.getByText('分享码已复制')).toBeVisible();
    expect(writeText).toHaveBeenCalledWith('BXQP1|progression-modes-1|COPY0001|D01|S01');

    await user.clear(input);
    await user.type(input, 'copy0002');
    expect(screen.getByRole('button', { name: '复制分享码' })).toBeVisible();
    expect(screen.queryByText('分享码已复制')).not.toBeInTheDocument();

    writeText.mockRejectedValueOnce(new Error('clipboard denied'));
    await user.click(screen.getByRole('button', { name: '复制分享码' }));
    expect(await screen.findByText('复制失败，请手动选择分享码')).toBeVisible();
    expect(screen.getByRole('button', { name: '复制分享码' })).toBeVisible();
  });

  it('完整分享码预览并启动码内指定的已解锁牌组与筹码', async () => {
    const user = userEvent.setup();
    const skipped = projectTutorialSkip(createProfile(1, '换码人', 100), 120);
    const unlockedObjectiveIds = new Set([
      'bxqp:objective:deck:02',
      'bxqp:objective:stake:02',
    ]);
    const profile = {
      ...skipped,
      updatedAtEpochMs: 150,
      objectives: skipped.objectives.map((record) =>
        unlockedObjectiveIds.has(record.objectiveId)
          ? {
              ...record,
              current: record.target,
              completedAtEpochMs: 140,
              source: 'campaign' as const,
            }
          : record,
      ),
      deckProgress: skipped.deckProgress.map((record, index) =>
        index === 1 ? { ...record, highestClearedStakeOrdinal: 1 } : record,
      ),
    };
    const deck = PRODUCTION_CATALOG.rows.find(
      (row) => row.family === 'deck' && row.referenceIndex === 'D02',
    );
    const stake = PRODUCTION_CATALOG.rows.find(
      (row) => row.family === 'stake' && row.referenceIndex === 'S02',
    );
    if (!deck || !stake) throw new Error('测试目录缺少 D02/S02');
    const store = createGameStore(
      createMemoryRepository({ profiles: [profile], activeProfileId: profile.id }),
      () => 200,
      () => 'AUTO0001',
    );
    render(<App store={store} />);

    await user.click(await screen.findByRole('button', { name: '种子牌局' }));
    await user.clear(screen.getByLabelText('种子或分享码'));
    await user.type(
      screen.getByLabelText('种子或分享码'),
      'BXQP1|progression-modes-1|CODE0001|D02|S02',
    );
    expect(
      screen.getByText(`牌组：D02 · ${PRODUCTION_CATALOG.localization[deck.nameKey]}`),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`筹码：S02 · ${PRODUCTION_CATALOG.localization[stake.nameKey]}`),
    ).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '开始种子牌局' }));

    await waitFor(() => expect(store.getState().app.status).toBe('playing'));
    const run = store.getState().app.run;
    expect(run && isRunStateV7(run) ? run.setupV3 : null).toMatchObject({
      deckId: deck.id,
      stakeId: stake.id,
    });
  });

  it('普通战役胜利后开放顺序挑战，且挑战设置不暴露牌组与筹码选择', async () => {
    const user = userEvent.setup();
    const base = createProfile(1, '挑战人', 100);
    const profile = {
      ...base,
      updatedAtEpochMs: 150,
      challengeProgress: {
        ...base.challengeProgress,
        nextAvailableOrdinal: 1,
      },
      objectives: base.objectives.map((record) =>
        record.objectiveId === 'bxqp:objective:challenge:01'
          ? {
              ...record,
              current: record.target,
              completedAtEpochMs: 150,
              source: 'campaign' as const,
            }
          : record,
      ),
    };
    const store = createGameStore(
      createMemoryRepository({ profiles: [profile], activeProfileId: profile.id }),
      () => 200,
      () => 'CHAL0001',
    );
    render(<App store={store} />);

    await user.click(await screen.findByRole('button', { name: '暂时跳过教程' }));
    const challengeButton = await screen.findByRole('button', { name: '挑战模式' });
    expect(challengeButton).toBeEnabled();
    await user.click(challengeButton);

    expect(screen.getByRole('heading', { name: '挑战模式设置' })).toBeInTheDocument();
    expect(screen.getByLabelText('已开放挑战')).toHaveDisplayValue(/C01/);
    expect(screen.queryByLabelText('牌组')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('筹码等级')).not.toBeInTheDocument();
    expect(screen.getByText('固定设置：D01 / S01')).toBeInTheDocument();
    expect(screen.getByText('种子：CHAL0001')).toBeInTheDocument();
    expect(screen.getByText('内容版本：progression-modes-1')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '开始挑战' }));

    await waitFor(() => expect(store.getState().app.status).toBe('playing'));
    const run = store.getState().app.run;
    expect(run && isRunStateV7(run) ? run.sessionV7.runClass : null).toBe('challenge');
    expect(run && isRunStateV7(run) ? run.setupV3.challengeId : null).toBe(
      CHALLENGE_CONTENT_IDS[0],
    );
  });

  it('展示统计、持久通知，并可逐项确认通知', async () => {
    const user = userEvent.setup();
    const base = createProfile(1, '记账人', 100);
    const profile = {
      ...base,
      statistics: { ...base.statistics, campaignWins: 3, handsPlayed: 12 },
      unreadNotices: [
        {
          noticeId: 'notice:one',
          kind: 'achievement' as const,
          title: '成就题名',
          detail: '完成初次开锣',
          createdAtEpochMs: 120,
        },
      ],
    };
    const store = createGameStore(
      createMemoryRepository({ profiles: [profile], activeProfileId: profile.id }),
      () => 200,
    );
    render(<App store={store} />);

    await user.click(await screen.findByRole('button', { name: '统计账册' }));
    expect(screen.getByRole('heading', { name: '统计账册' })).toBeInTheDocument();
    expect(screen.getByText('普通胜场').nextElementSibling).toHaveTextContent('3');
    expect(screen.getByText('当前连胜')).toBeInTheDocument();
    expect(screen.getByText('弃掉扑克牌')).toBeInTheDocument();
    expect(screen.getByText('最高持有戏票')).toBeInTheDocument();
    expect(screen.getByText('首领重抽')).toBeInTheDocument();
    expect(screen.getByText('使用消耗牌')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '返回主菜单' }));
    await user.click(screen.getByRole('button', { name: '戏报 1' }));
    expect(screen.getByText('完成初次开锣')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '全部收讫' }));
    await waitFor(() =>
      expect(store.getState().app.profiles[0]?.unreadNotices).toEqual([]),
    );
    expect(
      screen.getByRole('heading', { name: '戏报' }).closest('section'),
    ).toHaveAttribute('data-layout-size', 'content');
  });

  it('教程显示当前脚本步骤并允许跳过', async () => {
    const user = userEvent.setup();
    const profile = createProfile(1, '学徒', 100);
    const store = createGameStore(
      createMemoryRepository({ profiles: [profile], activeProfileId: profile.id }),
      () => 200,
    );
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App store={store} />);

    await user.click(await screen.findByRole('button', { name: '入门教程' }));
    expect(await screen.findByRole('heading', { name: '先看盲注' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: '跳过教程' }));
    await waitFor(() => expect(store.getState().app.status).toBe('menu'));
    expect(store.getState().app.profiles[0]?.tutorial.status).toBe('skipped');
    confirm.mockRestore();
  });

  it('重置档案后可一步恢复，并以精确档案名永久删除', async () => {
    const user = userEvent.setup();
    const base = createProfile(1, '收箱人', 100);
    const profile = {
      ...base,
      statistics: { ...base.statistics, campaignWins: 4 },
    };
    const store = createGameStore(
      createMemoryRepository({ profiles: [profile], activeProfileId: profile.id }),
      () => 200,
    );
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<App store={store} />);

    await user.click(await screen.findByRole('button', { name: '档案维护' }));
    expect(screen.getByRole('heading', { name: '档案维护' })).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '档案维护' }).closest('section'),
    ).toHaveAttribute('data-layout-size', 'content');
    await user.click(screen.getByRole('button', { name: '重置当前档案' }));
    await waitFor(() =>
      expect(store.getState().app.profiles[0]?.statistics.campaignWins).toBe(0),
    );

    await user.click(screen.getByRole('button', { name: '档案维护' }));
    await user.click(screen.getByRole('button', { name: '恢复上次档案操作' }));
    await waitFor(() =>
      expect(store.getState().app.profiles[0]?.statistics.campaignWins).toBe(4),
    );

    await user.click(screen.getByRole('button', { name: '档案维护' }));
    const deleteButton = screen.getByRole('button', { name: '永久删除档案' });
    expect(deleteButton).toBeDisabled();
    await user.type(screen.getByLabelText('输入档案名以确认'), '收箱人');
    expect(deleteButton).toBeEnabled();
    await user.click(deleteButton);
    await waitFor(() => expect(store.getState().app.profiles).toHaveLength(0));
    confirm.mockRestore();
  });
});
