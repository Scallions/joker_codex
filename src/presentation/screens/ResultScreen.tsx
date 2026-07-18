import { motion } from 'motion/react';

import { finishLocalRun } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { formatScore } from '../../game-core/score/score';
import styles from './ResultScreen.module.css';

export function ResultScreen() {
  const dispatch = useAppDispatch();
  const { run, busy } = useAppSelector((state) => state.app);
  if (!run || (run.phase.kind !== 'run-lost' && run.phase.kind !== 'finished'))
    return null;

  const won = run.phase.kind === 'finished';
  return (
    <motion.div
      className={`${styles.screen} ${won ? styles.won : styles.lost}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45 }}
    >
      <div className={styles.paperCrowd} aria-hidden="true">
        {Array.from({ length: 15 }, (_, index) => (
          <i key={String(index)} />
        ))}
      </div>
      <motion.div
        className={styles.resultSeal}
        initial={{ scale: 1.8, opacity: 0, rotate: -14 }}
        animate={{ scale: 1, opacity: 1, rotate: -5 }}
        transition={{ type: 'spring', stiffness: 180, damping: 18, delay: 0.12 }}
      >
        {won ? '胜' : '散'}
      </motion.div>
      <div className={styles.copy}>
        <p>{won ? '试演盲注 · 已破' : '试演盲注 · 未破'}</p>
        <h1>{won ? '今夜压轴，满堂喝彩' : '锣声已止，再排一场'}</h1>
        <span>
          {won
            ? '你把最后一手钉进朱砂印，百戏夜场为你亮到天明。'
            : '牌已收拢，戏台仍在。换个种子，再来一手。'}
        </span>
      </div>

      <dl className={styles.summary}>
        <div>
          <dt>最终得分</dt>
          <dd>{formatScore(run.result?.score ?? run.round?.score ?? 0)}</dd>
        </div>
        <div>
          <dt>目标</dt>
          <dd>{formatScore(run.round?.targetScore ?? 0)}</dd>
        </div>
        <div>
          <dt>剩余出牌</dt>
          <dd>{run.round?.handsRemaining ?? 0}</dd>
        </div>
        <div>
          <dt>戏票</dt>
          <dd>¥{run.economy.money}</dd>
        </div>
      </dl>

      <div className={styles.lastHand}>
        <span>最后一手</span>
        <strong>{run.lastHand?.handName ?? '未曾出牌'}</strong>
        <em>{run.lastHand ? `+${run.lastHand.score}` : '—'}</em>
      </div>

      <button
        type="button"
        disabled={busy}
        onClick={() => void dispatch(finishLocalRun())}
      >
        {busy ? '正在收卷…' : '回到戏主名簿'}
      </button>
      <p className={styles.checkpoint}>结局已保存 · 检查点 #{run.checkpointId}</p>
    </motion.div>
  );
}
