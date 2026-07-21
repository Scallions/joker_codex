import { useState, type ReactNode } from 'react';

import {
  PRESENTATION_SCENES_BY_ID,
  type PresentationSceneId,
} from '../assets/presentationAssets';
import { StageTransition } from '../motion/StageTransition';
import type { PresentationSpeed } from '../../persistence/deviceSettings';
import { SoundStageDrawer } from './SoundStageDrawer';
import styles from './StageMaterials.module.css';

export interface StageShellProps {
  readonly children: ReactNode;
  readonly sceneId?: PresentationSceneId;
  readonly showGlobalControls?: boolean;
  readonly presentationSpeed?: PresentationSpeed;
}

function StageScene({ sceneId }: { readonly sceneId: PresentationSceneId }) {
  const [failed, setFailed] = useState(false);
  const scene = PRESENTATION_SCENES_BY_ID[sceneId];

  return (
    <div className={styles.sceneLayer} aria-hidden="true">
      <img
        className={styles.sceneImage}
        data-load-state={failed ? 'failed' : 'ready'}
        data-testid={`stage-scene-${sceneId}`}
        src={scene.path}
        alt=""
        width={scene.width}
        height={scene.height}
        decoding="async"
        fetchPriority={sceneId === 'brand-curtain' ? 'high' : 'auto'}
        onError={() => setFailed(true)}
        style={{
          objectPosition: `${scene.focalPoint[0] * 100}% ${scene.focalPoint[1] * 100}%`,
          visibility: failed ? 'hidden' : 'visible',
        }}
      />
      <div className={styles.sceneVeil} />
    </div>
  );
}

export function StageShell({
  children,
  sceneId = 'brand-curtain',
  showGlobalControls = true,
  presentationSpeed = 'full',
}: StageShellProps) {
  return (
    <main className={styles.viewport}>
      <section
        className={styles.stage}
        aria-label="午夜百戏舞台"
        data-presentation-speed={presentationSpeed}
      >
        <StageScene key={sceneId} sceneId={sceneId} />
        <StageTransition key={`transition:${sceneId}`} sceneId={sceneId} />
        <div className={styles.curtainLeft} aria-hidden="true" />
        <div className={styles.curtainRight} aria-hidden="true" />
        <div
          className={styles.lanterns}
          data-scene-id={sceneId}
          key={`lanterns:${sceneId}`}
          aria-hidden="true"
        >
          <i />
          <i />
          <i />
          <i />
          <i />
        </div>
        {children}
        {showGlobalControls ? <SoundStageDrawer /> : null}
      </section>
    </main>
  );
}
