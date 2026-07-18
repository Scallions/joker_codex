import type { AssetOwnershipRecord, CatalogRow } from '../schema/catalog';

export function buildAssetManifest(
  rows: readonly CatalogRow[],
): readonly AssetOwnershipRecord[] {
  return rows.map((row) => ({
    id: row.ownershipId,
    contentId: row.id,
    assetId: row.assetId,
    assetPath: '/assets/catalog-stage.svg',
    focalKey: `${row.family}-${row.ordinal.toString().padStart(2, '0')}`,
    source: 'project-svg',
    sourceFileOrPrompt:
      'public/assets/catalog-stage.svg + CatalogGlyph deterministic geometry',
    author: '百戏奇牌项目',
    reviewed: true,
    notes: '午夜百戏公共纸纹与按内容编号生成的独立几何焦点构图。',
  }));
}
