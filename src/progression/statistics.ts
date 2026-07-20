import type { ProfileStatistics, CurrentRunProgress } from './model';
import type { ProgressionFact } from './facts';

const MAX_COUNTER = Number.MAX_SAFE_INTEGER;

export function boundedCounter(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(MAX_COUNTER, Math.floor(value));
}

export function addBoundedCounter(current: number, delta: number): number {
  return Math.min(MAX_COUNTER, boundedCounter(current) + boundedCounter(delta));
}

function profileScore(value: number): number {
  return value === Number.POSITIVE_INFINITY ? value : boundedCounter(value);
}

function addProfileScore(current: number, delta: number): number {
  if (current === Number.POSITIVE_INFINITY || delta === Number.POSITIVE_INFINITY) {
    return Number.POSITIVE_INFINITY;
  }
  return addBoundedCounter(current, delta);
}

export interface StatisticsReduction {
  readonly statistics: ProfileStatistics;
  readonly currentRunProgress: CurrentRunProgress;
  readonly changedKeys: readonly string[];
}

export function reduceCampaignStatistics(
  initialStatistics: ProfileStatistics,
  initialCurrentRun: CurrentRunProgress,
  facts: readonly ProgressionFact[],
): StatisticsReduction {
  let statistics = initialStatistics;
  let currentRunProgress = initialCurrentRun;
  const changedKeys = new Set<string>();
  const change = (key: string): void => {
    changedKeys.add(key);
  };

  for (const fact of facts) {
    switch (fact.type) {
      case 'hand-scored':
        statistics = {
          ...statistics,
          totalScore: addProfileScore(statistics.totalScore, fact.score),
          bestHandScore: Math.max(statistics.bestHandScore, profileScore(fact.score)),
          handsPlayed: addBoundedCounter(statistics.handsPlayed, 1),
          handTypes: statistics.handTypes.map((record) =>
            record.handType === fact.handType
              ? {
                  ...record,
                  playCount: addBoundedCounter(record.playCount, 1),
                  bestScore: Math.max(record.bestScore, profileScore(fact.score)),
                }
              : record,
          ),
        };
        currentRunProgress = {
          ...currentRunProgress,
          handsPlayedByType: {
            ...currentRunProgress.handsPlayedByType,
            [fact.handType]: addBoundedCounter(
              currentRunProgress.handsPlayedByType[fact.handType],
              1,
            ),
          },
          currentBlindHandsPlayed: addBoundedCounter(
            currentRunProgress.currentBlindHandsPlayed,
            1,
          ),
        };
        change('handsPlayed');
        change('totalScore');
        change('bestHandScore');
        change(`handTypes.${fact.handType}`);
        break;
      case 'cards-played':
        statistics = {
          ...statistics,
          cardsPlayed: addBoundedCounter(statistics.cardsPlayed, fact.count),
        };
        change('cardsPlayed');
        break;
      case 'cards-discarded':
        statistics = {
          ...statistics,
          cardsDiscarded: addBoundedCounter(statistics.cardsDiscarded, fact.count),
        };
        currentRunProgress = {
          ...currentRunProgress,
          currentBlindDiscardsUsed: addBoundedCounter(
            currentRunProgress.currentBlindDiscardsUsed,
            1,
          ),
        };
        change('cardsDiscarded');
        break;
      case 'blind-won':
        statistics = {
          ...statistics,
          blindsDefeated: addBoundedCounter(statistics.blindsDefeated, 1),
        };
        currentRunProgress = {
          ...currentRunProgress,
          currentBlindHandsPlayed: 0,
          currentBlindDiscardsUsed: 0,
        };
        change('blindsDefeated');
        break;
      case 'blind-skipped':
        statistics = {
          ...statistics,
          blindsSkipped: addBoundedCounter(statistics.blindsSkipped, 1),
        };
        change('blindsSkipped');
        break;
      case 'reward-claimed':
        statistics = {
          ...statistics,
          moneyEarned: addBoundedCounter(statistics.moneyEarned, fact.amount),
          interestEarned: addBoundedCounter(
            statistics.interestEarned,
            fact.interestAmount,
          ),
        };
        currentRunProgress = {
          ...currentRunProgress,
          interestEarned: addBoundedCounter(
            currentRunProgress.interestEarned,
            fact.interestAmount,
          ),
        };
        change('moneyEarned');
        if (fact.interestAmount > 0) change('interestEarned');
        break;
      case 'item-purchased':
        statistics = {
          ...statistics,
          itemsPurchased: addBoundedCounter(statistics.itemsPurchased, 1),
          moneySpent: addBoundedCounter(statistics.moneySpent, fact.price),
          playingCardsPurchased:
            fact.kind === 'playing-card'
              ? addBoundedCounter(statistics.playingCardsPurchased, 1)
              : statistics.playingCardsPurchased,
        };
        change('itemsPurchased');
        if (fact.price > 0) change('moneySpent');
        if (fact.kind === 'playing-card') change('playingCardsPurchased');
        break;
      case 'item-acquired':
        if (fact.kind === 'joker' && fact.editionId !== null) {
          statistics = {
            ...statistics,
            editionJokersAcquired: addBoundedCounter(statistics.editionJokersAcquired, 1),
          };
          change('editionJokersAcquired');
        }
        break;
      case 'item-sold':
        statistics = {
          ...statistics,
          itemsSold: addBoundedCounter(statistics.itemsSold, 1),
          moneyEarned: addBoundedCounter(statistics.moneyEarned, fact.amount),
        };
        change('itemsSold');
        if (fact.amount > 0) change('moneyEarned');
        break;
      case 'consumable-used':
        statistics = {
          ...statistics,
          consumablesUsed: addBoundedCounter(statistics.consumablesUsed, 1),
          tarotUsed:
            fact.family === 'tarot'
              ? addBoundedCounter(statistics.tarotUsed, 1)
              : statistics.tarotUsed,
          planetUsed:
            fact.family === 'planet'
              ? addBoundedCounter(statistics.planetUsed, 1)
              : statistics.planetUsed,
          spectralUsed:
            fact.family === 'spectral'
              ? addBoundedCounter(statistics.spectralUsed, 1)
              : statistics.spectralUsed,
        };
        change('consumablesUsed');
        if (fact.family !== 'fixture') change(`${fact.family}Used`);
        break;
      case 'voucher-redeemed': {
        const distinctVoucherIds = [
          ...new Set([...statistics.distinctVoucherIds, fact.voucherId]),
        ].sort((left, right) => left.localeCompare(right));
        statistics = {
          ...statistics,
          vouchersRedeemed: addBoundedCounter(statistics.vouchersRedeemed, 1),
          moneySpent: addBoundedCounter(statistics.moneySpent, fact.price),
          distinctVoucherIds,
        };
        change('vouchersRedeemed');
        change('distinctVoucherIds');
        if (fact.price > 0) change('moneySpent');
        break;
      }
      case 'shop-rerolled':
        statistics = {
          ...statistics,
          shopRerolls: addBoundedCounter(statistics.shopRerolls, 1),
          moneySpent: addBoundedCounter(statistics.moneySpent, fact.cost),
        };
        change('shopRerolls');
        if (fact.cost > 0) change('moneySpent');
        break;
      case 'boss-rerolled':
        statistics = {
          ...statistics,
          bossRerolls: addBoundedCounter(statistics.bossRerolls, 1),
          moneySpent: addBoundedCounter(statistics.moneySpent, fact.cost),
        };
        change('bossRerolls');
        if (fact.cost > 0) change('moneySpent');
        break;
      case 'pack-opened':
        statistics = {
          ...statistics,
          packsOpened: addBoundedCounter(statistics.packsOpened, 1),
          moneySpent: addBoundedCounter(statistics.moneySpent, fact.price),
        };
        change('packsOpened');
        if (fact.price > 0) change('moneySpent');
        break;
      case 'money-held':
        if (fact.amount > statistics.maximumMoneyHeld) {
          statistics = {
            ...statistics,
            maximumMoneyHeld: boundedCounter(fact.amount),
          };
          change('maximumMoneyHeld');
        }
        break;
      case 'endless-entered':
      case 'endless-ante-reached':
        if (fact.ante > statistics.highestEndlessAnte) {
          statistics = {
            ...statistics,
            highestEndlessAnte: boundedCounter(fact.ante),
          };
          change('highestEndlessAnte');
        }
        break;
      case 'run-won': {
        const currentWinStreak = addBoundedCounter(statistics.currentWinStreak, 1);
        statistics = {
          ...statistics,
          campaignWins: addBoundedCounter(statistics.campaignWins, 1),
          currentWinStreak,
          bestWinStreak: Math.max(statistics.bestWinStreak, currentWinStreak),
          decks: statistics.decks.map((record) =>
            record.deckId === fact.deckId
              ? {
                  ...record,
                  wins: addBoundedCounter(record.wins, 1),
                  highestClearedStakeOrdinal: Math.max(
                    record.highestClearedStakeOrdinal,
                    fact.stakeOrdinal,
                  ),
                }
              : record,
          ),
        };
        currentRunProgress = {
          ...currentRunProgress,
          campaignVictorySettled: true,
        };
        change('campaignWins');
        change('currentWinStreak');
        change('bestWinStreak');
        change(`decks.${fact.deckId}`);
        break;
      }
      case 'run-lost':
        statistics = {
          ...statistics,
          campaignLosses: addBoundedCounter(statistics.campaignLosses, 1),
          currentWinStreak: 0,
        };
        change('campaignLosses');
        change('currentWinStreak');
        break;
      case 'joker-discovered':
      case 'run-finished':
      case 'challenge-completed':
      case 'tutorial-step-completed':
      case 'tutorial-completed':
      case 'tutorial-skipped':
        break;
    }
  }

  return {
    statistics,
    currentRunProgress,
    changedKeys: [...changedKeys].sort((left, right) => left.localeCompare(right)),
  };
}
