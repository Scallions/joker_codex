import {
  OBJECTIVE_DEFINITIONS,
  type ObjectiveDefinition,
  type ObjectiveSource,
} from './definitions';
import type { ProgressionFact } from './facts';
import type {
  ChallengeProgress,
  CollectionProgress,
  CurrentRunProgress,
  DeckProgressRecord,
  ObjectiveProgressRecord,
  ProfileStatistics,
} from './model';
import type { ProgressionPolicy } from './modePolicy';

export interface ObjectiveEvaluationContext {
  readonly statistics: ProfileStatistics;
  readonly currentRunProgress: CurrentRunProgress;
  readonly collection: CollectionProgress;
  readonly deckProgress: readonly DeckProgressRecord[];
  readonly challengeProgress: ChallengeProgress;
  readonly facts: readonly ProgressionFact[];
}

export interface ObjectiveReduction {
  readonly records: readonly ObjectiveProgressRecord[];
  readonly completedIds: readonly string[];
}

function relevantFacts<T extends ProgressionFact['type']>(
  facts: readonly ProgressionFact[],
  type: T,
): readonly Extract<ProgressionFact, { readonly type: T }>[] {
  return facts.filter(
    (fact): fact is Extract<ProgressionFact, { readonly type: T }> => fact.type === type,
  );
}

function challengeCompletionCount(context: ObjectiveEvaluationContext): number {
  return context.challengeProgress.records.filter(
    ({ completedAtEpochMs }) => completedAtEpochMs !== null,
  ).length;
}

function contextualValue(
  definition: ObjectiveDefinition,
  existing: ObjectiveProgressRecord,
  context: ObjectiveEvaluationContext,
): number {
  const { objectiveId, family, referenceIndex } = definition;
  const { statistics, facts } = context;
  if (family === 'stake') {
    const stakeOrdinal = Number(referenceIndex.slice(1));
    return context.deckProgress.some(
      ({ highestClearedStakeOrdinal }) => highestClearedStakeOrdinal >= stakeOrdinal - 1,
    )
      ? 1
      : 0;
  }
  if (family === 'challenge') {
    const ordinal = Number(referenceIndex.slice(1));
    if (ordinal === 1) return statistics.campaignWins > 0 ? 1 : 0;
    return context.challengeProgress.records[ordinal - 2]?.completedAtEpochMs !== null
      ? 1
      : 0;
  }

  switch (objectiveId) {
    case 'bxqp:objective:deck:02':
      return statistics.campaignWins;
    case 'bxqp:objective:deck:03':
      return Math.max(
        existing.current,
        ...relevantFacts(facts, 'run-won').map(({ moneyHeld }) =>
          moneyHeld >= 40 ? 1 : 0,
        ),
      );
    case 'bxqp:objective:deck:04':
      return Math.max(
        existing.current,
        relevantFacts(facts, 'run-won').length > 0 &&
          context.currentRunProgress.interestEarned === 0
          ? 1
          : 0,
      );
    case 'bxqp:objective:deck:05':
      return Math.max(
        existing.current,
        relevantFacts(facts, 'blind-won').some(({ jokerCapacityOccupied }) =>
          Boolean(jokerCapacityOccupied),
        )
          ? 1
          : 0,
      );
    case 'bxqp:objective:deck:06':
      return statistics.consumablesUsed;
    case 'bxqp:objective:deck:07':
      return Math.max(...statistics.handTypes.map(({ playCount }) => playCount));
    case 'bxqp:objective:deck:08':
      return statistics.spectralUsed;
    case 'bxqp:objective:deck:09':
      return Math.max(
        existing.current,
        relevantFacts(facts, 'run-won').some(({ printedRanks }) =>
          printedRanks.every((rank) => !['jack', 'queen', 'king'].includes(rank)),
        )
          ? 1
          : 0,
      );
    case 'bxqp:objective:deck:10':
      return Math.max(
        existing.current,
        relevantFacts(facts, 'run-won').some(
          ({ printedSuits }) => printedSuits.length <= 2,
        )
          ? 1
          : 0,
      );
    case 'bxqp:objective:deck:11':
      return statistics.distinctVoucherIds.length;
    case 'bxqp:objective:deck:12':
      return Math.max(
        existing.current,
        relevantFacts(facts, 'run-won').some(({ stakeOrdinal }) => stakeOrdinal >= 3)
          ? 1
          : 0,
      );
    case 'bxqp:objective:deck:13':
      return statistics.blindsSkipped;
    case 'bxqp:objective:deck:14':
      return statistics.bestHandScore;
    case 'bxqp:objective:deck:15':
      return challengeCompletionCount(context);
    case 'bxqp:objective:voucher:02':
      return statistics.itemsPurchased;
    case 'bxqp:objective:voucher:04':
      return statistics.moneySpent;
    case 'bxqp:objective:voucher:06':
      return statistics.editionJokersAcquired;
    case 'bxqp:objective:voucher:08':
      return statistics.shopRerolls;
    case 'bxqp:objective:voucher:10':
    case 'bxqp:objective:voucher:18':
      return statistics.tarotUsed;
    case 'bxqp:objective:voucher:12':
    case 'bxqp:objective:voucher:20':
      return statistics.planetUsed;
    case 'bxqp:objective:voucher:14':
      return statistics.handsPlayed;
    case 'bxqp:objective:voucher:16':
      return statistics.cardsDiscarded;
    case 'bxqp:objective:voucher:22':
      return statistics.interestEarned;
    case 'bxqp:objective:voucher:24':
      return context.collection.discoveredJokerIds.length;
    case 'bxqp:objective:voucher:26':
      return statistics.playingCardsPurchased;
    case 'bxqp:objective:voucher:28':
      return statistics.highestEndlessAnte;
    case 'bxqp:objective:voucher:30':
      return statistics.bossRerolls;
    case 'bxqp:objective:voucher:32':
      return statistics.campaignWins;
    case 'bxqp:objective:tag:02':
      return context.collection.discoveredJokerIds.length;
    case 'bxqp:objective:tag:03':
      return Math.max(
        existing.current,
        relevantFacts(facts, 'item-acquired').some(
          ({ kind, editionId }) =>
            kind === 'joker' && editionId === 'bxqp:edition:shadow-cutout',
        )
          ? 1
          : 0,
      );
    case 'bxqp:objective:tag:04':
      return Math.max(
        existing.current,
        relevantFacts(facts, 'item-acquired').some(
          ({ kind, editionId }) =>
            kind === 'joker' && editionId === 'bxqp:edition:gilt-edge',
        )
          ? 1
          : 0,
      );
    case 'bxqp:objective:tag:05':
      return Math.max(
        existing.current,
        relevantFacts(facts, 'item-acquired').some(
          ({ kind, editionId }) =>
            kind === 'joker' && editionId === 'bxqp:edition:phantom-ink',
        )
          ? 1
          : 0,
      );
    case 'bxqp:objective:tag:06':
      return Math.max(
        existing.current,
        relevantFacts(facts, 'item-acquired').some(
          ({ kind, editionId }) =>
            kind === 'joker' && editionId === 'bxqp:edition:rainbow-lacquer',
        )
          ? 1
          : 0,
      );
    default:
      return existing.current;
  }
}

function allowedByPolicy(
  definition: ObjectiveDefinition,
  policy: ProgressionPolicy,
): boolean {
  if (policy === 'full') return true;
  if (policy !== 'challenge-only') return false;
  return (
    definition.objectiveId === 'bxqp:objective:deck:15' ||
    definition.family === 'challenge'
  );
}

function completionSource(
  definition: ObjectiveDefinition,
  policy: ProgressionPolicy,
): ObjectiveSource {
  if (
    policy === 'challenge-only' ||
    definition.objectiveId === 'bxqp:objective:deck:15' ||
    (definition.family === 'challenge' && definition.referenceIndex !== 'C01')
  ) {
    return 'challenge';
  }
  return 'campaign';
}

export function evaluateObjectives(
  initial: readonly ObjectiveProgressRecord[],
  context: ObjectiveEvaluationContext,
  policy: ProgressionPolicy,
  nowEpochMs: number,
): ObjectiveReduction {
  const completedIds: string[] = [];
  const records = initial.map((record, index) => {
    const definition = OBJECTIVE_DEFINITIONS[index];
    if (!definition || definition.objectiveId !== record.objectiveId) {
      throw new Error(`进度目标注册表错位：${record.objectiveId}`);
    }
    if (definition.baseline || !allowedByPolicy(definition, policy)) return record;
    const current = Math.min(
      record.target,
      Math.max(record.current, contextualValue(definition, record, context)),
    );
    if (current < record.target || record.completedAtEpochMs !== null) {
      return current === record.current ? record : { ...record, current };
    }
    completedIds.push(record.objectiveId);
    return {
      ...record,
      current,
      completedAtEpochMs: nowEpochMs,
      source: completionSource(definition, policy),
    };
  });
  return { records, completedIds };
}
