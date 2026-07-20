import { motion } from 'motion/react';

import { submitRunCommand } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { isRunStateV7 } from '../../game-core/model/runV7';
import styles from './DecisionScreen.module.css';

export function RunWonScreen() {
  const dispatch = useAppDispatch();
  const { run, busy } = useAppSelector((state) => state.app);
  if (!run || run.phase.kind !== 'run-won') return null;
  const runClass = isRunStateV7(run) ? run.sessionV7.runClass : 'campaign';
  const allowEndless =
    runClass === 'campaign' || runClass === 'seeded' || runClass === 'migrated-legacy';
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
        <p className={styles.kicker}>
          {runClass === 'challenge' ? '挑战告捷 · 规则达成' : '八幕尽破 · 满堂喝彩'}
        </p>
        <h1>{runClass === 'challenge' ? '挑战谢幕，下一阵开' : '百戏压轴，今夜留名'}</h1>
        <p>
          {allowEndless
            ? '第八幕班主已经退场。你可以收卷谢幕，也可以把这副戏箱带进第九幕，继续挑战无尽加演。'
            : '本项挑战已经完成。结算后将返回主菜单，并依次开放下一项挑战。'}
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
            {runClass === 'challenge' ? '完成挑战' : '收卷谢幕'}
          </button>
          {allowEndless ? (
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
          ) : null}
        </div>
      </section>
    </motion.div>
  );
}
