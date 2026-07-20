import { skipActiveTutorial } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { TUTORIAL_STEPS } from '../../tutorial/script';
import styles from './ProgressionScreens.module.css';

export function TutorialCoach() {
  const dispatch = useAppDispatch();
  const { profiles, activeProfileId, busy } = useAppSelector((state) => state.app);
  const profile = profiles.find((item) => item.id === activeProfileId);
  const step = TUTORIAL_STEPS.find(
    ({ stepId }) => stepId === profile?.tutorial.currentStepId,
  );
  if (!profile || !step) return null;

  return (
    <aside className={styles.coach}>
      <small>入门教程 · 第 {step.ordinal} / 8 步</small>
      <h2>{step.title}</h2>
      <p>{step.instruction}</p>
      <p>{step.explanation}</p>
      <button
        type="button"
        className={styles.button}
        disabled={busy}
        onClick={() => {
          if (window.confirm('跳过教程并返回主菜单？普通进度不会改变。')) {
            void dispatch(skipActiveTutorial({}));
          }
        }}
      >
        跳过教程
      </button>
    </aside>
  );
}
