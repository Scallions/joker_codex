import { writeFile } from 'node:fs/promises';

import { expect, test, type Page } from '@playwright/test';

import { commitRunCommand } from '../../src/app/commitRunCommand';
import { isRunStateV7, type RunStateV7 } from '../../src/game-core/model/runV7';
import type { ProfileRecord } from '../../src/persistence/profiles';
import { exportProfileToJson } from '../../src/persistence/profileTransfer';
import {
  RELEASE_REPLAY_KINDS,
  createReleaseReplayFixture,
  type ReleaseReplayFixture,
} from '../../src/test-support/releaseReplayV7';
import { readActiveProfileRunPair } from './helpers/indexedDb';

interface BrowserPair {
  readonly profile: ProfileRecord;
  readonly run: RunStateV7;
}

async function expectedPair(fixture: ReleaseReplayFixture): Promise<BrowserPair> {
  let profile = fixture.profile;
  let run = fixture.run;
  for (const step of fixture.steps) {
    const committed = await commitRunCommand(
      { commitCheckpoint: async () => undefined },
      profile,
      run,
      step.buildCommand(run),
      1_000,
    );
    if (!committed.ok) throw new Error(`${committed.code}: ${committed.message}`);
    if (!isRunStateV7(committed.state)) throw new Error('浏览器回放降级为旧版牌局');
    profile = committed.profile;
    run = committed.state;
  }
  return { profile, run };
}

async function importFixture(page: Page, fixture: ReleaseReplayFixture, path: string) {
  await writeFile(path, exportProfileToJson(fixture.profile, fixture.run), 'utf8');
  await page.goto('/');
  await page.locator('input[type="file"]').setInputFiles(path);
  await expect(page.getByText('档案导入预览')).toBeVisible();
  await page.getByRole('button', { name: '确认导入' }).click();
}

for (const kind of RELEASE_REPLAY_KINDS) {
  test(`${kind} 的真实控件与纯逻辑提交得到同一档案/牌局对`, async ({
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

    const fixture = createReleaseReplayFixture(kind);
    const expected = await expectedPair(fixture);
    await importFixture(page, fixture, testInfo.outputPath(`${kind}.json`));

    if (kind === 'endless') {
      await expect(
        page.getByRole('heading', { name: '百戏压轴，今夜留名' }),
      ).toBeVisible();
      await page.getByRole('button', { name: '进入无尽加演' }).click();
    } else {
      await page.getByRole('button', { name: '登台应战' }).click();
      const selectedCardId = expected.run.round?.selectedCardIds[0];
      if (!selectedCardId) throw new Error('规范回放缺少选中的手牌');
      await page.locator(`[data-card-id="${selectedCardId}"]`).click();
    }

    await expect
      .poll(async () => (await readActiveProfileRunPair(page)).run.checkpointId)
      .toBe(expected.run.checkpointId);
    await page.reload();
    expect(await readActiveProfileRunPair(page)).toEqual(expected);
    expect(remoteRequests).toEqual([]);
    expect(pageErrors).toEqual([]);
  });
}
