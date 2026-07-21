import { useMemo, useState } from 'react';

import { showMenu } from '../../app/store/appSlice';
import { useAppDispatch, useAppSelector } from '../../app/store/hooks';
import { PRODUCTION_CATALOG } from '../../content/productionCatalog';
import type { CatalogFamily } from '../../content/schema/catalog';
import type { JokerRarity } from '../../content/schema/catalog';
import { selectCollectionRows } from '../../progression/selectors';
import { CatalogEmblem } from '../catalog/CatalogEmblem';
import { JokerArtworkTrigger } from '../components/JokerArtworkInspector';
import { PaperLedger } from '../components/StagePrimitives';
import { selectJokerPresentation } from '../selectors/jokerPresentation';
import styles from './ProgressionScreens.module.css';

const FAMILY_NAMES: Readonly<Record<CatalogFamily, string>> = {
  deck: '牌组',
  stake: '筹码',
  challenge: '挑战',
  voucher: '优惠券',
  tarot: '塔罗牌',
  planet: '星球牌',
  spectral: '幻灵牌',
  tag: '戏签',
  blind: '盲注',
  booster: '补充包',
  enhancement: '增强',
  seal: '蜡封',
  edition: '版本',
  joker: '奇牌',
};

export function CollectionScreen() {
  const dispatch = useAppDispatch();
  const { profiles, activeProfileId } = useAppSelector((state) => state.app);
  const [family, setFamily] = useState<'all' | CatalogFamily>('all');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'locked' | 'unlocked' | 'discovered' | 'undiscovered'
  >('all');
  const [rarity, setRarity] = useState<'all' | JokerRarity>('all');
  const [victoryStake, setVictoryStake] = useState(0);
  const [query, setQuery] = useState('');
  const profile = profiles.find((item) => item.id === activeProfileId);
  const allRows = useMemo(
    () => (profile ? selectCollectionRows(profile, PRODUCTION_CATALOG) : []),
    [profile],
  );
  const visibleRows = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('zh-CN');
    return allRows.filter(
      (row) =>
        (family === 'all' || row.family === family) &&
        (statusFilter === 'all' ||
          (statusFilter === 'locked' && row.locked) ||
          (statusFilter === 'unlocked' && !row.locked) ||
          (statusFilter === 'discovered' && row.discovered) ||
          (statusFilter === 'undiscovered' && !row.discovered)) &&
        (rarity === 'all' || row.rarity === rarity) &&
        (victoryStake === 0 || (row.highestVictoryStakeOrdinal ?? 0) >= victoryStake) &&
        (!needle ||
          row.displayName.toLocaleLowerCase('zh-CN').includes(needle) ||
          row.referenceIndex.toLocaleLowerCase('zh-CN').includes(needle)),
    );
  }, [allRows, family, query, rarity, statusFilter, victoryStake]);

  if (!profile) return null;

  const completedObjectives = profile.objectives.filter(
    ({ completedAtEpochMs }) => completedAtEpochMs !== null,
  ).length;
  const completedCatalogRows = allRows.filter(
    (row) => !row.locked && row.discovered,
  ).length;
  const clearedDeckStakes = profile.deckProgress.reduce(
    (total, record) => total + record.highestClearedStakeOrdinal,
    0,
  );
  const markedJokers = profile.collection.jokerVictoryMarks.filter(
    ({ highestStakeOrdinal }) => highestStakeOrdinal > 0,
  ).length;

  return (
    <PaperLedger className={styles.screen}>
      <header className={styles.header}>
        <div>
          <p>已发现 {profile.collection.discoveredJokerIds.length} / 150 张奇牌</p>
          <h1>百戏图鉴</h1>
        </div>
        <div className={styles.headerActions}>
          <button type="button" onClick={() => dispatch(showMenu())}>
            返回主菜单
          </button>
        </div>
      </header>

      <div className={styles.scrollArea} data-layout-zone="collection-scroll">
        <div className={styles.collectionSummary}>
          <div>
            <span>目录完成</span>
            <strong>{completedCatalogRows} / 380</strong>
          </div>
          <div>
            <span>奇牌发现</span>
            <strong>{profile.collection.discoveredJokerIds.length} / 150</strong>
          </div>
          <div>
            <span>全局解锁</span>
            <strong>{completedObjectives} / 78</strong>
          </div>
          <div>
            <span>牌组筹码</span>
            <strong>{clearedDeckStakes} / 120</strong>
          </div>
          <div>
            <span>奇牌印记</span>
            <strong>{markedJokers} / 150</strong>
          </div>
        </div>
        <div className={styles.filterBar}>
          <label>
            内容类别
            <select
              value={family}
              onChange={(event) => setFamily(event.target.value as 'all' | CatalogFamily)}
            >
              <option value="all">全部 380 项</option>
              {Object.entries(FAMILY_NAMES).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label>
            状态
            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value as
                    'all' | 'locked' | 'unlocked' | 'discovered' | 'undiscovered',
                )
              }
            >
              <option value="all">全部状态</option>
              <option value="locked">未解锁</option>
              <option value="unlocked">已解锁</option>
              <option value="discovered">已发现</option>
              <option value="undiscovered">未发现</option>
            </select>
          </label>
          <label>
            奇牌稀有度
            <select
              value={rarity}
              onChange={(event) => setRarity(event.target.value as 'all' | JokerRarity)}
            >
              <option value="all">全部稀有度</option>
              <option value="common">普通</option>
              <option value="uncommon">罕见</option>
              <option value="rare">稀有</option>
              <option value="legendary">传奇</option>
            </select>
          </label>
          <label>
            胜幕印记
            <select
              value={victoryStake}
              onChange={(event) => setVictoryStake(Number(event.target.value))}
            >
              <option value={0}>全部印记</option>
              {Array.from({ length: 8 }, (_, index) => index + 1).map((ordinal) => (
                <option key={ordinal} value={ordinal}>
                  S{String(ordinal).padStart(2, '0')} 及以上
                </option>
              ))}
            </select>
          </label>
          <label>
            检索已知内容
            <input
              value={query}
              placeholder="名称或编号"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <p className={styles.filterResult}>当前显示 {visibleRows.length} 项</p>
        </div>

        <div className={styles.catalogGrid}>
          {visibleRows.map((row) => {
            const progress =
              row.objectiveCurrent !== null && row.objectiveTarget
                ? Math.min(100, (row.objectiveCurrent / row.objectiveTarget) * 100)
                : null;
            const jokerPresentation =
              row.family === 'joker' && row.discovered
                ? selectJokerPresentation(row.contentId)
                : undefined;
            return (
              <article
                key={row.contentId}
                className={styles.catalogRow}
                data-collection-row
                data-content-id={row.contentId}
                data-family={row.family}
                data-hidden={!row.discovered}
                data-locked={row.locked}
              >
                <div className={styles.catalogArtwork} data-silhouette={!row.discovered}>
                  {row.assetPath && row.assetFocalKey ? (
                    row.family === 'joker' ? (
                      jokerPresentation ? (
                        <JokerArtworkTrigger
                          presentation={jokerPresentation}
                          className={styles.catalogArtworkTrigger}
                          loading="lazy"
                          assetSource={row.assetSource ?? undefined}
                        />
                      ) : (
                        <i aria-hidden="true" />
                      )
                    ) : (
                      <CatalogEmblem
                        family={row.family}
                        assetPath={row.assetPath}
                        focalKey={row.assetFocalKey}
                        alt=""
                      />
                    )
                  ) : (
                    <i aria-hidden="true" />
                  )}
                </div>
                <div className={styles.catalogCopy}>
                  <small>
                    {FAMILY_NAMES[row.family]} · {row.referenceIndex}
                  </small>
                  <h3>{row.displayName}</h3>
                  {row.description ? <p>规则：{row.description}</p> : null}
                  {row.locked && row.objectiveCondition ? (
                    <p className={styles.lockCondition}>
                      解锁条件：{row.objectiveCondition}
                    </p>
                  ) : null}
                  {row.rarity ? <p>稀有度：{row.rarity}</p> : null}
                  {row.highestVictoryStakeOrdinal !== null && row.discovered ? (
                    <p>
                      胜幕印记：S
                      {String(row.highestVictoryStakeOrdinal).padStart(2, '0')}
                    </p>
                  ) : null}
                </div>
                {progress !== null ? (
                  <div
                    className={styles.progressTrack}
                    title={`${row.objectiveCurrent} / ${row.objectiveTarget}`}
                  >
                    <i style={{ width: `${progress}%` }} />
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      </div>
    </PaperLedger>
  );
}
