import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import {
  EXPECTED_CATALOG_COUNTS,
  EXPECTED_CATALOG_TOTAL,
} from '../../src/content/schema/catalog';
import { validateProductionCatalog } from '../../src/content/schema/validateCatalog';
import { createStandardDeck } from '../../src/game-core/model/cards';
import { POKER_HAND_TYPES } from '../../src/game-core/poker/evaluate';
import {
  ACHIEVEMENT_DEFINITIONS,
  OBJECTIVE_DEFINITIONS,
} from '../../src/progression/definitions';
import { RELEASE_COVERAGE_RULES, auditReleaseCoverage } from './releaseCoverage';

describe('百戏奇牌发布目录', () => {
  it('从实时注册表闭合全部冻结数量，并让 README 描述当前版本', () => {
    const catalog = validateProductionCatalog(PRODUCTION_CATALOG, {
      mode: 'integration-strict',
    });
    const cards = createStandardDeck();
    const coverage = auditReleaseCoverage(
      PRODUCTION_CATALOG.rows,
      RELEASE_COVERAGE_RULES,
    );
    const readme = readFileSync(resolve(process.cwd(), 'README.md'), 'utf8');

    expect(new Set(cards.map((card) => card.id))).toHaveLength(52);
    expect(POKER_HAND_TYPES).toHaveLength(12);
    expect(catalog.totalRows).toBe(EXPECTED_CATALOG_TOTAL);
    expect(catalog.familyCounts).toEqual(EXPECTED_CATALOG_COUNTS);
    expect(catalog.unresolvedExternalIds).toEqual([]);
    expect(ACHIEVEMENT_DEFINITIONS).toHaveLength(31);
    expect(OBJECTIVE_DEFINITIONS).toHaveLength(78);
    expect(coverage.coveredIds).toHaveLength(EXPECTED_CATALOG_TOTAL);
    expect(readme).toContain('V7 `joker-catalog-3`');
    expect(readme).toContain('生产总目录共 380 项');
    expect(readme).toContain('150 张可实际获得和结算的奇牌');
    expect(readme).not.toMatch(/V4 `joker-catalog-1`|生产总目录共 280 项|显示 50 张奇牌/);
  });

  it('显式声明本地图标，避免实名浏览器回退请求不存在的 favicon.ico', () => {
    const indexHtml = readFileSync(resolve(process.cwd(), 'index.html'), 'utf8');
    const favicon = readFileSync(
      resolve(process.cwd(), 'public/assets/catalog-stage.svg'),
      'utf8',
    );

    expect(indexHtml).toContain(
      '<link rel="icon" href="/assets/catalog-stage.svg" type="image/svg+xml" />',
    );
    expect(favicon).toContain('<svg');
  });
});
