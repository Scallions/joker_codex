import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import {
  CATALOG_FAMILIES,
  EXPECTED_CATALOG_COUNTS,
  EXPECTED_CATALOG_TOTAL,
  EXPECTED_NON_JOKER_CATALOG_COUNTS,
  EXPECTED_NON_JOKER_CATALOG_TOTAL,
  NON_JOKER_CATALOG_FAMILIES,
} from '../../src/content/schema/catalog';
import {
  CatalogValidationError,
  validateProductionCatalog,
} from '../../src/content/schema/validateCatalog';

describe('生产非奇牌目录审计', () => {
  it('冻结 230 项非奇牌、100 项奇牌与 32 对 15 卡包映射', () => {
    const report = validateProductionCatalog(PRODUCTION_CATALOG);

    expect(report.totalRows).toBe(EXPECTED_CATALOG_TOTAL);
    expect(report.nonJokerRows).toBe(EXPECTED_NON_JOKER_CATALOG_TOTAL);
    expect(report.jokerRows).toBe(100);
    expect(report.boosterRows).toBe(32);
    expect(report.boosterProfiles).toBe(15);
    expect(report.familyCounts).toEqual(EXPECTED_CATALOG_COUNTS);
    expect(Object.keys(report.familyCounts)).toEqual(CATALOG_FAMILIES);
    expect(report.nonJokerFamilyCounts).toEqual(EXPECTED_NON_JOKER_CATALOG_COUNTS);
    expect(Object.keys(report.nonJokerFamilyCounts)).toEqual(NON_JOKER_CATALOG_FAMILIES);
  });

  it('让每项中文、本地资产、权属和合约记录闭合', () => {
    const report = validateProductionCatalog(PRODUCTION_CATALOG);
    const assetPaths = new Set(PRODUCTION_CATALOG.assets.map((asset) => asset.assetPath));

    expect(report.localizationEntries).toBe(760);
    expect(report.assetRecords).toBe(330);
    expect(report.contractRecords).toBe(330);
    expect(report.reservedExternalIds).toBe(150);
    expect(
      [...assetPaths].every((path) =>
        existsSync(resolve(process.cwd(), 'public', path.replace(/^\//, ''))),
      ),
    ).toBe(true);
    expect(
      PRODUCTION_CATALOG.rows.every(
        (row) => row.id.startsWith('bxqp:') && !row.id.includes('fixture:'),
      ),
    ).toBe(true);
    expect(
      Object.entries(PRODUCTION_CATALOG.localization)
        .filter(([key]) => key.endsWith('.description') && !key.startsWith('bxqp:joker:'))
        .every(([, value]) => !/[A-Za-z]/.test(value)),
    ).toBe(true);
  });

  it('目录子任务模式诚实保留依赖，严格模式在真实奇牌缺失时失败', () => {
    const child = validateProductionCatalog(PRODUCTION_CATALOG, {
      mode: 'catalog-child',
    });
    expect(child.resolvedJokerIds).toHaveLength(100);
    expect(child.unresolvedExternalIds).toHaveLength(50);

    expect(() =>
      validateProductionCatalog(PRODUCTION_CATALOG, {
        mode: 'integration-strict',
      }),
    ).toThrow(CatalogValidationError);

    const resolved = new Set(child.unresolvedExternalIds);
    expect(
      validateProductionCatalog(PRODUCTION_CATALOG, {
        mode: 'integration-strict',
        resolvedExternalIds: resolved,
      }).unresolvedExternalIds,
    ).toEqual([]);

    expect(() =>
      validateProductionCatalog(PRODUCTION_CATALOG, {
        resolvedExternalIds: new Set(['bxqp:joker:001']),
      }),
    ).toThrow(/不得以外部能力覆盖/);
  });

  it('拒绝缺失本地化、重复 ID 和失联机械档案', () => {
    const first = PRODUCTION_CATALOG.rows[0];
    const booster = PRODUCTION_CATALOG.rows.find((row) => row.family === 'booster');
    expect(first).toBeDefined();
    expect(booster).toBeDefined();
    if (!first || !booster) return;

    const invalid = {
      ...PRODUCTION_CATALOG,
      rows: [
        first,
        { ...first },
        ...PRODUCTION_CATALOG.rows
          .slice(2)
          .map((row) =>
            row.id === booster.id ? { ...row, mechanicalProfileId: 'missing' } : row,
          ),
      ],
      localization: Object.fromEntries(
        Object.entries(PRODUCTION_CATALOG.localization).filter(
          ([key]) => key !== first.nameKey,
        ),
      ),
    };

    expect(() => validateProductionCatalog(invalid)).toThrow(
      /内容 ID重复|缺少中文名称|卡包机械档案/,
    );
  });
});
