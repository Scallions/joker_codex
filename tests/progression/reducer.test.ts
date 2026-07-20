import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV7 } from '../../src/content/runtime/runSetupV7';
import { createProfile } from '../../src/persistence/profiles';
import { projectRunStart } from '../../src/progression/reducer';

describe('档案进度投影', () => {
  it('普通开局推进统计与入场成就，种子开局只建立牌局归属', () => {
    const campaignProfile = createProfile(1, '正场人', 100);
    const campaign = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: campaignProfile.id,
      runSequence: 1,
      runClass: 'campaign',
      seed: 'START001',
      eligibilityObjectiveIds: [],
      discoveredContentIds: [],
    });
    const campaignStarted = projectRunStart(campaignProfile, campaign, 200);
    expect(campaignStarted).toMatchObject({
      activeRunId: campaign.runId,
      nextRunSequence: 2,
      activeProjectionCursor: { runId: campaign.runId, checkpointId: 0 },
      statistics: { campaignStarts: 1 },
      currentRunProgress: { runId: campaign.runId },
    });
    expect(campaignStarted.statistics.decks[0]).toMatchObject({ starts: 1 });
    expect(campaignStarted.achievements[0]).toMatchObject({
      current: 1,
      completedAtEpochMs: 200,
    });

    const seededProfile = createProfile(2, '种场人', 100);
    const seeded = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: seededProfile.id,
      runSequence: 1,
      runClass: 'seeded',
      seed: 'START002',
      eligibilityObjectiveIds: [],
      discoveredContentIds: [],
    });
    const seededStarted = projectRunStart(seededProfile, seeded, 200);
    expect(seededStarted.activeRunId).toBe(seeded.runId);
    expect(seededStarted.statistics.campaignStarts).toBe(0);
    expect(seededStarted.achievements[0]?.current).toBe(0);
  });

  it('开局相关的永久计数器在安全整数上限饱和', () => {
    const fresh = createProfile(1, '长演人', 100);
    const profile = {
      ...fresh,
      statistics: {
        ...fresh.statistics,
        campaignStarts: Number.MAX_SAFE_INTEGER,
        decks: fresh.statistics.decks.map((record, index) =>
          index === 0 ? { ...record, starts: Number.MAX_SAFE_INTEGER } : record,
        ),
      },
    };
    const run = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: profile.id,
      runSequence: 1,
      runClass: 'campaign',
      seed: 'START003',
      eligibilityObjectiveIds: [],
      discoveredContentIds: [],
    });

    const projected = projectRunStart(profile, run, 200);

    expect(projected.statistics.campaignStarts).toBe(Number.MAX_SAFE_INTEGER);
    expect(projected.statistics.decks[0]?.starts).toBe(Number.MAX_SAFE_INTEGER);
  });
});
