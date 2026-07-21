import { useState } from 'react';

import { skipActiveTutorial } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { TUTORIAL_STEPS, tutorialInstructionForPhase } from '../../tutorial/script';
import styles from './ProgressionScreens.module.css';

export function TutorialCoach() {
  const dispatch = useAppDispatch();
  const [detailOpen, setDetailOpen] = useState(false);
  const { profiles, activeProfileId, busy, run } = useAppSelector((state) => state.app);
  const profile = profiles.find((item) => item.id === activeProfileId);
  const step = TUTORIAL_STEPS.find(
    ({ stepId }) => stepId === profile?.tutorial.currentStepId,
  );
  if (!profile || !step) return null;
  const instruction = tutorialInstructionForPhase(step, run?.phase.kind ?? null);

  const skipTutorial = () => {
    if (window.confirm('跳过教程并返回主菜单？普通进度不会改变。')) {
      void dispatch(skipActiveTutorial({}));
    }
  };

  return (
    <>
      <aside className={styles.coach}>
        <div className={styles.coachStep}>
          <small>入门 · {step.ordinal}/8</small>
          <h2>{step.title}</h2>
        </div>
        <p>{instruction}</p>
        <div className={styles.coachActions}>
          <button type="button" onClick={() => setDetailOpen(true)}>
            查看讲解
          </button>
          <button type="button" disabled={busy} onClick={skipTutorial}>
            跳过教程
          </button>
        </div>
      </aside>
      {detailOpen ? (
        <div className={styles.tutorialDetailScrim} data-layout-overlay="tutorial-detail">
          <section
            className={styles.tutorialDetail}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-detail-title"
          >
            <small>入门教程 · 第 {step.ordinal} / 8 步</small>
            <h2 id="tutorial-detail-title">{step.title}</h2>
            <p>{instruction}</p>
            <p>{step.explanation}</p>
            <div className={styles.tutorialDetailActions}>
              <button
                type="button"
                aria-label="关闭讲解"
                onClick={() => setDetailOpen(false)}
              >
                收起讲解
              </button>
              <button type="button" disabled={busy} onClick={skipTutorial}>
                跳过教程
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
