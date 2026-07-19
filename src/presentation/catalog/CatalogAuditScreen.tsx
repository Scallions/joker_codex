import { useMemo, useState } from 'react';

import { PRODUCTION_CATALOG } from '../../content/productionCatalog';
import {
  EXPECTED_JOKER_CATALOG_TOTAL,
  EXPECTED_NON_JOKER_CATALOG_TOTAL,
  type JokerEnsemble,
  type JokerRarity,
  NON_JOKER_CATALOG_FAMILIES,
  type NonJokerCatalogFamily,
} from '../../content/schema/catalog';
import { CatalogCard } from './CatalogCard';
import styles from './CatalogAudit.module.css';

const PAGE_SIZE = 12;
const JOKER_PAGE_SIZE = 10;
const FAMILY_NAMES: Readonly<Record<NonJokerCatalogFamily, string>> = {
  deck: '起始牌组',
  stake: '难度注',
  challenge: '挑战',
  voucher: '木牌',
  tarot: '纸戏牌',
  planet: '星象牌',
  spectral: '灵戏牌',
  tag: '戏签',
  blind: '盲注',
  booster: '卡包',
  enhancement: '镶饰',
  seal: '封印',
  edition: '版式',
};

const ENSEMBLE_NAMES: Readonly<Record<JokerEnsemble, string>> = {
  'main-stage': '主台笑匠',
  'mask-illusion': '面具幻术',
  'backstage-machinery': '幕后机关',
  'music-acrobatics': '乐舞杂技',
  'midnight-spirits': '夜场精怪',
  'creation-secret': '造化秘戏',
  'disordered-machine': '失序机关',
  'cloud-traveler': '云路贵客',
  'night-market-ledger': '夜市账房',
  'strange-beast-finale': '异兽散场',
};
const ENSEMBLES = Object.keys(ENSEMBLE_NAMES) as readonly JokerEnsemble[];
const RARITY_NAMES: Readonly<Record<JokerRarity, string>> = {
  common: '常见',
  uncommon: '少见',
  rare: '稀有',
  legendary: '传奇',
};
const RARITIES = Object.keys(RARITY_NAMES) as readonly JokerRarity[];

function requestedPage(): number {
  if (typeof window === 'undefined') return 0;
  const raw = Number(new URLSearchParams(window.location.search).get('catalog-page'));
  return Number.isSafeInteger(raw) && raw > 0 ? raw - 1 : 0;
}

export interface CatalogAuditScreenProps {
  readonly ledger?: 'non-joker' | 'joker';
}

export function CatalogAuditScreen({
  ledger = 'non-joker',
}: CatalogAuditScreenProps = {}) {
  const [family, setFamily] = useState<NonJokerCatalogFamily | 'all'>('all');
  const [ensemble, setEnsemble] = useState<JokerEnsemble | 'all'>('all');
  const [rarity, setRarity] = useState<JokerRarity | 'all'>('all');
  const [page, setPage] = useState(requestedPage);
  const rows = useMemo(() => {
    if (ledger === 'joker') {
      return PRODUCTION_CATALOG.rows.filter(
        (row) =>
          row.family === 'joker' &&
          (ensemble === 'all' || row.ensemble === ensemble) &&
          (rarity === 'all' || row.rarity === rarity),
      );
    }
    return family === 'all'
      ? PRODUCTION_CATALOG.rows.filter((row) => row.family !== 'joker')
      : PRODUCTION_CATALOG.rows.filter((row) => row.family === family);
  }, [ensemble, family, ledger, rarity]);
  const pageSize = ledger === 'joker' ? JOKER_PAGE_SIZE : PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const visible = rows.slice(safePage * pageSize, (safePage + 1) * pageSize);
  const assets = new Map(
    PRODUCTION_CATALOG.assets.map((asset) => [asset.contentId, asset]),
  );

  return (
    <section
      className={styles.screen}
      data-ledger={ledger}
      data-testid="catalog-audit-screen"
    >
      <header className={styles.header}>
        <div>
          <p>午夜百戏 · 生产内容审计</p>
          <h1>{ledger === 'joker' ? '奇牌图鉴总账' : '非奇牌图鉴总账'}</h1>
        </div>
        <div className={styles.ledger}>
          <strong>
            {ledger === 'joker'
              ? EXPECTED_JOKER_CATALOG_TOTAL
              : EXPECTED_NON_JOKER_CATALOG_TOTAL}
          </strong>
          <span>
            {ledger === 'joker'
              ? '张原创奇牌 · 10 班目 · 零远程素材'
              : '项本地内容 · 13 家族 · 零远程素材'}
          </span>
        </div>
      </header>

      <div className={styles.filterRows}>
        {ledger === 'joker' ? (
          <>
            <nav className={styles.filters} aria-label="奇牌班目">
              <button
                type="button"
                data-active={ensemble === 'all'}
                onClick={() => {
                  setEnsemble('all');
                  setPage(0);
                }}
              >
                全部班目
              </button>
              {ENSEMBLES.map((entry) => (
                <button
                  type="button"
                  data-active={ensemble === entry}
                  key={entry}
                  onClick={() => {
                    setEnsemble(entry);
                    setPage(0);
                  }}
                >
                  {ENSEMBLE_NAMES[entry]}
                </button>
              ))}
            </nav>
            <nav className={styles.filters} aria-label="奇牌稀有度">
              <button
                type="button"
                data-active={rarity === 'all'}
                onClick={() => {
                  setRarity('all');
                  setPage(0);
                }}
              >
                全部稀有度
              </button>
              {RARITIES.map((entry) => (
                <button
                  type="button"
                  data-active={rarity === entry}
                  key={entry}
                  onClick={() => {
                    setRarity(entry);
                    setPage(0);
                  }}
                >
                  {RARITY_NAMES[entry]}
                </button>
              ))}
            </nav>
          </>
        ) : (
          <nav className={styles.filters} aria-label="目录家族">
            <button
              type="button"
              data-active={family === 'all'}
              onClick={() => {
                setFamily('all');
                setPage(0);
              }}
            >
              全部 230
            </button>
            {NON_JOKER_CATALOG_FAMILIES.map((entry) => (
              <button
                type="button"
                data-active={family === entry}
                key={entry}
                onClick={() => {
                  setFamily(entry);
                  setPage(0);
                }}
              >
                {FAMILY_NAMES[entry]}
              </button>
            ))}
          </nav>
        )}
      </div>

      <div className={styles.grid}>
        {visible.map((row) => {
          const asset = assets.get(row.id);
          if (!asset) throw new Error(`目录审计缺少素材：${row.id}`);
          return (
            <CatalogCard
              key={row.id}
              row={row}
              name={PRODUCTION_CATALOG.localization[row.nameKey] as string}
              description={PRODUCTION_CATALOG.localization[row.descriptionKey] as string}
              asset={asset}
              {...(row.family === 'joker'
                ? {
                    flavor: PRODUCTION_CATALOG.localization[row.flavorKey] as string,
                    badge: `${RARITY_NAMES[row.rarity]} · ¥${row.cost}`,
                  }
                : {})}
            />
          );
        })}
      </div>

      <footer className={styles.pagination}>
        <span>
          {ledger === 'joker'
            ? `${ensemble === 'all' ? '全部班目' : ENSEMBLE_NAMES[ensemble]}${
                rarity === 'all' ? '' : ` · ${RARITY_NAMES[rarity]}`
              } · ${rows.length} 项`
            : `${family === 'all' ? '全家族' : FAMILY_NAMES[family]} · ${rows.length} 项`}
        </span>
        <div>
          <button
            type="button"
            disabled={safePage === 0}
            onClick={() => setPage((value) => Math.max(0, value - 1))}
          >
            上一页
          </button>
          <strong>
            {safePage + 1} / {pageCount}
          </strong>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
          >
            下一页
          </button>
        </div>
      </footer>
    </section>
  );
}
