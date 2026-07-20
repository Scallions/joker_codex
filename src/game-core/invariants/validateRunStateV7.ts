import {
  JOKER_CONTENT_IDS,
  OBJECTIVE_DEFINITIONS,
  PROGRESSION_RULES_VERSION,
  TUTORIAL_SCRIPT_VERSION,
} from '../../progression/definitions';
import { PROGRESSION_CONTENT_VERSION } from '../../progression/seedCode';
import type { RunStateV7 } from '../model/runV7';
import { validateRunStateV6 } from './validateRunStateV6';
import type { RunValidationResultV3 } from './validateRunStateV3';

function isSortedUnique(values: readonly string[]): boolean {
  return values.every(
    (value, index) => index === 0 || value.localeCompare(values[index - 1] ?? '') > 0,
  );
}

export function validateRunStateV7(run: RunStateV7): RunValidationResultV3 {
  const base = validateRunStateV6(run);
  const violations = base.ok ? [] : [...base.violations];
  if (run.schemaVersion !== 7) violations.push('V7 牌局结构版本错误');
  if (!/^[a-f0-9]{8}$/.test(run.migrationV7.recoveryFingerprint)) {
    violations.push('V7 迁移指纹无效');
  }
  if (run.migrationV7.sourceCheckpointId > run.checkpointId) {
    violations.push('V7 迁移检查点晚于当前状态');
  }
  if (run.sessionV7.progressionRulesVersion !== PROGRESSION_RULES_VERSION) {
    violations.push('V7 进度规则版本无效');
  }
  if (!Number.isSafeInteger(run.sessionV7.runSequence) || run.sessionV7.runSequence < 0) {
    violations.push('V7 牌局序号无效');
  }
  if (run.sessionV7.runSequence === 0 && run.sessionV7.profileId !== null) {
    violations.push('迁移牌局不得虚构档案归属');
  }
  if (
    run.sessionV7.runSequence > 0 &&
    (run.sessionV7.profileId === null || run.sessionV7.runClass === 'migrated-legacy')
  ) {
    violations.push('新牌局缺少有效档案归属');
  }
  if (
    run.sessionV7.runSequence > 0 &&
    run.contentVersion !== PROGRESSION_CONTENT_VERSION
  ) {
    violations.push('新 V7 牌局内容版本无效');
  }
  if (run.sessionV7.runClass === 'challenge' ? run.setupV3.challengeId === null : false) {
    violations.push('挑战牌局缺少挑战设置');
  }
  if (
    ['campaign', 'seeded', 'tutorial'].includes(run.sessionV7.runClass) &&
    run.setupV3.challengeId !== null
  ) {
    violations.push('非挑战牌局不得携带挑战设置');
  }
  if (
    (run.sessionV7.runClass === 'tutorial') !==
    (run.sessionV7.tutorialScriptVersion !== null)
  ) {
    violations.push('教程牌局与脚本版本不匹配');
  }
  if (
    run.sessionV7.tutorialScriptVersion !== null &&
    run.sessionV7.tutorialScriptVersion !== TUTORIAL_SCRIPT_VERSION
  ) {
    violations.push('教程牌局脚本版本无效');
  }
  const knownObjectives = new Set(
    OBJECTIVE_DEFINITIONS.map(({ objectiveId }) => objectiveId),
  );
  if (
    !isSortedUnique(run.sessionV7.eligibilityObjectiveIds) ||
    run.sessionV7.eligibilityObjectiveIds.some((id) => !knownObjectives.has(id))
  ) {
    violations.push('V7 解锁快照包含重复、乱序或未知目标');
  }
  const knownJokers = new Set(JOKER_CONTENT_IDS);
  if (
    !isSortedUnique(run.sessionV7.discoveredContentIds) ||
    run.sessionV7.discoveredContentIds.some((id) => !knownJokers.has(id))
  ) {
    violations.push('V7 发现快照包含重复、乱序或未知内容');
  }
  if (run.sessionV7.runSequence > 0) {
    const objectiveSnapshot = new Set(run.sessionV7.eligibilityObjectiveIds);
    const discoverySnapshot = new Set(run.sessionV7.discoveredContentIds);
    const rowById = new Map(
      run.productionContentV3.rows.map(({ definition }) => [definition.id, definition]),
    );
    const deck = rowById.get(run.setupV3.deckId);
    const stake = rowById.get(run.setupV3.stakeId);
    const challenge = run.setupV3.challengeId
      ? rowById.get(run.setupV3.challengeId)
      : null;
    const setupRowAvailable = (
      row: (typeof run.productionContentV3.rows)[number]['definition'] | undefined,
    ): boolean =>
      row !== undefined &&
      (row.unlockObjectiveId === null || objectiveSnapshot.has(row.unlockObjectiveId));
    if (
      deck?.family !== 'deck' ||
      stake?.family !== 'stake' ||
      !setupRowAvailable(deck) ||
      !setupRowAvailable(stake)
    ) {
      violations.push('V7 牌组或筹码设置不在冻结快照中');
    }
    if (
      run.sessionV7.runClass === 'challenge' &&
      (challenge?.family !== 'challenge' ||
        !setupRowAvailable(challenge) ||
        deck?.ordinal !== 1 ||
        stake?.ordinal !== 1)
    ) {
      violations.push('V7 挑战设置不在冻结快照中或未使用 D01/S01');
    }
    if (
      run.sessionV7.runClass === 'tutorial' &&
      (deck?.ordinal !== 1 || stake?.ordinal !== 1)
    ) {
      violations.push('V7 教程必须使用冻结的 D01/S01 设置');
    }
    const runtimeContentIds = new Set([
      ...run.content.items.map(({ contentId }) => contentId),
      ...run.content.vouchers.map(({ id }) => id),
      ...run.content.tags.map(({ id }) => id),
      ...run.content.packs.map(({ id }) => id),
      ...run.content.blinds.map(({ id }) => id),
    ]);
    const forbiddenRuntimeRows = run.productionContentV3.rows.filter(
      ({ definition }) =>
        runtimeContentIds.has(definition.id) &&
        ((definition.unlockObjectiveId !== null &&
          !objectiveSnapshot.has(definition.unlockObjectiveId)) ||
          (definition.availability.kind === 'profile-objective' &&
            !objectiveSnapshot.has(definition.availability.value)) ||
          (definition.discovery.kind === 'profile-objective' &&
            !objectiveSnapshot.has(definition.discovery.value)) ||
          (definition.discovery.kind === 'after-use' &&
            !discoverySnapshot.has(definition.discovery.value))),
    );
    if (forbiddenRuntimeRows.length > 0) {
      violations.push(
        `V7 运行时池包含快照未开放内容：${forbiddenRuntimeRows
          .map(({ definition }) => definition.id)
          .join('、')}`,
      );
    }
  }

  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}
