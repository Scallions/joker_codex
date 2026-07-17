import type { RunState } from '../model/run';

export type RunValidationResult =
  { readonly ok: true } | { readonly ok: false; readonly violations: readonly string[] };

export function validateRunState(state: RunState): RunValidationResult {
  const violations: string[] = [];
  const allCards = [...state.drawPile, ...state.hand, ...state.discardPile];
  const uniqueCardIds = new Set(allCards.map((card) => card.id));
  const handIds = new Set(state.hand.map((card) => card.id));

  if (allCards.length !== 52 || uniqueCardIds.size !== 52) {
    violations.push('牌组必须恰好包含 52 个唯一实例');
  }
  if (
    state.selectedCardIds.length > 5 ||
    state.selectedCardIds.some((cardId) => !handIds.has(cardId))
  ) {
    violations.push('选择区只能引用当前手牌');
  }
  if (!Number.isSafeInteger(state.checkpointId) || state.checkpointId < 0) {
    violations.push('检查点编号必须是非负安全整数');
  }
  if (!Number.isSafeInteger(state.rngState) || state.rngState <= 0) {
    violations.push('随机状态必须是非零 32 位整数');
  }
  if (state.handsRemaining < 0 || state.discardsRemaining < 0) {
    violations.push('出牌和弃牌次数不能为负数');
  }
  if (state.jokers.length > 5 || state.consumables.length > 2) {
    violations.push('持有物超过当前试玩容量');
  }
  if ((state.phase === 'shop') !== (state.shop !== null)) {
    violations.push('商店状态必须与运行阶段一致');
  }

  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}
