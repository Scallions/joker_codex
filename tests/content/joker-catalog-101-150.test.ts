import {
  JOKER_101_150_EXPECTED_LEDGER,
  JOKER_101_150_SHARED_FIXTURES,
} from '../../src/content/catalogs/jokers101150';
import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunContent } from '../../src/content/runtime/productionRunContent';
import type { JokerCatalogRow } from '../../src/content/schema/catalog';

function isFinalJoker(
  row: (typeof PRODUCTION_CATALOG.rows)[number],
): row is JokerCatalogRow {
  return row.family === 'joker' && row.ordinal >= 101;
}

describe('生产奇牌目录 101-150', () => {
  it('冻结 50 行机器账本、连续身份、文本、稀有度、价格与复制路由', () => {
    const rows = PRODUCTION_CATALOG.rows.filter(isFinalJoker);
    expect(rows).toHaveLength(50);
    expect(rows.map((row) => row.id)).toEqual(
      JOKER_101_150_EXPECTED_LEDGER.map((row) => row.id),
    );
    expect(
      rows.map((row) => ({
        id: row.id,
        name: PRODUCTION_CATALOG.localization[row.nameKey],
        description: PRODUCTION_CATALOG.localization[row.descriptionKey],
        flavor: PRODUCTION_CATALOG.localization[row.flavorKey],
        rarity: row.rarity,
        cost: row.cost,
        copyPolicy: row.copyPolicy,
        copyTarget: row.copyTarget,
      })),
    ).toEqual(
      JOKER_101_150_EXPECTED_LEDGER.map((row) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        flavor: row.flavor,
        rarity: row.rarity,
        cost: row.cost,
        copyPolicy: row.copyPolicy,
        copyTarget: row.copyTarget,
      })),
    );
    expect(rows.every((row) => row.introducedIn === 'joker-catalog-3')).toBe(true);
  });

  it('冻结 6/25/14/5、五组十张班目和贴签排除', () => {
    const rows = PRODUCTION_CATALOG.rows.filter(isFinalJoker);
    expect(rows.filter((row) => row.rarity === 'common')).toHaveLength(6);
    expect(rows.filter((row) => row.rarity === 'uncommon')).toHaveLength(25);
    expect(rows.filter((row) => row.rarity === 'rare')).toHaveLength(14);
    expect(rows.filter((row) => row.rarity === 'legendary')).toHaveLength(5);
    expect(rows.map((row) => row.ensemble)).toEqual(
      [
        'brass-dispatch',
        'four-color-procession',
        'mirror-stage',
        'grand-formation',
        'starfire-legend',
      ].flatMap((ensemble) => Array.from({ length: 10 }, () => ensemble)),
    );
    expect(rows.map((row) => row.stickerEligibility)).toEqual(
      JOKER_101_150_EXPECTED_LEDGER.map((row) => row.stickerEligibility),
    );
  });

  it('编译 230+150=380 行且全部奇牌依赖由真实定义闭合', () => {
    const content = createProductionRunContent(PRODUCTION_CATALOG);
    const jokers = content.items.filter((item) => item.kind === 'joker');
    expect(PRODUCTION_CATALOG.productionVersion).toBe('joker-catalog-3');
    expect(PRODUCTION_CATALOG.rows).toHaveLength(380);
    expect(jokers).toHaveLength(150);
    expect(jokers.at(-1)?.contentId).toBe('bxqp:joker:150');
    expect(
      PRODUCTION_CATALOG.dependencies.filter(
        (dependency) => !jokers.some((row) => row.contentId === dependency.id),
      ),
    ).toEqual([]);
  });

  it('每行命名夹具与共享夹具账本唯一且闭合', () => {
    expect(
      new Set(JOKER_101_150_EXPECTED_LEDGER.map((row) => row.namedFixture)),
    ).toHaveLength(50);
    expect(new Set(JOKER_101_150_SHARED_FIXTURES)).toHaveLength(
      JOKER_101_150_SHARED_FIXTURES.length,
    );
    expect(
      JOKER_101_150_EXPECTED_LEDGER.every(
        (row) =>
          row.standardContracts.join('|') === 'positive|boundary|debuffed' &&
          row.art.focalKey.trim() &&
          row.art.prompt.trim() &&
          row.art.provenancePath.endsWith('.md'),
      ),
    ).toBe(true);
  });
});
