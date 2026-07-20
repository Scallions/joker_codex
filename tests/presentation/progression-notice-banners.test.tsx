// @vitest-environment jsdom

import { configureStore } from '@reduxjs/toolkit';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';

import {
  appReducer,
  skipPresentationSequence,
  type AppState,
} from '../../src/app/store/appSlice';
import { DEFAULT_DEVICE_SETTINGS } from '../../src/persistence/deviceSettings';
import { createProfile } from '../../src/persistence/profiles';
import { ProgressionNoticeBanners } from '../../src/presentation/progression/ProgressionNoticeBanners';

describe('永久进度横幅', () => {
  it('等待演出队列清空后才显示持久通知', () => {
    const base = createProfile(1, '听报人', 100);
    const profile = {
      ...base,
      unreadNotices: [
        {
          noticeId: 'notice:after-presentation',
          kind: 'unlock' as const,
          title: '新戏箱开放',
          detail: 'D02 已可使用',
          createdAtEpochMs: 120,
        },
        {
          noticeId: 'notice:latest',
          kind: 'achievement' as const,
          title: '压轴新报',
          detail: '逐条收讫，不遮住戏台',
          createdAtEpochMs: 121,
        },
      ],
    };
    const app: AppState = {
      status: 'playing',
      busy: false,
      error: null,
      profiles: [profile],
      activeProfileId: profile.id,
      run: null,
      presentationSequence: {
        version: 1,
        sequenceId: 'run:notice:1',
        checkpointId: 1,
        cursor: 0,
        cues: [
          {
            cueId: 'run:notice:1:cue:0:coin-spent',
            kind: 'coin-spent',
            payload: { type: 'coin-spent', amount: 1 },
            repetitions: 1,
          },
        ],
      },
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
        <ProgressionNoticeBanners />
      </Provider>,
    );

    expect(screen.queryByText('新戏箱开放')).not.toBeInTheDocument();
    expect(screen.queryByText('压轴新报')).not.toBeInTheDocument();
    act(() => {
      store.dispatch(skipPresentationSequence());
    });
    expect(screen.queryByText('新戏箱开放')).not.toBeInTheDocument();
    expect(screen.getByText('压轴新报')).toBeInTheDocument();
  });
});
