import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV6 } from '../../src/content/runtime/runSetupV6';
import { createProductionRunV7 } from '../../src/content/runtime/runSetupV7';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import { validateRunStateV7 } from '../../src/game-core/invariants/validateRunStateV7';
import { stableId } from '../../src/game-core/model/ids';
import { isRunStateV3 } from '../../src/game-core/model/runV3';
import { migrateRunV6ToV7 } from '../../src/persistence/migrations/migrateRunV6ToV7';
import { createProfile } from '../../src/persistence/profiles';

describe('Run V7 身份与迁移', () => {
  it('同一档案重复同种子时保持玩法设置一致但牌局身份唯一', () => {
    const common = {
      profileId: stableId<'profile'>('profile:1'),
      runClass: 'campaign' as const,
      seed: 'AB12CD34',
      eligibilityObjectiveIds: ['bxqp:objective:voucher:01'],
      discoveredContentIds: [],
    };
    const first = createProductionRunV7(PRODUCTION_CATALOG, {
      ...common,
      runSequence: 1,
    });
    const second = createProductionRunV7(PRODUCTION_CATALOG, {
      ...common,
      runSequence: 2,
    });

    expect(first.runId).not.toBe(second.runId);
    expect(first.rngState).toBe(second.rngState);
    expect(first.setupV3).toEqual(second.setupV3);
    expect(first.sessionV7.runSequence).toBe(1);
    expect(second.sessionV7.runSequence).toBe(2);
    expect(validateRunStateV7(first)).toEqual({ ok: true });
    expect(validateRunStateV7(second)).toEqual({ ok: true });
    expect(isRunStateV3(first)).toBe(true);
  });

  it('拒绝未经应用边界规范化的 V7 种子', () => {
    expect(() =>
      createProductionRunV7(PRODUCTION_CATALOG, {
        profileId: stableId<'profile'>('profile:1'),
        runSequence: 1,
        runClass: 'campaign',
        seed: 'lowercase',
        eligibilityObjectiveIds: [],
        discoveredContentIds: [],
      }),
    ).toThrow('8 位大写');
  });

  it('把档案解锁快照冻结进优惠券与戏签运行时池', () => {
    const profile = createProfile(1, '守门人', 100);
    const baselineObjectiveIds = profile.objectives
      .filter(({ completedAtEpochMs }) => completedAtEpochMs !== null)
      .map(({ objectiveId }) => objectiveId);
    const run = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: profile.id,
      runSequence: 1,
      runClass: 'campaign',
      seed: 'GATES001',
      eligibilityObjectiveIds: baselineObjectiveIds,
      discoveredContentIds: [],
    });
    const referenceById = new Map(
      run.productionContentV3.rows.map(({ definition }) => [
        definition.id,
        definition.referenceIndex,
      ]),
    );

    expect(run.content.vouchers.map(({ id }) => referenceById.get(id))).toEqual(
      Array.from(
        { length: 16 },
        (_, index) => `V${String(index * 2 + 1).padStart(2, '0')}`,
      ),
    );
    expect(run.content.tags.map(({ id }) => referenceById.get(id))).not.toEqual(
      expect.arrayContaining(['G02', 'G03', 'G04', 'G05', 'G06']),
    );
    expect([
      referenceById.get(run.progress.lineup.smallTagId),
      referenceById.get(run.progress.lineup.bigTagId),
    ]).not.toEqual(expect.arrayContaining(['G02', 'G03', 'G04', 'G05', 'G06']));

    const completeV6 = createProductionRunV6(PRODUCTION_CATALOG, {
      seed: 'gates-validation',
    });
    const lockedVoucherId = PRODUCTION_CATALOG.rows.find(
      (row) => row.family === 'voucher' && row.referenceIndex === 'V02',
    )?.id;
    const lockedVoucher = completeV6.content.vouchers.find(
      ({ id }) => id === lockedVoucherId,
    );
    if (!lockedVoucher) throw new Error('测试目录缺少 V02 运行时定义');
    expect(
      validateRunStateV7({
        ...run,
        content: {
          ...run.content,
          vouchers: [...run.content.vouchers, lockedVoucher],
        },
      }),
    ).toMatchObject({ ok: false });

    const unlocked = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: profile.id,
      runSequence: 2,
      runClass: 'campaign',
      seed: 'GATES002',
      eligibilityObjectiveIds: [
        ...baselineObjectiveIds,
        'bxqp:objective:voucher:02',
        'bxqp:objective:tag:02',
      ],
      discoveredContentIds: [],
    });
    expect(
      unlocked.content.vouchers.some(
        ({ id }) =>
          unlocked.productionContentV3.rows.find(({ definition }) => definition.id === id)
            ?.definition.referenceIndex === 'V02',
      ),
    ).toBe(true);
    expect(
      unlocked.content.tags.some(
        ({ id }) =>
          unlocked.productionContentV3.rows.find(({ definition }) => definition.id === id)
            ?.definition.referenceIndex === 'G02',
      ),
    ).toBe(true);
  });

  it('拒绝冻结快照未包含所选牌组、筹码或挑战目标的牌局', () => {
    const profile = createProfile(1, '验场人', 100);
    const lockedDeckId = PRODUCTION_CATALOG.rows.find(
      (row) => row.family === 'deck' && row.referenceIndex === 'D02',
    )?.id;
    const lockedStakeId = PRODUCTION_CATALOG.rows.find(
      (row) => row.family === 'stake' && row.referenceIndex === 'S02',
    )?.id;
    const lockedChallengeId = PRODUCTION_CATALOG.rows.find(
      (row) => row.family === 'challenge' && row.referenceIndex === 'C01',
    )?.id;
    if (!lockedDeckId || !lockedStakeId || !lockedChallengeId) {
      throw new Error('测试目录缺少受锁设置');
    }

    expect(() =>
      createProductionRunV7(PRODUCTION_CATALOG, {
        profileId: profile.id,
        runSequence: 1,
        runClass: 'campaign',
        seed: 'LOCKED01',
        deckId: lockedDeckId,
        eligibilityObjectiveIds: [],
        discoveredContentIds: [],
      }),
    ).toThrow('冻结快照');
    expect(() =>
      createProductionRunV7(PRODUCTION_CATALOG, {
        profileId: profile.id,
        runSequence: 1,
        runClass: 'campaign',
        seed: 'LOCKED02',
        stakeId: lockedStakeId,
        eligibilityObjectiveIds: [],
        discoveredContentIds: [],
      }),
    ).toThrow('冻结快照');
    expect(() =>
      createProductionRunV7(PRODUCTION_CATALOG, {
        profileId: profile.id,
        runSequence: 1,
        runClass: 'challenge',
        seed: 'LOCKED03',
        challengeId: lockedChallengeId,
        eligibilityObjectiveIds: [],
        discoveredContentIds: [],
      }),
    ).toThrow('冻结快照');
  });

  it('V6 迁移不改动已有牌局身份、内容版本、检查点或随机状态', () => {
    const legacy = createProductionRunV6(PRODUCTION_CATALOG, { seed: 'legacy-v6' });
    const migrated = migrateRunV6ToV7(legacy);

    expect(migrated).toMatchObject({
      schemaVersion: 7,
      contentVersion: legacy.contentVersion,
      runId: legacy.runId,
      checkpointId: legacy.checkpointId,
      rngState: legacy.rngState,
      sessionV7: {
        runClass: 'campaign',
        profileId: null,
        runSequence: 0,
      },
    });
    expect(validateRunStateV7(migrated)).toEqual({ ok: true });
  });

  it('允许普通、种子与旧版合法胜局进入无尽，并拒绝挑战', () => {
    const profileId = stableId<'profile'>('profile:1');
    const challengeId = PRODUCTION_CATALOG.rows.find(
      (row) => row.family === 'challenge' && row.ordinal === 1,
    )?.id;
    if (!challengeId) throw new Error('缺少第一项挑战');
    const campaign = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId,
      runSequence: 1,
      runClass: 'campaign',
      seed: 'ENDLESS1',
      eligibilityObjectiveIds: [],
      discoveredContentIds: [],
    });
    const challenge = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId,
      runSequence: 2,
      runClass: 'challenge',
      challengeId,
      seed: 'CHALLENG',
      eligibilityObjectiveIds: ['bxqp:objective:challenge:01'],
      discoveredContentIds: [],
    });
    const won = <Run extends typeof campaign>(run: Run): Run => ({
      ...run,
      phase: { kind: 'run-won' },
      progress: { ...run.progress, ante: 8, campaignWon: true },
      result: { kind: 'won', ante: 8, score: 1, reason: '测试胜利' },
    });

    expect(
      executeCommandV2(won(campaign), {
        type: 'enter-endless',
        checkpointId: campaign.checkpointId,
      }).ok,
    ).toBe(true);
    const migratedCampaign = migrateRunV6ToV7(
      createProductionRunV6(PRODUCTION_CATALOG, { seed: 'legacy-fixture' }),
    );
    const migratedLegacy = {
      ...migratedCampaign,
      sessionV7: {
        ...migratedCampaign.sessionV7,
        runClass: 'migrated-legacy' as const,
      },
    };
    expect(
      executeCommandV2(won(migratedLegacy), {
        type: 'enter-endless',
        checkpointId: migratedLegacy.checkpointId,
      }).ok,
    ).toBe(true);
    expect(
      executeCommandV2(won(challenge), {
        type: 'enter-endless',
        checkpointId: challenge.checkpointId,
      }),
    ).toMatchObject({
      ok: false,
      rejection: { code: 'illegal-phase' },
    });
  });
});
