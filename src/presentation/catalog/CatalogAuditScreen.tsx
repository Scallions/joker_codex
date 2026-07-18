import { useMemo, useState } from 'react';

import { PRODUCTION_CATALOG } from '../../content/productionCatalog';
import {
  CATALOG_FAMILIES,
  EXPECTED_CATALOG_TOTAL,
  type CatalogFamily,
} from '../../content/schema/catalog';
import { CatalogCard } from './CatalogCard';
import styles from './CatalogAudit.module.css';

const PAGE_SIZE = 12;
const FAMILY_NAMES: Readonly<Record<CatalogFamily, string>> = {
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

function requestedPage(): number {
  if (typeof window === 'undefined') return 0;
  const raw = Number(new URLSearchParams(window.location.search).get('catalog-page'));
  return Number.isSafeInteger(raw) && raw > 0 ? raw - 1 : 0;
}

export function CatalogAuditScreen() {
  const [family, setFamily] = useState<CatalogFamily | 'all'>('all');
  const [page, setPage] = useState(requestedPage);
  const rows = useMemo(
    () =>
      family === 'all'
        ? PRODUCTION_CATALOG.rows
        : PRODUCTION_CATALOG.rows.filter((row) => row.family === family),
    [family],
  );
  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = rows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);
  const assets = new Map(
    PRODUCTION_CATALOG.assets.map((asset) => [asset.contentId, asset]),
  );

  return (
    <section className={styles.screen} data-testid="catalog-audit-screen">
      <header className={styles.header}>
        <div>
          <p>午夜百戏 · 生产内容审计</p>
          <h1>非奇牌图鉴总账</h1>
        </div>
        <div className={styles.ledger}>
          <strong>{EXPECTED_CATALOG_TOTAL}</strong>
          <span>项本地内容 · 13 家族 · 零远程素材</span>
        </div>
      </header>

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
        {CATALOG_FAMILIES.map((entry) => (
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
            />
          );
        })}
      </div>

      <footer className={styles.pagination}>
        <span>
          {family === 'all' ? '全家族' : FAMILY_NAMES[family]} · {rows.length} 项
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
