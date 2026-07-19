import type { JokerDefinitionV2 } from '../model/runV2';
import type { RunStateV4 } from '../model/runV4';
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

export function validateRunStateV4(run: RunStateV4): RunValidationResultV3 {
  const base = validateRunStateV3(run);
  const violations = base.ok ? [] : [...base.violations];

  if (run.schemaVersion !== 4) violations.push('V4 牌局结构版本错误');
  if (!/^[a-f0-9]{8}$/.test(run.migrationV4.recoveryFingerprint)) {
    violations.push('V4 迁移指纹无效');
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
    violations.push('V4 奇牌实例与能力状态必须一一对应');
  }

  for (const modifier of run.modifiersV3.jokers) {
    const owned = ownedByInstance.get(modifier.instanceId);
    const definition = owned ? definitionById.get(owned.contentId) : undefined;
    const expected = definition?.initialAbilityState ?? {};
    const actualKeys = Object.keys(modifier.abilityState).sort();
    const expectedKeys = Object.keys(expected).sort();
    if (!sameKeys(actualKeys, expectedKeys)) {
      violations.push(`V4 奇牌能力状态键不匹配：${modifier.instanceId}`);
      continue;
    }
    for (const key of expectedKeys) {
      const value = modifier.abilityState[key];
      const initial = expected[key];
      if (!abilityValueIsValid(value) || typeof value !== typeof initial) {
        violations.push(`V4 奇牌能力状态值无效：${modifier.instanceId}:${key}`);
      }
    }
  }

  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}
