import { motion } from 'motion/react';

import { submitRunCommand } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import type { Rank, Suit } from '../../game-core/model/cards';
import styles from './DecisionScreen.module.css';

const SUIT: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦',
};
const RANK: Record<Rank, string> = {
  '2': '2',
  '3': '3',
  '4': '4',
  '5': '5',
  '6': '6',
  '7': '7',
  '8': '8',
  '9': '9',
  '10': '10',
  jack: 'J',
  queen: 'Q',
  king: 'K',
  ace: 'A',
};

export function ChoiceScreen() {
  const dispatch = useAppDispatch();
  const { run, busy } = useAppSelector((state) => state.app);
  if (!run || run.phase.kind !== 'choice' || !run.pendingChoice) return null;
  const choice = run.pendingChoice.current;
  const command = <T extends Parameters<typeof submitRunCommand>[0]>(value: T) =>
    void dispatch(submitRunCommand(value));

  if (choice.kind === 'pack') {
    return (
      <motion.div
        className={styles.screen}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <header className={styles.header}>
          <div>
            <p>卡包已拆 · 选项已落印</p>
            <h1>还可挑选 {choice.remainingPicks} 件</h1>
          </div>
          <div className={styles.wallet}>
            <span>手中戏票</span>
            <strong>¥{run.economy.money}</strong>
          </div>
        </header>
        <section className={styles.options}>
          {choice.options.map((option) => (
            <article className={styles.option} key={option.id}>
              <small>
                {option.item.kind === 'joker'
                  ? '奇牌'
                  : option.item.kind === 'consumable'
                    ? '变牌诀'
                    : '永久戏牌'}
              </small>
              <h2>{option.item.name}</h2>
              <p>{option.item.description}</p>
              {option.item.generatedCard ? (
                <span className={styles.tag}>
                  {SUIT[option.item.generatedCard.suit]}{' '}
                  {RANK[option.item.generatedCard.rank]}
                </span>
              ) : null}
              <button
                type="button"
                disabled={busy || option.consumed}
                onClick={() =>
                  command({
                    type: 'choose-pack-option',
                    checkpointId: run.checkpointId,
                    choiceId: choice.id,
                    optionId: option.id,
                  })
                }
              >
                {option.consumed ? '已取' : '选此件'}
              </button>
            </article>
          ))}
        </section>
        <div className={styles.footerActions}>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              command({
                type: 'skip-pack',
                checkpointId: run.checkpointId,
                choiceId: choice.id,
              })
            }
          >
            放弃余项
          </button>
        </div>
      </motion.div>
    );
  }

  if (choice.kind === 'boss-reroll') {
    return (
      <motion.div
        className={styles.screen}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <section className={styles.hero}>
          <div className={styles.heroSeal}>换</div>
          <p className={styles.kicker}>木牌特权 · 一幕一次</p>
          <h1>花 ¥{choice.cost} 更换班主？</h1>
          <p>候选名单已冻结，确认后才会扣款并抽取替补班主；取消不会消耗随机状态。</p>
          <div className={styles.footerActions}>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                command({
                  type: 'cancel-choice',
                  checkpointId: run.checkpointId,
                  choiceId: choice.id,
                })
              }
            >
              仍战原班
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                command({
                  type: 'confirm-choice',
                  checkpointId: run.checkpointId,
                  choiceId: choice.id,
                })
              }
            >
              确认换班
            </button>
          </div>
        </section>
      </motion.div>
    );
  }

  const selected = new Set(choice.selectedIds);
  const labels = new Map<string, string>();
  for (const card of run.deck.cards)
    labels.set(card.id, `${SUIT[card.suit]} ${RANK[card.rank]}`);
  for (const joker of run.inventory.jokers) labels.set(joker.instanceId, joker.name);
  for (const item of run.inventory.consumables) labels.set(item.instanceId, item.name);
  return (
    <motion.div
      className={styles.screen}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <header className={styles.header}>
        <div>
          <p>效果待决 · 检查点已保存</p>
          <h1>
            选择 {choice.minimumTargets} 至 {choice.maximumTargets} 个目标
          </h1>
        </div>
      </header>
      <section className={styles.choicePanel}>
        <div className={styles.targetGrid}>
          {choice.eligibleIds.map((id) => (
            <button
              key={id}
              type="button"
              data-selected={String(selected.has(id))}
              disabled={busy}
              onClick={() =>
                command({
                  type: 'toggle-choice-target',
                  checkpointId: run.checkpointId,
                  choiceId: choice.id,
                  targetId: id,
                })
              }
            >
              {labels.get(id) ?? id}
            </button>
          ))}
        </div>
        <div className={styles.footerActions}>
          {choice.optional ? (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                command({
                  type: 'cancel-choice',
                  checkpointId: run.checkpointId,
                  choiceId: choice.id,
                })
              }
            >
              取消
            </button>
          ) : null}
          <button
            type="button"
            disabled={
              busy ||
              selected.size < choice.minimumTargets ||
              selected.size > choice.maximumTargets
            }
            onClick={() =>
              command({
                type: 'confirm-choice',
                checkpointId: run.checkpointId,
                choiceId: choice.id,
              })
            }
          >
            确认施行
          </button>
        </div>
      </section>
    </motion.div>
  );
}
