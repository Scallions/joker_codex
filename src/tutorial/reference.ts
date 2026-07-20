import type { RunStateV2 } from '../game-core/model/runV2';
import { POKER_HANDS, POKER_HAND_TYPES } from '../game-core/poker/evaluate';

export interface HandReferenceRow {
  readonly handType: keyof typeof POKER_HANDS;
  readonly name: string;
  readonly baseChips: number;
  readonly baseMultiplier: number;
  readonly currentLevel: number;
}

export function selectHandReference(run: RunStateV2 | null): readonly HandReferenceRow[] {
  return POKER_HAND_TYPES.map((handType) => {
    const definition = POKER_HANDS[handType];
    return {
      handType,
      name: definition.name,
      baseChips: definition.baseChips,
      baseMultiplier: definition.baseMultiplier,
      currentLevel: run?.rules.handLevels[handType] ?? 1,
    };
  });
}

export const TERMINOLOGY_REFERENCE = [
  ['筹码', '牌型与计分牌提供的基础数值。'],
  ['倍率', '与筹码相乘得到本手总分。'],
  ['幕', '一轮由小盲注、大盲注和班主盲注组成的进程。'],
  ['盲注', '必须在有限出牌次数内达到的分数目标。'],
  ['牌组', '决定起始牌与规则的戏箱。'],
  ['手牌', '当前可选择出牌或弃牌的扑克牌。'],
  ['弃牌', '消耗一次弃牌机会来替换所选手牌。'],
  ['奇牌', '占用栏位并在结算窗口改变规则的被动牌。'],
  ['消耗牌', '使用后立即产生效果的塔罗、星球或幻灵牌。'],
  ['优惠券', '在本局永久改变夜市或规则的木牌。'],
  ['戏签', '跳过盲注后获得、在指定时机触发的效果。'],
  ['补充包', '付费打开并从候选内容中选择奖励。'],
  ['版本', '附着于牌上的特殊纸面效果。'],
  ['贴签', '永久、枯萎或租赁等奇牌状态。'],
  ['胜幕印记', '奇牌随普通战役胜利获得的最高筹码等级记录。'],
  ['无尽模式', '第八幕胜利后继续攀升幕数的加演。'],
] as const;
