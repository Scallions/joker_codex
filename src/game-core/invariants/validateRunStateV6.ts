import { RANKS, SUITS } from '../model/cards';
import type { RunStateV6 } from '../model/runV6';
import { usedJokerSlotsForRun } from '../rules/inventoryCapacityV6';
import { validateRunStateV5 } from './validateRunStateV5';
import type { RunValidationResultV3 } from './validateRunStateV3';

export function validateRunStateV6(run: RunStateV6): RunValidationResultV3 {
  const base = validateRunStateV5(run);
  const violations = base.ok ? [] : [...base.violations];

  if (run.schemaVersion !== 6 && run.schemaVersion !== 7) {
    violations.push('V6 基础牌局结构版本错误');
  }
  if (!/^[a-f0-9]{8}$/.test(run.migrationV6.recoveryFingerprint)) {
    violations.push('V6 迁移指纹无效');
  }
  if (
    run.jokerRuntimeV6.castleTargetSuit !== null &&
    !SUITS.includes(run.jokerRuntimeV6.castleTargetSuit)
  ) {
    violations.push('V6 守垒花色目标无效');
  }
  if (
    run.jokerRuntimeV6.idolTargetRank !== null &&
    !RANKS.includes(run.jokerRuntimeV6.idolTargetRank)
  ) {
    violations.push('V6 神龛点数目标无效');
  }
  if (
    run.jokerRuntimeV6.idolTargetSuit !== null &&
    !SUITS.includes(run.jokerRuntimeV6.idolTargetSuit)
  ) {
    violations.push('V6 神龛花色目标无效');
  }
  if (
    (run.jokerRuntimeV6.idolTargetRank === null) !==
    (run.jokerRuntimeV6.idolTargetSuit === null)
  ) {
    violations.push('V6 神龛点数与花色目标必须同时存在或同时为空');
  }
  const hasRuntimeAction = (action: string) =>
    run.inventory.jokers.some((joker) =>
      joker.effects.some((effect) => effect.parameters.action === action),
    );
  if (
    !hasRuntimeAction('set-castle-target') &&
    run.jokerRuntimeV6.castleTargetSuit !== null
  ) {
    violations.push('V6 无守垒来源时不得保留花色目标');
  }
  if (
    !hasRuntimeAction('set-idol-target') &&
    (run.jokerRuntimeV6.idolTargetRank !== null ||
      run.jokerRuntimeV6.idolTargetSuit !== null)
  ) {
    violations.push('V6 无神龛来源时不得保留牌面目标');
  }
  const expectedDebt = Math.max(0, usedJokerSlotsForRun(run) - run.rules.jokerSlots);
  if (
    !Number.isSafeInteger(run.jokerRuntimeV6.jokerCapacityDebt) ||
    run.jokerRuntimeV6.jokerCapacityDebt < 0 ||
    run.jokerRuntimeV6.jokerCapacityDebt !== expectedDebt
  ) {
    violations.push('V6 奇牌容量欠额必须与已用栏位精确一致');
  }

  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}
