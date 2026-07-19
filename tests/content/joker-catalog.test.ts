import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunContent } from '../../src/content/runtime/productionRunContent';

describe('生产奇牌目录 001-050', () => {
  it('公开 J001 开场喝彩的冻结身份与基础数值', () => {
    const row = PRODUCTION_CATALOG.rows.find(
      (candidate) => candidate.id === 'bxqp:joker:001',
    );

    expect(row).toMatchObject({
      family: 'joker',
      ordinal: 1,
      referenceIndex: 'J001',
      cost: 2,
      weightUnits: 1,
    });
    expect(row && PRODUCTION_CATALOG.localization[row.nameKey]).toBe('开场喝彩');
    expect(row && PRODUCTION_CATALOG.localization[row.descriptionKey]).toBe('+4 倍率。');
  });

  it('冻结 50 个连续 ID、36/14 稀有度和三段中文文本', () => {
    const rows = PRODUCTION_CATALOG.rows.filter((row) => row.family === 'joker');

    expect(rows).toHaveLength(50);
    expect(rows.map((row) => row.id)).toEqual(
      Array.from(
        { length: 50 },
        (_, index) => `bxqp:joker:${(index + 1).toString().padStart(3, '0')}`,
      ),
    );
    expect(rows.filter((row) => row.rarity === 'common')).toHaveLength(36);
    expect(rows.filter((row) => row.rarity === 'uncommon')).toHaveLength(14);
    expect(
      rows.every(
        (row) =>
          PRODUCTION_CATALOG.localization[row.nameKey]?.trim() &&
          PRODUCTION_CATALOG.localization[row.descriptionKey]?.trim() &&
          PRODUCTION_CATALOG.localization[row.flavorKey]?.trim(),
      ),
    ).toBe(true);
    expect(new Set(rows.map((row) => row.ensemble))).toEqual(
      new Set([
        'main-stage',
        'mask-illusion',
        'backstage-machinery',
        'music-acrobatics',
        'midnight-spirits',
      ]),
    );
  });

  it('把同一批 50 项定义编译为可购买的运行时奇牌', () => {
    const content = createProductionRunContent(PRODUCTION_CATALOG);
    const jokers = content.items.filter((item) => item.kind === 'joker');

    expect(jokers).toHaveLength(50);
    expect(jokers[0]).toMatchObject({
      contentId: 'bxqp:joker:001',
      name: '开场喝彩',
      description: '+4 倍率。',
      baseCost: 2,
      rarity: 'common',
      slotContribution: 1,
      copyPolicy: 'output',
      stickerEligibility: {
        permanent: true,
        perishable: true,
        rental: true,
      },
      initialAbilityState: {},
    });
    expect(jokers[49]).toMatchObject({
      contentId: 'bxqp:joker:050',
      initialAbilityState: { remainingChips: 100 },
    });
  });
});
