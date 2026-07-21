import { motion } from 'motion/react';

import { submitRunCommand } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import type { BlindPosition, MaterializedBlind } from '../../game-core/model/runV2';
import { isRunStateV3 } from '../../game-core/model/runV3';
import { formatScore } from '../../game-core/score/score';
import { selectBossRerollCostV2 } from '../../game-core/selectors/runV2';
import {
  getBlindDefinitionForPosition,
  materializeBlind,
} from '../../game-core/rules/ante';
import { blindRewardForRun, getBlindTargetForRun } from '../../game-core/rules/runtimeV3';
import styles from './DecisionScreen.module.css';

const POSITIONS: readonly BlindPosition[] = ['small', 'big', 'boss'];
const POSITION_NAME: Record<BlindPosition, string> = {
  small: '小幕',
  big: '大幕',
  boss: '班主',
};

export function BlindSelectScreen() {
  const dispatch = useAppDispatch();
  const { run, busy } = useAppSelector((state) => state.app);
  if (!run || run.phase.kind !== 'blind-select') return null;
  const currentIndex = POSITIONS.indexOf(run.progress.blindPosition);
  const blinds: readonly MaterializedBlind[] = POSITIONS.map((position) =>
    position === 'boss'
      ? run.progress.lineup.boss
      : materializeBlind(getBlindDefinitionForPosition(run.content, position)),
  );
  const tags = [run.progress.lineup.smallTagId, run.progress.lineup.bigTagId].map((id) =>
    run.content.tags.find((tag) => tag.id === id),
  );
  const bossRerollCost = selectBossRerollCostV2(run);
  const canRerollBoss =
    run.progress.blindPosition === 'boss' &&
    bossRerollCost !== null &&
    (!isRunStateV3(run) ||
      run.rulesV3.bossRerollLimitPerAnte === null ||
      run.progress.bossRerollCount < run.rulesV3.bossRerollLimitPerAnte);

  return (
    <motion.div
      className={`${styles.screen} ${styles.blindSelectScreen}`}
      data-layout-size="content"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className={styles.header}>
        <div>
          <p>{run.progress.endless ? '无尽加演' : '八幕正戏'} · 阵容已落印</p>
          <h1>第 {run.progress.ante} 幕 · 择幕登台</h1>
        </div>
        <div className={styles.wallet}>
          <span>手中戏票</span>
          <strong>¥{run.economy.money}</strong>
        </div>
      </header>

      <section className={styles.cards}>
        {POSITIONS.map((position, index) => {
          const blind = blinds[index]!;
          const current = index === currentIndex;
          const past = index < currentIndex;
          const tag = index < 2 ? tags[index] : null;
          const target = getBlindTargetForRun(run, blind.targetMultiplier);
          const reward = blindRewardForRun(run, blind.kind, blind.reward);
          return (
            <article
              className={styles.blind}
              data-current={String(current)}
              data-past={String(past)}
              key={position}
            >
              <small>
                {POSITION_NAME[position]} · {past ? '已过' : current ? '当前' : '候场'}
              </small>
              <h2>{blind.name}</h2>
              <p>{blind.description}</p>
              <div className={styles.stats}>
                <div>
                  <span>目标</span>
                  <strong>{formatScore(target)}</strong>
                </div>
                <div>
                  <span>破幕赏</span>
                  <strong>¥{reward}</strong>
                </div>
              </div>
              {tag ? <span className={styles.tag}>跳过可得 · {tag.name}</span> : null}
              {current ? (
                <div className={styles.actions}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void dispatch(
                        submitRunCommand({
                          type: 'select-blind',
                          checkpointId: run.checkpointId,
                          position,
                        }),
                      )
                    }
                  >
                    登台应战
                  </button>
                  {position !== 'boss' ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        void dispatch(
                          submitRunCommand({
                            type: 'skip-blind',
                            checkpointId: run.checkpointId,
                            position,
                          }),
                        )
                      }
                    >
                      跳过取签
                    </button>
                  ) : null}
                  {canRerollBoss ? (
                    <button
                      type="button"
                      disabled={
                        busy ||
                        bossRerollCost === null ||
                        run.economy.money + run.rules.allowedDebt < bossRerollCost
                      }
                      onClick={() =>
                        void dispatch(
                          submitRunCommand({
                            type: 'request-boss-reroll',
                            checkpointId: run.checkpointId,
                          }),
                        )
                      }
                    >
                      换班 · ¥{bossRerollCost}
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          );
        })}
      </section>
    </motion.div>
  );
}
