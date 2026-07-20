import type { ChangeEvent } from 'react';

import {
  closeSoundStageDrawer,
  openSoundStageDrawer,
  saveDeviceSettings,
} from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import type {
  DeviceSettingsV1,
  PresentationSpeed,
} from '../../persistence/deviceSettings';
import styles from './SoundStageDrawer.module.css';

type VolumeKey = 'masterVolume' | 'musicVolume' | 'sfxVolume';

const VOLUME_CONTROLS: readonly {
  readonly key: VolumeKey;
  readonly label: string;
  readonly mark: string;
}[] = [
  { key: 'masterVolume', label: '总音量', mark: '总' },
  { key: 'musicVolume', label: '音乐', mark: '乐' },
  { key: 'sfxVolume', label: '音效', mark: '效' },
];

export function SoundStageDrawer() {
  const dispatch = useAppDispatch();
  const { settings, settingsBusy, settingsError, settingsOpen, status } = useAppSelector(
    (state) => state.app,
  );

  if (status === 'loading') return null;

  const persist = (next: DeviceSettingsV1) => {
    void dispatch(saveDeviceSettings(next));
  };

  const changeVolume = (key: VolumeKey) => (event: ChangeEvent<HTMLInputElement>) => {
    persist({ ...settings, [key]: Number(event.currentTarget.value) });
  };

  const changeSpeed = (presentationSpeed: PresentationSpeed) => {
    persist({ ...settings, presentationSpeed });
  };

  return (
    <>
      <div className={styles.globalControls}>
        <button
          type="button"
          className={styles.soundButton}
          aria-label="打开声场设置"
          onClick={() => dispatch(openSoundStageDrawer())}
        >
          <span aria-hidden="true">声</span>
          声场
        </button>
        {status === 'playing' ? (
          <button
            type="button"
            className={styles.muteButton}
            aria-label={settings.muted ? '恢复声场' : '一键静音'}
            disabled={settingsBusy}
            onClick={() => persist({ ...settings, muted: !settings.muted })}
          >
            {settings.muted ? '启声' : '静音'}
          </button>
        ) : null}
      </div>

      {settingsOpen ? (
        <div className={styles.scrim}>
          <aside
            className={styles.drawer}
            role="dialog"
            aria-modal="true"
            aria-labelledby="sound-stage-title"
          >
            <div className={styles.headingRow}>
              <div>
                <p>后台 · 第七码头</p>
                <h2 id="sound-stage-title">声场控制台</h2>
              </div>
              <button
                type="button"
                className={styles.closeButton}
                aria-label="收起声场"
                onClick={() => dispatch(closeSoundStageDrawer())}
              >
                收
              </button>
            </div>

            <div className={styles.mixer}>
              {VOLUME_CONTROLS.map((control) => (
                <label key={control.key} className={styles.fader}>
                  <span className={styles.faderMark} aria-hidden="true">
                    {control.mark}
                  </span>
                  <span>{control.label}</span>
                  <input
                    type="range"
                    aria-label={control.label}
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings[control.key]}
                    disabled={settingsBusy}
                    onChange={changeVolume(control.key)}
                  />
                  <output>{Math.round(settings[control.key] * 100)}</output>
                </label>
              ))}
            </div>

            <section className={styles.pacing} aria-labelledby="pacing-title">
              <div>
                <p>落锣节奏</p>
                <h3 id="pacing-title">演出速度</h3>
              </div>
              <div className={styles.speedButtons}>
                <button
                  type="button"
                  aria-label="完整演出"
                  aria-pressed={settings.presentationSpeed === 'full'}
                  disabled={settingsBusy}
                  onClick={() => changeSpeed('full')}
                >
                  完整演出
                  <small>章法尽显</small>
                </button>
                <button
                  type="button"
                  aria-label="利落演出"
                  aria-pressed={settings.presentationSpeed === 'brisk'}
                  disabled={settingsBusy}
                  onClick={() => changeSpeed('brisk')}
                >
                  利落演出
                  <small>快起快落</small>
                </button>
              </div>
            </section>

            <div className={styles.statusLine}>
              <span>{settings.muted ? '总场已静音，原音量仍保留' : '声场待命'}</span>
              <span>{settingsBusy ? '正在落印…' : '仅存于此设备'}</span>
            </div>
            {settingsError ? <p className={styles.error}>{settingsError}</p> : null}
          </aside>
        </div>
      ) : null}
    </>
  );
}
