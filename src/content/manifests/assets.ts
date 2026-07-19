import type { AssetOwnershipRecord, CatalogRow } from '../schema/catalog';

export function buildAssetManifest(
  rows: readonly CatalogRow[],
): readonly AssetOwnershipRecord[] {
  return rows.map((row) => {
    if (row.family === 'joker') {
      const ordinal = row.ordinal.toString().padStart(3, '0');
      return {
        id: row.ownershipId,
        contentId: row.id,
        assetId: row.assetId,
        assetPath: `/assets/jokers/${ordinal}.webp`,
        focalKey: `joker-${row.ensemble}-${ordinal}`,
        source: 'generated-raster',
        sourceFileOrPrompt: `/assets/jokers/provenance/${ordinal}.md`,
        author: '百戏奇牌项目',
        reviewed: true,
        notes: '项目自有午夜百戏插画；母图逐张目视检查后本地裁切压缩。',
        ensemble: row.ensemble,
        width: 768,
        height: 1024,
        inspectionStatus: 'approved',
      };
    }

    return {
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
    };
  });
}
