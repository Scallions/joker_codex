import { motion } from 'motion/react';

import { submitRunCommand } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { saleValue } from '../../game-core/economy/pricing';
import styles from './ShopScreen.module.css';

export function ShopScreen() {
  const dispatch = useAppDispatch();
  const { run, busy } = useAppSelector((state) => state.app);
  if (!run || run.phase.kind !== 'shop' || !run.shop) return null;
  const shop = run.shop;
  const checkpointId = run.checkpointId;
  const available = run.economy.money + run.rules.allowedDebt;
  const rerollPrice = shop.freeRerollAvailable ? 0 : shop.rerollCost;

  return (
    <motion.div
      className={styles.screen}
      initial={{ opacity: 0, scale: 0.985 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <header className={styles.header}>
        <div>
          <p>
            第 {run.progress.ante} 幕 ·{' '}
            {shop.afterBlind === 'boss'
              ? '班主已破'
              : shop.afterBlind === 'big'
                ? '大幕已破'
                : '小幕已破'}
          </p>
          <h1>百戏夜市 · 幕间奇货</h1>
        </div>
        <div className={styles.wallet}>
          <span>手中戏票</span>
          <strong>¥{run.economy.money}</strong>
        </div>
      </header>

      <main className={styles.market}>
        <section className={styles.offerSection}>
          <div className={styles.sectionTitle}>
            <div>
              <span>掌柜今夜摆出</span>
              <strong>奇牌、变牌与戏牌</strong>
            </div>
            <button
              type="button"
              aria-label="重掷商品"
              disabled={busy || available < rerollPrice || shop.cardOffers.length === 0}
              onClick={() =>
                void dispatch(submitRunCommand({ type: 'reroll-shop', checkpointId }))
              }
            >
              换摊 · {rerollPrice === 0 ? '免费' : `¥${rerollPrice}`}
            </button>
          </div>

          <div className={styles.offers}>
            {shop.cardOffers.map((offer, index) => (
              <motion.article
                className={`${styles.offer} ${offer.item.kind === 'joker' ? styles.jokerOffer : styles.consumableOffer}`}
                key={offer.id}
                initial={{ y: 18, opacity: 0, rotate: index === 0 ? -1 : 1 }}
                animate={{ y: 0, opacity: 1, rotate: 0 }}
              >
                <span className={styles.offerKind}>
                  {offer.item.kind === 'joker'
                    ? '奇牌挂牌'
                    : offer.item.kind === 'consumable'
                      ? '消耗道具'
                      : '永久戏牌'}
                </span>
                <div className={styles.offerIcon} aria-hidden="true">
                  {offer.item.kind === 'joker'
                    ? '奇'
                    : offer.item.kind === 'consumable'
                      ? '变'
                      : '牌'}
                </div>
                <h2>{offer.item.name}</h2>
                <p>{offer.item.description}</p>
                <button
                  type="button"
                  aria-label={`购买 ${offer.item.name}`}
                  disabled={busy || available < offer.price}
                  onClick={() =>
                    void dispatch(
                      submitRunCommand({
                        type: 'buy-shop-offer',
                        checkpointId,
                        offerId: offer.id,
                      }),
                    )
                  }
                >
                  <span>收入戏箱</span>
                  <strong>¥{offer.price}</strong>
                </button>
              </motion.article>
            ))}
            {shop.packOffers.map((offer) => (
              <article className={`${styles.offer} ${styles.jokerOffer}`} key={offer.id}>
                <span className={styles.offerKind}>密封卡包</span>
                <div className={styles.offerIcon} aria-hidden="true">
                  封
                </div>
                <h2>{offer.name}</h2>
                <p>{offer.description}</p>
                <button
                  type="button"
                  aria-label={`购买 ${offer.name}`}
                  disabled={busy || available < offer.price}
                  onClick={() =>
                    void dispatch(
                      submitRunCommand({
                        type: 'buy-pack',
                        checkpointId,
                        offerId: offer.id,
                      }),
                    )
                  }
                >
                  <span>当场拆封</span>
                  <strong>{offer.price === 0 ? '赠' : `¥${offer.price}`}</strong>
                </button>
              </article>
            ))}
            {shop.cardOffers.length + shop.packOffers.length === 0 ? (
              <div className={styles.soldOut}>今夜货架已空</div>
            ) : null}
          </div>

          {shop.voucherOffer ? (
            <article className={styles.soldOut}>
              <strong>{shop.voucherOffer.name}</strong> · {shop.voucherOffer.description}
              <button
                type="button"
                aria-label={`兑换 ${shop.voucherOffer.name}`}
                disabled={busy || available < shop.voucherOffer.price}
                onClick={() =>
                  void dispatch(
                    submitRunCommand({
                      type: 'buy-voucher',
                      checkpointId,
                      offerId: shop.voucherOffer!.id,
                    }),
                  )
                }
              >
                兑换木牌 · ¥{shop.voucherOffer.price}
              </button>
            </article>
          ) : null}
        </section>

        <aside className={styles.inventory}>
          <div className={styles.inventoryTitle}>
            <span>随身戏箱</span>
            <strong>
              持有奇牌 {run.inventory.jokers.length} / {run.rules.jokerSlots}
            </strong>
          </div>
          <div className={styles.ownedJokers}>
            {run.inventory.jokers.map((joker, index) => {
              const value = saleValue(
                joker.baseCost,
                joker.editionCost,
                run.rules.priceDiscountBasisPoints,
                joker.sellValueOverride,
              );
              return (
                <article key={joker.instanceId}>
                  <span>第 {index + 1} 位</span>
                  <strong>{joker.name}</strong>
                  <em>{joker.description}</em>
                  <div>
                    <button
                      type="button"
                      aria-label={`左移 ${joker.name}`}
                      disabled={busy || index === 0}
                      onClick={() =>
                        void dispatch(
                          submitRunCommand({
                            type: 'reorder-joker',
                            checkpointId,
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
                      disabled={busy || index === run.inventory.jokers.length - 1}
                      onClick={() =>
                        void dispatch(
                          submitRunCommand({
                            type: 'reorder-joker',
                            checkpointId,
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
                            checkpointId,
                            jokerInstanceId: joker.instanceId,
                          }),
                        )
                      }
                    >
                      售 ¥{value}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
          <div className={styles.consumables}>
            <span>
              道具 {run.inventory.consumables.length} / {run.rules.consumableSlots}
            </span>
            {run.inventory.consumables.map((item) => (
              <div key={item.instanceId}>
                <strong>{item.name}</strong>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void dispatch(
                      submitRunCommand({
                        type: 'begin-consumable-choice',
                        checkpointId,
                        consumableInstanceId: item.instanceId,
                      }),
                    )
                  }
                >
                  使用
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    void dispatch(
                      submitRunCommand({
                        type: 'sell-consumable',
                        checkpointId,
                        consumableInstanceId: item.instanceId,
                      }),
                    )
                  }
                >
                  出售
                </button>
              </div>
            ))}
          </div>
        </aside>
      </main>

      <footer className={styles.footer}>
        <p>
          <span>已破幕数</span>
          <strong>{run.history.completedBlindIds.length}</strong>
          <em>已自动保存至检查点 #{run.checkpointId}</em>
        </p>
        <button
          type="button"
          disabled={busy}
          onClick={() =>
            void dispatch(submitRunCommand({ type: 'leave-shop', checkpointId }))
          }
        >
          收摊 · 前往下一幕
        </button>
      </footer>
    </motion.div>
  );
}
