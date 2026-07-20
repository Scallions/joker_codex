import { writeFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import { commitRunCommand } from '../../src/app/commitRunCommand';
import type { RunCommandV2 } from '../../src/game-core/commands/typesV2';
import { validateRunStateV7 } from '../../src/game-core/invariants/validateRunStateV7';
import { isRunStateV7, type RunStateV7 } from '../../src/game-core/model/runV7';
import { materializeBlind } from '../../src/game-core/rules/ante';
import type { ProfileRecord } from '../../src/persistence/profiles';
import { exportProfileToJson } from '../../src/persistence/profileTransfer';
import { createReleaseReplayFixture } from '../../src/test-support/releaseReplayV7';
import { readActiveProfileRunPair } from './helpers/indexedDb';

interface ChallengePair {
  readonly profile: ProfileRecord;
  readonly run: RunStateV7;
}

async function commitPair(
  pair: ChallengePair,
  command: RunCommandV2,
): Promise<ChallengePair> {
  const result = await commitRunCommand(
    { commitCheckpoint: async () => undefined },
    pair.profile,
    pair.run,
    command,
    1_000,
  );
  if (!result.ok) throw new Error(`${result.code}: ${result.message}`);
  if (!isRunStateV7(result.state)) throw new Error('挑战终局夹具降级为旧版牌局');
  return { profile: result.profile, run: result.state };
}

async function createChallengeTerminalFixture(outcome: 'won' | 'lost') {
  const fixture = createReleaseReplayFixture('challenge');
  const finisher = fixture.run.content.blinds.find(
    ({ kind, minimumAnte }) => kind === 'finisher' && minimumAnte <= 8,
  );
  if (!finisher) throw new Error('挑战终局缺少第八幕班主');
  const ready: RunStateV7 = {
    ...fixture.run,
    progress: {
      ...fixture.run.progress,
      ante: 8,
      blindPosition: 'boss',
      lineup: {
        ...fixture.run.progress.lineup,
        boss: materializeBlind(finisher),
      },
    },
  };
  let initial = await commitPair(
    { profile: fixture.profile, run: ready },
    {
      type: 'select-blind',
      checkpointId: ready.checkpointId,
      position: 'boss',
    },
  );
  if (!initial.run.round) throw new Error('挑战终局没有活动回合');
  initial = {
    ...initial,
    run: {
      ...initial.run,
      round: {
        ...initial.run.round,
        targetScore: outcome === 'won' ? 1 : Number.MAX_SAFE_INTEGER,
        handsRemaining: outcome === 'lost' ? 1 : initial.run.round.handsRemaining,
      },
    },
  };
  const validation = validateRunStateV7(initial.run);
  if (!validation.ok) {
    throw new Error(`挑战终局夹具无效：${validation.violations.join('；')}`);
  }
  const activeRound = initial.run.round;
  if (!activeRound) throw new Error('挑战终局没有活动回合');
  const cardId = activeRound.handIds.find(
    (candidate) => !activeRound.forcedSelectedCardIds.includes(candidate),
  );
  if (!cardId) throw new Error('挑战终局缺少可选择手牌');

  let expected = await commitPair(initial, {
    type: 'toggle-card',
    checkpointId: initial.run.checkpointId,
    cardId,
  });
  expected = await commitPair(expected, {
    type: 'play-selected',
    checkpointId: expected.run.checkpointId,
  });
  if (outcome === 'won') {
    expected = await commitPair(expected, {
      type: 'claim-round-reward',
      checkpointId: expected.run.checkpointId,
    });
    expected = await commitPair(expected, {
      type: 'finish-run',
      checkpointId: expected.run.checkpointId,
    });
  }
  return { initial, expected, cardId };
}

async function importPair(page: Page, pair: ChallengePair, path: string) {
  await writeFile(path, exportProfileToJson(pair.profile, pair.run), 'utf8');
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles(path);
  await page.getByRole('button', { name: '确认导入' }).click();
}

for (const outcome of ['won', 'lost'] as const) {
  test(`挑战${outcome === 'won' ? '成功' : '失败'}走完真实终局并保存隔离统计`, async ({
    page,
  }, testInfo) => {
    await page.addInitScript(() => {
      Date.now = () => 1_000;
    });
    const remoteRequests: string[] = [];
    const pageErrors: string[] = [];
    page.on('request', (request) => {
      const url = new URL(request.url());
      if (url.origin !== 'http://127.0.0.1:4173') remoteRequests.push(request.url());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const fixture = await createChallengeTerminalFixture(outcome);
    await importPair(
      page,
      fixture.initial,
      testInfo.outputPath(`challenge-${outcome}.json`),
    );
    await expect(page.getByRole('button', { name: '出牌' })).toBeVisible();
    await page.locator(`[data-card-id="${fixture.cardId}"]`).click();
    await page.getByRole('button', { name: '出牌' }).click();
    const settle = page.getByRole('button', {
      name: '落定演出，显示已提交结果',
    });
    await expect(settle).toBeVisible();
    await settle.click();

    if (outcome === 'won') {
      await page.getByRole('button', { name: '收赏入夜市' }).click();
      await expect(
        page.getByRole('heading', { name: '挑战谢幕，下一阵开' }),
      ).toBeVisible();
      await page.getByRole('button', { name: '完成挑战' }).click();
      await expect(
        page.getByRole('heading', { name: '今夜压轴，满堂喝彩' }),
      ).toBeVisible();
    } else {
      await expect(
        page.getByRole('heading', { name: '锣声已止，再排一场' }),
      ).toBeVisible();
    }

    await expect
      .poll(async () => (await readActiveProfileRunPair(page)).run.checkpointId)
      .toBe(fixture.expected.run.checkpointId);
    await page.reload();
    expect(await readActiveProfileRunPair(page)).toEqual(fixture.expected);
    const challengeRecord = fixture.expected.profile.challengeProgress.records[0];
    expect(challengeRecord).toMatchObject({
      attempts: 1,
      completions: outcome === 'won' ? 1 : 0,
    });
    expect(fixture.expected.profile.statistics.campaignLosses).toBe(0);
    expect(remoteRequests).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}

test('无尽大历史与正无穷分数可传输、刷新并继续操作', async ({ page }, testInfo) => {
  await page.addInitScript(() => {
    Date.now = () => 1_000;
  });
  const fixture = createReleaseReplayFixture('endless');
  const profile: ProfileRecord = {
    ...fixture.profile,
    statistics: {
      ...fixture.profile.statistics,
      totalScore: Number.POSITIVE_INFINITY,
      bestHandScore: Number.POSITIVE_INFINITY,
      handTypes: fixture.profile.statistics.handTypes.map((record, index) =>
        index === 0 ? { ...record, bestScore: Number.POSITIVE_INFINITY } : record,
      ),
    },
  };
  const run: RunStateV7 = {
    ...fixture.run,
    history: {
      ...fixture.run.history,
      playedHandTypes: Array.from({ length: 2_048 }, () => 'high-card' as const),
    },
    result: fixture.run.result
      ? { ...fixture.run.result, score: Number.POSITIVE_INFINITY }
      : null,
  };
  const validation = validateRunStateV7(run);
  if (!validation.ok) {
    throw new Error(`无尽大值夹具无效：${validation.violations.join('；')}`);
  }
  const initial = { profile, run };
  let expected = await commitPair(initial, {
    type: 'enter-endless',
    checkpointId: run.checkpointId,
  });
  expected = await commitPair(expected, {
    type: 'select-blind',
    checkpointId: expected.run.checkpointId,
    position: 'small',
  });

  await importPair(page, initial, testInfo.outputPath('endless-infinity.json'));
  await page.getByRole('button', { name: '进入无尽加演' }).click();
  await page.getByRole('button', { name: '登台应战' }).click();
  await expect(page.getByRole('button', { name: '出牌' })).toBeVisible();
  await expect
    .poll(async () => (await readActiveProfileRunPair(page)).run.checkpointId)
    .toBe(expected.run.checkpointId);
  await page.reload();
  expect(await readActiveProfileRunPair(page)).toEqual(expected);
  expect(expected.profile.statistics.totalScore).toBe(Number.POSITIVE_INFINITY);
  expect(expected.run.history.playedHandTypes).toHaveLength(2_048);
});
