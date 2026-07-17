import { motion } from 'motion/react';

import { submitRunCommand } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import styles from './ShopScreen.module.css';

export function ShopScreen() {
  const dispatch = useAppDispatch();
  const { run, busy } = useAppSelector((state) => state.app);
  if (!run?.shop) return null;

  const commandCheckpoint = run.checkpointId;

  return (
    <motion.div
      className={styles.screen}
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className={styles.header}>
        <div>
          <p>盲注已破 · 幕间采买</p>
          <h1>百戏夜市 · 试演摊位</h1>
        </div>
        <div className={styles.wallet}>
          <span>手中戏票</span>
          <strong>¥{run.money}</strong>
        </div>
      </header>

      <main className={styles.market}>
        <section className={styles.offerSection}>
          <div className={styles.sectionTitle}>
            <div>
              <span>掌柜今夜摆出</span>
              <strong>幕间奇货</strong>
            </div>
            <button
              type="button"
              aria-label="重掷商品"
              disabled={busy || run.money < run.shop.rerollCost}
              onClick={() =>
                void dispatch(
                  submitRunCommand({
                    type: 'reroll-shop',
                    checkpointId: commandCheckpoint,
                  }),
                )
              }
            >
              重掷 · ¥{run.shop.rerollCost}
            </button>
          </div>

          <div className={styles.offers}>
            {run.shop.offers.map((offer, index) => (
              <motion.article
                className={`${styles.offer} ${
                  offer.kind === 'joker' ? styles.jokerOffer : styles.consumableOffer
                }`}
                key={offer.id}
                initial={{ y: 18, opacity: 0, rotate: index === 0 ? -1 : 1 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
                transition={{ delay: index * 0.08 }}
              >
                <span className={styles.offerKind}>
                  {offer.kind === 'joker' ? '奇牌挂牌' : '消耗道具'}
                </span>
                <div className={styles.offerIcon} aria-hidden="true">
                  {offer.kind === 'joker' ? '鼓' : '换'}
                </div>
                <h2>{offer.name}</h2>
                <p>{offer.description}</p>
                <button
                  type="button"
                  aria-label={`购买 ${offer.name}`}
                  disabled={busy || run.money < offer.cost}
                  onClick={() =>
                    void dispatch(
                      submitRunCommand({
                        type: 'buy-shop-offer',
                        checkpointId: commandCheckpoint,
                        offerId: offer.id,
                      }),
                    )
                  }
                >
                  <span>收入戏箱</span>
                  <strong>¥{offer.cost}</strong>
                </button>
              </motion.article>
            ))}
            {run.shop.offers.length === 0 ? (
              <div className={styles.soldOut}>今夜货架已空</div>
            ) : null}
          </div>
        </section>

        <aside className={styles.inventory}>
          <div className={styles.inventoryTitle}>
            <span>随身戏箱</span>
            <strong>持有奇牌 {run.jokers.length} / 5</strong>
          </div>
          <div className={styles.ownedJokers}>
            {run.jokers.map((joker, index) => (
              <article key={joker.instanceId}>
                <span>第 {index + 1} 位</span>
                <strong>{joker.name}</strong>
                <em>倍率 ×{joker.handMultiplier}</em>
                <div>
                  <button
                    type="button"
                    aria-label={`左移 ${joker.name}`}
                    disabled={busy || index === 0}
                    onClick={() =>
                      void dispatch(
                        submitRunCommand({
                          type: 'reorder-joker',
                          checkpointId: commandCheckpoint,
                          jokerInstanceId: joker.instanceId,
                          toIndex: index - 1,
                        }),
                      )
                    }
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    aria-label={`右移 ${joker.name}`}
                    disabled={busy || index === run.jokers.length - 1}
                    onClick={() =>
                      void dispatch(
                        submitRunCommand({
                          type: 'reorder-joker',
                          checkpointId: commandCheckpoint,
                          jokerInstanceId: joker.instanceId,
                          toIndex: index + 1,
                        }),
                      )
                    }
                  >
                    →
                  </button>
                  <button
                    type="button"
                    aria-label={`出售 ${joker.name}`}
                    disabled={busy}
                    onClick={() =>
                      void dispatch(
                        submitRunCommand({
                          type: 'sell-joker',
                          checkpointId: commandCheckpoint,
                          jokerInstanceId: joker.instanceId,
                        }),
                      )
                    }
                  >
                    售 ¥{joker.sellPrice}
                  </button>
                </div>
              </article>
            ))}
          </div>
          <div className={styles.consumables}>
            <span>道具 {run.consumables.length} / 2</span>
            {run.consumables.map((item) => (
              <strong key={item.instanceId}>{item.name}</strong>
            ))}
          </div>
        </aside>
      </main>

      <footer className={styles.footer}>
        <p>
          <span>本幕得分</span>
          <strong>{run.roundScore}</strong>
          <em>已自动保存至检查点 #{run.checkpointId}</em>
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void dispatch(
              submitRunCommand({
                type: 'leave-shop',
                checkpointId: commandCheckpoint,
              }),
            )
          }
        >
          收摊 · 完成试玩
        </button>
      </footer>
    </motion.div>
  );
}
