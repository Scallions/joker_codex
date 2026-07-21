// @vitest-environment jsdom

import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

import { appReducer, type AppState } from '../../src/app/store/appSlice';
import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { stableId } from '../../src/game-core/model/ids';
import { DEFAULT_DEVICE_SETTINGS } from '../../src/persistence/deviceSettings';
import { createProfile } from '../../src/persistence/profiles';
import { TutorialCoach } from '../../src/presentation/progression/TutorialCoach';
import { createTutorialRun } from '../../src/tutorial/script';

describe('紧凑教程提示', () => {
  it('只在主动打开讲解时显示完整说明并始终保留跳过入口', async () => {
    const user = userEvent.setup();
    const base = createProfile(1, '学戏人', 100);
    const profile = {
      ...base,
      tutorial: {
        ...base.tutorial,
        status: 'in-progress' as const,
        currentStepId: 'tutorial:step:01',
      },
    };
    const app: AppState = {
      status: 'playing',
      busy: false,
      error: null,
      profiles: [profile],
      activeProfileId: profile.id,
      run: null,
      presentationSequence: null,
      setupMode: null,
      setupSeed: null,
      settings: DEFAULT_DEVICE_SETTINGS,
      settingsOpen: false,
      settingsBusy: false,
      settingsError: null,
      settingsRollback: null,
    };
    const store = configureStore({
      reducer: { app: appReducer },
      preloadedState: { app },
    });

    render(
      <Provider store={store}>
        <TutorialCoach />
      </Provider>,
    );

    expect(screen.getByText('选择“小盲注”，留意目标分与本轮奖励。')).toBeVisible();
    expect(
      screen.queryByText('每一幕依次面对小盲注、大盲注和班主盲注。'),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '跳过教程' })).toBeVisible();

    await user.click(screen.getByRole('button', { name: '查看讲解' }));
    expect(screen.getByRole('dialog', { name: '先看盲注' })).toBeVisible();
    expect(screen.getByText('每一幕依次面对小盲注、大盲注和班主盲注。')).toBeVisible();

    await user.click(screen.getByRole('button', { name: '关闭讲解' }));
    expect(screen.queryByRole('dialog', { name: '先看盲注' })).not.toBeInTheDocument();
  });

  it('奖励阶段就地提示领取戏票，而不是继续要求出牌', () => {
    const base = createProfile(1, '收赏人', 100);
    const run = createTutorialRun(PRODUCTION_CATALOG, base, 'REWARD01');
    const profile = {
      ...base,
      activeRunId: run.runId,
      tutorial: {
        ...base.tutorial,
        status: 'in-progress' as const,
        currentStepId: 'tutorial:step:05',
      },
    };
    const app: AppState = {
      status: 'playing',
      busy: false,
      error: null,
      profiles: [profile],
      activeProfileId: profile.id,
      run: {
        ...run,
        phase: {
          kind: 'round-reward',
          receiptId: stableId<'reward-receipt'>('tutorial:test:reward'),
        },
      },
      presentationSequence: null,
      setupMode: null,
      setupSeed: null,
      settings: DEFAULT_DEVICE_SETTINGS,
      settingsOpen: false,
      settingsBusy: false,
      settingsError: null,
      settingsRollback: null,
    };
    const store = configureStore({
      reducer: { app: appReducer },
      preloadedState: { app },
    });

    render(
      <Provider store={store}>
        <TutorialCoach />
      </Provider>,
    );

    expect(screen.getByText('点击“收赏入夜市”，领取戏票奖励。')).toBeVisible();
    expect(screen.queryByText(/继续选牌并出手/)).not.toBeInTheDocument();
  });
});
