import { motion } from 'motion/react';

import { finishLocalRun } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { isRunStateV3 } from '../../game-core/model/runV3';
import { isRunStateV7 } from '../../game-core/model/runV7';
import { formatScore } from '../../game-core/score/score';
import {
  PROGRESSION_CONTENT_VERSION,
  serializeSeedCode,
} from '../../progression/seedCode';
import styles from './ResultScreen.module.css';

export function ResultScreen() {
  const dispatch = useAppDispatch();
  const { run, busy, profiles, activeProfileId } = useAppSelector((state) => state.app);
  if (!run || (run.phase.kind !== 'run-lost' && run.phase.kind !== 'finished'))
    return null;

  const won = run.phase.kind === 'finished';
  const profile = profiles.find((item) => item.id === activeProfileId);
  const delta =
    profile?.lastResultSummary?.runId === run.runId ? profile.lastResultSummary : null;
  const runClass = isRunStateV7(run) ? run.sessionV7.runClass : null;
  const isTutorial = runClass === 'tutorial';
  const modeName =
    runClass === 'campaign'
      ? '普通战役'
      : runClass === 'seeded'
        ? '种子牌局 · 不推进永久进度'
        : runClass === 'challenge'
          ? '挑战模式'
          : runClass === 'tutorial'
            ? '入门教程'
            : '本地牌局';
  const frozenRows = isRunStateV3(run)
    ? new Map(run.productionContentV3.rows.map((row) => [row.definition.id, row]))
    : null;
  const deckRow = isRunStateV3(run) ? frozenRows?.get(run.setupV3.deckId) : null;
  const stakeRow = isRunStateV3(run) ? frozenRows?.get(run.setupV3.stakeId) : null;
  const challengeRow =
    isRunStateV3(run) && run.setupV3.challengeId
      ? frozenRows?.get(run.setupV3.challengeId)
      : null;
  const seededShareCode =
    runClass === 'seeded' &&
    isRunStateV3(run) &&
    run.contentVersion === PROGRESSION_CONTENT_VERSION &&
    deckRow &&
    stakeRow
      ? serializeSeedCode({
          contentVersion: PROGRESSION_CONTENT_VERSION,
          seed: run.seed,
          deckReference: deckRow.definition.referenceIndex,
          stakeReference: stakeRow.definition.referenceIndex,
          deckId: run.setupV3.deckId,
          stakeId: run.setupV3.stakeId,
        })
      : null;
  return (
    <motion.div
      className={`${styles.screen} ${won ? styles.won : styles.lost} ${isTutorial ? styles.tutorial : ''}`}
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
        <p>
          {modeName} · {won ? '已完成' : '未完成'}
        </p>
        <h1>
          {isTutorial
            ? '八步入门 · 8/8 完成'
            : won
              ? '今夜压轴，满堂喝彩'
              : '锣声已止，再排一场'}
        </h1>
        <span>
          {isTutorial
            ? '盲注、理牌、结算与夜市已经走完；下一场可以按自己的节奏登台。'
            : won
              ? '你把最后一手钉进朱砂印，百戏夜场为你亮到天明。'
              : '牌已收拢，戏台仍在。换个种子，再来一手。'}
        </span>
      </div>

      {!isTutorial ? (
        <div className={styles.setupIdentity}>
          {deckRow ? (
            <span>
              牌组：{deckRow.definition.referenceIndex} · {deckRow.name}
            </span>
          ) : null}
          {stakeRow ? (
            <span>
              筹码：{stakeRow.definition.referenceIndex} · {stakeRow.name}
            </span>
          ) : null}
          {challengeRow ? (
            <span>
              挑战：{challengeRow.definition.referenceIndex} · {challengeRow.name}
            </span>
          ) : null}
          <span>种子：{run.seed}</span>
          <span>内容版本：{run.contentVersion}</span>
        </div>
      ) : null}

      {seededShareCode ? (
        <div className={styles.seedCode}>
          <code>{seededShareCode}</code>
          <button
            type="button"
            aria-label="复制本局分享码"
            onClick={() => void navigator.clipboard?.writeText(seededShareCode)}
          >
            复制本局分享码
          </button>
        </div>
      ) : null}

      {isTutorial ? (
        <section className={styles.learningRecap} aria-label="八步所学">
          <article>
            <h2>识幕</h2>
            <p>选择盲注，读懂目标与奖励。</p>
          </article>
          <article>
            <h2>理牌</h2>
            <p>选牌、出牌、弃牌并整理手牌。</p>
          </article>
          <article>
            <h2>结算</h2>
            <p>观察筹码倍率，领取戏票。</p>
          </article>
          <article>
            <h2>夜市</h2>
            <p>购买奇牌，拆包并使用消耗牌。</p>
          </article>
        </section>
      ) : (
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
      )}

      <div className={styles.lastHand}>
        <span>最后一手</span>
        <strong>{run.lastHand?.handName ?? '未曾出牌'}</strong>
        <em>{run.lastHand ? `+${run.lastHand.score}` : '—'}</em>
      </div>

      {isTutorial ? (
        <section className={styles.delta}>
          <h2>教程说明：不会写入普通进度</h2>
          <p>本次练习不会改变普通解锁、收藏、成就与统计。</p>
        </section>
      ) : delta ? (
        <section className={styles.delta}>
          <h2>本局永久进度</h2>
          <div className={styles.deltaCounts}>
            <span>内容解锁 {delta.objectiveIds.length}</span>
            <span>奇牌发现 {delta.discoveredJokerIds.length}</span>
            <span>成就题名 {delta.achievementIds.length}</span>
            <span>胜幕印记 {delta.victoryMarkContentIds.length}</span>
            <span>统计更新 {delta.statisticKeys.length}</span>
          </div>
          <details className={styles.deltaDetails}>
            <summary>查看完整变动</summary>
            <dl>
              <div>
                <dt>内容解锁</dt>
                <dd>
                  {delta.objectiveIds.length
                    ? delta.objectiveIds.map((id) => <code key={id}>{id}</code>)
                    : '无'}
                </dd>
              </div>
              <div>
                <dt>奇牌发现</dt>
                <dd>
                  {delta.discoveredJokerIds.length
                    ? delta.discoveredJokerIds.map((id) => <code key={id}>{id}</code>)
                    : '无'}
                </dd>
              </div>
              <div>
                <dt>成就题名</dt>
                <dd>
                  {delta.achievementIds.length
                    ? delta.achievementIds.map((id) => <code key={id}>{id}</code>)
                    : '无'}
                </dd>
              </div>
              <div>
                <dt>胜幕印记</dt>
                <dd>
                  {delta.victoryMarkContentIds.length
                    ? delta.victoryMarkContentIds.map((id) => <code key={id}>{id}</code>)
                    : '无'}
                </dd>
              </div>
              <div>
                <dt>统计更新</dt>
                <dd>
                  {delta.statisticKeys.length
                    ? delta.statisticKeys.map((key) => <code key={key}>{key}</code>)
                    : '无'}
                </dd>
              </div>
            </dl>
          </details>
        </section>
      ) : runClass === 'seeded' ? (
        <section className={styles.delta}>
          <h2>本局永久进度</h2>
          <p>此模式不改变普通解锁、收藏、成就与统计。</p>
        </section>
      ) : null}

      <button
        type="button"
        disabled={busy}
        onClick={() => void dispatch(finishLocalRun())}
      >
        {busy ? '正在收卷…' : '返回主菜单'}
      </button>
      <p className={styles.checkpoint}>结局已保存 · 检查点 #{run.checkpointId}</p>
    </motion.div>
  );
}
