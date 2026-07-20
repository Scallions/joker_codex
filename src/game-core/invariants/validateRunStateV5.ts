import type { JokerDefinitionV2 } from '../model/runV2';
import type { RunStateV5 } from '../model/runV5';
import type { RunStateV6 } from '../model/runV6';
import { RANKS, SUITS } from '../model/cards';
import { validateRunStateV3, type RunValidationResultV3 } from './validateRunStateV3';

function sameKeys(left: readonly string[], right: readonly string[]): boolean {
  return (
    left.length === right.length && left.every((value, index) => value === right[index])
  );
}

function abilityValueIsValid(value: unknown): boolean {
  return (
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isSafeInteger(value))
  );
}

export function validateRunStateV5(run: RunStateV5 | RunStateV6): RunValidationResultV3 {
  const base = validateRunStateV3(run);
  const violations = base.ok ? [] : [...base.violations];

  if (run.schemaVersion !== 5 && run.schemaVersion !== 6 && run.schemaVersion !== 7) {
    violations.push('V5 基础牌局结构版本错误');
  }
  if (!/^[a-f0-9]{8}$/.test(run.migrationV5.recoveryFingerprint)) {
    violations.push('V5 迁移指纹无效');
  }
  if (
    !Number.isSafeInteger(run.jokerRuntimeV5.initialDeckSize) ||
    run.jokerRuntimeV5.initialDeckSize < 0
  ) {
    violations.push('V5 初始牌组数量无效');
  }
  if (
    run.jokerRuntimeV5.sharedRoundTargetRank !== null &&
    !RANKS.includes(run.jokerRuntimeV5.sharedRoundTargetRank)
  ) {
    violations.push('V5 共享点数目标无效');
  }
  if (
    run.jokerRuntimeV5.sharedRoundTargetSuit !== null &&
    !SUITS.includes(run.jokerRuntimeV5.sharedRoundTargetSuit)
  ) {
    violations.push('V5 共享花色目标无效');
  }

  const ownedByInstance = new Map(
    run.inventory.jokers.map((joker) => [joker.instanceId, joker]),
  );
  const definitionById = new Map(
    run.content.items
      .filter((item): item is JokerDefinitionV2 => item.kind === 'joker')
      .map((definition) => [definition.contentId, definition]),
  );
  const modifierIds = run.modifiersV3.jokers
    .map((modifier) => modifier.instanceId)
    .sort((left, right) => left.localeCompare(right));
  const ownedIds = run.inventory.jokers
    .map((joker) => joker.instanceId)
    .sort((left, right) => left.localeCompare(right));
  if (!sameKeys(modifierIds, ownedIds)) {
    violations.push('V5 奇牌实例与能力状态必须一一对应');
  }
  for (const modifier of run.modifiersV3.jokers) {
    const owned = ownedByInstance.get(modifier.instanceId);
    const expected = owned
      ? (definitionById.get(owned.contentId)?.initialAbilityState ?? {})
      : {};
    const actualKeys = Object.keys(modifier.abilityState).sort();
    const expectedKeys = Object.keys(expected).sort();
    if (!sameKeys(actualKeys, expectedKeys)) {
      violations.push(`V5 奇牌能力状态键不匹配：${modifier.instanceId}`);
      continue;
    }
    for (const key of expectedKeys) {
      const value = modifier.abilityState[key];
      if (!abilityValueIsValid(value) || typeof value !== typeof expected[key]) {
        violations.push(`V5 奇牌能力状态值无效：${modifier.instanceId}:${key}`);
      }
    }
  }

  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}
