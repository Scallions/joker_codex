import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunContent } from '../../src/content/runtime/productionRunContent';
import type { JokerCatalogRow } from '../../src/content/schema/catalog';

function isJoker(row: (typeof PRODUCTION_CATALOG.rows)[number]): row is JokerCatalogRow {
  return row.family === 'joker';
}

function isNewJoker(
  row: (typeof PRODUCTION_CATALOG.rows)[number],
): row is JokerCatalogRow {
  return isJoker(row) && row.ordinal >= 51;
}

const EXPECTED = [
  ['051', '镜胎双生', 'rare', 8, 'trigger'],
  ['052', '满堂入戏', 'common', 3, 'none'],
  ['053', '帷后余筹', 'common', 5, 'output'],
  ['054', '六爻焚偶', 'uncommon', 6, 'none'],
  ['055', '星谱添辉', 'uncommon', 6, 'output'],
  ['056', '旅痕刻筹', 'uncommon', 5, 'trigger'],
  ['057', '落面收赏', 'common', 4, 'trigger'],
  ['058', '青藤台账', 'common', 4, 'output'],
  ['059', '首尾叠桥', 'common', 4, 'trigger'],
  ['060', '换目戏单', 'common', 4, 'trigger'],
  ['061', '劫后金果', 'common', 4, 'output'],
  ['062', '回手利刃', 'uncommon', 6, 'output'],
  ['063', '空匣红签', 'common', 5, 'output'],
  ['064', '狂轮吞座', 'uncommon', 7, 'output'],
  ['065', '四方积木', 'common', 4, 'output'],
  ['066', '合脉招魂', 'uncommon', 6, 'trigger'],
  ['067', '开台散班', 'common', 6, 'trigger'],
  ['068', '饮华夜爵', 'uncommon', 7, 'output'],
  ['069', '隔阶飞索', 'uncommon', 7, 'none'],
  ['070', '添牌幻灯', 'uncommon', 7, 'output'],
  ['071', '穷游符客', 'rare', 8, 'trigger'],
  ['072', '袖中王侯', 'rare', 8, 'output'],
  ['073', '九盏云钱', 'uncommon', 7, 'none'],
  ['074', '步云钱筒', 'uncommon', 6, 'none'],
  ['075', '避峰玄碑', 'rare', 8, 'output'],
  ['076', '镀夜花面', 'uncommon', 7, 'none'],
  ['077', '断冠力士', 'uncommon', 5, 'trigger'],
  ['078', '首面照灯', 'common', 5, 'output'],
  ['079', '众物添价', 'uncommon', 6, 'none'],
  ['080', '五席云茧', 'uncommon', 6, 'none'],
  ['081', '瘦册掌柜', 'uncommon', 6, 'output'],
  ['082', '袖面零钱', 'common', 6, 'trigger'],
  ['083', '点数回票', 'common', 4, 'trigger'],
  ['084', '月息算盘', 'uncommon', 5, 'none'],
  ['085', '开匣幻签', 'common', 4, 'trigger'],
  ['086', '旧符算命', 'common', 6, 'output'],
  ['087', '掌盘杂耍', 'common', 4, 'none'],
  ['088', '醉袖添签', 'common', 4, 'none'],
  ['089', '石仓筹主', 'uncommon', 6, 'output'],
  ['090', '金更俸客', 'common', 6, 'none'],
  ['091', '福铃狸奴', 'uncommon', 6, 'output'],
  ['092', '稀客签谱', 'rare', 8, 'trigger'],
  ['093', '铜角钱兽', 'uncommon', 6, 'output'],
  ['094', '双响冰露', 'uncommon', 6, 'trigger'],
  ['095', '一弃当票', 'uncommon', 6, 'none'],
  ['096', '转摊闪账', 'uncommon', 5, 'output'],
  ['097', '酥火纸囊', 'common', 5, 'output'],
  ['098', '成双戏袍', 'uncommon', 6, 'output'],
  ['099', '四象古兽', 'rare', 8, 'output'],
  ['100', '百丝汤魇', 'uncommon', 6, 'output'],
] as const;

const ENSEMBLES = [
  'creation-secret',
  'disordered-machine',
  'cloud-traveler',
  'night-market-ledger',
  'strange-beast-finale',
] as const;

const PERMANENT_EXCLUDED = new Set(['061', '077', '080', '094', '097', '100']);
const PERISHABLE_EXCLUDED = new Set([
  '055',
  '058',
  '063',
  '064',
  '065',
  '068',
  '070',
  '074',
  '075',
  '091',
  '096',
  '098',
]);

describe('生产奇牌目录 051-100', () => {
  it('冻结连续身份、原创中文文本、稀有度、价格与复制策略', () => {
    const rows = PRODUCTION_CATALOG.rows.filter(isNewJoker);

    expect(rows).toHaveLength(50);
    expect(
      rows.map((row) => [
        row.ordinal.toString().padStart(3, '0'),
        PRODUCTION_CATALOG.localization[row.nameKey],
        row.rarity,
        row.cost,
        row.copyPolicy,
      ]),
    ).toEqual(EXPECTED);
    expect(rows.every((row) => row.introducedIn === 'joker-catalog-2')).toBe(true);
    expect(
      rows.every(
        (row) =>
          PRODUCTION_CATALOG.localization[row.descriptionKey]?.trim() &&
          PRODUCTION_CATALOG.localization[row.flavorKey]?.trim(),
      ),
    ).toBe(true);
  });

  it('冻结五组十张展示班目与贴签排除', () => {
    const rows = PRODUCTION_CATALOG.rows.filter(isNewJoker);

    expect(rows.map((row) => row.ensemble)).toEqual(
      ENSEMBLES.flatMap((ensemble) => Array.from({ length: 10 }, () => ensemble)),
    );
    for (const row of rows) {
      const ordinal = row.ordinal.toString().padStart(3, '0');
      expect(row.stickerEligibility).toEqual({
        permanent: !PERMANENT_EXCLUDED.has(ordinal),
        perishable: !PERISHABLE_EXCLUDED.has(ordinal),
        rental: true,
      });
    }
  });

  it('冻结三项额外可用条件和 19/25/6 批次稀有度', () => {
    const rows = PRODUCTION_CATALOG.rows.filter(isNewJoker);
    const byId = new Map(rows.map((row) => [row.id, row]));

    expect(byId.get('bxqp:joker:061')?.availability).toEqual({
      kind: 'prerequisite',
      value: 'bxqp:history:joker-038-extinct',
    });
    expect(byId.get('bxqp:joker:089')?.availability).toEqual({
      kind: 'deck-contains-modifier',
      value: 'bxqp:enhancement:stone-mask',
    });
    expect(byId.get('bxqp:joker:091')?.availability).toEqual({
      kind: 'deck-contains-modifier',
      value: 'bxqp:enhancement:lucky-knot',
    });
    expect(rows.filter((row) => row.rarity === 'common')).toHaveLength(19);
    expect(rows.filter((row) => row.rarity === 'uncommon')).toHaveLength(25);
    expect(rows.filter((row) => row.rarity === 'rare')).toHaveLength(6);
  });

  it('把 100 张真实奇牌编译进 330 项生产快照并只留下后 50 个依赖', () => {
    const jokers = PRODUCTION_CATALOG.rows.filter(isJoker);
    const content = createProductionRunContent(PRODUCTION_CATALOG);
    const runtimeJokers = content.items.filter((item) => item.kind === 'joker');

    expect(PRODUCTION_CATALOG.rows).toHaveLength(330);
    expect(jokers).toHaveLength(100);
    expect(runtimeJokers).toHaveLength(100);
    expect(runtimeJokers.at(-1)?.contentId).toBe('bxqp:joker:100');
    expect(
      PRODUCTION_CATALOG.dependencies
        .filter((dependency) => !jokers.some((row) => row.id === dependency.id))
        .map((dependency) => dependency.id),
    ).toEqual(
      Array.from(
        { length: 50 },
        (_, index) => `bxqp:joker:${(index + 101).toString().padStart(3, '0')}`,
      ),
    );
  });
});
