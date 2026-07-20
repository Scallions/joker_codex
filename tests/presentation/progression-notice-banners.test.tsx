// @vitest-environment jsdom

import { configureStore } from '@reduxjs/toolkit';
import { act, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';

import {
  appReducer,
  clearPresentationEvents,
  type AppState,
} from '../../src/app/store/appSlice';
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
      ],
    };
    const app: AppState = {
      status: 'playing',
      busy: false,
      error: null,
      profiles: [profile],
      activeProfileId: profile.id,
      run: null,
      presentationEvents: [{ type: 'coin-spent', amount: 1 }],
      setupMode: null,
      setupSeed: null,
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
    act(() => {
      store.dispatch(clearPresentationEvents());
    });
    expect(screen.getByText('新戏箱开放')).toBeInTheDocument();
  });
});
