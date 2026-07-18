import type { AssetOwnershipRecord, CatalogRow } from '../../content/schema/catalog';
import { CatalogGlyph } from './CatalogGlyph';
import styles from './CatalogAudit.module.css';

interface CatalogCardProps {
  readonly row: CatalogRow;
  readonly name: string;
  readonly description: string;
  readonly asset: AssetOwnershipRecord;
}

export function CatalogCard({ row, name, description, asset }: CatalogCardProps) {
  return (
    <article
      className={styles.card}
      data-content-id={row.id}
      data-family={row.family}
      data-testid="catalog-card"
    >
      <div className={styles.artwork}>
        <img src={asset.assetPath} alt="" />
        <CatalogGlyph focalKey={asset.focalKey} />
        <span>{row.referenceIndex}</span>
      </div>
      <div className={styles.copy}>
        <small>
          {row.family} · {row.ordinal.toString().padStart(2, '0')}
        </small>
        <h2>{name}</h2>
        <p>{description}</p>
      </div>
      <footer>
        <span>{row.cost > 0 ? `¥${row.cost}` : '规则项'}</span>
        <code>{row.id}</code>
      </footer>
    </article>
  );
}
