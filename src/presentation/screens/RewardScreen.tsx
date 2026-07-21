import { motion } from 'motion/react';

import { submitRunCommand } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { motionProfileForSpeed } from '../motion/motionTokens';
import styles from './DecisionScreen.module.css';

export function RewardScreen() {
  const dispatch = useAppDispatch();
  const { run, busy, settings } = useAppSelector((state) => state.app);
  if (!run || run.phase.kind !== 'round-reward' || !run.economy.pendingReward)
    return null;
  const receipt = run.economy.pendingReward;
  const motionProfile = motionProfileForSpeed(settings.presentationSpeed);
  const rowTransition = (index: number) => ({
    delay: (motionProfile.stageMs + index * motionProfile.staggerMs) / 1_000,
    duration: motionProfile.routineMs / 1_000,
  });
  return (
    <motion.div
      className={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className={styles.header}>
        <div>
          <p>锣落 · 清账</p>
          <h1>{run.round?.blind.name ?? '本幕'} 已破</h1>
        </div>
        <div className={styles.wallet}>
          <span>当前戏票</span>
          <strong>¥{run.economy.money}</strong>
        </div>
      </header>
      <motion.section
        className={styles.receipt}
        initial={{ opacity: 0, scaleY: 0.84, y: -18 }}
        animate={{ opacity: 1, scaleY: 1, y: 0 }}
        transition={{
          duration: motionProfile.stageMs / 1_000,
          ease: [0.2, 0.75, 0.24, 1],
        }}
        style={{ transformOrigin: 'top center' }}
      >
        <small>百戏夜场 · 赏银收据</small>
        <h2>
          第 {run.progress.ante} 幕 ·{' '}
          {run.progress.blindPosition === 'boss'
            ? '班主'
            : run.progress.blindPosition === 'big'
              ? '大幕'
              : '小幕'}
        </h2>
        <dl>
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={rowTransition(0)}
          >
            <dt>破幕赏</dt>
            <dd>¥{receipt.blindReward}</dd>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={rowTransition(1)}
          >
            <dt>余手赏</dt>
            <dd>¥{receipt.remainingHandReward}</dd>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={rowTransition(2)}
          >
            <dt>聚财利息</dt>
            <dd>¥{receipt.interestReward}</dd>
          </motion.div>
          {receipt.effectLines.map((line, index) => (
            <motion.div
              key={line.id}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={rowTransition(index + 3)}
            >
              <dt>{line.label}</dt>
              <dd>¥{line.amount}</dd>
            </motion.div>
          ))}
          <motion.div
            className={styles.total}
            initial={{ opacity: 0, scale: 1.08 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={rowTransition(receipt.effectLines.length + 3)}
          >
            <dt>合计</dt>
            <dd>¥{receipt.total}</dd>
          </motion.div>
        </dl>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void dispatch(
              submitRunCommand({
                type: 'claim-round-reward',
                checkpointId: run.checkpointId,
              }),
            )
          }
        >
          收赏入夜市
        </button>
      </motion.section>
    </motion.div>
  );
}
