import { useEffect, useRef, useState } from 'react';

import { selectStageScene } from '../../app/selectStageScene';
import { useAppSelector } from '../../app/store/hooks';
import type { DeviceSettingsV1 } from '../../persistence/deviceSettings';
import type {
  PresentationAudioId,
  PresentationSceneId,
} from '../assets/presentationAssets';
import { audioIdForCue, audioIdForProgressionNotice } from './audioMap';
import { PresentationAudioEngine, type PresentationAudioStatus } from './audioEngine';
import styles from './AudioDirector.module.css';

export interface AudioDirectorEngine {
  getStatus(): PresentationAudioStatus;
  unlock(): Promise<boolean>;
  setSettings(settings: DeviceSettingsV1): void;
  setScene(sceneId: PresentationSceneId): void;
  playOneShot(id: PresentationAudioId, cueKey: string): Promise<boolean>;
  suspend(): Promise<void>;
  resume(): Promise<void>;
  destroy(): Promise<void>;
}

export interface AudioDirectorProps {
  readonly createEngine?: () => AudioDirectorEngine;
}

function createDefaultEngine(): AudioDirectorEngine {
  return new PresentationAudioEngine();
}

export function AudioDirector({
  createEngine = createDefaultEngine,
}: AudioDirectorProps) {
  const { activeProfileId, presentationSequence, profiles, run, settings, status } =
    useAppSelector((state) => state.app);
  const [engine] = useState(createEngine);
  const [audioStatus, setAudioStatus] = useState<PresentationAudioStatus>(() =>
    engine.getStatus(),
  );
  const destroyTimer = useRef<number | null>(null);
  const sceneId = selectStageScene(status, run?.phase.kind);
  const cue = presentationSequence?.cues[presentationSequence.cursor];
  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
  const notice = presentationSequence ? undefined : activeProfile?.unreadNotices.at(-1);

  useEffect(() => {
    engine.setSettings(settings);
  }, [engine, settings]);

  useEffect(() => {
    engine.setScene(sceneId);
  }, [engine, sceneId]);

  useEffect(() => {
    const refreshStatus = () => setAudioStatus(engine.getStatus());
    const handleActivation = (event: Event) => {
      if (!event.isTrusted) return;
      void engine.unlock().then((unlocked) => {
        refreshStatus();
        if (unlocked) removeActivationListeners();
      });
    };
    const removeActivationListeners = () => {
      window.removeEventListener('pointerdown', handleActivation);
      window.removeEventListener('keydown', handleActivation);
    };

    window.addEventListener('pointerdown', handleActivation, { passive: true });
    window.addEventListener('keydown', handleActivation);
    return removeActivationListeners;
  }, [engine]);

  useEffect(() => {
    if (!cue) return;
    let active = true;
    void engine
      .playOneShot(audioIdForCue(cue), `${presentationSequence.sequenceId}:${cue.cueId}`)
      .finally(() => {
        if (active) setAudioStatus(engine.getStatus());
      });
    return () => {
      active = false;
    };
  }, [audioStatus.kind, cue, engine, presentationSequence]);

  useEffect(() => {
    if (!notice) return;
    let active = true;
    void engine
      .playOneShot(
        audioIdForProgressionNotice(notice),
        `progression-notice:${notice.noticeId}`,
      )
      .finally(() => {
        if (active) setAudioStatus(engine.getStatus());
      });
    return () => {
      active = false;
    };
  }, [audioStatus.kind, engine, notice]);

  useEffect(() => {
    let active = true;
    const updateStatus = () => {
      if (active) setAudioStatus(engine.getStatus());
    };
    const handleVisibility = () => {
      const action = document.hidden ? engine.suspend() : engine.resume();
      void action.finally(updateStatus);
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      active = false;
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [engine]);

  useEffect(() => {
    if (destroyTimer.current !== null) {
      window.clearTimeout(destroyTimer.current);
      destroyTimer.current = null;
    }
    return () => {
      destroyTimer.current = window.setTimeout(() => {
        destroyTimer.current = null;
        void engine.destroy();
      }, 0);
    };
  }, [engine]);

  if (audioStatus.kind !== 'error') {
    return <span hidden data-audio-status={audioStatus.kind} />;
  }

  return (
    <p className={styles.warning} data-audio-status="error">
      声场暂时静默，牌局仍可继续。
      {audioStatus.message ? ` ${audioStatus.message}` : ''}
    </p>
  );
}
