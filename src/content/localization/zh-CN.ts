import type { CatalogOperation, CatalogRow } from '../schema/catalog';

const NAMES: Readonly<Record<CatalogRow['family'], readonly string[]>> = {
  deck: [
    '余响牌幕',
    '加演牌幕',
    '铜钱牌幕',
    '空匣牌幕',
    '拥台牌幕',
    '回影牌幕',
    '星图牌幕',
    '招魂牌幕',
    '无面班底',
    '双帘班底',
    '三签班底',
    '广袖班底',
    '复签班底',
    '合璧班底',
    '移形班底',
  ],
  stake: ['初更', '静场', '青幕', '蜡封', '短息', '紫幕', '残纸', '借面'],
  challenge: [
    '空座无赏',
    '满堂花面',
    '钱顶压筹',
    '左首之誓',
    '蒙眼摸牌',
    '小角儿班',
    '钱重袖窄',
    '封箱不售',
    '石面登台',
    '回声封签',
    '封楼之后',
    '步步涨价',
    '无奇夜市',
    '琉璃全班',
    '旧事生花',
    '两拍星轨',
    '窄袖宽台',
    '弃牌买路',
    '哑场三席',
    '空台独演',
  ],
  voucher: [
    '添摊木牌',
    '满街木牌',
    '小折木牌',
    '半价木牌',
    '亮彩木牌',
    '极彩木牌',
    '短砍木牌',
    '深砍木牌',
    '阔囊木牌',
    '纸中藏灵',
    '照星木牌',
    '怀星木牌',
    '加板木牌',
    '再加一板',
    '添息木牌',
    '再添一息',
    '纸香木牌',
    '纸潮木牌',
    '星香木牌',
    '星潮木牌',
    '十钱生息',
    '二十钱生息',
    '无字木牌',
    '暗栏木牌',
    '散牌入市',
    '花牌入市',
    '倒幕减手',
    '倒幕减弃',
    '一换班主',
    '随时换班',
    '展袖木牌',
    '广袖木牌',
  ],
  tarot: [
    '余像',
    '吉结',
    '双星',
    '朱笔',
    '双纸',
    '双铜',
    '四风印',
    '绸影印',
    '琉璃印',
    '开囊',
    '三色灯',
    '转阶',
    '剪纸',
    '照影',
    '道具账',
    '金叶印',
    '石面印',
    '金刚转',
    '青梅转',
    '赤心转',
    '唤面',
    '黑锋转',
  ],
  planet: [
    '孤灯星谱',
    '对钹星谱',
    '双绦星谱',
    '三鼓星谱',
    '长索星谱',
    '团扇星谱',
    '满堂星谱',
    '四柱星谱',
    '流火星谱',
    '五星星谱',
    '月满星谱',
    '日轮星谱',
  ],
  spectral: [
    '化角',
    '化首',
    '化数',
    '钱痕',
    '绘光',
    '稀面',
    '一色夜',
    '一阶夜',
    '剪影',
    '五纸二十钱',
    '独留其双',
    '回声痕',
    '虹漆献祭',
    '星痕',
    '文痕',
    '纸生双影',
    '传奇登台',
    '群星齐升',
  ],
  tag: [
    '生角签',
    '名角签',
    '剪影签',
    '描金签',
    '幻墨签',
    '虹漆签',
    '压轴赏签',
    '添牌签',
    '换班签',
    '巨散牌匣签',
    '巨纸术匣签',
    '巨星谱匣签',
    '巨奇面匣签',
    '出手账签',
    '余弃账签',
    '幽戏匣签',
    '免单签',
    '复签',
    '展袖签',
    '免换签',
    '双生角签',
    '越场赏签',
    '三星签',
    '翻囊签',
  ],
  blind: [
    '开锣试锋',
    '二锣压场',
    '钩手班主',
    '铜牛班主',
    '暗宅班主',
    '高墙班主',
    '转轮班主',
    '卸力班主',
    '梅杖班主',
    '覆鳞班主',
    '五言班主',
    '黑锋班主',
    '枯钵班主',
    '金窗班主',
    '紧索班主',
    '照眼班主',
    '独口班主',
    '吞面花主',
    '三牌蛇主',
    '记痕柱主',
    '一针班主',
    '赤心班主',
    '钱齿班主',
    '裂燧班主',
    '蒙面班主',
    '藏班压轴',
    '卖铃压轴',
    '六重压轴',
    '游灯压轴',
    '牵线压轴',
  ],
  booster: [],
  enhancement: ['铜嵌', '朱墨', '四风', '琉璃绦', '绸影', '石面', '金叶', '吉结'],
  seal: ['钱印', '回声结', '星印', '文印'],
  edition: ['素纸', '描金', '幻墨', '虹漆', '剪影'],
};

const BOOSTER_FAMILY_NAME = {
  standard: '散牌',
  tarot: '纸术',
  planet: '星谱',
  joker: '奇面',
  spectral: '幽戏',
} as const;

const BOOSTER_SIZE_NAME = { normal: '小匣', jumbo: '大匣', mega: '巨匣' } as const;
const CHINESE_ORDINALS = ['一', '二', '三', '四'] as const;

function boosterName(row: CatalogRow): string {
  const match =
    /^bxqp:booster:(standard|tarot|planet|joker|spectral)-(normal|jumbo|mega)-(\d+)$/.exec(
      row.id,
    );
  if (!match) return `百戏匣${row.ordinal}`;
  const family = match[1] as keyof typeof BOOSTER_FAMILY_NAME;
  const size = match[2] as keyof typeof BOOSTER_SIZE_NAME;
  const variant = Number(match[3]);
  return `${BOOSTER_FAMILY_NAME[family]}${BOOSTER_SIZE_NAME[size]}·${CHINESE_ORDINALS[variant - 1] ?? variant}`;
}

const BASELINE_DESCRIPTIONS: Readonly<Record<string, string>> = {
  'start-with-consumable-slot-voucher': '开局带有扩充消耗牌栏位的木牌。',
  'start-with-two-last-use-copies': '开局带有两张可复演最近纸术或星谱的消耗牌。',
  'start-with-most-played-hand-voucher': '开局带有照应本局最常用牌型的木牌。',
  'start-with-polychrome-sacrifice-consumable': '开局带有一张虹漆献祭牌。',
  'start-with-tarot-frequency-voucher': '开局带有提升纸术入市频率的木牌。',
  'start-with-planet-frequency-voucher': '开局带有提升星谱入市频率的木牌。',
  'start-with-shop-slot-voucher': '开局额外开启一个夜市商品位。',
  'start-with-interest-cap-voucher-pair': '开局拥有两级生息上限木牌。',
  'start-with-two-tarot-and-card-shop-vouchers':
    '开局备有两张指定纸术与两级散牌入市木牌。',
  'start-with-planet-frequency-voucher-pair': '开局拥有两级星谱入市木牌。',
  'playing-card-counts-as-all-suits': '这张牌同时视作四种花色。',
  'post-score-independent-destroy-1-in-4': '计分后独立进行一次四分之一的自毁判定。',
  'playing-card-has-no-effective-rank-or-suit': '计分时不保留有效点数与花色。',
  'retrigger-scored-or-held-card-once': '所附着牌的计分或留手效果额外触发一次。',
  'base-edition': '基础纸面，不附加额外数值。',
  'instance-slot-contribution-minus-one': '该实例少占用一个对应栏位。',
  'copy-last-tarot-or-planet-excluding-self':
    '复演最近使用的纸术或星谱，但不会复演自身。',
  'create-three-enhanced-face-cards': '生成三张带随机强化的花面牌。',
  'create-two-enhanced-aces': '生成两张带随机强化的首牌。',
  'create-four-enhanced-number-cards': '生成四张带随机强化的数字牌。',
  'cumulative-hand-size-cost-one-plus-prior-use':
    '每次使用都会按一加此前使用次数减少手牌上限。',
  'planet-pack-guarantees-most-played-hand': '星谱匣必定包含本局最常用牌型对应的星谱。',
  'intentionally-inert-voucher': '这块无字木牌本身不改变规则，是后续木牌的先决条件。',
  'shop-playing-card-modifier-rolls-including-seals':
    '夜市散牌可按既定权重获得强化、彩面与封印。',
  'move-back-one-ante': '将当前幕次倒退一幕并重新物化后续安排。',
};

const TERM_LABELS: Readonly<Record<string, string>> = {
  'hands-per-round': '每轮出牌次数',
  'discards-per-round': '每轮弃牌次数',
  'hand-size': '手牌上限',
  'joker-slots': '奇牌栏位',
  'consumable-slots': '消耗牌栏位',
  'interest-enabled': '生息',
  'interest-cap': '生息上限',
  'remaining-hand-reward': '余下出牌赏',
  'remaining-discard-reward': '余下弃牌赏',
  'blind-reward': '盲注基础赏',
  'discard-cost': '弃牌费用',
  'target-scale': '盲注目标倍率',
  'shop-offer-slots': '夜市商品位',
  'pack-offer-slots': '卡包商品位',
  'reroll-cost': '换摊费用',
  'allowed-debt': '可欠戏票',
  'maximum-selected-cards': '单次选牌上限',
  'discount-basis-points': '售价折扣',
  'edition-weight': '彩面出现权重',
  'reroll-discount': '换摊减价',
  'family-weight': '家族出现权重',
  'playing-cards-enabled': '散牌入市',
  'boss-reroll': '更换班主',
  'price-increase-per-purchase': '逐次购入涨价',
  'joker-offers-enabled': '奇牌入市',
  'average-chips-mult': '筹码与倍率取均值',
  'money-chip-cap': '以现有戏票限制筹码',
  'add-chips': '增加筹码',
  'add-mult': '增加倍率',
  'multiply-mult': '倍乘倍率',
  'chance-money': '概率获得戏票',
  'played-card-always-scores': '所出牌恒定计分',
  'target-multiplier': '目标倍率',
  'random-held-discard': '随机丢弃留手牌',
  'money-reset-on-most-played': '最常用牌型清空戏票',
  'first-hand-face-down': '首手牌背朝上',
  'random-draw-face-down': '抽牌随机背面',
  'decrease-hand-level': '牌型暂降一级',
  'draw-replacements-face-down': '补牌背面入手',
  'require-play-count': '限定出牌张数',
  'zero-discards': '本轮弃牌归零',
  'hand-type-no-repeat': '本轮牌型不可重复',
  'first-hand-type-only': '仅许首手牌型',
  'draw-exactly': '每次恰抽指定张数',
  'one-hand': '本轮仅可出牌一次',
  'played-card-cost': '按出牌张数扣票',
  'halve-base': '牌型基础值减半',
  'conceal-reorder-jokers': '隐藏并重排奇牌',
  'debuff-until-joker-sold': '售出奇牌前全体失效',
  'disable-random-joker': '随机停用奇牌',
  'force-selected-card': '强制留选一牌',
  'free-joker': '赠送奇牌',
  'edition-joker': '指定彩面奇牌',
  money: '戏票',
  voucher: '木牌',
  'free-pack': '免费卡包',
  'history-money': '按历史记录结算戏票',
  'free-shop': '夜市首批免单',
  'copy-next-tag': '复制下一枚戏签',
  'free-reroll': '免费换摊',
  'hand-levels': '牌型等级',
  'ban-content': '禁用内容',
  'exclude-content': '排除内容',
  'permanent-jokers': '奇牌永久封签',
  'dynamic-hand-size': '动态手牌上限',
  'capacity-after-ante-four': '第四幕后栏位规则',
  'debuff-after-score': '计分后失效',
  'no-joker-routes': '禁用奇牌来源',
  'challenge-stake-baseline': '挑战固定初阶难度',
  'playing-card': '戏牌',
  'face-down': '背面状态',
  suit: '花色',
  rank: '点数',
  debuff: '失效状态',
  'full-state': '完整牌面状态',
  selected: '所选',
  'selected-right': '右侧所选牌',
  'selected-left': '左侧所选牌',
  all: '全部',
  random: '随机',
  'random-held': '随机留手牌',
  'random-joker': '随机奇牌',
  'other-jokers': '其余奇牌',
  drawn: '新抽入',
  'played-this-ante': '本幕曾打出',
  'face-cards': '全部花面牌',
  'new-playing-cards': '新戏牌实例',
  'new-joker': '新奇牌实例',
  standard: '标准牌组',
  'no-face': '无花面牌组',
  'hearts-spades': '红心黑锋双花色牌组',
  'rank-two-through-nine': '二至九点数牌组',
  'double-face-no-low': '双份花面无低点牌组',
  randomized: '逐张随机牌组',
  baseline: '基础',
  green: '青幕',
  purple: '紫幕',
  joker: '奇牌',
  tarot: '纸术牌',
  planet: '星谱牌',
  spectral: '幽戏牌',
  any: '任意稀有度',
  common: '常见',
  uncommon: '少见',
  rare: '稀有',
  legendary: '传奇',
  immediate: '立即',
  'next-shop': '下一间夜市',
  'next-round': '下一轮',
  'next-boss': '下一位班主结算后',
  add: '增加',
  'set-zero': '清零',
  'cap-add': '按当前数额追加',
  'per-history': '按历史次数追加',
  true: '启用',
  false: '停用',
  'high-card': '高牌',
  pair: '对子',
  'two-pair': '两对',
  'three-of-a-kind': '三条',
  straight: '顺子',
  flush: '同花',
  'full-house': '葫芦',
  'four-of-a-kind': '四条',
  'straight-flush': '同花顺',
  'five-of-a-kind': '五条',
  'flush-house': '同花葫芦',
  'flush-five': '同花五条',
  clubs: '青梅',
  diamonds: '金刚',
  hearts: '赤心',
  spades: '黑锋',
  'random-materialized': '已物化随机结果',
  'next-with-king-ace-two-wrap': '依次升阶并按王、首、二循环',
  'spectral-enabled': '幽戏牌入市',
};

const MODIFIER_LABELS: Readonly<Record<string, string>> = {
  'bxqp:enhancement:brass-inlay': '铜嵌强化',
  'bxqp:enhancement:red-ink': '朱墨强化',
  'bxqp:enhancement:four-winds': '四风强化',
  'bxqp:enhancement:glass-ribbon': '琉璃绦强化',
  'bxqp:enhancement:silk-shadow': '绸影强化',
  'bxqp:enhancement:stone-mask': '石面强化',
  'bxqp:enhancement:gold-leaf': '金叶强化',
  'bxqp:enhancement:lucky-knot': '吉结强化',
  'bxqp:seal:coin-seal': '钱印',
  'bxqp:seal:echo-knot': '回声结',
  'bxqp:seal:star-seal': '星印',
  'bxqp:seal:script-seal': '文印',
  'bxqp:edition:plain-paper': '素纸版式',
  'bxqp:edition:gilt-edge': '描金版式',
  'bxqp:edition:phantom-ink': '幻墨版式',
  'bxqp:edition:rainbow-lacquer': '虹漆版式',
  'bxqp:edition:shadow-cutout': '剪影版式',
  'bxqp:sticker:permanent': '永久贴签',
  'bxqp:sticker:perishable': '枯萎贴签',
  'bxqp:sticker:rental': '租借贴签',
};

function term(value: string | number | boolean): string {
  if (typeof value !== 'string') return TERM_LABELS[String(value)] ?? String(value);
  if (value.includes(':')) {
    return value
      .split(':')
      .map((part) => TERM_LABELS[part] ?? (Number.isFinite(Number(part)) ? part : ''))
      .join('');
  }
  return TERM_LABELS[value] ?? '既定条款';
}

function prettyId(value: string): string {
  if (MODIFIER_LABELS[value]) return MODIFIER_LABELS[value];
  if (value.startsWith('weighted:')) {
    return `按冻结权重抽取${value
      .slice('weighted:'.length)
      .split(',')
      .map((entry) => MODIFIER_LABELS[entry.slice(0, entry.lastIndexOf('='))])
      .filter(Boolean)
      .join('、')}`;
  }
  return '既定修饰';
}

function describeOperation(operation: CatalogOperation): string {
  switch (operation.type) {
    case 'baseline':
      return BASELINE_DESCRIPTIONS[operation.key] ?? `启用“${term(operation.key)}”规则。`;
    case 'rule-patch':
      return `${operation.mode === 'set' ? '设定' : operation.mode === 'add' ? '调整' : '倍乘'}${term(operation.key)}为${term(operation.value)}。`;
    case 'deck-recipe':
      return `按${term(operation.recipe)}配方组成${operation.count}张起始牌。`;
    case 'target-curve':
      return `采用${term(operation.curveId)}目标曲线，前八幕依次为${operation.anteOneThroughEight.join('、')}。`;
    case 'sticker-roll':
      return `符合条件的奇牌独立以 ${operation.numerator}/${operation.denominator} 概率获得 ${prettyId(operation.stickerId)}。`;
    case 'card-modifier':
      return `为${operation.selection === 'all' ? '全部' : `至多${operation.count}张${term(operation.selection)}`}目标施加${prettyId(operation.modifierId)}。`;
    case 'card-transform':
      return `将${term(operation.selection)}目标的${term(operation.field)}改为${term(operation.value)}。`;
    case 'card-destroy':
      return `从${term(operation.selection)}中销毁至多${operation.count}个${operation.destructibleOnly ? '可销毁' : ''}目标。`;
    case 'card-copy':
      return `把${term(operation.source)}的完整实例状态复制到${term(operation.destination)}，共${operation.count}份。`;
    case 'playing-card-create':
      return `生成${operation.count}张${term(operation.rankPool)}点数池的随机增强戏牌。`;
    case 'content-create':
      return `生成至多${operation.count}个${term(operation.rarity)}${term(operation.family)}内容${operation.capacityRequired ? '，须有可用栏位' : ''}。`;
    case 'money':
      return `按${term(operation.mode)}规则结算${operation.amount}戏票${operation.cap === null ? '' : `，上限${operation.cap}`}。`;
    case 'hand-level':
      return `${operation.hand === null ? '全部牌型' : term(operation.hand)}提升${operation.levels}级，每级增加${operation.chips}筹码与${operation.mult}倍率。`;
    case 'score-rule':
      return `在固定计分窗口执行${term(operation.key)}，数值为${operation.amount}${operation.denominator === null ? '' : `，概率${operation.numerator}/${operation.denominator}`}。`;
    case 'shop-rule':
      return `夜市的${term(operation.key)}调整为${term(operation.value)}。`;
    case 'pack-rule':
      return `按对应机械档案开启卡包：展示${operation.optionCount}项、可选${operation.pickCount}项，并提供${operation.temporarySlots}个临时栏位。`;
    case 'blind-rule':
      return `本轮执行班主规则“${term(operation.key)}”（${term(operation.value)}）。`;
    case 'tag-rule':
      return `${term(operation.timing)}执行戏签规则“${term(operation.key)}”（${term(operation.value)}）。`;
    case 'restriction':
      return `施加“${term(operation.key)}”限制：${operation.values.map(term).join('、')}。`;
  }
}

function description(row: CatalogRow): string {
  return row.effects
    .flatMap((effect) => effect.operations)
    .map(describeOperation)
    .join('；');
}

export function buildZhCnLocalization(
  rows: readonly CatalogRow[],
): Readonly<Record<string, string>> {
  return Object.fromEntries(
    rows.flatMap((row) => {
      const familyNames = NAMES[row.family];
      const name =
        row.family === 'booster' ? boosterName(row) : familyNames[row.ordinal - 1];
      if (!name) throw new Error(`缺少中文名称：${row.id}`);
      return [
        [row.nameKey, name],
        [row.descriptionKey, description(row)],
      ];
    }),
  );
}
