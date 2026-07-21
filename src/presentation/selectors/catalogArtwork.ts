import { PRODUCTION_CATALOG } from '../../content/productionCatalog';
import type { NonJokerCatalogFamily } from '../../content/schema/catalog';

export interface CatalogArtworkPresentation {
  readonly contentId: string;
  readonly family: NonJokerCatalogFamily;
  readonly assetPath: string;
  readonly focalKey: string;
  readonly source: 'project-svg';
}

const NON_JOKER_ROWS_BY_ID = new Map(
  PRODUCTION_CATALOG.rows.flatMap((row) =>
    row.family === 'joker' ? [] : ([[row.id, row] as const] as const),
  ),
);

const PROJECT_SVG_ASSETS_BY_CONTENT_ID = new Map(
  PRODUCTION_CATALOG.assets.flatMap((asset) =>
    asset.source === 'project-svg' ? ([[asset.contentId, asset] as const] as const) : [],
  ),
);

export function selectCatalogArtwork(
  contentId: string,
): CatalogArtworkPresentation | null {
  const row = NON_JOKER_ROWS_BY_ID.get(contentId);
  const asset = PROJECT_SVG_ASSETS_BY_CONTENT_ID.get(contentId);
  if (!row || !asset) return null;

  return {
    contentId,
    family: row.family,
    assetPath: asset.assetPath,
    focalKey: asset.focalKey,
    source: asset.source,
  };
}
