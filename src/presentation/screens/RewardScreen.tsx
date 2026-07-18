import { motion } from 'motion/react';

import { submitRunCommand } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import styles from './DecisionScreen.module.css';

export function RewardScreen() {
  const dispatch = useAppDispatch();
  const { run, busy } = useAppSelector((state) => state.app);
  if (!run || run.phase.kind !== 'round-reward' || !run.economy.pendingReward)
    return null;
  const receipt = run.economy.pendingReward;
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
      <section className={styles.receipt}>
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
          <div>
            <dt>破幕赏</dt>
            <dd>¥{receipt.blindReward}</dd>
          </div>
          <div>
            <dt>余手赏</dt>
            <dd>¥{receipt.remainingHandReward}</dd>
          </div>
          <div>
            <dt>聚财利息</dt>
            <dd>¥{receipt.interestReward}</dd>
          </div>
          {receipt.effectLines.map((line) => (
            <div key={line.id}>
              <dt>{line.label}</dt>
              <dd>¥{line.amount}</dd>
            </div>
          ))}
          <div className={styles.total}>
            <dt>合计</dt>
            <dd>¥{receipt.total}</dd>
          </div>
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
      </section>
    </motion.div>
  );
}
