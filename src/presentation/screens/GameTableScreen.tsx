import { AnimatePresence, motion } from 'motion/react';

import { finishLocalRun, showProfiles, submitRunCommand } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import type { PlayingCard, Rank, Suit } from '../../game-core/model/cards';
import { selectHandPreview } from '../../game-core/selectors/hand';
import styles from './GameTableScreen.module.css';

const SUIT_LABEL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦',
};

const SUIT_NAME: Record<Suit, string> = {
  spades: '黑桃',
  hearts: '红心',
  clubs: '梅花',
  diamonds: '方片',
};

const RANK_LABEL: Record<Rank, string> = {
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

interface CardButtonProps {
  readonly card: PlayingCard;
  readonly index: number;
  readonly count: number;
  readonly selected: boolean;
  readonly disabled: boolean;
  readonly onSelect: () => void;
}

function CardButton({
  card,
  index,
  count,
  selected,
  disabled,
  onSelect,
}: CardButtonProps) {
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  const center = (count - 1) / 2;
  return (
    <motion.button
      type="button"
      data-testid="playing-card"
      data-card-id={card.id}
      className={`${styles.card} ${red ? styles.redCard : ''} ${
        selected ? styles.selectedCard : ''
      }`}
      aria-label={`${SUIT_NAME[card.suit]} ${RANK_LABEL[card.rank]}`}
      disabled={disabled}
      onClick={onSelect}
      initial={false}
      animate={{
        y: selected ? -24 : Math.abs(index - center) * 2.2,
        rotate: (index - center) * 2.2,
      }}
      whileHover={{ y: selected ? -28 : -10, scale: 1.025 }}
      whileTap={{ scale: 0.97 }}
      transition={{ type: 'spring', stiffness: 430, damping: 28 }}
    >
      <span className={styles.cardCorner}>
        <strong>{RANK_LABEL[card.rank]}</strong>
        <i>{SUIT_LABEL[card.suit]}</i>
      </span>
      <span className={styles.cardSuit}>{SUIT_LABEL[card.suit]}</span>
      <span className={styles.cardFiber} aria-hidden="true" />
      {card.enhancement !== 'none' ? (
        <span className={styles.enhancement}>
          {card.enhancement === 'wild' ? '百搭' : '石'}
        </span>
      ) : null}
    </motion.button>
  );
}

export function GameTableScreen() {
  const dispatch = useAppDispatch();
  const { run, busy, activeProfileId, profiles } = useAppSelector((state) => state.app);
  if (!run) return null;

  const activeProfile = profiles.find((profile) => profile.id === activeProfileId);
  const preview = selectHandPreview(run);
  const selectedId = run.selectedCardIds[0];
  const selectedCount = run.selectedCardIds.length;

  const toggleCard = (card: PlayingCard) => {
    void dispatch(
      submitRunCommand({
        type: 'toggle-card',
        checkpointId: run.checkpointId,
        cardId: card.id,
      }),
    );
  };

  return (
    <motion.div
      className={styles.table}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.28 }}
    >
      <header className={styles.inventoryRail}>
        <div className={styles.brandPlate}>
          <span>百戏奇牌</span>
          <strong>{activeProfile?.displayName ?? '无名戏主'}</strong>
          <div className={styles.sessionControls}>
            <button
              type="button"
              aria-label="返回戏主名簿"
              onClick={() => dispatch(showProfiles())}
            >
              名簿
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (window.confirm('确定放弃这局试玩吗？最后检查点仍会留作恢复记录。')) {
                  void dispatch(finishLocalRun());
                }
              }}
            >
              放弃
            </button>
          </div>
        </div>
        <div className={styles.jokerSlots}>
          {run.jokers.map((joker, index) => (
            <motion.article
              className={styles.jokerPlacard}
              key={joker.instanceId}
              initial={{ y: -14, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: index * 0.06 }}
              title={joker.description}
            >
              <span>奇牌 {index + 1}</span>
              <strong>{joker.name}</strong>
              <em>×{joker.handMultiplier}</em>
            </motion.article>
          ))}
          {Array.from({ length: Math.max(0, 5 - run.jokers.length) }, (_, index) => (
            <div className={styles.emptyJokerSlot} key={`empty-joker-${String(index)}`}>
              空
            </div>
          ))}
        </div>
        <div className={styles.consumableSlots}>
          {run.consumables.map((item) => (
            <button
              type="button"
              aria-label={`使用 ${item.name}`}
              key={item.instanceId}
              className={styles.consumable}
              disabled={busy || selectedCount !== 1}
              title={item.description}
              onClick={() => {
                if (!selectedId) return;
                void dispatch(
                  submitRunCommand({
                    type: 'use-consumable',
                    checkpointId: run.checkpointId,
                    consumableInstanceId: item.instanceId,
                    cardId: selectedId,
                  }),
                );
              }}
            >
              <span>道具</span>
              <strong>{item.name}</strong>
            </button>
          ))}
        </div>
      </header>

      <aside className={styles.ledger}>
        <div className={styles.ledgerTitle}>
          <span>试演账簿</span>
          <strong>第 1 幕</strong>
        </div>
        <dl>
          <div>
            <dt>目标</dt>
            <dd>{run.targetScore}</dd>
          </div>
          <div className={styles.scoreRow}>
            <dt>当前</dt>
            <dd>{run.roundScore}</dd>
          </div>
          <div>
            <dt>出牌</dt>
            <dd>{run.handsRemaining}</dd>
          </div>
          <div>
            <dt>弃牌</dt>
            <dd>{run.discardsRemaining}</dd>
          </div>
          <div className={styles.moneyRow}>
            <dt>戏票</dt>
            <dd>¥{run.money}</dd>
          </div>
        </dl>
        <p>检查点 #{run.checkpointId}</p>
      </aside>

      <section className={styles.centerStage}>
        <div className={styles.blindBanner}>
          <span>基础试演 · 需达成 {run.targetScore} 分</span>
          <strong>幕一 · 试演盲注</strong>
        </div>
        <div className={styles.scoreSeal}>
          <span>本幕得分</span>
          <strong>{run.roundScore}</strong>
          <i aria-hidden="true">百戏</i>
          <AnimatePresence mode="wait">
            {run.lastHand ? (
              <motion.p
                key={run.checkpointId}
                initial={{ scale: 1.4, opacity: 0, rotate: -5 }}
                animate={{ scale: 1, opacity: 1, rotate: -2 }}
                exit={{ opacity: 0 }}
              >
                本手 · {run.lastHand.handName} +{run.lastHand.score}
              </motion.p>
            ) : (
              <p>朱砂印静候落分</p>
            )}
          </AnimatePresence>
        </div>
      </section>

      <section className={styles.handArea}>
        <div className={styles.handMeta}>
          <div>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void dispatch(
                  submitRunCommand({
                    type: 'sort-hand',
                    checkpointId: run.checkpointId,
                    mode: 'rank',
                  }),
                )
              }
            >
              按点数
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void dispatch(
                  submitRunCommand({
                    type: 'sort-hand',
                    checkpointId: run.checkpointId,
                    mode: 'suit',
                  }),
                )
              }
            >
              按花色
            </button>
          </div>
          <p>
            {preview ? `预判 · ${preview.name}` : '请选择 1 至 5 张牌'}
            <span>已选 {selectedCount} / 5</span>
          </p>
          <span>牌堆余 {run.drawPile.length}</span>
        </div>
        <div className={styles.handFan}>
          {run.hand.map((card, index) => (
            <CardButton
              card={card}
              index={index}
              count={run.hand.length}
              selected={run.selectedCardIds.includes(card.id)}
              disabled={busy}
              onSelect={() => toggleCard(card)}
              key={card.id}
            />
          ))}
        </div>
      </section>

      <aside className={styles.actionRail}>
        <button
          type="button"
          aria-label="出牌"
          className={styles.playButton}
          disabled={busy || selectedCount === 0}
          onClick={() =>
            void dispatch(
              submitRunCommand({
                type: 'play-selected',
                checkpointId: run.checkpointId,
              }),
            )
          }
        >
          <span>落牌成章</span>
          <strong>出牌</strong>
        </button>
        <button
          type="button"
          aria-label="弃牌"
          className={styles.discardButton}
          disabled={busy || selectedCount === 0 || run.discardsRemaining === 0}
          onClick={() =>
            void dispatch(
              submitRunCommand({
                type: 'discard-selected',
                checkpointId: run.checkpointId,
              }),
            )
          }
        >
          <span>另起一手</span>
          <strong>弃牌</strong>
        </button>
      </aside>
    </motion.div>
  );
}
