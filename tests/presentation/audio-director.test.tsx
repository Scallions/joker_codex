// @vitest-environment jsdom

import { configureStore } from '@reduxjs/toolkit';
import { render, waitFor } from '@testing-library/react';
import { StrictMode } from 'react';
import { Provider } from 'react-redux';

import { appReducer, type AppState } from '../../src/app/store/appSlice';
import { DEFAULT_DEVICE_SETTINGS } from '../../src/persistence/deviceSettings';
import { createProfile } from '../../src/persistence/profiles';
import {
  AudioDirector,
  type AudioDirectorEngine,
} from '../../src/presentation/audio/AudioDirector';
import type { PresentationAudioStatus } from '../../src/presentation/audio/audioEngine';

function createState(overrides: Partial<AppState> = {}): AppState {
  return {
    status: 'playing',
    busy: false,
    error: null,
    profiles: [],
    activeProfileId: null,
    run: null,
    presentationSequence: null,
    setupMode: null,
    setupSeed: null,
    settings: DEFAULT_DEVICE_SETTINGS,
    settingsOpen: false,
    settingsBusy: false,
    settingsError: null,
    settingsRollback: null,
    ...overrides,
  };
}

function createFakeEngine(
  initialStatus: PresentationAudioStatus = {
    kind: 'ready',
    message: null,
  },
) {
  let status = initialStatus;
  const setSettings = vi.fn();
  const setScene = vi.fn();
  const playOneShot = vi.fn<AudioDirectorEngine['playOneShot']>(async () => true);
  const destroy = vi.fn(async () => undefined);
  const engine: AudioDirectorEngine = {
    getStatus: vi.fn(() => status),
    unlock: vi.fn(async () => true),
    setSettings,
    setScene,
    playOneShot,
    suspend: vi.fn(async () => undefined),
    resume: vi.fn(async () => undefined),
    destroy,
  };
  return {
    destroy,
    engine,
    playOneShot,
    setScene,
    setSettings,
    setStatus(next: PresentationAudioStatus) {
      status = next;
    },
  };
}

function renderDirector(app: AppState, engine: AudioDirectorEngine, strictMode = false) {
  const store = configureStore({
    reducer: { app: appReducer },
    preloadedState: { app },
  });
  const director = (
    <Provider store={store}>
      <AudioDirector createEngine={() => engine} />
    </Provider>
  );
  return render(strictMode ? <StrictMode>{director}</StrictMode> : director);
}

describe('浏览器声场导演', () => {
  it('把设备设置、当前场景和已提交演出提示映射到声场', async () => {
    const fake = createFakeEngine();
    renderDirector(
      createState({
        presentationSequence: {
          version: 1,
          sequenceId: 'run:audio:1',
          checkpointId: 1,
          cursor: 0,
          cues: [
            {
              cueId: 'run:audio:1:cue:0:coin-spent',
              kind: 'coin-spent',
              payload: { type: 'coin-spent', amount: 2 },
              repetitions: 1,
            },
          ],
        },
      }),
      fake.engine,
    );

    expect(fake.setSettings).toHaveBeenCalledWith(DEFAULT_DEVICE_SETTINGS);
    expect(fake.setScene).toHaveBeenCalledWith('table-stage');
    await waitFor(() => {
      expect(fake.playOneShot).toHaveBeenCalledWith(
        'coin-spend',
        'run:audio:1:run:audio:1:cue:0:coin-spent',
      );
    });
  });

  it('演出结束后才为最新永久进度通知奏响结尾音', async () => {
    const profile = {
      ...createProfile(1, '听戏人', 1),
      unreadNotices: [
        {
          noticeId: 'notice:rare-find',
          kind: 'discovery' as const,
          title: '新奇牌入册',
          detail: '已收入百戏图鉴',
          createdAtEpochMs: 2,
        },
      ],
    };
    const fake = createFakeEngine();
    renderDirector(
      createState({ profiles: [profile], activeProfileId: profile.id }),
      fake.engine,
    );

    await waitFor(() => {
      expect(fake.playOneShot).toHaveBeenCalledWith(
        'stinger-rare',
        'progression-notice:notice:rare-find',
      );
    });
  });

  it('媒体故障只给出静默提示，并在卸载时释放声场', async () => {
    const fake = createFakeEngine();
    fake.playOneShot.mockImplementation(async () => {
      fake.setStatus({ kind: 'error', message: '模拟解码失败' });
      return false;
    });
    const view = renderDirector(
      createState({
        presentationSequence: {
          version: 1,
          sequenceId: 'run:audio:error',
          checkpointId: 1,
          cursor: 0,
          cues: [
            {
              cueId: 'run:audio:error:cue:0:seal',
              kind: 'total',
              payload: {
                type: 'total',
                chips: 5,
                multiplier: 2,
                score: 10,
              },
              repetitions: 1,
            },
          ],
        },
      }),
      fake.engine,
    );

    await waitFor(() => {
      expect(view.getByText(/声场暂时静默，牌局仍可继续/)).toHaveTextContent(
        '模拟解码失败',
      );
    });
    view.unmount();
    await waitFor(() => expect(fake.destroy).toHaveBeenCalledOnce());
  });

  it('React 严格模式的模拟卸载不会提前销毁声场', async () => {
    const fake = createFakeEngine();
    const view = renderDirector(createState(), fake.engine, true);

    await new Promise((resolve) => window.setTimeout(resolve, 5));
    expect(fake.destroy).not.toHaveBeenCalled();
    view.unmount();
    await waitFor(() => expect(fake.destroy).toHaveBeenCalledOnce());
  });
});
