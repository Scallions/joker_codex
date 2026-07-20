import type { CollectionProgress, DeckProgressRecord } from './model';
import type { ProgressionFact } from './facts';

export interface CollectionReduction {
  readonly collection: CollectionProgress;
  readonly deckProgress: readonly DeckProgressRecord[];
}

export function reduceCampaignCollection(
  initialCollection: CollectionProgress,
  initialDeckProgress: readonly DeckProgressRecord[],
  facts: readonly ProgressionFact[],
): CollectionReduction {
  let collection = initialCollection;
  let deckProgress = initialDeckProgress;

  for (const fact of facts) {
    if (fact.type === 'joker-discovered') {
      collection = {
        ...collection,
        discoveredJokerIds: [
          ...new Set([...collection.discoveredJokerIds, fact.contentId]),
        ].sort((left, right) => left.localeCompare(right)),
      };
    }
    if (fact.type === 'run-won') {
      const wonJokers = new Set(fact.ownedJokerContentIds);
      deckProgress = deckProgress.map((record) =>
        record.deckId === fact.deckId
          ? {
              ...record,
              highestClearedStakeOrdinal: Math.max(
                record.highestClearedStakeOrdinal,
                fact.stakeOrdinal,
              ),
            }
          : record,
      );
      collection = {
        ...collection,
        jokerVictoryMarks: collection.jokerVictoryMarks.map((record) =>
          wonJokers.has(record.contentId)
            ? {
                ...record,
                highestStakeOrdinal: Math.max(
                  record.highestStakeOrdinal,
                  fact.stakeOrdinal,
                ),
              }
            : record,
        ),
      };
    }
  }
  return { collection, deckProgress };
}
