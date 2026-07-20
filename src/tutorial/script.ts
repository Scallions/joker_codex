import { createProductionRunV7 } from '../content/runtime/runSetupV7';
import type { ProductionCatalog } from '../content/schema/catalog';
import { validateRunStateV7 } from '../game-core/invariants/validateRunStateV7';
import type { RunStateV7 } from '../game-core/model/runV7';
import type { ProfileRecord } from '../persistence/profiles';
import { TUTORIAL_SCRIPT_VERSION } from '../progression/definitions';
import { selectFrozenEligibilityObjectiveIds } from '../progression/selectors';

export const TUTORIAL_FIXED_SEED = 'TUTOR001' as const;
export const TUTORIAL_SMALL_BLIND_TARGET = 80 as const;
export const TUTORIAL_STARTING_MONEY = 30 as const;

export interface TutorialStepDefinition {
  readonly stepId: string;
  readonly ordinal: number;
  readonly title: string;
  readonly instruction: string;
  readonly explanation: string;
}

export const TUTORIAL_STEPS: readonly TutorialStepDefinition[] = [
  {
    stepId: 'tutorial:step:01',
    ordinal: 1,
    title: '先看盲注',
    instruction: '选择“小盲注”，留意目标分与本轮奖励。',
    explanation: '每一幕依次面对小盲注、大盲注和班主盲注。',
  },
  {
    stepId: 'tutorial:step:02',
    ordinal: 2,
    title: '挑选手牌',
    instruction: '点选一张亮起的扑克牌。',
    explanation: '一次最多选五张牌；再次点击可取消。',
  },
  {
    stepId: 'tutorial:step:03',
    ordinal: 3,
    title: '第一次出手',
    instruction: '点击“出牌”，观察筹码、倍率与最终得分。',
    explanation: '本手得分等于筹码乘以倍率，并累加到盲注进度。',
  },
  {
    stepId: 'tutorial:step:04',
    ordinal: 4,
    title: '整理后场',
    instruction: '选择低价值牌并弃牌，换取新的手牌。',
    explanation: '弃牌次数有限，留下能组成更强牌型的牌。',
  },
  {
    stepId: 'tutorial:step:05',
    ordinal: 5,
    title: '击败盲注',
    instruction: '继续选牌并出手，达标后领取戏票奖励。',
    explanation: '剩余出牌数与利息也会影响奖励。',
  },
  {
    stepId: 'tutorial:step:06',
    ordinal: 6,
    title: '奇牌入班',
    instruction: '在夜市购买一张奇牌。',
    explanation: '奇牌会占用栏位，并在特定结算窗口改变玩法。',
  },
  {
    stepId: 'tutorial:step:07',
    ordinal: 7,
    title: '打开补充包',
    instruction: '购买补充包，选择其中的消耗牌并完成使用。',
    explanation: '塔罗、星球和幻灵牌可以改变牌组或强化牌型。',
  },
  {
    stepId: 'tutorial:step:08',
    ordinal: 8,
    title: '离开夜市',
    instruction: '点击“离开夜市”，完成入门教程。',
    explanation: '之后可随时从帮助页查看牌型表和术语。',
  },
];

export function validateTutorialScript(catalog: ProductionCatalog): void {
  if (TUTORIAL_STEPS.length !== 8) throw new Error('教程必须恰好包含八步');
  const stepIds = TUTORIAL_STEPS.map(({ stepId }) => stepId);
  if (new Set(stepIds).size !== stepIds.length) throw new Error('教程步骤编号重复');
  const deck = catalog.rows.find((row) => row.family === 'deck' && row.ordinal === 1);
  const stake = catalog.rows.find((row) => row.family === 'stake' && row.ordinal === 1);
  if (!deck || deck.referenceIndex !== 'D01') throw new Error('教程缺少 D01 牌组');
  if (!stake || stake.referenceIndex !== 'S01') throw new Error('教程缺少 S01 筹码');
  if (!catalog.rows.some((row) => row.family === 'joker')) {
    throw new Error('教程目录缺少奇牌');
  }
  if (!catalog.rows.some((row) => row.family === 'booster')) {
    throw new Error('教程目录缺少补充包');
  }
}

export function createTutorialRun(
  catalog: ProductionCatalog,
  profile: ProfileRecord,
  seed: string = TUTORIAL_FIXED_SEED,
): RunStateV7 {
  validateTutorialScript(catalog);
  const deckId = catalog.rows.find(
    (row) => row.family === 'deck' && row.ordinal === 1,
  )!.id;
  const stakeId = catalog.rows.find(
    (row) => row.family === 'stake' && row.ordinal === 1,
  )!.id;
  const productionRun = createProductionRunV7(catalog, {
    profileId: profile.id,
    runSequence: profile.nextRunSequence,
    runClass: 'tutorial',
    seed,
    deckId,
    stakeId,
    eligibilityObjectiveIds: selectFrozenEligibilityObjectiveIds(
      profile,
      catalog,
      deckId,
    ),
    discoveredContentIds: profile.collection.discoveredJokerIds,
  });
  const run: RunStateV7 = {
    ...productionRun,
    economy: {
      ...productionRun.economy,
      money: TUTORIAL_STARTING_MONEY,
    },
    rules: {
      ...productionRun.rules,
      cardOfferSlots: 4,
      packOfferSlots: 4,
    },
    rulesV3: {
      ...productionRun.rulesV3,
      anteOneThroughEightTargets: productionRun.rulesV3.anteOneThroughEightTargets.map(
        (target, index) => (index === 0 ? TUTORIAL_SMALL_BLIND_TARGET : target),
      ),
      shopFamilyWeightMultipliers: {
        ...productionRun.rulesV3.shopFamilyWeightMultipliers,
        joker: 10_000,
      },
    },
  };
  if (run.sessionV7.tutorialScriptVersion !== TUTORIAL_SCRIPT_VERSION) {
    throw new Error('教程牌局脚本版本无效');
  }
  const validation = validateRunStateV7(run);
  if (!validation.ok) {
    throw new Error(`教程牌局状态无效：${validation.violations.join('；')}`);
  }
  return run;
}
