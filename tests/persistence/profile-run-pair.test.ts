import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV7 } from '../../src/content/runtime/runSetupV7';
import { createProfile } from '../../src/persistence/profiles';
import { validateProfileRunPair } from '../../src/persistence/profileRunPair';
import { projectRunStart } from '../../src/progression/reducer';

function contentId(family: 'deck' | 'stake' | 'challenge', referenceIndex: string) {
  const row = PRODUCTION_CATALOG.rows.find(
    (candidate) =>
      candidate.family === family && candidate.referenceIndex === referenceIndex,
  );
  if (!row) throw new Error(`测试目录缺少 ${referenceIndex}`);
  return row.id;
}

function jokerId(referenceIndex: string) {
  const row = PRODUCTION_CATALOG.rows.find(
    (candidate) =>
      candidate.family === 'joker' && candidate.referenceIndex === referenceIndex,
  );
  if (!row) throw new Error(`测试目录缺少 ${referenceIndex}`);
  return row.id;
}

describe('档案与牌局配对校验', () => {
  it.each([
    {
      label: '未解锁牌组',
      runClass: 'campaign' as const,
      deckId: contentId('deck', 'D02'),
      stakeId: contentId('stake', 'S01'),
      challengeId: null,
      eligibilityObjectiveIds: ['bxqp:objective:deck:02'],
    },
    {
      label: '当前牌组未解锁筹码',
      runClass: 'campaign' as const,
      deckId: contentId('deck', 'D01'),
      stakeId: contentId('stake', 'S02'),
      challengeId: null,
      eligibilityObjectiveIds: ['bxqp:objective:stake:02'],
    },
    {
      label: '未开放挑战',
      runClass: 'challenge' as const,
      deckId: contentId('deck', 'D01'),
      stakeId: contentId('stake', 'S01'),
      challengeId: contentId('challenge', 'C01'),
      eligibilityObjectiveIds: ['bxqp:objective:challenge:01'],
    },
  ])('拒绝冻结快照中不可用的设置：$label', (setup) => {
    const profile = createProfile(1, '守门人', 100);
    const run = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: profile.id,
      runSequence: 1,
      runClass: setup.runClass,
      seed: 'PAIR0001',
      deckId: setup.deckId,
      stakeId: setup.stakeId,
      challengeId: setup.challengeId,
      eligibilityObjectiveIds: setup.eligibilityObjectiveIds,
      discoveredContentIds: [],
    });
    const attached = projectRunStart(profile, run, 150);

    expect(validateProfileRunPair(attached, run)).toMatchObject({ ok: false });
  });

  it('拒绝牌局伪造档案尚未取得的解锁与发现快照', () => {
    const profile = createProfile(1, '验票人', 100);
    const deckObjectiveId = 'bxqp:objective:deck:02';
    const run = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: profile.id,
      runSequence: 1,
      runClass: 'campaign',
      seed: 'PAIR0002',
      eligibilityObjectiveIds: [deckObjectiveId],
      discoveredContentIds: [jokerId('J001')],
    });
    const attached = projectRunStart(profile, run, 150);

    expect(validateProfileRunPair(attached, run)).toMatchObject({ ok: false });
  });

  it('接受由有效档案快照建立的普通牌局', () => {
    const profile = createProfile(1, '验档人', 100);
    const eligibilityObjectiveIds = profile.objectives
      .filter(({ completedAtEpochMs }) => completedAtEpochMs !== null)
      .map(({ objectiveId }) => objectiveId);
    const run = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: profile.id,
      runSequence: 1,
      runClass: 'campaign',
      seed: 'PAIR0003',
      eligibilityObjectiveIds,
      discoveredContentIds: [],
    });
    const attached = projectRunStart(profile, run, 150);

    expect(validateProfileRunPair(attached, run)).toEqual({ ok: true });
  });
});
