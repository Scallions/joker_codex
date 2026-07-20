import { stableId } from '../game-core/model/ids';
import type { ProfileId, RunId } from '../game-core/model/ids';
import {
  createInitialProgressionState,
  type ProfileProgressionState,
} from '../progression/model';
import {
  ACHIEVEMENT_DEFINITIONS,
  CHALLENGE_CONTENT_IDS,
  DECK_CONTENT_IDS,
  JOKER_CONTENT_IDS,
  OBJECTIVE_DEFINITIONS,
  PROFILE_HAND_TYPES,
  PROGRESSION_RULES_VERSION,
  TUTORIAL_SCRIPT_VERSION,
  VOUCHER_CONTENT_IDS,
} from '../progression/definitions';

export type ProfileSlot = 1 | 2 | 3;
export const PROFILE_SCHEMA_VERSION = 1 as const;

export interface ProfileRecord extends ProfileProgressionState {
  readonly schemaVersion: typeof PROFILE_SCHEMA_VERSION;
  readonly id: ProfileId;
  readonly slot: ProfileSlot;
  readonly displayName: string;
  readonly createdAtEpochMs: number;
  readonly updatedAtEpochMs: number;
  readonly activeRunId: RunId | null;
}

export type ProfileValidationResult =
  { readonly ok: true } | { readonly ok: false; readonly violations: readonly string[] };

function isSafeNonnegative(value: number): boolean {
  return Number.isSafeInteger(value) && value >= 0;
}

function hasExactOrderedIds(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  return (
    actual.length === expected.length &&
    actual.every((value, index) => value === expected[index])
  );
}

function isSortedUnique(values: readonly string[]): boolean {
  return values.every(
    (value, index) => index === 0 || value.localeCompare(values[index - 1] ?? '') > 0,
  );
}

function isOrderedSubset(
  actual: readonly string[],
  expected: readonly string[],
): boolean {
  let previousIndex = -1;
  for (const value of actual) {
    const index = expected.indexOf(value);
    if (index <= previousIndex) return false;
    previousIndex = index;
  }
  return true;
}

const STATISTIC_COUNTER_KEYS = [
  'campaignStarts',
  'campaignWins',
  'campaignLosses',
  'currentWinStreak',
  'bestWinStreak',
  'highestEndlessAnte',
  'handsPlayed',
  'cardsPlayed',
  'cardsDiscarded',
  'blindsDefeated',
  'blindsSkipped',
  'moneyEarned',
  'moneySpent',
  'maximumMoneyHeld',
  'interestEarned',
  'itemsPurchased',
  'itemsSold',
  'shopRerolls',
  'bossRerolls',
  'packsOpened',
  'vouchersRedeemed',
  'consumablesUsed',
  'tarotUsed',
  'planetUsed',
  'spectralUsed',
  'playingCardsPurchased',
  'editionJokersAcquired',
] as const;

const RESULT_STATISTIC_KEYS = new Set<string>([
  ...STATISTIC_COUNTER_KEYS,
  'totalScore',
  'bestHandScore',
  'distinctVoucherIds',
]);

function isKnownResultStatisticKey(key: string): boolean {
  if (RESULT_STATISTIC_KEYS.has(key)) return true;
  if (key.startsWith('handTypes.')) {
    return PROFILE_HAND_TYPES.includes(
      key.slice('handTypes.'.length) as (typeof PROFILE_HAND_TYPES)[number],
    );
  }
  if (key.startsWith('decks.')) {
    return DECK_CONTENT_IDS.includes(key.slice('decks.'.length));
  }
  if (key.startsWith('challenges.')) {
    return CHALLENGE_CONTENT_IDS.some((challengeId) => {
      const prefix = `challenges.${challengeId}.`;
      return (
        key.startsWith(prefix) &&
        ['attempts', 'completions', 'completedAtEpochMs'].includes(
          key.slice(prefix.length),
        )
      );
    });
  }
  return false;
}

function isProfileScore(value: number): boolean {
  return value === Number.POSITIVE_INFINITY || (Number.isFinite(value) && value >= 0);
}

function isNullableTimestamp(value: number | null): boolean {
  return value === null || isSafeNonnegative(value);
}

export function validateProfileRecord(profile: ProfileRecord): ProfileValidationResult {
  const violations: string[] = [];
  if (profile.schemaVersion !== PROFILE_SCHEMA_VERSION) violations.push('档案版本无效');
  if (profile.progressionRulesVersion !== PROGRESSION_RULES_VERSION) {
    violations.push('进度规则版本无效');
  }
  if (![1, 2, 3].includes(profile.slot) || profile.id !== `profile:${profile.slot}`) {
    violations.push('档案编号与档位不匹配');
  }
  if (
    profile.displayName !== profile.displayName.trim() ||
    profile.displayName.length < 1 ||
    profile.displayName.length > 12
  ) {
    violations.push('档案名无效');
  }
  if (
    !isSafeNonnegative(profile.createdAtEpochMs) ||
    !isSafeNonnegative(profile.updatedAtEpochMs) ||
    profile.updatedAtEpochMs < profile.createdAtEpochMs
  ) {
    violations.push('档案时间无效');
  }
  if (!isSafeNonnegative(profile.nextRunSequence) || profile.nextRunSequence < 1) {
    violations.push('下一牌局序号无效');
  }

  const expectedObjectiveIds = OBJECTIVE_DEFINITIONS.map(
    ({ objectiveId }) => objectiveId,
  );
  if (
    !hasExactOrderedIds(
      profile.objectives.map(({ objectiveId }) => objectiveId),
      expectedObjectiveIds,
    )
  ) {
    violations.push('进度目标编号缺失、重复或顺序错误');
  } else {
    profile.objectives.forEach((record, index) => {
      const definition = OBJECTIVE_DEFINITIONS[index];
      if (
        !definition ||
        record.target !== definition.target ||
        !isSafeNonnegative(record.current) ||
        record.current > record.target
      ) {
        violations.push(`进度目标数值无效：${record.objectiveId}`);
      }
      const completed = record.current >= record.target;
      if (
        completed !== (record.completedAtEpochMs !== null) ||
        completed !== (record.source !== null)
      ) {
        violations.push(`进度目标完成状态不一致：${record.objectiveId}`);
      }
      if (
        record.completedAtEpochMs !== null &&
        (!isSafeNonnegative(record.completedAtEpochMs) ||
          record.completedAtEpochMs > profile.updatedAtEpochMs)
      ) {
        violations.push(`进度目标时间无效：${record.objectiveId}`);
      }
      if (definition?.baseline && record.source !== 'baseline') {
        violations.push(`初始目标来源无效：${record.objectiveId}`);
      }
    });
  }

  if (
    !hasExactOrderedIds(
      profile.deckProgress.map(({ deckId }) => deckId),
      DECK_CONTENT_IDS,
    ) ||
    profile.deckProgress.some(
      ({ highestClearedStakeOrdinal }) =>
        !isSafeNonnegative(highestClearedStakeOrdinal) || highestClearedStakeOrdinal > 8,
    )
  ) {
    violations.push('牌组筹码进度无效');
  }

  const challengeIds = profile.challengeProgress.records.map(
    ({ challengeId }) => challengeId,
  );
  if (
    !hasExactOrderedIds(challengeIds, CHALLENGE_CONTENT_IDS) ||
    !isSafeNonnegative(profile.challengeProgress.nextAvailableOrdinal) ||
    profile.challengeProgress.nextAvailableOrdinal > 20
  ) {
    violations.push('挑战进度骨架无效');
  }
  for (const record of profile.challengeProgress.records) {
    if (
      !isSafeNonnegative(record.attempts) ||
      !isSafeNonnegative(record.completions) ||
      record.completions > record.attempts ||
      record.completions > 0 !== (record.completedAtEpochMs !== null) ||
      (record.completedAtEpochMs !== null &&
        (!isSafeNonnegative(record.completedAtEpochMs) ||
          record.completedAtEpochMs > profile.updatedAtEpochMs))
    ) {
      violations.push(`挑战记录无效：${record.challengeId}`);
    }
  }
  const completedChallengeCount = profile.challengeProgress.records.findIndex(
    ({ completedAtEpochMs }) => completedAtEpochMs === null,
  );
  const normalizedCompletedChallengeCount =
    completedChallengeCount < 0
      ? profile.challengeProgress.records.length
      : completedChallengeCount;
  const hasCompletionGap = profile.challengeProgress.records
    .slice(normalizedCompletedChallengeCount)
    .some(({ completedAtEpochMs }) => completedAtEpochMs !== null);
  const expectedChallengeGate =
    normalizedCompletedChallengeCount === 0
      ? profile.challengeProgress.nextAvailableOrdinal
      : Math.min(
          profile.challengeProgress.records.length,
          normalizedCompletedChallengeCount + 1,
        );
  if (
    hasCompletionGap ||
    (normalizedCompletedChallengeCount === 0
      ? ![0, 1].includes(profile.challengeProgress.nextAvailableOrdinal)
      : profile.challengeProgress.nextAvailableOrdinal !== expectedChallengeGate)
  ) {
    violations.push('挑战开放顺序无效');
  }

  if (
    !hasExactOrderedIds(
      profile.collection.jokerVictoryMarks.map(({ contentId }) => contentId),
      JOKER_CONTENT_IDS,
    ) ||
    profile.collection.jokerVictoryMarks.some(
      ({ highestStakeOrdinal }) =>
        !isSafeNonnegative(highestStakeOrdinal) || highestStakeOrdinal > 8,
    )
  ) {
    violations.push('奇牌胜幕印记无效');
  }
  const knownJokers = new Set(JOKER_CONTENT_IDS);
  if (
    !isSortedUnique(profile.collection.discoveredJokerIds) ||
    profile.collection.discoveredJokerIds.some((contentId) => !knownJokers.has(contentId))
  ) {
    violations.push('奇牌发现记录包含重复、乱序或未知编号');
  }

  const expectedAchievementIds = ACHIEVEMENT_DEFINITIONS.map(
    ({ achievementId }) => achievementId,
  );
  if (
    !hasExactOrderedIds(
      profile.achievements.map(({ achievementId }) => achievementId),
      expectedAchievementIds,
    )
  ) {
    violations.push('成就编号缺失、重复或顺序错误');
  } else {
    profile.achievements.forEach((record, index) => {
      const definition = ACHIEVEMENT_DEFINITIONS[index];
      if (
        !definition ||
        record.category !== definition.category ||
        record.target !== definition.target ||
        !isSafeNonnegative(record.current) ||
        record.current > record.target ||
        record.current >= record.target !== (record.completedAtEpochMs !== null)
      ) {
        violations.push(`成就进度无效：${record.achievementId}`);
      }
      if (!isNullableTimestamp(record.completedAtEpochMs)) {
        violations.push(`成就完成时间无效：${record.achievementId}`);
      }
      if (
        record.completedAtEpochMs !== null &&
        record.completedAtEpochMs > profile.updatedAtEpochMs
      ) {
        violations.push(`成就完成时间无效：${record.achievementId}`);
      }
    });
  }

  if (
    !hasExactOrderedIds(
      profile.statistics.handTypes.map(({ handType }) => handType),
      PROFILE_HAND_TYPES,
    ) ||
    !hasExactOrderedIds(
      profile.statistics.decks.map(({ deckId }) => deckId),
      DECK_CONTENT_IDS,
    ) ||
    !hasExactOrderedIds(
      profile.statistics.challenges.map(({ challengeId }) => challengeId),
      CHALLENGE_CONTENT_IDS,
    )
  ) {
    violations.push('统计注册表缺失、重复或顺序错误');
  }
  if (
    STATISTIC_COUNTER_KEYS.some((key) => !isSafeNonnegative(profile.statistics[key])) ||
    !isProfileScore(profile.statistics.totalScore) ||
    !isProfileScore(profile.statistics.bestHandScore) ||
    profile.statistics.currentWinStreak > profile.statistics.bestWinStreak
  ) {
    violations.push('统计汇总数值无效');
  }
  if (
    profile.statistics.handTypes.some(
      ({ playCount, bestScore }) =>
        !isSafeNonnegative(playCount) || !isProfileScore(bestScore),
    ) ||
    profile.statistics.decks.some(
      ({ starts, wins, highestClearedStakeOrdinal }) =>
        !isSafeNonnegative(starts) ||
        !isSafeNonnegative(wins) ||
        wins > starts ||
        !isSafeNonnegative(highestClearedStakeOrdinal) ||
        highestClearedStakeOrdinal > 8,
    ) ||
    profile.statistics.challenges.some(
      ({ attempts, completions, completedAtEpochMs }) =>
        !isSafeNonnegative(attempts) ||
        !isSafeNonnegative(completions) ||
        completions > attempts ||
        !isNullableTimestamp(completedAtEpochMs) ||
        completions > 0 !== (completedAtEpochMs !== null),
    )
  ) {
    violations.push('统计明细数值无效');
  }
  if (
    profile.statistics.campaignWins + profile.statistics.campaignLosses >
      profile.statistics.campaignStarts ||
    profile.statistics.decks.reduce((sum, { starts }) => sum + starts, 0) !==
      profile.statistics.campaignStarts ||
    profile.statistics.decks.reduce((sum, { wins }) => sum + wins, 0) !==
      profile.statistics.campaignWins ||
    profile.statistics.challenges.some((record, index) => {
      const progress = profile.challengeProgress.records[index];
      return (
        !progress ||
        record.challengeId !== progress.challengeId ||
        record.attempts !== progress.attempts ||
        record.completions !== progress.completions ||
        record.completedAtEpochMs !== progress.completedAtEpochMs
      );
    })
  ) {
    violations.push('统计汇总与明细不一致');
  }
  const knownVoucherIds = new Set(VOUCHER_CONTENT_IDS);
  if (
    !isSortedUnique(profile.statistics.distinctVoucherIds) ||
    profile.statistics.distinctVoucherIds.length > 32 ||
    profile.statistics.distinctVoucherIds.some(
      (voucherId) => !knownVoucherIds.has(voucherId),
    )
  ) {
    violations.push('优惠券统计集合无效');
  }

  if (profile.tutorial.scriptVersion !== TUTORIAL_SCRIPT_VERSION) {
    violations.push('教程脚本版本无效');
  }
  if (
    (profile.tutorial.status === 'in-progress') !==
    (profile.tutorial.currentStepId !== null)
  ) {
    violations.push('教程步骤与状态不一致');
  }
  if (!isSafeNonnegative(profile.tutorial.replayCount)) {
    violations.push('教程重玩次数无效');
  }
  const tutorialTimes = [
    profile.tutorial.startedAtEpochMs,
    profile.tutorial.completedAtEpochMs,
    profile.tutorial.skippedAtEpochMs,
  ];
  if (
    tutorialTimes.some((value) => !isNullableTimestamp(value)) ||
    tutorialTimes.some((value) => value !== null && value > profile.updatedAtEpochMs) ||
    (profile.tutorial.status === 'not-started' &&
      tutorialTimes.some((value) => value !== null)) ||
    (profile.tutorial.status !== 'not-started' &&
      profile.tutorial.startedAtEpochMs === null) ||
    (profile.tutorial.status === 'completed' &&
      profile.tutorial.completedAtEpochMs === null) ||
    (profile.tutorial.status === 'skipped' &&
      profile.tutorial.skippedAtEpochMs === null) ||
    (profile.tutorial.status === 'completed' &&
      profile.tutorial.skippedAtEpochMs !== null) ||
    (profile.tutorial.completedAtEpochMs !== null &&
      profile.tutorial.startedAtEpochMs !== null &&
      profile.tutorial.completedAtEpochMs < profile.tutorial.startedAtEpochMs) ||
    (profile.tutorial.skippedAtEpochMs !== null &&
      profile.tutorial.startedAtEpochMs !== null &&
      profile.tutorial.skippedAtEpochMs < profile.tutorial.startedAtEpochMs) ||
    (profile.tutorial.status === 'not-started' && profile.tutorial.replayCount !== 0) ||
    (profile.tutorial.currentStepId !== null &&
      !/^tutorial:step:0[1-8]$/.test(profile.tutorial.currentStepId))
  ) {
    violations.push('教程时间或步骤无效');
  }

  if (profile.activeProjectionCursor) {
    if (
      profile.activeRunId !== profile.activeProjectionCursor.runId ||
      !isSafeNonnegative(profile.activeProjectionCursor.checkpointId)
    ) {
      violations.push('进度游标与当前牌局不匹配');
    }
  }
  if (profile.currentRunProgress.runId !== profile.activeRunId) {
    violations.push('当前牌局投影与档案引用不匹配');
  }
  const handCounterEntries = Object.entries(profile.currentRunProgress.handsPlayedByType);
  if (
    !hasExactOrderedIds(
      handCounterEntries.map(([handType]) => handType),
      PROFILE_HAND_TYPES,
    ) ||
    handCounterEntries.some(([, count]) => !isSafeNonnegative(count)) ||
    !isSafeNonnegative(profile.currentRunProgress.interestEarned) ||
    !isSafeNonnegative(profile.currentRunProgress.currentBlindHandsPlayed) ||
    !isSafeNonnegative(profile.currentRunProgress.currentBlindDiscardsUsed)
  ) {
    violations.push('当前牌局统计投影无效');
  }
  if (
    profile.activeRunId === null &&
    (profile.currentRunProgress.campaignVictorySettled ||
      profile.currentRunProgress.interestEarned !== 0 ||
      profile.currentRunProgress.currentBlindHandsPlayed !== 0 ||
      profile.currentRunProgress.currentBlindDiscardsUsed !== 0 ||
      profile.currentRunProgress.resultDelta !== null ||
      Object.values(profile.currentRunProgress.handsPlayedByType).some(
        (count) => count !== 0,
      ))
  ) {
    violations.push('无进行中牌局时仍保留局内统计');
  }

  const noticeIds = profile.unreadNotices.map(({ noticeId }) => noticeId);
  if (
    profile.unreadNotices.length > 50 ||
    new Set(noticeIds).size !== noticeIds.length ||
    profile.unreadNotices.some(
      ({ noticeId, kind, title, detail, createdAtEpochMs }) =>
        noticeId.length < 1 ||
        noticeId.length > 160 ||
        !['unlock', 'discovery', 'achievement', 'victory-mark'].includes(kind) ||
        title.trim().length < 1 ||
        title.length > 80 ||
        detail.trim().length < 1 ||
        detail.length > 240 ||
        !isSafeNonnegative(createdAtEpochMs) ||
        createdAtEpochMs > profile.updatedAtEpochMs,
    )
  ) {
    violations.push('未读通知超过上限或包含无效记录');
  }

  const invalidResultSummary = (result: ProfileRecord['lastResultSummary']): boolean =>
    result !== null &&
    (result.runId.length < 1 ||
      result.runId.length > 160 ||
      !isOrderedSubset(result.objectiveIds, expectedObjectiveIds) ||
      !isSortedUnique(result.discoveredJokerIds) ||
      result.discoveredJokerIds.some((contentId) => !knownJokers.has(contentId)) ||
      !isOrderedSubset(result.achievementIds, expectedAchievementIds) ||
      !isOrderedSubset(result.victoryMarkContentIds, JOKER_CONTENT_IDS) ||
      !isSortedUnique(result.statisticKeys) ||
      result.statisticKeys.some((key) => !isKnownResultStatisticKey(key)));
  const currentResult = profile.currentRunProgress.resultDelta;
  if (
    invalidResultSummary(currentResult) ||
    (currentResult !== null && currentResult.runId !== profile.activeRunId)
  ) {
    violations.push('当前牌局结果增量无效');
  }
  if (invalidResultSummary(profile.lastResultSummary)) {
    violations.push('牌局结果摘要无效');
  }

  return violations.length === 0 ? { ok: true } : { ok: false, violations };
}

export function createProfile(
  slot: ProfileSlot,
  displayName: string,
  nowEpochMs: number,
): ProfileRecord {
  const normalizedName = displayName.trim();
  if (normalizedName.length < 1 || normalizedName.length > 12) {
    throw new RangeError('档案名须为 1 至 12 个字符');
  }
  if (!Number.isSafeInteger(nowEpochMs) || nowEpochMs < 0) {
    throw new RangeError('档案时间无效');
  }

  return {
    schemaVersion: PROFILE_SCHEMA_VERSION,
    id: stableId<'profile'>(`profile:${slot}`),
    slot,
    displayName: normalizedName,
    createdAtEpochMs: nowEpochMs,
    updatedAtEpochMs: nowEpochMs,
    activeRunId: null,
    ...createInitialProgressionState(nowEpochMs),
  };
}

export function renameProfile(
  profile: ProfileRecord,
  displayName: string,
  nowEpochMs: number,
): ProfileRecord {
  const renamed = createProfile(profile.slot, displayName, nowEpochMs);
  return {
    ...profile,
    displayName: renamed.displayName,
    updatedAtEpochMs: nowEpochMs,
  };
}
