import { PRODUCTION_CATALOG } from '../content/productionCatalog';
import { validateRunStateV2 } from '../game-core/invariants/validateRunStateV2';
import { validateRunStateV7 } from '../game-core/invariants/validateRunStateV7';
import type { RunStateV2 } from '../game-core/model/runV2';
import { isRunStateV7, type RunStateV7 } from '../game-core/model/runV7';
import { validateProfileRecord, type ProfileRecord } from './profiles';

export type ProfileRunPairValidation =
  { readonly ok: true } | { readonly ok: false; readonly violations: readonly string[] };

function validateFrozenV7Setup(
  profile: ProfileRecord,
  run: RunStateV7,
  violations: string[],
): void {
  if (run.sessionV7.runSequence === 0) return;

  const completedObjectives = new Set(
    profile.objectives.flatMap(({ objectiveId, completedAtEpochMs }) =>
      completedAtEpochMs === null ? [] : [objectiveId],
    ),
  );
  const frozenObjectives = new Set(run.sessionV7.eligibilityObjectiveIds);
  if (
    run.sessionV7.eligibilityObjectiveIds.some(
      (objectiveId) => !completedObjectives.has(objectiveId),
    )
  ) {
    violations.push('牌局解锁快照包含档案尚未取得的目标');
  }
  const discoveredJokers = new Set(profile.collection.discoveredJokerIds);
  if (
    run.sessionV7.discoveredContentIds.some(
      (contentId) => !discoveredJokers.has(contentId),
    )
  ) {
    violations.push('牌局发现快照包含档案尚未发现的内容');
  }
  if (profile.nextRunSequence !== run.sessionV7.runSequence + 1) {
    violations.push('档案下一牌局序号与当前牌局不连续');
  }

  const rowById = new Map(PRODUCTION_CATALOG.rows.map((row) => [row.id, row] as const));
  const deck = rowById.get(run.setupV3.deckId);
  const stake = rowById.get(run.setupV3.stakeId);
  const challenge = run.setupV3.challengeId ? rowById.get(run.setupV3.challengeId) : null;
  const isFrozenAvailable = (objectiveId: string | null): boolean =>
    objectiveId === null || frozenObjectives.has(objectiveId);

  if (deck?.family !== 'deck' || stake?.family !== 'stake') {
    violations.push('牌局牌组或筹码设置不在目录中');
    return;
  }

  if (run.sessionV7.runClass === 'challenge') {
    if (
      challenge?.family !== 'challenge' ||
      !isFrozenAvailable(challenge.unlockObjectiveId) ||
      challenge.ordinal > profile.challengeProgress.nextAvailableOrdinal
    ) {
      violations.push('牌局挑战在冻结快照中尚未开放');
    }
    if (deck.ordinal !== 1 || stake.ordinal !== 1) {
      violations.push('挑战牌局必须使用固定 D01/S01 设置');
    }
    return;
  }

  if (challenge !== null) {
    violations.push('非挑战牌局不得携带挑战设置');
  }
  if (run.sessionV7.runClass === 'tutorial') {
    if (deck.ordinal !== 1 || stake.ordinal !== 1) {
      violations.push('教程牌局必须使用固定 D01/S01 设置');
    }
    return;
  }
  if (!isFrozenAvailable(deck.unlockObjectiveId)) {
    violations.push('牌局牌组在冻结快照中尚未解锁');
  }
  if (!isFrozenAvailable(stake.unlockObjectiveId)) {
    violations.push('牌局筹码在冻结快照中尚未解锁');
  }
  const deckProgress = profile.deckProgress.find((record) => record.deckId === deck.id);
  if (
    !deckProgress ||
    stake.ordinal > Math.min(8, Math.max(1, deckProgress.highestClearedStakeOrdinal + 1))
  ) {
    violations.push('当前牌组尚未开放所选筹码等级');
  }
}

export function validateProfileRunPair(
  profile: ProfileRecord,
  run: RunStateV2 | null,
): ProfileRunPairValidation {
  const profileValidation = validateProfileRecord(profile);
  const violations = profileValidation.ok ? [] : [...profileValidation.violations];
  if ((profile.activeRunId === null) !== (run === null)) {
    violations.push('档案与进行中的牌局不匹配');
  }
  if (run) {
    if (profile.activeRunId !== run.runId) violations.push('档案引用了另一局牌');
    const runValidation = isRunStateV7(run)
      ? validateRunStateV7(run)
      : validateRunStateV2(run);
    if (!runValidation.ok) violations.push(...runValidation.violations);
    if (
      isRunStateV7(run) &&
      run.sessionV7.profileId !== null &&
      run.sessionV7.profileId !== profile.id
    ) {
      violations.push('牌局属于另一份档案');
    }
    if (isRunStateV7(run)) validateFrozenV7Setup(profile, run, violations);
    if (
      isRunStateV7(run) &&
      run.sessionV7.runSequence > 0 &&
      profile.activeProjectionCursor?.checkpointId !== run.checkpointId
    ) {
      violations.push('档案进度游标没有指向当前牌局检查点');
    }
    if (
      profile.activeProjectionCursor &&
      profile.activeProjectionCursor.checkpointId > run.checkpointId
    ) {
      violations.push('档案进度游标领先于牌局检查点');
    }
  }
  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}

export function assertValidProfileRunPair(
  profile: ProfileRecord,
  run: RunStateV2 | null,
  prefix: string,
): void {
  const validation = validateProfileRunPair(profile, run);
  if (!validation.ok) {
    throw new Error(`${prefix}：${validation.violations.join('；')}`);
  }
}
