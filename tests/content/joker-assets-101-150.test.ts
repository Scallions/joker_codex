import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import type { JokerCatalogRow } from '../../src/content/schema/catalog';

describe('奇牌 101-150 本地插画与来源记录', () => {
  it('逐项绑定唯一 768×1024 WebP、独立焦点和已审来源侧车', () => {
    const rows = PRODUCTION_CATALOG.rows.filter(
      (row): row is JokerCatalogRow =>
        row.family === 'joker' && row.ordinal >= 101 && row.ordinal <= 150,
    );
    const assets = new Map(
      PRODUCTION_CATALOG.assets.map((asset) => [asset.contentId, asset]),
    );
    const paths = new Set<string>();
    const focalKeys = new Set<string>();

    expect(rows).toHaveLength(50);
    for (const row of rows) {
      const ordinal = row.ordinal.toString().padStart(3, '0');
      const asset = assets.get(row.id);
      expect(asset).toBeDefined();
      if (!asset) continue;

      expect(asset.assetPath).toBe(`/assets/jokers/${ordinal}.webp`);
      expect(asset.source).toBe('generated-raster');
      expect(asset.reviewed).toBe(true);
      expect(paths.has(asset.assetPath)).toBe(false);
      expect(focalKeys.has(asset.focalKey)).toBe(false);
      paths.add(asset.assetPath);
      focalKeys.add(asset.focalKey);

      if (asset.source !== 'generated-raster') continue;
      expect(asset).toMatchObject({
        ensemble: row.ensemble,
        width: 768,
        height: 1024,
        inspectionStatus: 'approved',
        sourceFileOrPrompt: `/assets/jokers/provenance/${ordinal}.md`,
      });

      const imagePath = resolve(
        process.cwd(),
        'public',
        asset.assetPath.replace(/^\//, ''),
      );
      const provenancePath = resolve(
        process.cwd(),
        'public',
        asset.sourceFileOrPrompt.replace(/^\//, ''),
      );
      expect(existsSync(imagePath)).toBe(true);
      expect(existsSync(provenancePath)).toBe(true);

      const image = readFileSync(imagePath);
      expect(image.subarray(0, 4).toString('ascii')).toBe('RIFF');
      expect(image.subarray(8, 12).toString('ascii')).toBe('WEBP');
      const provenance = readFileSync(provenancePath, 'utf8');
      expect(provenance).toContain(`content-id: ${row.id}`);
      expect(provenance).toContain('inspection-status: approved');
      expect(provenance).toContain(`final-asset: /assets/jokers/${ordinal}.webp`);
    }

    expect(paths.size).toBe(50);
    expect(focalKeys.size).toBe(50);
  });
});
