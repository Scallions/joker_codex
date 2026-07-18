import { motion } from 'motion/react';

import { submitRunCommand } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import styles from './DecisionScreen.module.css';

export function RunWonScreen() {
  const dispatch = useAppDispatch();
  const { run, busy } = useAppSelector((state) => state.app);
  if (!run || run.phase.kind !== 'run-won') return null;
  return (
    <motion.div
      className={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <section className={styles.hero}>
        <motion.div
          className={styles.heroSeal}
          initial={{ scale: 1.8 }}
          animate={{ scale: 1 }}
        >
          胜
        </motion.div>
        <p className={styles.kicker}>八幕尽破 · 满堂喝彩</p>
        <h1>百戏压轴，今夜留名</h1>
        <p>
          第八幕班主已经退场。你可以收卷谢幕，也可以把这副戏箱带进第九幕，继续挑战无尽加演。
        </p>
        <div className={styles.footerActions}>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void dispatch(
                submitRunCommand({ type: 'finish-run', checkpointId: run.checkpointId }),
              )
            }
          >
            收卷谢幕
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void dispatch(
                submitRunCommand({
                  type: 'enter-endless',
                  checkpointId: run.checkpointId,
                }),
              )
            }
          >
            进入无尽加演
          </button>
        </div>
      </section>
    </motion.div>
  );
}
