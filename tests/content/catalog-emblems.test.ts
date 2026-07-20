import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import {
  EXPECTED_NON_JOKER_CATALOG_TOTAL,
  NON_JOKER_CATALOG_FAMILIES,
} from '../../src/content/schema/catalog';

describe('非奇牌独立徽记', () => {
  it('为 230 条内容提供唯一、安全且本地的 SVG 路径', () => {
    const nonJokerIds = new Set(
      PRODUCTION_CATALOG.rows
        .filter((row) => row.family !== 'joker')
        .map((row) => row.id),
    );
    const assets = PRODUCTION_CATALOG.assets.filter((asset) =>
      nonJokerIds.has(asset.contentId),
    );
    const paths = new Set(assets.map((asset) => asset.assetPath));

    expect(assets).toHaveLength(EXPECTED_NON_JOKER_CATALOG_TOTAL);
    expect(paths.size).toBe(EXPECTED_NON_JOKER_CATALOG_TOTAL);
    expect(
      assets.every((asset) =>
        NON_JOKER_CATALOG_FAMILIES.some((family) =>
          asset.assetPath.startsWith(`/assets/catalog/${family}/`),
        ),
      ),
    ).toBe(true);

    for (const asset of assets) {
      const file = resolve(process.cwd(), 'public', asset.assetPath.replace(/^\//, ''));
      expect(existsSync(file), asset.assetPath).toBe(true);
      const svg = readFileSync(file, 'utf8');
      expect(svg).toMatch(/^<svg[^>]+viewBox="0 0 240 320"/);
      expect(svg).not.toMatch(/<script|<text|javascript:|(?:href|src)=["']https?:/i);
    }
  });
});
