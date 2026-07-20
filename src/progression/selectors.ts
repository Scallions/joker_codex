import type {
  CatalogFamily,
  CatalogRow,
  JokerRarity,
  ProductionCatalog,
} from '../content/schema/catalog';
import type { ProfileRecord } from '../persistence/profiles';
import { OBJECTIVE_DEFINITIONS } from './definitions';

export interface SetupCatalogOption {
  readonly id: string;
  readonly referenceIndex: string;
  readonly displayName: string;
  readonly description: string;
}

export interface CollectionRowProjection {
  readonly contentId: string;
  readonly family: CatalogFamily;
  readonly referenceIndex: string;
  readonly locked: boolean;
  readonly discovered: boolean;
  readonly displayName: string;
  readonly description: string | null;
  readonly rarity: JokerRarity | null;
  readonly assetPath: string | null;
  readonly assetFocalKey: string | null;
  readonly assetSource: 'project-svg' | 'generated-raster' | null;
  readonly objectiveId: string | null;
  readonly objectiveCondition: string | null;
  readonly objectiveCurrent: number | null;
  readonly objectiveTarget: number | null;
  readonly highestVictoryStakeOrdinal: number | null;
}

function localized(catalog: ProductionCatalog, key: string): string {
  const value = catalog.localization[key];
  if (typeof value !== 'string') throw new Error(`目录本地化缺失：${key}`);
  return value;
}

function option(catalog: ProductionCatalog, row: CatalogRow): SetupCatalogOption {
  return {
    id: row.id,
    referenceIndex: row.referenceIndex,
    displayName: localized(catalog, row.nameKey),
    description: localized(catalog, row.descriptionKey),
  };
}

function completedObjectives(profile: ProfileRecord): ReadonlySet<string> {
  return new Set(
    profile.objectives.flatMap(({ objectiveId, completedAtEpochMs }) =>
      completedAtEpochMs === null ? [] : [objectiveId],
    ),
  );
}

export function selectAvailableDecks(
  profile: ProfileRecord,
  catalog: ProductionCatalog,
): readonly SetupCatalogOption[] {
  const completed = completedObjectives(profile);
  return catalog.rows
    .filter(
      (row) =>
        row.family === 'deck' &&
        (row.ordinal === 1 ||
          (row.unlockObjectiveId !== null && completed.has(row.unlockObjectiveId))),
    )
    .sort((left, right) => left.ordinal - right.ordinal)
    .map((row) => option(catalog, row));
}

export function selectAvailableStakesForDeck(
  profile: ProfileRecord,
  catalog: ProductionCatalog,
  deckId: string,
): readonly SetupCatalogOption[] {
  const deck = profile.deckProgress.find((record) => record.deckId === deckId);
  if (!deck) return [];
  const highestAvailableOrdinal = Math.min(
    8,
    Math.max(1, deck.highestClearedStakeOrdinal + 1),
  );
  return catalog.rows
    .filter((row) => row.family === 'stake' && row.ordinal <= highestAvailableOrdinal)
    .sort((left, right) => left.ordinal - right.ordinal)
    .map((row) => option(catalog, row));
}

export function selectAvailableChallenges(
  profile: ProfileRecord,
  catalog: ProductionCatalog,
): readonly SetupCatalogOption[] {
  const completed = completedObjectives(profile);
  return catalog.rows
    .filter(
      (row) =>
        row.family === 'challenge' &&
        row.ordinal <= profile.challengeProgress.nextAvailableOrdinal &&
        row.unlockObjectiveId !== null &&
        completed.has(row.unlockObjectiveId),
    )
    .sort((left, right) => left.ordinal - right.ordinal)
    .map((row) => option(catalog, row));
}

export function selectFrozenEligibilityObjectiveIds(
  profile: ProfileRecord,
  catalog: ProductionCatalog,
  deckId: string,
): readonly string[] {
  const contextualStakeObjectiveIds = new Set(
    selectAvailableStakesForDeck(profile, catalog, deckId).flatMap(({ id }) => {
      const objectiveId = catalog.rows.find((row) => row.id === id)?.unlockObjectiveId;
      return objectiveId ? [objectiveId] : [];
    }),
  );
  const stakeObjectiveIds = new Set(
    catalog.rows.flatMap((row) =>
      row.family === 'stake' && row.unlockObjectiveId ? [row.unlockObjectiveId] : [],
    ),
  );
  return profile.objectives
    .filter(
      ({ objectiveId, completedAtEpochMs }) =>
        completedAtEpochMs !== null &&
        (!stakeObjectiveIds.has(objectiveId) ||
          contextualStakeObjectiveIds.has(objectiveId)),
    )
    .map(({ objectiveId }) => objectiveId)
    .sort((left, right) => left.localeCompare(right));
}

function rowIsLocked(
  profile: ProfileRecord,
  row: CatalogRow,
  completed: ReadonlySet<string>,
): boolean {
  if (row.family === 'deck') {
    return (
      row.ordinal > 1 &&
      (row.unlockObjectiveId === null || !completed.has(row.unlockObjectiveId))
    );
  }
  if (row.family === 'stake') {
    return !profile.deckProgress.some(
      ({ highestClearedStakeOrdinal }) =>
        row.ordinal <= Math.max(1, highestClearedStakeOrdinal + 1),
    );
  }
  if (row.family === 'challenge') {
    return row.ordinal > profile.challengeProgress.nextAvailableOrdinal;
  }
  return row.unlockObjectiveId !== null && !completed.has(row.unlockObjectiveId);
}

export function selectCollectionRows(
  profile: ProfileRecord,
  catalog: ProductionCatalog,
): readonly CollectionRowProjection[] {
  const completed = completedObjectives(profile);
  const discovered = new Set(profile.collection.discoveredJokerIds);
  const objectiveById = new Map(
    profile.objectives.map((record) => [record.objectiveId, record]),
  );
  const objectiveDefinitionById = new Map(
    OBJECTIVE_DEFINITIONS.map((definition) => [definition.objectiveId, definition]),
  );
  const assetByContentId = new Map(
    catalog.assets.map((asset) => [asset.contentId, asset]),
  );
  const victoryMarkById = new Map(
    profile.collection.jokerVictoryMarks.map((record) => [record.contentId, record]),
  );

  return catalog.rows.map((row) => {
    const objective = row.unlockObjectiveId
      ? objectiveById.get(row.unlockObjectiveId)
      : undefined;
    if (row.family === 'joker' && !discovered.has(row.id)) {
      return {
        contentId: row.id,
        family: row.family,
        referenceIndex: row.referenceIndex,
        locked: false,
        discovered: false,
        displayName: '未发现奇牌',
        description: null,
        rarity: null,
        assetPath: null,
        assetFocalKey: null,
        assetSource: null,
        objectiveId: null,
        objectiveCondition: null,
        objectiveCurrent: null,
        objectiveTarget: null,
        highestVictoryStakeOrdinal: victoryMarkById.get(row.id)?.highestStakeOrdinal ?? 0,
      };
    }
    const asset = assetByContentId.get(row.id);
    if (!asset) throw new Error(`目录素材缺失：${row.id}`);
    return {
      contentId: row.id,
      family: row.family,
      referenceIndex: row.referenceIndex,
      locked: rowIsLocked(profile, row, completed),
      discovered: row.family !== 'joker' || discovered.has(row.id),
      displayName: localized(catalog, row.nameKey),
      description: localized(catalog, row.descriptionKey),
      rarity: row.family === 'joker' ? row.rarity : null,
      assetPath: asset.assetPath,
      assetFocalKey: asset.focalKey,
      assetSource: asset.source,
      objectiveId: objective?.objectiveId ?? null,
      objectiveCondition: row.unlockObjectiveId
        ? (objectiveDefinitionById.get(row.unlockObjectiveId)?.condition ?? null)
        : null,
      objectiveCurrent: objective?.current ?? null,
      objectiveTarget: objective?.target ?? null,
      highestVictoryStakeOrdinal:
        row.family === 'joker'
          ? (victoryMarkById.get(row.id)?.highestStakeOrdinal ?? 0)
          : null,
    };
  });
}

export function assertAvailableModeSetup(
  profile: ProfileRecord,
  catalog: ProductionCatalog,
  setup:
    | {
        readonly runClass: 'campaign' | 'seeded';
        readonly deckId: string;
        readonly stakeId: string;
      }
    | { readonly runClass: 'challenge'; readonly challengeId: string }
    | { readonly runClass: 'tutorial' },
): void {
  if (setup.runClass === 'tutorial') return;
  if (setup.runClass === 'challenge') {
    if (
      !selectAvailableChallenges(profile, catalog).some(
        ({ id }) => id === setup.challengeId,
      )
    ) {
      throw new Error('这项挑战尚未开放');
    }
    return;
  }
  if (!selectAvailableDecks(profile, catalog).some(({ id }) => id === setup.deckId)) {
    throw new Error('这个牌组尚未解锁');
  }
  if (
    !selectAvailableStakesForDeck(profile, catalog, setup.deckId).some(
      ({ id }) => id === setup.stakeId,
    )
  ) {
    throw new Error('这个筹码等级尚未解锁');
  }
}
