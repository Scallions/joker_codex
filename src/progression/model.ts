import type { RunId } from '../game-core/model/ids';
import type { PokerHandType } from '../game-core/poker/evaluate';
import {
  ACHIEVEMENT_DEFINITIONS,
  CHALLENGE_CONTENT_IDS,
  DECK_CONTENT_IDS,
  JOKER_CONTENT_IDS,
  OBJECTIVE_DEFINITIONS,
  PROFILE_HAND_TYPES,
  PROGRESSION_RULES_VERSION,
  TUTORIAL_SCRIPT_VERSION,
  type AchievementCategory,
  type ObjectiveSource,
} from './definitions';

export interface ObjectiveProgressRecord {
  readonly objectiveId: string;
  readonly current: number;
  readonly target: number;
  readonly completedAtEpochMs: number | null;
  readonly source: ObjectiveSource | null;
}

export interface DeckProgressRecord {
  readonly deckId: string;
  readonly highestClearedStakeOrdinal: number;
}

export interface ChallengeProgressRecord {
  readonly challengeId: string;
  readonly attempts: number;
  readonly completions: number;
  readonly completedAtEpochMs: number | null;
}

export interface ChallengeProgress {
  readonly nextAvailableOrdinal: number;
  readonly records: readonly ChallengeProgressRecord[];
}

export interface JokerVictoryMarkRecord {
  readonly contentId: string;
  readonly highestStakeOrdinal: number;
}

export interface CollectionProgress {
  readonly discoveredJokerIds: readonly string[];
  readonly jokerVictoryMarks: readonly JokerVictoryMarkRecord[];
}

export interface AchievementProgressRecord {
  readonly achievementId: string;
  readonly category: AchievementCategory;
  readonly current: number;
  readonly target: number;
  readonly completedAtEpochMs: number | null;
}

export interface HandTypeStatistics {
  readonly handType: PokerHandType;
  readonly playCount: number;
  readonly bestScore: number;
}

export interface DeckStatistics {
  readonly deckId: string;
  readonly starts: number;
  readonly wins: number;
  readonly highestClearedStakeOrdinal: number;
}

export interface ChallengeStatistics {
  readonly challengeId: string;
  readonly attempts: number;
  readonly completions: number;
  readonly completedAtEpochMs: number | null;
}

export interface ProfileStatistics {
  readonly campaignStarts: number;
  readonly campaignWins: number;
  readonly campaignLosses: number;
  readonly currentWinStreak: number;
  readonly bestWinStreak: number;
  readonly highestEndlessAnte: number;
  readonly totalScore: number;
  readonly bestHandScore: number;
  readonly handsPlayed: number;
  readonly cardsPlayed: number;
  readonly cardsDiscarded: number;
  readonly blindsDefeated: number;
  readonly blindsSkipped: number;
  readonly moneyEarned: number;
  readonly moneySpent: number;
  readonly maximumMoneyHeld: number;
  readonly interestEarned: number;
  readonly itemsPurchased: number;
  readonly itemsSold: number;
  readonly shopRerolls: number;
  readonly bossRerolls: number;
  readonly packsOpened: number;
  readonly vouchersRedeemed: number;
  readonly consumablesUsed: number;
  readonly tarotUsed: number;
  readonly planetUsed: number;
  readonly spectralUsed: number;
  readonly playingCardsPurchased: number;
  readonly editionJokersAcquired: number;
  readonly distinctVoucherIds: readonly string[];
  readonly handTypes: readonly HandTypeStatistics[];
  readonly decks: readonly DeckStatistics[];
  readonly challenges: readonly ChallengeStatistics[];
}

export type TutorialStatus = 'not-started' | 'in-progress' | 'completed' | 'skipped';

export interface TutorialProgress {
  readonly status: TutorialStatus;
  readonly currentStepId: string | null;
  readonly scriptVersion: typeof TUTORIAL_SCRIPT_VERSION;
  readonly startedAtEpochMs: number | null;
  readonly completedAtEpochMs: number | null;
  readonly skippedAtEpochMs: number | null;
  readonly replayCount: number;
}

export interface ProgressionCursor {
  readonly runId: RunId;
  readonly checkpointId: number;
}

export interface CurrentRunProgress {
  readonly runId: RunId | null;
  readonly campaignVictorySettled: boolean;
  readonly interestEarned: number;
  readonly handsPlayedByType: Readonly<Record<PokerHandType, number>>;
  readonly currentBlindHandsPlayed: number;
  readonly currentBlindDiscardsUsed: number;
  readonly resultDelta: ResultDeltaSummary | null;
}

export interface ProgressionNotice {
  readonly noticeId: string;
  readonly kind: 'unlock' | 'discovery' | 'achievement' | 'victory-mark';
  readonly title: string;
  readonly detail: string;
  readonly createdAtEpochMs: number;
}

export interface ResultDeltaSummary {
  readonly runId: RunId;
  readonly objectiveIds: readonly string[];
  readonly discoveredJokerIds: readonly string[];
  readonly achievementIds: readonly string[];
  readonly victoryMarkContentIds: readonly string[];
  readonly statisticKeys: readonly string[];
}

export interface ProfileProgressionState {
  readonly progressionRulesVersion: typeof PROGRESSION_RULES_VERSION;
  readonly nextRunSequence: number;
  readonly activeProjectionCursor: ProgressionCursor | null;
  readonly tutorial: TutorialProgress;
  readonly objectives: readonly ObjectiveProgressRecord[];
  readonly deckProgress: readonly DeckProgressRecord[];
  readonly challengeProgress: ChallengeProgress;
  readonly collection: CollectionProgress;
  readonly achievements: readonly AchievementProgressRecord[];
  readonly statistics: ProfileStatistics;
  readonly currentRunProgress: CurrentRunProgress;
  readonly unreadNotices: readonly ProgressionNotice[];
  readonly lastResultSummary: ResultDeltaSummary | null;
}

function zeroHandTypeCounts(): Readonly<Record<PokerHandType, number>> {
  return Object.fromEntries(
    PROFILE_HAND_TYPES.map((handType) => [handType, 0]),
  ) as Record<PokerHandType, number>;
}

export function createInitialProgressionState(
  nowEpochMs: number,
): ProfileProgressionState {
  return {
    progressionRulesVersion: PROGRESSION_RULES_VERSION,
    nextRunSequence: 1,
    activeProjectionCursor: null,
    tutorial: {
      status: 'not-started',
      currentStepId: null,
      scriptVersion: TUTORIAL_SCRIPT_VERSION,
      startedAtEpochMs: null,
      completedAtEpochMs: null,
      skippedAtEpochMs: null,
      replayCount: 0,
    },
    objectives: OBJECTIVE_DEFINITIONS.map((definition) => ({
      objectiveId: definition.objectiveId,
      current: definition.baseline ? definition.target : 0,
      target: definition.target,
      completedAtEpochMs: definition.baseline ? nowEpochMs : null,
      source: definition.baseline ? 'baseline' : null,
    })),
    deckProgress: DECK_CONTENT_IDS.map((deckId) => ({
      deckId,
      highestClearedStakeOrdinal: 0,
    })),
    challengeProgress: {
      nextAvailableOrdinal: 0,
      records: CHALLENGE_CONTENT_IDS.map((challengeId) => ({
        challengeId,
        attempts: 0,
        completions: 0,
        completedAtEpochMs: null,
      })),
    },
    collection: {
      discoveredJokerIds: [],
      jokerVictoryMarks: JOKER_CONTENT_IDS.map((contentId) => ({
        contentId,
        highestStakeOrdinal: 0,
      })),
    },
    achievements: ACHIEVEMENT_DEFINITIONS.map((definition) => ({
      achievementId: definition.achievementId,
      category: definition.category,
      current: 0,
      target: definition.target,
      completedAtEpochMs: null,
    })),
    statistics: {
      campaignStarts: 0,
      campaignWins: 0,
      campaignLosses: 0,
      currentWinStreak: 0,
      bestWinStreak: 0,
      highestEndlessAnte: 0,
      totalScore: 0,
      bestHandScore: 0,
      handsPlayed: 0,
      cardsPlayed: 0,
      cardsDiscarded: 0,
      blindsDefeated: 0,
      blindsSkipped: 0,
      moneyEarned: 0,
      moneySpent: 0,
      maximumMoneyHeld: 0,
      interestEarned: 0,
      itemsPurchased: 0,
      itemsSold: 0,
      shopRerolls: 0,
      bossRerolls: 0,
      packsOpened: 0,
      vouchersRedeemed: 0,
      consumablesUsed: 0,
      tarotUsed: 0,
      planetUsed: 0,
      spectralUsed: 0,
      playingCardsPurchased: 0,
      editionJokersAcquired: 0,
      distinctVoucherIds: [],
      handTypes: PROFILE_HAND_TYPES.map((handType) => ({
        handType,
        playCount: 0,
        bestScore: 0,
      })),
      decks: DECK_CONTENT_IDS.map((deckId) => ({
        deckId,
        starts: 0,
        wins: 0,
        highestClearedStakeOrdinal: 0,
      })),
      challenges: CHALLENGE_CONTENT_IDS.map((challengeId) => ({
        challengeId,
        attempts: 0,
        completions: 0,
        completedAtEpochMs: null,
      })),
    },
    currentRunProgress: {
      runId: null,
      campaignVictorySettled: false,
      interestEarned: 0,
      handsPlayedByType: zeroHandTypeCounts(),
      currentBlindHandsPlayed: 0,
      currentBlindDiscardsUsed: 0,
      resultDelta: null,
    },
    unreadNotices: [],
    lastResultSummary: null,
  };
}
