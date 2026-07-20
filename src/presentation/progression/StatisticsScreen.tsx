import { showMenu } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { PRODUCTION_CATALOG } from '../../content/productionCatalog';
import { formatScore } from '../../game-core/score/score';
import { selectHandReference } from '../../tutorial/reference';
import { PaperLedger } from '../components/StagePrimitives';
import { formatTimestamp } from './formatTimestamp';
import styles from './ProgressionScreens.module.css';

export function StatisticsScreen() {
  const dispatch = useAppDispatch();
  const { profiles, activeProfileId } = useAppSelector((state) => state.app);
  const profile = profiles.find((item) => item.id === activeProfileId);
  if (!profile) return null;
  const statistics = profile.statistics;
  const completedCampaigns = statistics.campaignWins + statistics.campaignLosses;
  const winRate = completedCampaigns
    ? `${Math.round((statistics.campaignWins / completedCampaigns) * 100)}%`
    : '0%';
  const summary = [
    ['普通开局', statistics.campaignStarts],
    ['普通胜场', statistics.campaignWins],
    ['普通败场', statistics.campaignLosses],
    ['胜率', winRate],
    ['当前连胜', statistics.currentWinStreak],
    ['最高连胜', statistics.bestWinStreak],
    ['最高无尽幕', statistics.highestEndlessAnte],
    ['累计得分', formatScore(statistics.totalScore)],
    ['最佳单手', formatScore(statistics.bestHandScore)],
    ['累计出手', statistics.handsPlayed],
    ['打出扑克牌', statistics.cardsPlayed],
    ['弃掉扑克牌', statistics.cardsDiscarded],
    ['击败盲注', statistics.blindsDefeated],
    ['跳过盲注', statistics.blindsSkipped],
    ['赚取戏票', statistics.moneyEarned],
    ['花费戏票', statistics.moneySpent],
    ['最高持有戏票', statistics.maximumMoneyHeld],
    ['利息收入', statistics.interestEarned],
    ['购买商品', statistics.itemsPurchased],
    ['出售商品', statistics.itemsSold],
    ['夜市重抽', statistics.shopRerolls],
    ['首领重抽', statistics.bossRerolls],
    ['打开补充包', statistics.packsOpened],
    ['兑换优惠券', statistics.vouchersRedeemed],
    ['使用消耗牌', statistics.consumablesUsed],
  ] as const;
  const handNames = new Map(
    selectHandReference(null).map((hand) => [hand.handType, hand.name]),
  );
  const catalogNames = new Map(
    PRODUCTION_CATALOG.rows.map((row) => [
      row.id,
      PRODUCTION_CATALOG.localization[row.nameKey] ?? row.referenceIndex,
    ]),
  );

  return (
    <PaperLedger className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p>只统计符合模式政策的已提交牌局</p>
          <h1>统计账册</h1>
        </div>
        <div className={styles.headerActions}>
          <button type="button" onClick={() => dispatch(showMenu())}>
            返回主菜单
          </button>
        </div>
      </header>

      <div className={styles.scrollArea}>
        <div className={styles.statisticsGrid}>
          {summary.map(([label, value]) => (
            <article key={label} className={styles.statCard}>
              <span>{label}</span>
              <strong>{value}</strong>
            </article>
          ))}
        </div>

        <h2 className={styles.sectionTitle}>十二牌型</h2>
        <div className={styles.compactTable}>
          {statistics.handTypes.map((record) => (
            <div key={record.handType}>
              <strong>{handNames.get(record.handType) ?? record.handType}</strong>
              <span>出手 {record.playCount}</span>
              <span>最佳 {formatScore(record.bestScore)}</span>
            </div>
          ))}
        </div>

        <h2 className={styles.sectionTitle}>牌组与挑战</h2>
        <div className={styles.compactTable}>
          {statistics.decks.map((record) => (
            <div key={record.deckId}>
              <strong>{catalogNames.get(record.deckId)}</strong>
              <span>
                开局 {record.starts} / 胜利 {record.wins}
              </span>
              <span>
                最高 S{String(record.highestClearedStakeOrdinal).padStart(2, '0')}
              </span>
            </div>
          ))}
          {statistics.challenges.map((record) => (
            <div key={record.challengeId}>
              <strong>{catalogNames.get(record.challengeId)}</strong>
              <span>尝试 {record.attempts}</span>
              <span>完成 {record.completions}</span>
              <span>
                首次完成{' '}
                {record.completedAtEpochMs === null
                  ? '—'
                  : formatTimestamp(record.completedAtEpochMs)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </PaperLedger>
  );
}
