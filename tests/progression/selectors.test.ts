import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProfile } from '../../src/persistence/profiles';
import {
  selectAvailableChallenges,
  selectAvailableDecks,
  selectAvailableStakesForDeck,
  selectCollectionRows,
  selectFrozenEligibilityObjectiveIds,
} from '../../src/progression/selectors';

describe('档案内容选择器', () => {
  it('新档案只开放 D01/S01、锁定挑战，并投影恰好 380 项图鉴', () => {
    const profile = createProfile(1, '藏谱人', 100);
    const decks = selectAvailableDecks(profile, PRODUCTION_CATALOG);
    const stakes = selectAvailableStakesForDeck(
      profile,
      PRODUCTION_CATALOG,
      decks[0]!.id,
    );
    const collection = selectCollectionRows(profile, PRODUCTION_CATALOG);

    expect(decks.map(({ referenceIndex }) => referenceIndex)).toEqual(['D01']);
    expect(stakes.map(({ referenceIndex }) => referenceIndex)).toEqual(['S01']);
    expect(selectAvailableChallenges(profile, PRODUCTION_CATALOG)).toEqual([]);
    expect(collection).toHaveLength(380);
    const firstJoker = collection.find(({ family }) => family === 'joker');
    expect(firstJoker).toMatchObject({
      referenceIndex: 'J001',
      discovered: false,
      displayName: '未发现奇牌',
      description: null,
      rarity: null,
    });
  });

  it('发现后的奇牌显示本地目录文案，但未发现行不泄漏身份', () => {
    const fresh = createProfile(2, '开谱人', 100);
    const profile = {
      ...fresh,
      collection: {
        ...fresh.collection,
        discoveredJokerIds: ['bxqp:joker:001'],
      },
    };
    const rows = selectCollectionRows(profile, PRODUCTION_CATALOG);
    const discovered = rows.find(({ contentId }) => contentId === 'bxqp:joker:001');
    const hidden = rows.find(({ contentId }) => contentId === 'bxqp:joker:002');
    expect(discovered?.displayName).not.toBe('未发现奇牌');
    expect(discovered?.description).not.toBeNull();
    expect(hidden).toMatchObject({
      displayName: '未发现奇牌',
      description: null,
      rarity: null,
    });
  });

  it('挑战同时要求顺序门槛与对应的冻结解锁目标', () => {
    const fresh = createProfile(1, '守阵人', 100);
    const gateOnly = {
      ...fresh,
      challengeProgress: { ...fresh.challengeProgress, nextAvailableOrdinal: 1 },
    };
    expect(selectAvailableChallenges(gateOnly, PRODUCTION_CATALOG)).toEqual([]);

    const unlocked = {
      ...gateOnly,
      updatedAtEpochMs: 150,
      objectives: gateOnly.objectives.map((record) =>
        record.objectiveId === 'bxqp:objective:challenge:01'
          ? {
              ...record,
              current: record.target,
              completedAtEpochMs: 150,
              source: 'campaign' as const,
            }
          : record,
      ),
    };
    expect(
      selectAvailableChallenges(unlocked, PRODUCTION_CATALOG).map(
        ({ referenceIndex }) => referenceIndex,
      ),
    ).toEqual(['C01']);
  });

  it('筹码解锁按牌组计算，并只把所选牌组的筹码目标冻结进快照', () => {
    const fresh = createProfile(1, '验筹人', 100);
    const firstDeckId = fresh.deckProgress[0]!.deckId;
    const secondDeckId = fresh.deckProgress[1]!.deckId;
    const profile = {
      ...fresh,
      objectives: fresh.objectives.map((record) =>
        record.objectiveId === 'bxqp:objective:stake:02'
          ? {
              ...record,
              current: record.target,
              completedAtEpochMs: 100,
              source: 'campaign' as const,
            }
          : record,
      ),
      deckProgress: fresh.deckProgress.map((record, index) =>
        index === 0 ? { ...record, highestClearedStakeOrdinal: 1 } : record,
      ),
    };
    expect(
      selectAvailableStakesForDeck(profile, PRODUCTION_CATALOG, firstDeckId).map(
        ({ referenceIndex }) => referenceIndex,
      ),
    ).toEqual(['S01', 'S02']);
    expect(
      selectAvailableStakesForDeck(profile, PRODUCTION_CATALOG, secondDeckId).map(
        ({ referenceIndex }) => referenceIndex,
      ),
    ).toEqual(['S01']);
    expect(
      selectFrozenEligibilityObjectiveIds(profile, PRODUCTION_CATALOG, firstDeckId),
    ).toContain('bxqp:objective:stake:02');
    expect(
      selectFrozenEligibilityObjectiveIds(profile, PRODUCTION_CATALOG, secondDeckId),
    ).not.toContain('bxqp:objective:stake:02');
  });
});
