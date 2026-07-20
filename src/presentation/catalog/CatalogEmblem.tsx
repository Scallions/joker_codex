import { useState } from 'react';

import type { NonJokerCatalogFamily } from '../../content/schema/catalog';
import styles from './CatalogEmblem.module.css';

export interface CatalogEmblemProps {
  readonly family: NonJokerCatalogFamily;
  readonly assetPath: string;
  readonly focalKey: string;
  readonly alt?: string;
  readonly loading?: 'eager' | 'lazy';
}

export function CatalogEmblem({
  family,
  assetPath,
  focalKey,
  alt = '目录徽记',
  loading = 'lazy',
}: CatalogEmblemProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className={styles.fallback}
        data-family={family}
        data-testid="catalog-emblem-fallback"
        aria-hidden="true"
      >
        <svg viewBox="0 0 100 132">
          <circle cx="50" cy="62" r="33" />
          <path d="M26 94L50 28l24 66M31 54h38M24 103h52" />
        </svg>
      </span>
    );
  }

  return (
    <img
      className={styles.image}
      src={assetPath}
      alt={alt}
      loading={loading}
      data-focal-key={focalKey}
      data-asset-source="project-svg"
      onError={() => setFailed(true)}
    />
  );
}
