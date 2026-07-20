import { stableId } from '../../src/game-core/model/ids';
import { migrateProfileV0ToV1 } from '../../src/persistence/migrations/migrateProfileV0ToV1';
import { validateProfileRecord } from '../../src/persistence/profiles';

describe('旧档案迁移', () => {
  it('只保留可证明的身份字段并建立新档案基线', () => {
    const migrated = migrateProfileV0ToV1(
      {
        id: stableId<'profile'>('profile:2'),
        slot: 2,
        displayName: '旧戏主',
        createdAtEpochMs: 100,
        updatedAtEpochMs: 200,
        activeRunId: null,
      },
      null,
    );

    expect(migrated).toMatchObject({
      schemaVersion: 1,
      id: 'profile:2',
      slot: 2,
      displayName: '旧戏主',
      createdAtEpochMs: 100,
      updatedAtEpochMs: 200,
      activeRunId: null,
      tutorial: { status: 'not-started' },
      statistics: { campaignStarts: 0, campaignWins: 0, itemsPurchased: 0 },
    });
    expect(migrated.collection.discoveredJokerIds).toEqual([]);
    expect(migrated.achievements.every(({ current }) => current === 0)).toBe(true);
    expect(validateProfileRecord(migrated)).toEqual({ ok: true });
  });
});
