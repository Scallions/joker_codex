import { PRODUCTION_CATALOG } from '../../src/content/productionCatalog';
import { createProductionRunV7 } from '../../src/content/runtime/runSetupV7';
import { executeCommandV2 } from '../../src/game-core/commands/executeCommandV2';
import type { DomainEventV2, RunCommandV2 } from '../../src/game-core/commands/typesV2';
import type { RunStateV7 } from '../../src/game-core/model/runV7';
import { createProfile, type ProfileRecord } from '../../src/persistence/profiles';
import { deriveProgressionFacts } from '../../src/progression/facts';
import { projectRunStart, reduceProfileProgression } from '../../src/progression/reducer';

function accepted(
  before: RunStateV7,
  command: RunCommandV2,
): {
  readonly state: RunStateV7;
  readonly domainEvents: readonly DomainEventV2[];
} {
  const result = executeCommandV2(before, command);
  if (!result.ok) throw new Error(result.rejection.message);
  return {
    state: result.state as RunStateV7,
    domainEvents: result.domainEvents,
  };
}

function commit(
  profile: ProfileRecord,
  before: RunStateV7,
  command: RunCommandV2,
  nowEpochMs: number,
): { readonly profile: ProfileRecord; readonly run: RunStateV7 } {
  const proposal = accepted(before, command);
  const batch = deriveProgressionFacts(before, proposal.state, proposal.domainEvents);
  return {
    profile: reduceProfileProgression(profile, batch, nowEpochMs),
    run: proposal.state,
  };
}

function achievement(profile: ProfileRecord, ordinal: number) {
  return profile.achievements[ordinal - 1];
}

describe('统一局外进度事实管线', () => {
  it('普通战役从成功命令更新牌型、得分、盲注和一次性成就', () => {
    const baseProfile = createProfile(1, '记场人', 100);
    let run = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: baseProfile.id,
      runSequence: 1,
      runClass: 'campaign',
      seed: 'FACT0001',
      eligibilityObjectiveIds: [],
      discoveredContentIds: [],
    });
    run = {
      ...run,
      rules: { ...run.rules, targetScaleBasisPoints: 1 },
    };
    let profile = projectRunStart(baseProfile, run, 200);

    ({ profile, run } = commit(
      profile,
      run,
      {
        type: 'select-blind',
        checkpointId: run.checkpointId,
        position: 'small',
      },
      201,
    ));
    for (const cardId of run.round!.handIds.slice(0, 5)) {
      ({ profile, run } = commit(
        profile,
        run,
        { type: 'toggle-card', checkpointId: run.checkpointId, cardId },
        202 + run.checkpointId,
      ));
    }

    const beforeHand = run;
    const played = accepted(run, {
      type: 'play-selected',
      checkpointId: run.checkpointId,
    });
    const batch = deriveProgressionFacts(beforeHand, played.state, played.domainEvents);
    const projected = reduceProfileProgression(profile, batch, 300);

    expect(projected.statistics).toMatchObject({
      handsPlayed: 1,
      cardsPlayed: 5,
      blindsDefeated: 1,
      totalScore: played.state.lastHand!.score,
      bestHandScore: played.state.lastHand!.score,
    });
    expect(
      projected.statistics.handTypes.find(
        ({ handType }) => handType === played.state.lastHand!.handType,
      ),
    ).toMatchObject({
      playCount: 1,
      bestScore: played.state.lastHand!.score,
    });
    expect(achievement(projected, 2)).toMatchObject({
      current: 1,
      completedAtEpochMs: 300,
    });
    expect(achievement(projected, 7)).toMatchObject({ current: 1 });
    expect(achievement(projected, 8)).toMatchObject({ current: 1 });
    expect(projected.activeProjectionCursor).toEqual({
      runId: run.runId,
      checkpointId: played.state.checkpointId,
    });

    expect(reduceProfileProgression(projected, batch, 301)).toBe(projected);
  });

  it('普通战役结果摘要累计整局变动，而不是只保留终局检查点', () => {
    const baseProfile = createProfile(1, '总账人', 100);
    const run = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: baseProfile.id,
      runSequence: 1,
      runClass: 'campaign',
      seed: 'FACT0006',
      eligibilityObjectiveIds: [],
      discoveredContentIds: [],
    });
    const jokerId = PRODUCTION_CATALOG.rows.find(
      (row) => row.family === 'joker' && row.ordinal === 1,
    )!.id;
    let profile = projectRunStart(baseProfile, run, 150);
    profile = reduceProfileProgression(
      profile,
      {
        runId: run.runId,
        checkpointId: 1,
        runClass: 'campaign',
        profileId: profile.id,
        facts: [
          { type: 'hand-scored', handType: 'high-card', score: 10 },
          { type: 'joker-discovered', contentId: jokerId },
        ],
      },
      160,
    );
    profile = reduceProfileProgression(
      profile,
      {
        runId: run.runId,
        checkpointId: 2,
        runClass: 'campaign',
        profileId: profile.id,
        facts: [
          {
            type: 'run-won',
            deckId: run.setupV3.deckId,
            stakeId: run.setupV3.stakeId,
            stakeOrdinal: 1,
            moneyHeld: 4,
            printedRanks: ['ace'],
            printedSuits: ['spades'],
            ownedJokerContentIds: [jokerId],
          },
        ],
      },
      170,
    );

    expect(profile.lastResultSummary).toMatchObject({
      runId: run.runId,
      discoveredJokerIds: [jokerId],
      victoryMarkContentIds: [jokerId],
    });
    expect(profile.lastResultSummary?.achievementIds).toEqual(
      expect.arrayContaining(['bxqp:achievement:001', 'bxqp:achievement:005']),
    );
    expect(profile.lastResultSummary?.statisticKeys).toEqual(
      expect.arrayContaining([
        'campaignStarts',
        'handsPlayed',
        'totalScore',
        'campaignWins',
      ]),
    );
  });

  it('普通战役胜利后的无尽落败不会反记为普通败场', () => {
    const baseProfile = createProfile(1, '加演人', 100);
    const run = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: baseProfile.id,
      runSequence: 1,
      runClass: 'campaign',
      seed: 'FACT0007',
      eligibilityObjectiveIds: [],
      discoveredContentIds: [],
    });
    const started = projectRunStart(baseProfile, run, 150);
    const won = reduceProfileProgression(
      started,
      {
        runId: run.runId,
        checkpointId: 1,
        runClass: 'campaign',
        profileId: started.id,
        facts: [
          {
            type: 'run-won',
            deckId: run.setupV3.deckId,
            stakeId: run.setupV3.stakeId,
            stakeOrdinal: 1,
            moneyHeld: 4,
            printedRanks: ['ace'],
            printedSuits: ['spades'],
            ownedJokerContentIds: [],
          },
        ],
      },
      160,
    );

    const endlessLoss = reduceProfileProgression(
      won,
      {
        runId: run.runId,
        checkpointId: 2,
        runClass: 'campaign',
        profileId: won.id,
        facts: [{ type: 'run-lost', ante: 9, challengeId: null }],
      },
      170,
    );

    expect(endlessLoss.statistics).toMatchObject({
      campaignWins: 1,
      campaignLosses: 0,
      currentWinStreak: 1,
    });
    expect(endlessLoss.lastResultSummary?.statisticKeys).not.toContain('campaignLosses');
  });

  it('种子牌局只推进检查点游标，不写入普通统计或成就', () => {
    const baseProfile = createProfile(2, '借种人', 100);
    const before = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: baseProfile.id,
      runSequence: 1,
      runClass: 'seeded',
      seed: 'FACT0002',
      eligibilityObjectiveIds: [],
      discoveredContentIds: [],
    });
    const profile = projectRunStart(baseProfile, before, 200);
    const proposal = accepted(before, {
      type: 'select-blind',
      checkpointId: before.checkpointId,
      position: 'small',
    });
    const projected = reduceProfileProgression(
      profile,
      deriveProgressionFacts(before, proposal.state, proposal.domainEvents),
      201,
    );

    expect(projected.statistics).toEqual(profile.statistics);
    expect(projected.achievements).toEqual(profile.achievements);
    expect(projected.activeProjectionCursor?.checkpointId).toBe(1);
  });

  it('补充包选择复用的 item-purchased 事件不会被计作夜市购买', () => {
    const profile = createProfile(1, '拆包人', 100);
    const before = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: profile.id,
      runSequence: 1,
      runClass: 'campaign',
      seed: 'PACK0001',
      eligibilityObjectiveIds: [],
      discoveredContentIds: [],
    });
    const contentId = before.content.items[0]?.contentId;
    if (!contentId) throw new Error('测试牌局缺少可用内容');
    const after = { ...before, checkpointId: before.checkpointId + 1 };

    const batch = deriveProgressionFacts(before, after, [
      { type: 'item-purchased', contentId },
    ]);

    expect(batch.facts).not.toContainEqual(
      expect.objectContaining({ type: 'item-purchased' }),
    );
  });

  it('沿用计分线协议保存正无穷累计与最佳分数', () => {
    const fresh = createProfile(1, '极艺人', 100);
    const run = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: fresh.id,
      runSequence: 1,
      runClass: 'campaign',
      seed: 'SCOREINF',
      eligibilityObjectiveIds: [],
      discoveredContentIds: [],
    });
    const started = projectRunStart(fresh, run, 150);

    const projected = reduceProfileProgression(
      started,
      {
        runId: run.runId,
        checkpointId: 1,
        runClass: 'campaign',
        profileId: started.id,
        facts: [{ type: 'hand-scored', handType: 'high-card', score: Infinity }],
      },
      200,
    );

    expect(projected.statistics.totalScore).toBe(Infinity);
    expect(projected.statistics.bestHandScore).toBe(Infinity);
    expect(
      projected.statistics.handTypes.find(({ handType }) => handType === 'high-card')
        ?.bestScore,
    ).toBe(Infinity);
  });

  it('挑战局只写挑战账本、D15 与成就 025–027', () => {
    const fresh = createProfile(3, '试阵人', 100);
    const unlockedProfile = {
      ...fresh,
      challengeProgress: { ...fresh.challengeProgress, nextAvailableOrdinal: 1 },
    };
    const challengeId = PRODUCTION_CATALOG.rows.find(
      (row) => row.family === 'challenge' && row.ordinal === 1,
    )!.id;
    const run = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: fresh.id,
      runSequence: 1,
      runClass: 'challenge',
      challengeId,
      seed: 'FACT0003',
      eligibilityObjectiveIds: ['bxqp:objective:challenge:01'],
      discoveredContentIds: [],
    });
    const profile = projectRunStart(unlockedProfile, run, 150);
    const projected = reduceProfileProgression(
      profile,
      {
        runId: run.runId,
        checkpointId: 1,
        runClass: 'challenge',
        profileId: profile.id,
        facts: [
          { type: 'challenge-completed', challengeId },
          { type: 'hand-scored', handType: 'straight-flush', score: 1_000_000 },
          { type: 'joker-discovered', contentId: 'bxqp:joker:001' },
        ],
      },
      200,
    );

    expect(projected.challengeProgress.records[0]).toMatchObject({
      attempts: 1,
      completions: 1,
      completedAtEpochMs: 200,
    });
    expect(projected.challengeProgress.nextAvailableOrdinal).toBe(2);
    expect(projected.achievements[24]).toMatchObject({ current: 1 });
    expect(
      projected.objectives.find(
        ({ objectiveId }) => objectiveId === 'bxqp:objective:deck:15',
      ),
    ).toMatchObject({ current: 1, completedAtEpochMs: null });
    expect(projected.statistics.handsPlayed).toBe(0);
    expect(projected.collection.discoveredJokerIds).toEqual([]);
    expect(projected.lastResultSummary?.statisticKeys).toEqual(
      [
        `challenges.${challengeId}.attempts`,
        `challenges.${challengeId}.completions`,
        `challenges.${challengeId}.completedAtEpochMs`,
      ].sort((left, right) => left.localeCompare(right)),
    );
  });

  it('挑战失败结果保留本次尝试的隔离统计增量', () => {
    const fresh = createProfile(1, '再试人', 100);
    const challengeId = PRODUCTION_CATALOG.rows.find(
      (row) => row.family === 'challenge' && row.ordinal === 1,
    )!.id;
    const run = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: fresh.id,
      runSequence: 1,
      runClass: 'challenge',
      challengeId,
      seed: 'FACT0004',
      eligibilityObjectiveIds: ['bxqp:objective:challenge:01'],
      discoveredContentIds: [],
    });
    const started = projectRunStart(
      {
        ...fresh,
        challengeProgress: { ...fresh.challengeProgress, nextAvailableOrdinal: 1 },
      },
      run,
      150,
    );

    const projected = reduceProfileProgression(
      started,
      {
        runId: run.runId,
        checkpointId: 1,
        runClass: 'challenge',
        profileId: started.id,
        facts: [{ type: 'run-lost', ante: 1, challengeId }],
      },
      200,
    );

    expect(projected.lastResultSummary).toEqual({
      runId: run.runId,
      objectiveIds: [],
      discoveredJokerIds: [],
      achievementIds: [],
      victoryMarkContentIds: [],
      statisticKeys: [`challenges.${challengeId}.attempts`],
    });
    expect(projected.statistics.campaignLosses).toBe(0);
  });

  it('重复完成挑战会累计完成次数并保留首次完成时间', () => {
    const fresh = createProfile(1, '复阵人', 100);
    const challengeId = PRODUCTION_CATALOG.rows.find(
      (row) => row.family === 'challenge' && row.ordinal === 1,
    )!.id;
    const firstCompletedAt = 120;
    const completed = {
      ...fresh,
      updatedAtEpochMs: 150,
      challengeProgress: {
        nextAvailableOrdinal: 2,
        records: fresh.challengeProgress.records.map((record, index) =>
          index === 0
            ? {
                ...record,
                attempts: 1,
                completions: 1,
                completedAtEpochMs: firstCompletedAt,
              }
            : record,
        ),
      },
      statistics: {
        ...fresh.statistics,
        challenges: fresh.statistics.challenges.map((record, index) =>
          index === 0
            ? {
                ...record,
                attempts: 1,
                completions: 1,
                completedAtEpochMs: firstCompletedAt,
              }
            : record,
        ),
      },
    };
    const run = createProductionRunV7(PRODUCTION_CATALOG, {
      profileId: completed.id,
      runSequence: 1,
      runClass: 'challenge',
      challengeId,
      seed: 'FACT0005',
      eligibilityObjectiveIds: ['bxqp:objective:challenge:01'],
      discoveredContentIds: [],
    });
    const started = projectRunStart(completed, run, 160);

    const projected = reduceProfileProgression(
      started,
      {
        runId: run.runId,
        checkpointId: 1,
        runClass: 'challenge',
        profileId: started.id,
        facts: [{ type: 'challenge-completed', challengeId }],
      },
      200,
    );

    expect(projected.challengeProgress.records[0]).toMatchObject({
      attempts: 2,
      completions: 2,
      completedAtEpochMs: firstCompletedAt,
    });
    expect(projected.statistics.challenges[0]).toMatchObject({
      attempts: 2,
      completions: 2,
      completedAtEpochMs: firstCompletedAt,
    });
    expect(projected.lastResultSummary?.statisticKeys).toEqual([
      `challenges.${challengeId}.attempts`,
      `challenges.${challengeId}.completions`,
    ]);
  });
});
