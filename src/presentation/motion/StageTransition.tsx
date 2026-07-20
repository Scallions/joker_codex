import type { PresentationSceneId } from '../assets/presentationAssets';
import { transitionKindForScene } from './motionTokens';
import styles from './StageTransition.module.css';

export function StageTransition({ sceneId }: { readonly sceneId: PresentationSceneId }) {
  const kind = transitionKindForScene(sceneId);

  return (
    <div
      key={sceneId}
      className={styles.transition}
      data-scene-id={sceneId}
      data-transition-kind={kind}
      aria-hidden="true"
    >
      <i />
      <i />
      <span />
    </div>
  );
}
