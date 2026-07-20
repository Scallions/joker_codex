import { resumeRun, showMenu, startLocalProductionRun } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { selectHandReference, TERMINOLOGY_REFERENCE } from '../../tutorial/reference';
import { TUTORIAL_FIXED_SEED } from '../../tutorial/script';
import { PaperLedger } from '../components/StagePrimitives';
import styles from './ProgressionScreens.module.css';

export function HelpReferenceScreen() {
  const dispatch = useAppDispatch();
  const { run, profiles, activeProfileId, busy } = useAppSelector((state) => state.app);
  const profile = profiles.find((item) => item.id === activeProfileId);
  const hands = selectHandReference(run);
  const canReplayTutorial =
    !run && profile !== undefined && profile.tutorial.status !== 'not-started';

  return (
    <PaperLedger className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p>随时查阅 · 当前牌局等级会同步显示</p>
          <h1>牌型与术语</h1>
        </div>
        <div className={styles.headerActions}>
          {canReplayTutorial ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void dispatch(
                  startLocalProductionRun({
                    runClass: 'tutorial',
                    seed: TUTORIAL_FIXED_SEED,
                  }),
                )
              }
            >
              重温入门教程
            </button>
          ) : null}
          <button type="button" onClick={() => dispatch(run ? resumeRun() : showMenu())}>
            {run ? '返回牌局' : '返回主菜单'}
          </button>
        </div>
      </header>

      <div className={styles.scrollArea}>
        <div className={styles.referenceGrid}>
          {hands.map((hand) => (
            <article
              key={hand.handType}
              className={styles.referenceRow}
              data-hand-reference-row
            >
              <strong>{hand.name}</strong>
              <span>
                基础 {hand.baseChips} 筹码 × {hand.baseMultiplier} 倍率
              </span>
              <span>当前等级 {hand.currentLevel}</span>
            </article>
          ))}
        </div>

        <ul className={styles.termList}>
          {TERMINOLOGY_REFERENCE.map(([term, explanation]) => (
            <li key={term}>
              <strong>{term}：</strong>
              {explanation}
            </li>
          ))}
        </ul>
      </div>
    </PaperLedger>
  );
}
