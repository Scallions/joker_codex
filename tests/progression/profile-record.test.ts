import { createProfile, validateProfileRecord } from '../../src/persistence/profiles';
import { profileRecordSchema } from '../../src/persistence/schemas';

describe('进度档案 V1', () => {
  it('为新档案建立规范化且彼此独立的完整进度骨架', () => {
    const first = createProfile(1, '掌灯人', 100);
    const second = createProfile(2, '巡场人', 200);

    expect(first).toMatchObject({
      schemaVersion: 1,
      progressionRulesVersion: 'progression-1',
      nextRunSequence: 1,
      activeProjectionCursor: null,
      tutorial: { status: 'not-started', currentStepId: null },
      challengeProgress: { nextAvailableOrdinal: 0 },
      currentRunProgress: { resultDelta: null },
    });
    expect(first.objectives).toHaveLength(78);
    expect(first.deckProgress).toHaveLength(15);
    expect(first.challengeProgress.records).toHaveLength(20);
    expect(first.collection.discoveredJokerIds).toEqual([]);
    expect(first.collection.jokerVictoryMarks).toHaveLength(150);
    expect(first.achievements).toHaveLength(31);
    expect(first.statistics.handTypes).toHaveLength(12);
    expect(first.statistics.decks).toHaveLength(15);
    expect(first.statistics.challenges).toHaveLength(20);
    expect(first.unreadNotices).toEqual([]);

    expect(
      first.objectives
        .filter((record) => record.source === 'baseline')
        .map((record) => record.objectiveId),
    ).toEqual([
      'bxqp:objective:voucher:01',
      'bxqp:objective:voucher:03',
      'bxqp:objective:voucher:05',
      'bxqp:objective:voucher:07',
      'bxqp:objective:voucher:09',
      'bxqp:objective:voucher:11',
      'bxqp:objective:voucher:13',
      'bxqp:objective:voucher:15',
      'bxqp:objective:voucher:17',
      'bxqp:objective:voucher:19',
      'bxqp:objective:voucher:21',
      'bxqp:objective:voucher:23',
      'bxqp:objective:voucher:25',
      'bxqp:objective:voucher:27',
      'bxqp:objective:voucher:29',
      'bxqp:objective:voucher:31',
    ]);

    expect(first.objectives).not.toBe(second.objectives);
    expect(first.statistics).not.toBe(second.statistics);
  });

  it('读取早期 V1 档案时为缺失的局内结果增量补空值', () => {
    const profile = createProfile(1, '旧册人', 100);
    const raw = structuredClone(profile) as unknown as {
      currentRunProgress: Record<string, unknown>;
    };
    delete raw.currentRunProgress.resultDelta;

    expect(profileRecordSchema.parse(raw).currentRunProgress.resultDelta).toBeNull();
  });

  it('拒绝乱序、重复或超过有界容量的档案投影', () => {
    const profile = createProfile(1, '守册人', 100);
    expect(validateProfileRecord(profile)).toEqual({ ok: true });

    const reversed = {
      ...profile,
      objectives: [...profile.objectives].reverse(),
    };
    const repeatedDiscovery = {
      ...profile,
      collection: {
        ...profile.collection,
        discoveredJokerIds: ['bxqp:joker:001', 'bxqp:joker:001'],
      },
    };
    const tooManyNotices = {
      ...profile,
      unreadNotices: Array.from({ length: 51 }, (_, index) => ({
        noticeId: `notice:${index}`,
        kind: 'unlock' as const,
        title: '解锁',
        detail: '测试通知',
        createdAtEpochMs: 100,
      })),
    };

    expect(validateProfileRecord(reversed)).toMatchObject({ ok: false });
    expect(validateProfileRecord(repeatedDiscovery)).toMatchObject({ ok: false });
    expect(validateProfileRecord(tooManyNotices)).toMatchObject({ ok: false });
  });

  it('拒绝负数统计、外来券号、无效教程时间和不完整的当前局计数', () => {
    const profile = createProfile(1, '验账人', 100);
    const negativeCounter = {
      ...profile,
      statistics: { ...profile.statistics, moneySpent: -1 },
    };
    const foreignVoucher = {
      ...profile,
      statistics: {
        ...profile.statistics,
        distinctVoucherIds: ['foreign:voucher'],
      },
    };
    const invalidTutorial = {
      ...profile,
      tutorial: {
        ...profile.tutorial,
        status: 'completed' as const,
        completedAtEpochMs: null,
      },
    };
    const missingHandCounter = {
      ...profile,
      currentRunProgress: {
        ...profile.currentRunProgress,
        handsPlayedByType: { 'high-card': 0 },
      },
    };

    expect(validateProfileRecord(negativeCounter)).toMatchObject({ ok: false });
    expect(validateProfileRecord(foreignVoucher)).toMatchObject({ ok: false });
    expect(validateProfileRecord(invalidTutorial)).toMatchObject({ ok: false });
    expect(
      validateProfileRecord(
        missingHandCounter as unknown as Parameters<typeof validateProfileRecord>[0],
      ),
    ).toMatchObject({ ok: false });
  });

  it('拒绝挑战完成状态错位、未来通知与伪造结果摘要', () => {
    const profile = createProfile(1, '稽核人', 100);
    const inconsistentChallenge = {
      ...profile,
      challengeProgress: {
        nextAvailableOrdinal: 2,
        records: profile.challengeProgress.records.map((record, index) =>
          index === 0
            ? { ...record, attempts: 1, completions: 1, completedAtEpochMs: null }
            : record,
        ),
      },
    };
    const futureNotice = {
      ...profile,
      unreadNotices: [
        {
          noticeId: 'notice:future',
          kind: 'unlock' as const,
          title: '解锁',
          detail: '来自未来的戏报',
          createdAtEpochMs: 101,
        },
      ],
    };
    const forgedResult = {
      ...profile,
      lastResultSummary: {
        runId: 'run:forged',
        objectiveIds: ['foreign:objective'],
        discoveredJokerIds: [],
        achievementIds: [],
        victoryMarkContentIds: [],
        statisticKeys: ['foreignStatistic'],
      },
    };

    expect(validateProfileRecord(inconsistentChallenge)).toMatchObject({ ok: false });
    expect(validateProfileRecord(futureNotice)).toMatchObject({ ok: false });
    expect(
      validateProfileRecord(
        forgedResult as unknown as Parameters<typeof validateProfileRecord>[0],
      ),
    ).toMatchObject({ ok: false });
  });
});
