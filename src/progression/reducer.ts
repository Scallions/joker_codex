import type { RunStateV7 } from '../game-core/model/runV7';
import { validateProfileRecord, type ProfileRecord } from '../persistence/profiles';
import { evaluateAchievements } from './achievements';
import { reduceCampaignCollection } from './collection';
import {
  ACHIEVEMENT_DEFINITIONS,
  JOKER_CONTENT_IDS,
  OBJECTIVE_DEFINITIONS,
  PROFILE_HAND_TYPES,
} from './definitions';
import type { ProgressionFact, ProgressionFactBatch } from './facts';
import {
  filterProgressionFactsByRunClass,
  progressionPolicyForRunClass,
} from './modePolicy';
import type {
  AchievementProgressRecord,
  ChallengeProgressRecord,
  ChallengeStatistics,
  ProgressionNotice,
  ProfileProgressionState,
  ResultDeltaSummary,
} from './model';
import { evaluateObjectives } from './objectives';
import { addBoundedCounter, reduceCampaignStatistics } from './statistics';

function completeAchievement(
  records: readonly AchievementProgressRecord[],
  achievementId: string,
  current: number,
  nowEpochMs: number,
): readonly AchievementProgressRecord[] {
  return records.map((record) => {
    if (record.achievementId !== achievementId) return record;
    const nextCurrent = Math.min(record.target, Math.max(record.current, current));
    return {
      ...record,
      current: nextCurrent,
      completedAtEpochMs:
        record.completedAtEpochMs ?? (nextCurrent >= record.target ? nowEpochMs : null),
    };
  });
}

function incrementChallengeRecord<
  T extends ChallengeProgressRecord | ChallengeStatistics,
>(records: readonly T[], challengeId: string): readonly T[] {
  return records.map((record) =>
    record.challengeId === challengeId
      ? { ...record, attempts: addBoundedCounter(record.attempts, 1) }
      : record,
  );
}

function resetCurrentRunProgress(
  run: RunStateV7,
  resultDelta: ResultDeltaSummary | null,
): ProfileProgressionState['currentRunProgress'] {
  return {
    runId: run.runId,
    campaignVictorySettled: false,
    interestEarned: 0,
    handsPlayedByType: Object.fromEntries(
      PROFILE_HAND_TYPES.map((handType) => [handType, 0]),
    ) as ProfileProgressionState['currentRunProgress']['handsPlayedByType'],
    currentBlindHandsPlayed: 0,
    currentBlindDiscardsUsed: 0,
    resultDelta,
  };
}

function emptyResultSummary(runId: RunStateV7['runId']): ResultDeltaSummary {
  return {
    runId,
    objectiveIds: [],
    discoveredJokerIds: [],
    achievementIds: [],
    victoryMarkContentIds: [],
    statisticKeys: [],
  };
}

function orderedUnion(
  order: readonly string[],
  existing: readonly string[],
  incoming: readonly string[],
): readonly string[] {
  const values = new Set([...existing, ...incoming]);
  return order.filter((value) => values.has(value));
}

function mergeResultSummary(
  existing: ResultDeltaSummary,
  additions: Omit<ResultDeltaSummary, 'runId'>,
): ResultDeltaSummary {
  return {
    runId: existing.runId,
    objectiveIds: orderedUnion(
      OBJECTIVE_DEFINITIONS.map(({ objectiveId }) => objectiveId),
      existing.objectiveIds,
      additions.objectiveIds,
    ),
    discoveredJokerIds: [
      ...new Set([...existing.discoveredJokerIds, ...additions.discoveredJokerIds]),
    ].sort((left, right) => left.localeCompare(right)),
    achievementIds: orderedUnion(
      ACHIEVEMENT_DEFINITIONS.map(({ achievementId }) => achievementId),
      existing.achievementIds,
      additions.achievementIds,
    ),
    victoryMarkContentIds: orderedUnion(
      JOKER_CONTENT_IDS,
      existing.victoryMarkContentIds,
      additions.victoryMarkContentIds,
    ),
    statisticKeys: [
      ...new Set([...existing.statisticKeys, ...additions.statisticKeys]),
    ].sort((left, right) => left.localeCompare(right)),
  };
}

export function projectRunStart(
  profile: ProfileRecord,
  run: RunStateV7,
  nowEpochMs: number,
): ProfileRecord {
  if (run.sessionV7.profileId !== profile.id) {
    throw new Error('牌局不属于当前档案');
  }
  if (run.sessionV7.runSequence !== profile.nextRunSequence) {
    throw new Error('牌局序号与档案不匹配');
  }
  if (!Number.isSafeInteger(nowEpochMs) || nowEpochMs < profile.updatedAtEpochMs) {
    throw new Error('进度结算时间无效');
  }

  let achievements = profile.achievements;
  let statistics = profile.statistics;
  let challengeProgress = profile.challengeProgress;
  let tutorial = profile.tutorial;
  let unreadNotices = profile.unreadNotices;
  let resultDelta: ResultDeltaSummary | null = null;

  if (run.sessionV7.runClass === 'campaign') {
    const entryAchievementWasNew = profile.achievements[0]?.completedAtEpochMs === null;
    achievements = completeAchievement(
      achievements,
      'bxqp:achievement:001',
      1,
      nowEpochMs,
    );
    statistics = {
      ...statistics,
      campaignStarts: addBoundedCounter(statistics.campaignStarts, 1),
      decks: statistics.decks.map((record) =>
        record.deckId === run.setupV3.deckId
          ? { ...record, starts: addBoundedCounter(record.starts, 1) }
          : record,
      ),
    };
    const firstAchievement = ACHIEVEMENT_DEFINITIONS[0];
    if (firstAchievement && profile.achievements[0]?.completedAtEpochMs === null) {
      const notice: ProgressionNotice = {
        noticeId: `${run.runId}:achievement:001`,
        kind: 'achievement',
        title: `成就达成：${firstAchievement.name}`,
        detail: firstAchievement.description,
        createdAtEpochMs: nowEpochMs,
      };
      unreadNotices = [...unreadNotices, notice].slice(-50);
    }
    resultDelta = {
      ...emptyResultSummary(run.runId),
      achievementIds: entryAchievementWasNew ? ['bxqp:achievement:001'] : [],
      statisticKeys: [`decks.${run.setupV3.deckId}`, 'campaignStarts'].sort(
        (left, right) => left.localeCompare(right),
      ),
    };
  } else if (run.sessionV7.runClass === 'challenge') {
    const challengeId = run.setupV3.challengeId;
    if (!challengeId) throw new Error('挑战牌局缺少挑战编号');
    challengeProgress = {
      ...challengeProgress,
      records: incrementChallengeRecord(challengeProgress.records, challengeId),
    };
    statistics = {
      ...statistics,
      challenges: incrementChallengeRecord(statistics.challenges, challengeId),
    };
    resultDelta = {
      ...emptyResultSummary(run.runId),
      statisticKeys: [`challenges.${challengeId}.attempts`],
    };
  } else if (run.sessionV7.runClass === 'tutorial') {
    tutorial = {
      ...tutorial,
      status: 'in-progress',
      currentStepId: 'tutorial:step:01',
      startedAtEpochMs: tutorial.startedAtEpochMs ?? nowEpochMs,
      completedAtEpochMs: tutorial.completedAtEpochMs,
      skippedAtEpochMs: null,
      replayCount:
        tutorial.status === 'completed' || tutorial.status === 'skipped'
          ? addBoundedCounter(tutorial.replayCount, 1)
          : tutorial.replayCount,
    };
  }

  const projected: ProfileRecord = {
    ...profile,
    updatedAtEpochMs: nowEpochMs,
    activeRunId: run.runId,
    nextRunSequence: run.sessionV7.runSequence + 1,
    activeProjectionCursor: { runId: run.runId, checkpointId: run.checkpointId },
    tutorial,
    challengeProgress,
    achievements,
    statistics,
    currentRunProgress: resetCurrentRunProgress(run, resultDelta),
    unreadNotices,
  };
  const validation = validateProfileRecord(projected);
  if (!validation.ok) {
    throw new Error(`开局进度无效：${validation.violations.join('；')}`);
  }
  return projected;
}

function reduceChallengeCompletion(
  profile: ProfileRecord,
  facts: readonly ProgressionFact[],
  nowEpochMs: number,
): Pick<ProfileRecord, 'challengeProgress' | 'statistics'> {
  let challengeProgress = profile.challengeProgress;
  let statistics = profile.statistics;
  for (const fact of facts) {
    if (fact.type !== 'challenge-completed') continue;
    const ordinal = challengeProgress.records.findIndex(
      ({ challengeId }) => challengeId === fact.challengeId,
    );
    if (ordinal < 0) throw new Error(`未知挑战编号：${fact.challengeId}`);
    const record = challengeProgress.records[ordinal];
    if (!record) continue;
    const firstCompletion = record.completedAtEpochMs === null;
    challengeProgress = {
      nextAvailableOrdinal: firstCompletion
        ? Math.max(
            challengeProgress.nextAvailableOrdinal,
            Math.min(challengeProgress.records.length, ordinal + 2),
          )
        : challengeProgress.nextAvailableOrdinal,
      records: challengeProgress.records.map((candidate) =>
        candidate.challengeId === fact.challengeId
          ? {
              ...candidate,
              completions: addBoundedCounter(candidate.completions, 1),
              completedAtEpochMs: candidate.completedAtEpochMs ?? nowEpochMs,
            }
          : candidate,
      ),
    };
    statistics = {
      ...statistics,
      challenges: statistics.challenges.map((candidate) =>
        candidate.challengeId === fact.challengeId
          ? {
              ...candidate,
              completions: addBoundedCounter(candidate.completions, 1),
              completedAtEpochMs: candidate.completedAtEpochMs ?? nowEpochMs,
            }
          : candidate,
      ),
    };
  }
  return { challengeProgress, statistics };
}

function reduceTutorialFacts(
  profile: ProfileRecord,
  facts: readonly ProgressionFact[],
  nowEpochMs: number,
): ProfileRecord['tutorial'] {
  let tutorial = profile.tutorial;
  for (const fact of facts) {
    if (fact.type === 'tutorial-step-completed') {
      tutorial = { ...tutorial, status: 'in-progress', currentStepId: fact.stepId };
    } else if (fact.type === 'tutorial-completed') {
      tutorial = {
        ...tutorial,
        status: 'completed',
        currentStepId: null,
        completedAtEpochMs: tutorial.completedAtEpochMs ?? nowEpochMs,
        skippedAtEpochMs: null,
      };
    } else if (fact.type === 'tutorial-skipped') {
      tutorial = {
        ...tutorial,
        status: 'skipped',
        currentStepId: null,
        skippedAtEpochMs: nowEpochMs,
      };
    }
  }
  return tutorial;
}

function mergeNotices(
  existing: readonly ProgressionNotice[],
  incoming: readonly ProgressionNotice[],
): readonly ProgressionNotice[] {
  const merged = new Map(existing.map((notice) => [notice.noticeId, notice]));
  for (const notice of incoming) {
    merged.delete(notice.noticeId);
    merged.set(notice.noticeId, notice);
  }
  return [...merged.values()].slice(-50);
}

function completionNotices(
  objectiveIds: readonly string[],
  achievementIds: readonly string[],
  discoveredJokerIds: readonly string[],
  victoryMarkContentIds: readonly string[],
  nowEpochMs: number,
): readonly ProgressionNotice[] {
  const objectiveById = new Map(
    OBJECTIVE_DEFINITIONS.map((definition) => [definition.objectiveId, definition]),
  );
  const achievementById = new Map(
    ACHIEVEMENT_DEFINITIONS.map((definition) => [definition.achievementId, definition]),
  );
  return [
    ...objectiveIds.flatMap((objectiveId) => {
      const definition = objectiveById.get(objectiveId);
      return definition
        ? [
            {
              noticeId: `objective:${objectiveId}`,
              kind: 'unlock' as const,
              title: `内容解锁：${definition.referenceIndex}`,
              detail: definition.condition,
              createdAtEpochMs: nowEpochMs,
            },
          ]
        : [];
    }),
    ...achievementIds.flatMap((achievementId) => {
      const definition = achievementById.get(achievementId);
      return definition
        ? [
            {
              noticeId: `achievement:${achievementId}`,
              kind: 'achievement' as const,
              title: `成就达成：${definition.name}`,
              detail: definition.description,
              createdAtEpochMs: nowEpochMs,
            },
          ]
        : [];
    }),
    ...discoveredJokerIds.map((contentId) => ({
      noticeId: `discovery:${contentId}`,
      kind: 'discovery' as const,
      title: '奇牌入谱',
      detail: `已发现 ${contentId}`,
      createdAtEpochMs: nowEpochMs,
    })),
    ...victoryMarkContentIds.map((contentId) => ({
      noticeId: `victory-mark:${contentId}`,
      kind: 'victory-mark' as const,
      title: '胜幕印记提升',
      detail: `${contentId} 获得新的胜幕印记`,
      createdAtEpochMs: nowEpochMs,
    })),
  ];
}

export function reduceProfileProgression(
  profile: ProfileRecord,
  batch: ProgressionFactBatch,
  nowEpochMs: number,
): ProfileRecord {
  if (profile.activeRunId !== batch.runId) {
    throw new Error('进度事实不属于档案当前牌局');
  }
  if (batch.profileId !== null && batch.profileId !== profile.id) {
    throw new Error('进度事实的档案归属不匹配');
  }
  if (!Number.isSafeInteger(nowEpochMs) || nowEpochMs < profile.updatedAtEpochMs) {
    throw new Error('进度结算时间无效');
  }
  const cursor = profile.activeProjectionCursor;
  if (
    cursor &&
    cursor.runId === batch.runId &&
    batch.checkpointId <= cursor.checkpointId
  ) {
    return profile;
  }
  if (cursor && cursor.runId !== batch.runId) {
    throw new Error('进度游标指向其他牌局');
  }

  const policy = progressionPolicyForRunClass(batch.runClass);
  let facts = filterProgressionFactsByRunClass(batch.runClass, batch.facts);
  if (profile.currentRunProgress.campaignVictorySettled) {
    facts = facts.filter(({ type }) => type !== 'run-won' && type !== 'run-lost');
  }

  const campaignStatistics =
    policy === 'full'
      ? reduceCampaignStatistics(profile.statistics, profile.currentRunProgress, facts)
      : {
          statistics: profile.statistics,
          currentRunProgress: profile.currentRunProgress,
          changedKeys: [] as readonly string[],
        };
  const challenge =
    policy === 'challenge-only'
      ? reduceChallengeCompletion(profile, facts, nowEpochMs)
      : {
          challengeProgress:
            policy === 'full' && facts.some(({ type }) => type === 'run-won')
              ? {
                  ...profile.challengeProgress,
                  nextAvailableOrdinal: Math.max(
                    profile.challengeProgress.nextAvailableOrdinal,
                    1,
                  ),
                }
              : profile.challengeProgress,
          statistics: campaignStatistics.statistics,
        };
  const collectionReduction =
    policy === 'full'
      ? reduceCampaignCollection(profile.collection, profile.deckProgress, facts)
      : { collection: profile.collection, deckProgress: profile.deckProgress };

  const objectiveReduction = evaluateObjectives(
    profile.objectives,
    {
      statistics: challenge.statistics,
      currentRunProgress: campaignStatistics.currentRunProgress,
      collection: collectionReduction.collection,
      deckProgress: collectionReduction.deckProgress,
      challengeProgress: challenge.challengeProgress,
      facts,
    },
    policy,
    nowEpochMs,
  );
  const achievementReduction = evaluateAchievements(
    profile.achievements,
    {
      statistics: challenge.statistics,
      collection: collectionReduction.collection,
      deckProgress: collectionReduction.deckProgress,
      challengeProgress: challenge.challengeProgress,
      facts,
    },
    policy,
    nowEpochMs,
  );

  const previousDiscoveries = new Set(profile.collection.discoveredJokerIds);
  const discoveredJokerIds = collectionReduction.collection.discoveredJokerIds.filter(
    (contentId) => !previousDiscoveries.has(contentId),
  );
  const previousMarks = new Map(
    profile.collection.jokerVictoryMarks.map((record) => [
      record.contentId,
      record.highestStakeOrdinal,
    ]),
  );
  const victoryMarkContentIds = collectionReduction.collection.jokerVictoryMarks
    .filter(
      ({ contentId, highestStakeOrdinal }) =>
        highestStakeOrdinal > (previousMarks.get(contentId) ?? 0),
    )
    .map(({ contentId }) => contentId);
  const notices = completionNotices(
    objectiveReduction.completedIds,
    achievementReduction.completedIds,
    discoveredJokerIds,
    victoryMarkContentIds,
    nowEpochMs,
  );
  const completedChallengeId = facts.find(
    (fact): fact is Extract<ProgressionFact, { type: 'challenge-completed' }> =>
      fact.type === 'challenge-completed',
  )?.challengeId;
  const failedChallengeId = facts.find(
    (fact): fact is Extract<ProgressionFact, { type: 'run-lost' }> =>
      fact.type === 'run-lost' && fact.challengeId !== null,
  )?.challengeId;
  const challengeResultId = completedChallengeId ?? failedChallengeId ?? null;
  const firstChallengeCompletion = completedChallengeId
    ? profile.challengeProgress.records.find(
        ({ challengeId }) => challengeId === completedChallengeId,
      )?.completedAtEpochMs === null
    : false;
  const statisticKeys =
    policy === 'challenge-only' && challengeResultId
      ? [
          `challenges.${challengeResultId}.attempts`,
          ...(completedChallengeId
            ? [
                `challenges.${challengeResultId}.completions`,
                ...(firstChallengeCompletion
                  ? [`challenges.${challengeResultId}.completedAtEpochMs`]
                  : []),
              ]
            : []),
        ].sort((left, right) => left.localeCompare(right))
      : campaignStatistics.changedKeys;
  const tracksResultDelta = policy === 'full' || policy === 'challenge-only';
  const existingResultSummary =
    profile.currentRunProgress.resultDelta?.runId === batch.runId
      ? profile.currentRunProgress.resultDelta
      : emptyResultSummary(batch.runId);
  const resultDelta = tracksResultDelta
    ? mergeResultSummary(existingResultSummary, {
        objectiveIds: objectiveReduction.completedIds,
        discoveredJokerIds,
        achievementIds: achievementReduction.completedIds,
        victoryMarkContentIds,
        statisticKeys,
      })
    : profile.currentRunProgress.resultDelta;
  const terminal = batch.facts.some(({ type }) =>
    [
      'run-won',
      'run-lost',
      'run-finished',
      'challenge-completed',
      'tutorial-completed',
    ].includes(type),
  );
  const lastResultSummary =
    terminal && resultDelta ? resultDelta : profile.lastResultSummary;
  const tutorial = reduceTutorialFacts(profile, facts, nowEpochMs);
  const projected: ProfileRecord = {
    ...profile,
    updatedAtEpochMs: nowEpochMs,
    activeRunId: profile.activeRunId,
    activeProjectionCursor: {
      runId: batch.runId,
      checkpointId: batch.checkpointId,
    },
    tutorial,
    objectives: objectiveReduction.records,
    deckProgress: collectionReduction.deckProgress,
    challengeProgress: challenge.challengeProgress,
    collection: collectionReduction.collection,
    achievements: achievementReduction.records,
    statistics: challenge.statistics,
    currentRunProgress: {
      ...campaignStatistics.currentRunProgress,
      resultDelta,
    },
    unreadNotices: mergeNotices(profile.unreadNotices, notices),
    lastResultSummary,
  };
  const validation = validateProfileRecord(projected);
  if (!validation.ok) {
    throw new Error(`局外进度无效：${validation.violations.join('；')}`);
  }
  return projected;
}

function clearedCurrentRunProgress(): ProfileProgressionState['currentRunProgress'] {
  return {
    runId: null,
    campaignVictorySettled: false,
    interestEarned: 0,
    handsPlayedByType: Object.fromEntries(
      PROFILE_HAND_TYPES.map((handType) => [handType, 0]),
    ) as ProfileProgressionState['currentRunProgress']['handsPlayedByType'],
    currentBlindHandsPlayed: 0,
    currentBlindDiscardsUsed: 0,
    resultDelta: null,
  };
}

export function projectRunAbandon(
  profile: ProfileRecord,
  nowEpochMs: number,
): ProfileRecord {
  if (!Number.isSafeInteger(nowEpochMs) || nowEpochMs < profile.updatedAtEpochMs) {
    throw new Error('弃局时间无效');
  }
  const projected: ProfileRecord = {
    ...profile,
    updatedAtEpochMs: nowEpochMs,
    activeRunId: null,
    activeProjectionCursor: null,
    currentRunProgress: clearedCurrentRunProgress(),
  };
  const validation = validateProfileRecord(projected);
  if (!validation.ok)
    throw new Error(`弃局档案无效：${validation.violations.join('；')}`);
  return projected;
}

export function projectTutorialSkip(
  profile: ProfileRecord,
  nowEpochMs: number,
): ProfileRecord {
  const abandoned = projectRunAbandon(profile, nowEpochMs);
  const projected: ProfileRecord = {
    ...abandoned,
    tutorial: {
      ...abandoned.tutorial,
      status: 'skipped',
      currentStepId: null,
      startedAtEpochMs: abandoned.tutorial.startedAtEpochMs ?? nowEpochMs,
      skippedAtEpochMs: nowEpochMs,
    },
  };
  const validation = validateProfileRecord(projected);
  if (!validation.ok) {
    throw new Error(`跳过教程后的档案无效：${validation.violations.join('；')}`);
  }
  return projected;
}
