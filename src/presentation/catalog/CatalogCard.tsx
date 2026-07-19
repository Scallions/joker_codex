import type { AssetOwnershipRecord, CatalogRow } from '../../content/schema/catalog';
import { CatalogGlyph } from './CatalogGlyph';
import styles from './CatalogAudit.module.css';

interface CatalogCardProps {
  readonly row: CatalogRow;
  readonly name: string;
  readonly description: string;
  readonly asset: AssetOwnershipRecord;
  readonly flavor?: string;
  readonly badge?: string;
}

export function CatalogCard({
  row,
  name,
  description,
  asset,
  flavor,
  badge,
}: CatalogCardProps) {
  const joker = row.family === 'joker';
  return (
    <article
      className={`${styles.card} ${joker ? styles.jokerCard : ''}`}
      data-content-id={row.id}
      data-family={row.family}
      data-ensemble={joker ? row.ensemble : undefined}
      data-rarity={joker ? row.rarity : undefined}
      data-testid="catalog-card"
    >
      <div className={styles.artwork}>
        <img
          src={asset.assetPath}
          alt=""
          data-focal-key={
            asset.source === 'generated-raster' ? asset.focalKey : undefined
          }
        />
        {asset.source === 'project-svg' ? (
          <CatalogGlyph focalKey={asset.focalKey} />
        ) : null}
        <span>{row.referenceIndex}</span>
      </div>
      <div className={styles.copy}>
        <small>
          {badge ?? `${row.family} · ${row.ordinal.toString().padStart(2, '0')}`}
        </small>
        <h2>{name}</h2>
        <p className={styles.rules}>{description}</p>
        {flavor ? <p className={styles.flavor}>{flavor}</p> : null}
      </div>
      <footer>
        <span>{row.cost > 0 ? `¥${row.cost}` : '规则项'}</span>
        <code>{row.id}</code>
      </footer>
    </article>
  );
}
