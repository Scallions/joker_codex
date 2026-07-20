import { ACHIEVEMENT_DEFINITIONS } from './definitions';
import type { ProgressionFact } from './facts';
import type {
  AchievementProgressRecord,
  ChallengeProgress,
  CollectionProgress,
  DeckProgressRecord,
  ProfileStatistics,
} from './model';
import type { ProgressionPolicy } from './modePolicy';

export interface AchievementEvaluationContext {
  readonly statistics: ProfileStatistics;
  readonly collection: CollectionProgress;
  readonly deckProgress: readonly DeckProgressRecord[];
  readonly challengeProgress: ChallengeProgress;
  readonly facts: readonly ProgressionFact[];
}

export interface AchievementReduction {
  readonly records: readonly AchievementProgressRecord[];
  readonly completedIds: readonly string[];
}

function anyFact<T extends ProgressionFact['type']>(
  facts: readonly ProgressionFact[],
  type: T,
  predicate: (fact: Extract<ProgressionFact, { readonly type: T }>) => boolean = () =>
    true,
): boolean {
  return facts.some(
    (fact) =>
      fact.type === type && predicate(fact as Extract<ProgressionFact, { type: T }>),
  );
}

function challengeCompletionCount(context: AchievementEvaluationContext): number {
  return context.challengeProgress.records.filter(
    ({ completedAtEpochMs }) => completedAtEpochMs !== null,
  ).length;
}

function achievementValue(
  ordinal: number,
  existing: AchievementProgressRecord,
  context: AchievementEvaluationContext,
): number {
  const { statistics, facts, collection, deckProgress } = context;
  switch (ordinal) {
    case 1:
      return existing.current;
    case 2:
      return statistics.blindsDefeated;
    case 3:
      return statistics.itemsPurchased;
    case 4:
      return Math.max(
        existing.current,
        anyFact(facts, 'item-acquired', ({ kind }) => kind === 'joker') ? 1 : 0,
      );
    case 5:
      return statistics.campaignWins;
    case 6:
      return Math.max(existing.current, anyFact(facts, 'endless-entered') ? 1 : 0);
    case 7:
      return Math.max(
        existing.current,
        anyFact(facts, 'blind-won', ({ handsPlayed }) => handsPlayed === 1) ? 1 : 0,
      );
    case 8:
      return Math.max(
        existing.current,
        anyFact(facts, 'blind-won', ({ discardsUsed }) => discardsUsed === 0) ? 1 : 0,
      );
    case 9:
      return Math.max(
        existing.current,
        anyFact(facts, 'hand-scored', ({ handType }) => handType === 'straight-flush')
          ? 1
          : 0,
      );
    case 10:
      return Math.max(
        existing.current,
        anyFact(facts, 'hand-scored', ({ handType }) =>
          ['flush-five', 'flush-house', 'five-of-a-kind'].includes(handType),
        )
          ? 1
          : 0,
      );
    case 11:
    case 12:
      return statistics.bestHandScore;
    case 13:
      return statistics.handsPlayed;
    case 14:
      return statistics.handTypes.filter(({ playCount }) => playCount > 0).length;
    case 15:
      return statistics.maximumMoneyHeld;
    case 16:
      return statistics.moneySpent;
    case 17:
      return statistics.packsOpened;
    case 18:
      return statistics.shopRerolls;
    case 19:
      return statistics.distinctVoucherIds.length;
    case 20:
    case 21:
    case 22:
      return collection.discoveredJokerIds.length;
    case 23:
      return collection.jokerVictoryMarks.filter(
        ({ highestStakeOrdinal }) => highestStakeOrdinal > 0,
      ).length;
    case 24:
      return collection.jokerVictoryMarks.filter(
        ({ highestStakeOrdinal }) => highestStakeOrdinal >= 8,
      ).length;
    case 25:
    case 26:
    case 27:
      return challengeCompletionCount(context);
    case 28:
      return deckProgress.some(
        ({ highestClearedStakeOrdinal }) => highestClearedStakeOrdinal >= 8,
      )
        ? 1
        : 0;
    case 29:
      return statistics.decks.filter(({ wins }) => wins > 0).length;
    case 30:
      return deckProgress.filter(
        ({ highestClearedStakeOrdinal }) => highestClearedStakeOrdinal >= 8,
      ).length;
    case 31:
      return collection.jokerVictoryMarks.filter(
        ({ highestStakeOrdinal }) => highestStakeOrdinal >= 8,
      ).length;
    default:
      return existing.current;
  }
}

function allowedOrdinal(ordinal: number, policy: ProgressionPolicy): boolean {
  if (policy === 'full') return true;
  return policy === 'challenge-only' && ordinal >= 25 && ordinal <= 27;
}

export function evaluateAchievements(
  initial: readonly AchievementProgressRecord[],
  context: AchievementEvaluationContext,
  policy: ProgressionPolicy,
  nowEpochMs: number,
): AchievementReduction {
  const completedIds: string[] = [];
  const records = initial.map((record, index) => {
    const definition = ACHIEVEMENT_DEFINITIONS[index];
    const ordinal = index + 1;
    if (!definition || definition.achievementId !== record.achievementId) {
      throw new Error(`成就注册表错位：${record.achievementId}`);
    }
    if (!allowedOrdinal(ordinal, policy)) return record;
    const current = Math.min(
      record.target,
      Math.max(record.current, achievementValue(ordinal, record, context)),
    );
    if (current < record.target || record.completedAtEpochMs !== null) {
      return current === record.current ? record : { ...record, current };
    }
    completedIds.push(record.achievementId);
    return { ...record, current, completedAtEpochMs: nowEpochMs };
  });
  return { records, completedIds };
}
