import { PRODUCTION_CATALOG } from '../content/productionCatalog';
import { POKER_HAND_TYPES, type PokerHandType } from '../game-core/poker/evaluate';

export const PROGRESSION_RULES_VERSION = 'progression-1' as const;
export const TUTORIAL_SCRIPT_VERSION = 'tutorial-1' as const;

export type ObjectiveSource = 'baseline' | 'campaign' | 'challenge';

export interface ObjectiveDefinition {
  readonly objectiveId: string;
  readonly contentId: string;
  readonly referenceIndex: string;
  readonly family: 'deck' | 'stake' | 'challenge' | 'voucher' | 'tag';
  readonly target: number;
  readonly condition: string;
  readonly baseline: boolean;
}

const OBJECTIVE_DETAILS: Readonly<
  Record<string, { readonly target: number; readonly condition: string }>
> = {
  'bxqp:objective:deck:02': { target: 1, condition: '赢得 1 场普通战役' },
  'bxqp:objective:deck:03': { target: 40, condition: '胜利时持有至少 40 戏票' },
  'bxqp:objective:deck:04': { target: 1, condition: '在整场未获得利息的情况下胜利' },
  'bxqp:objective:deck:05': { target: 1, condition: '奇牌栏位全部占用时击败任意盲注' },
  'bxqp:objective:deck:06': { target: 20, condition: '累计使用 20 张消耗牌' },
  'bxqp:objective:deck:07': { target: 20, condition: '累计打出同一种牌型 20 次' },
  'bxqp:objective:deck:08': { target: 5, condition: '累计使用 5 张幻灵牌' },
  'bxqp:objective:deck:09': { target: 1, condition: '牌组中没有印刷 J、Q、K 时胜利' },
  'bxqp:objective:deck:10': { target: 1, condition: '牌组只剩至多两种印刷花色时胜利' },
  'bxqp:objective:deck:11': { target: 10, condition: '累计兑换 10 种不同优惠券' },
  'bxqp:objective:deck:12': { target: 1, condition: '在 S03 或更高筹码等级胜利' },
  'bxqp:objective:deck:13': { target: 20, condition: '累计跳过 20 个盲注' },
  'bxqp:objective:deck:14': { target: 1_000_000, condition: '单手得分达到 1,000,000' },
  'bxqp:objective:deck:15': { target: 10, condition: '完成 10 项挑战' },
  'bxqp:objective:voucher:02': { target: 30, condition: '累计购买 30 件商店商品' },
  'bxqp:objective:voucher:04': { target: 500, condition: '累计在商店花费 500 戏票' },
  'bxqp:objective:voucher:06': { target: 10, condition: '累计获得 10 张带版本的奇牌' },
  'bxqp:objective:voucher:08': { target: 30, condition: '累计刷新商店 30 次' },
  'bxqp:objective:voucher:10': { target: 20, condition: '累计使用 20 张塔罗牌' },
  'bxqp:objective:voucher:12': { target: 20, condition: '累计使用 20 张星球牌' },
  'bxqp:objective:voucher:14': { target: 150, condition: '累计出手 150 次' },
  'bxqp:objective:voucher:16': { target: 300, condition: '累计弃掉 300 张扑克牌' },
  'bxqp:objective:voucher:18': { target: 50, condition: '累计使用 50 张塔罗牌' },
  'bxqp:objective:voucher:20': { target: 50, condition: '累计使用 50 张星球牌' },
  'bxqp:objective:voucher:22': { target: 100, condition: '累计获得 100 戏票利息' },
  'bxqp:objective:voucher:24': { target: 50, condition: '发现 50 张奇牌' },
  'bxqp:objective:voucher:26': { target: 20, condition: '累计购买 20 张扑克牌' },
  'bxqp:objective:voucher:28': { target: 12, condition: '在无尽模式到达第 12 幕' },
  'bxqp:objective:voucher:30': { target: 10, condition: '累计重抽首领盲注 10 次' },
  'bxqp:objective:voucher:32': { target: 5, condition: '赢得 5 场普通战役' },
  'bxqp:objective:tag:02': { target: 25, condition: '发现 25 张奇牌' },
  'bxqp:objective:tag:03': { target: 1, condition: '获得一张暗影版本奇牌' },
  'bxqp:objective:tag:04': { target: 1, condition: '获得一张鎏金版本奇牌' },
  'bxqp:objective:tag:05': { target: 1, condition: '获得一张幻影版本奇牌' },
  'bxqp:objective:tag:06': { target: 1, condition: '获得一张虹彩版本奇牌' },
};

function isBaselineVoucher(objectiveId: string): boolean {
  const match = /^bxqp:objective:voucher:(\d{2})$/.exec(objectiveId);
  return match ? Number(match[1]) % 2 === 1 : false;
}

function defaultObjectiveDetail(
  objectiveId: string,
  referenceIndex: string,
): { readonly target: number; readonly condition: string } {
  if (objectiveId.startsWith('bxqp:objective:stake:')) {
    return { target: 1, condition: `使用当前牌组通关 ${referenceIndex} 的前一筹码等级` };
  }
  if (objectiveId.startsWith('bxqp:objective:challenge:')) {
    return referenceIndex === 'C01'
      ? { target: 1, condition: '赢得首场普通战役' }
      : {
          target: 1,
          condition: `完成挑战 C${String(Number(referenceIndex.slice(1)) - 1).padStart(2, '0')}`,
        };
  }
  if (isBaselineVoucher(objectiveId)) {
    return { target: 1, condition: '新档案初始可用' };
  }
  throw new Error(`缺少进度目标定义：${objectiveId}`);
}

export const OBJECTIVE_DEFINITIONS: readonly ObjectiveDefinition[] =
  PRODUCTION_CATALOG.rows
    .flatMap((row) => {
      if (
        !row.unlockObjectiveId ||
        !['deck', 'stake', 'challenge', 'voucher', 'tag'].includes(row.family)
      ) {
        return [];
      }
      const details =
        OBJECTIVE_DETAILS[row.unlockObjectiveId] ??
        defaultObjectiveDetail(row.unlockObjectiveId, row.referenceIndex);
      return [
        {
          objectiveId: row.unlockObjectiveId,
          contentId: row.id,
          referenceIndex: row.referenceIndex,
          family: row.family as ObjectiveDefinition['family'],
          target: details.target,
          condition: details.condition,
          baseline: isBaselineVoucher(row.unlockObjectiveId),
        },
      ];
    })
    .sort((left, right) => left.objectiveId.localeCompare(right.objectiveId));

if (OBJECTIVE_DEFINITIONS.length !== 78) {
  throw new Error(`进度目标数量漂移：应为 78，实际为 ${OBJECTIVE_DEFINITIONS.length}`);
}

export const DECK_CONTENT_IDS = PRODUCTION_CATALOG.rows
  .filter((row) => row.family === 'deck')
  .sort((left, right) => left.ordinal - right.ordinal)
  .map((row) => row.id);

export const CHALLENGE_CONTENT_IDS = PRODUCTION_CATALOG.rows
  .filter((row) => row.family === 'challenge')
  .sort((left, right) => left.ordinal - right.ordinal)
  .map((row) => row.id);

export const JOKER_CONTENT_IDS = PRODUCTION_CATALOG.rows
  .filter((row) => row.family === 'joker')
  .sort((left, right) => left.ordinal - right.ordinal)
  .map((row) => row.id);

export const VOUCHER_CONTENT_IDS = PRODUCTION_CATALOG.rows
  .filter((row) => row.family === 'voucher')
  .sort((left, right) => left.ordinal - right.ordinal)
  .map((row) => row.id);

export const PROFILE_HAND_TYPES: readonly PokerHandType[] = [...POKER_HAND_TYPES];

export type AchievementCategory = '入场' | '牌技' | '经营' | '收藏' | '挑战' | '终局';

export interface AchievementDefinition {
  readonly achievementId: string;
  readonly category: AchievementCategory;
  readonly name: string;
  readonly iconId: string;
  readonly description: string;
  readonly target: number;
}

type AchievementSeed = readonly [
  category: AchievementCategory,
  name: string,
  description: string,
  target: number,
];

const ACHIEVEMENT_SEEDS: readonly AchievementSeed[] = [
  ['入场', '初次开锣', '开始第一场普通战役', 1],
  ['入场', '首场喝彩', '首次击败盲注', 1],
  ['入场', '开市第一单', '首次购买商店商品', 1],
  ['入场', '奇客入班', '首次获得奇牌', 1],
  ['入场', '八幕谢场', '首次赢得普通战役', 1],
  ['入场', '加演不散', '在普通战役胜利后进入无尽模式', 1],
  ['牌技', '一招谢幕', '只出一手便击败一个盲注', 1],
  ['牌技', '后场未动', '不弃牌击败一个盲注', 1],
  ['牌技', '四门齐唱', '打出同花顺', 1],
  ['牌技', '秘式现台', '打出同花五条、葫芦同花或五条', 1],
  ['牌技', '十万喝彩', '单手得分达到 100,000', 100_000],
  ['牌技', '百万满堂', '单手得分达到 1,000,000', 1_000_000],
  ['牌技', '百手熟客', '累计出手 100 次', 100],
  ['牌技', '十二式全', '打出全部 12 种牌型', 12],
  ['经营', '满堂戏票', '持有至少 50 戏票', 50],
  ['经营', '一掷五百', '累计在商店花费 500 戏票', 500],
  ['经营', '百货开箱', '累计打开 50 个补充包', 50],
  ['经营', '换场不倦', '累计刷新商店 50 次', 50],
  ['经营', '券册满行', '累计兑换全部 32 种优惠券', 32],
  ['收藏', '初识百相', '发现 25 张奇牌', 25],
  ['收藏', '半卷奇谱', '发现 75 张奇牌', 75],
  ['收藏', '百戏全谱', '发现全部 150 张奇牌', 150],
  ['收藏', '印记成班', '为 25 张奇牌取得任意胜幕印记', 25],
  ['收藏', '顶阶金印', '为 25 张奇牌取得 S08 胜幕印记', 25],
  ['挑战', '试阵初捷', '完成 1 项挑战', 1],
  ['挑战', '十阵连破', '完成 10 项挑战', 10],
  ['挑战', '二十阵全破', '完成全部 20 项挑战', 20],
  ['挑战', '八阶登顶', '使用任意牌组通关 S08', 1],
  ['终局', '十五箱同庆', '使用全部 15 个牌组各胜利一次', 15],
  ['终局', '八阶全冠', '使用全部 15 个牌组通关 S08', 15],
  ['终局', '百相满金', '为全部 150 张奇牌取得 S08 胜幕印记', 150],
];

export const ACHIEVEMENT_DEFINITIONS: readonly AchievementDefinition[] =
  ACHIEVEMENT_SEEDS.map(([category, name, description, target], index) => {
    const ordinal = String(index + 1).padStart(3, '0');
    return {
      achievementId: `bxqp:achievement:${ordinal}`,
      category,
      name,
      iconId: `bxqp:achievement-icon:${ordinal}`,
      description,
      target,
    };
  });

if (ACHIEVEMENT_DEFINITIONS.length !== 31) {
  throw new Error('百戏成就簿必须恰好包含 31 项成就');
}

export type ProgressionDefinitionValidation =
  { readonly ok: true } | { readonly ok: false; readonly violations: readonly string[] };

export function validateProgressionDefinitions(): ProgressionDefinitionValidation {
  const violations: string[] = [];
  const catalogById = new Map(PRODUCTION_CATALOG.rows.map((row) => [row.id, row]));
  const objectiveIds = OBJECTIVE_DEFINITIONS.map(({ objectiveId }) => objectiveId);
  if (new Set(objectiveIds).size !== objectiveIds.length) {
    violations.push('内容目标编号重复');
  }

  for (const definition of OBJECTIVE_DEFINITIONS) {
    const row = catalogById.get(definition.contentId);
    if (!row || row.unlockObjectiveId !== definition.objectiveId) {
      violations.push(`内容目标没有唯一目录归属：${definition.objectiveId}`);
    }
    if (!Number.isSafeInteger(definition.target) || definition.target <= 0) {
      violations.push(`内容目标阈值无效：${definition.objectiveId}`);
    }
    if (definition.baseline !== isBaselineVoucher(definition.objectiveId)) {
      violations.push(`初始目标标记无效：${definition.objectiveId}`);
    }
  }

  const voucherRows = PRODUCTION_CATALOG.rows
    .filter((row) => row.family === 'voucher')
    .sort((left, right) => left.ordinal - right.ordinal);
  for (const row of voucherRows.filter(({ ordinal }) => ordinal % 2 === 0)) {
    const base = voucherRows[row.ordinal - 2];
    if (
      !base ||
      row.prerequisiteIds.length !== 1 ||
      row.prerequisiteIds[0] !== base.id ||
      row.availability.kind !== 'prerequisite' ||
      row.availability.value !== base.id
    ) {
      violations.push(`升级优惠券缺少成对局内前置：${row.referenceIndex}`);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (contentId: string): void => {
    if (visiting.has(contentId)) {
      violations.push(`目录依赖形成循环：${contentId}`);
      return;
    }
    if (visited.has(contentId)) return;
    visiting.add(contentId);
    const row = catalogById.get(contentId);
    for (const dependencyId of row?.prerequisiteIds ?? []) {
      if (!catalogById.has(dependencyId)) {
        violations.push(`目录依赖不存在：${contentId} -> ${dependencyId}`);
      } else {
        visit(dependencyId);
      }
    }
    visiting.delete(contentId);
    visited.add(contentId);
  };
  for (const row of PRODUCTION_CATALOG.rows) visit(row.id);

  const achievementIds = ACHIEVEMENT_DEFINITIONS.map(
    ({ achievementId }) => achievementId,
  );
  if (new Set(achievementIds).size !== achievementIds.length) {
    violations.push('成就编号重复');
  }
  ACHIEVEMENT_DEFINITIONS.forEach((definition, index) => {
    const ordinal = String(index + 1).padStart(3, '0');
    if (
      definition.achievementId !== `bxqp:achievement:${ordinal}` ||
      definition.iconId !== `bxqp:achievement-icon:${ordinal}` ||
      !Number.isSafeInteger(definition.target) ||
      definition.target <= 0
    ) {
      violations.push(`成就定义无效：${definition.achievementId}`);
    }
  });

  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}
