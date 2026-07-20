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
      assetPath: `/assets/catalog/${row.family}/${row.referenceIndex.toLowerCase()}.svg`,
      focalKey: `catalog-${row.family}-${row.referenceIndex.toLowerCase()}`,
      source: 'project-svg',
      sourceFileOrPrompt: `scripts/generate-catalog-emblems.mjs#${row.family}`,
      author: '百戏奇牌项目',
      reviewed: true,
      notes: '午夜百戏家族语法生成的逐条独立徽记；无文字、无外链、可确定性复验。',
    };
  });
}
