// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { App } from '../../src/app/App';
import { createGameStore } from '../../src/app/store';
import { isRunStateV7 } from '../../src/game-core/model/runV7';
import { createProfile } from '../../src/persistence/profiles';
import { projectTutorialSkip } from '../../src/progression/reducer';
import { selectJokerPresentation } from '../../src/presentation/selectors/jokerPresentation';
import { createMemoryRepository } from '../helpers/memoryRepository';

describe('局外功能页面', () => {
  it('从主菜单进入 380 项图鉴、31 项成就簿和十二牌型帮助', async () => {
    const user = userEvent.setup();
    const base = createProfile(1, '看谱人', 100);
    const profile = {
      ...base,
      updatedAtEpochMs: 150,
      achievements: base.achievements.map((record, index) =>
        index === 0 ? { ...record, current: 1, completedAtEpochMs: 150 } : record,
      ),
    };
    const store = createGameStore(
      createMemoryRepository({ profiles: [profile], activeProfileId: profile.id }),
      () => 200,
    );
    const { container } = render(<App store={store} />);

    expect(
      await screen.findByRole('heading', { name: '今晚演哪一出' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: '今晚演哪一出' }).closest('section'),
    ).toHaveAttribute('data-layout-size', 'content');
    expect(screen.getByRole('button', { name: '普通战役' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '种子牌局' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '挑战模式' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: '暂时跳过教程' }));

    await user.click(screen.getByRole('button', { name: '百戏图鉴' }));
    expect(await screen.findByRole('heading', { name: '百戏图鉴' })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-collection-row]')).toHaveLength(380);
    expect(screen.getAllByText('未发现奇牌')).toHaveLength(150);
    expect(screen.getByText('目录完成')).toBeInTheDocument();
    expect(screen.getByText('奇牌发现')).toBeInTheDocument();
    expect(screen.getByText('全局解锁')).toBeInTheDocument();
    expect(screen.getByText('牌组筹码')).toBeInTheDocument();
    expect(screen.getByText('奇牌印记')).toBeInTheDocument();
    const emblemImages = container.querySelectorAll(
      '[data-collection-row] img[src^="/assets/catalog/"]',
    );
    expect(emblemImages).toHaveLength(230);
    expect(
      new Set([...emblemImages].map((image) => image.getAttribute('src'))).size,
    ).toBe(230);
    expect(
      container.querySelector('[data-collection-row] .catalog-glyph'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('[data-collection-row][data-hidden="true"] img'),
    ).not.toBeInTheDocument();
    expect(screen.getByText('解锁条件：赢得 1 场普通战役')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '返回主菜单' }));
    await user.click(screen.getByRole('button', { name: '百戏成就簿' }));
    expect(container.querySelectorAll('[data-achievement-row]')).toHaveLength(31);
    expect(container.querySelectorAll('[data-achievement-icon]')).toHaveLength(31);
    expect(container).not.toHaveTextContent('bxqp:achievement:');
    expect(screen.getByText('首次完成：1970-01-01 00:00:00 UTC')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '返回主菜单' }));
    await user.click(screen.getByRole('button', { name: '牌型与术语' }));
    expect(container.querySelectorAll('[data-hand-reference-row]')).toHaveLength(12);
    await user.click(screen.getByRole('button', { name: '重温入门教程' }));
    await waitFor(() => expect(store.getState().app.status).toBe('playing'));
    const run = store.getState().app.run;
    expect(run && isRunStateV7(run) ? run.sessionV7.runClass : null).toBe('tutorial');
  });

  it('统计账册沿用统一分数格式显示无穷终幕', async () => {
    const user = userEvent.setup();
    const skipped = projectTutorialSkip(createProfile(1, '记分人', 100), 150);
    const profile = {
      ...skipped,
      statistics: {
        ...skipped.statistics,
        totalScore: Infinity,
        bestHandScore: Infinity,
        handTypes: skipped.statistics.handTypes.map((record, index) =>
          index === 0 ? { ...record, bestScore: Infinity } : record,
        ),
      },
    };
    const store = createGameStore(
      createMemoryRepository({ profiles: [profile], activeProfileId: profile.id }),
      () => 200,
    );
    render(<App store={store} />);

    await screen.findByRole('heading', { name: '今晚演哪一出' });
    await user.click(screen.getByRole('button', { name: '统计账册' }));

    expect(screen.getAllByText('无穷终幕')).toHaveLength(2);
    expect(screen.getByText('最佳 无穷终幕')).toBeInTheDocument();
  });

  it('已发现奇牌可以鉴赏大图，未发现奇牌不泄露入口或素材', async () => {
    const user = userEvent.setup();
    const skipped = projectTutorialSkip(createProfile(1, '图鉴鉴赏人', 100), 150);
    const discovered = selectJokerPresentation('bxqp:joker:001');
    if (!discovered) throw new Error('缺少 J001 展示数据');
    const profile = {
      ...skipped,
      collection: {
        ...skipped.collection,
        discoveredJokerIds: ['bxqp:joker:001'],
      },
    };
    const store = createGameStore(
      createMemoryRepository({ profiles: [profile], activeProfileId: profile.id }),
    );
    render(<App store={store} />);

    await screen.findByRole('heading', { name: '今晚演哪一出' });
    await user.click(screen.getByRole('button', { name: '百戏图鉴' }));
    await user.selectOptions(screen.getByLabelText('内容类别'), 'joker');
    expect(screen.getAllByText('未发现奇牌')).toHaveLength(149);
    expect(
      screen.getByRole('button', { name: `查看 ${discovered.name} 大图` }),
    ).toBeInTheDocument();
    expect(
      screen.queryAllByRole('button', { name: /查看 未发现奇牌 大图/ }),
    ).toHaveLength(0);

    await user.click(
      screen.getByRole('button', { name: `查看 ${discovered.name} 大图` }),
    );
    expect(
      screen.getByRole('dialog', { name: `奇牌鉴赏 · ${discovered.name}` }),
    ).toBeInTheDocument();
  });
});
