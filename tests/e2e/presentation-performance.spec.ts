import { expect, test, type Page } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

import { JOKER_CONTENT_IDS } from '../../src/progression/definitions';
import { createProfile } from '../../src/persistence/profiles';
import { exportProfileToJson } from '../../src/persistence/profileTransfer';

async function landPerformance(page: Page) {
  const button = page.getByRole('button', {
    name: '落定演出，显示已提交结果',
  });
  try {
    await expect(button).toBeVisible({ timeout: 1_000 });
    await button.click({ force: true, timeout: 1_000 });
  } catch {
    // Routine cues may finish naturally before the probe asks them to land.
  }
}

async function enterPerformanceRound(page: Page) {
  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  await page.getByRole('button', { name: '在此建档' }).first().click();
  await page.getByLabel('档案名').fill('帧率验收人');
  await page.getByRole('button', { name: '落印建档' }).click();
  await page.getByRole('button', { name: '暂时跳过教程' }).click();
  await page.getByRole('button', { name: '普通战役' }).click();
  await page.getByLabel('演出种子').fill('PERF0001');
  await page.getByRole('button', { name: '开始普通战役' }).click();
  await page.getByRole('button', { name: '登台应战' }).click();
  await expect(page.getByRole('button', { name: '出牌' })).toBeVisible();
  const openingPerformance = page.getByRole('button', {
    name: '落定演出，显示已提交结果',
  });
  if (await openingPerformance.isVisible())
    await openingPerformance.click({ force: true });
}

test('首屏只取当前布景，图鉴保留尺寸且不会一次解码全部奇牌大图', async ({
  page,
}, testInfo) => {
  const base = createProfile(1, '资源验收人', 100);
  const profile = {
    ...base,
    updatedAtEpochMs: 200,
    tutorial: {
      ...base.tutorial,
      status: 'skipped' as const,
      startedAtEpochMs: 150,
      skippedAtEpochMs: 150,
    },
    collection: {
      ...base.collection,
      discoveredJokerIds: JOKER_CONTENT_IDS,
    },
  };
  const fixturePath = testInfo.outputPath('all-jokers-profile.json');
  await writeFile(fixturePath, exportProfileToJson(profile, null), 'utf8');

  const remoteRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4173') remoteRequests.push(request.url());
  });

  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  const initialResources = await page.evaluate(() =>
    performance.getEntriesByType('resource').map(({ name }) => name),
  );
  expect(
    initialResources
      .filter((name) => name.includes('/presentation/scenes/'))
      .map((name) => new URL(name).pathname),
  ).toEqual([
    '/assets/presentation/scenes/brand-curtain.webp',
    '/assets/presentation/scenes/profile-ledger.webp',
  ]);
  expect(
    initialResources.filter((name) => name.includes('/assets/presentation/audio/')),
  ).toHaveLength(0);

  await page.locator('input[type="file"]').setInputFiles(fixturePath);
  await page.getByRole('button', { name: '确认导入' }).click();
  await page.getByRole('button', { name: '百戏图鉴' }).click();
  await expect(page.getByRole('heading', { name: '百戏图鉴' })).toBeVisible();
  await page.getByLabel('内容类别').selectOption('joker');
  await expect(page.locator('[data-collection-row]')).toHaveCount(150);

  const jokerImages = page.locator('[data-collection-row] img');
  await expect(jokerImages).toHaveCount(150);
  await expect(jokerImages.first()).toHaveJSProperty('complete', true);
  const decodedCount = await jokerImages.evaluateAll(
    (images) =>
      images.filter((image) => (image as HTMLImageElement).naturalWidth > 0).length,
  );
  expect(decodedCount).toBeGreaterThan(0);
  expect(decodedCount).toBeLessThan(150);
  await expect(page.locator('[data-collection-row]').last()).not.toBeInViewport();
  expect(
    await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      width: document.documentElement.scrollWidth,
    })),
  ).toEqual({ height: 720, width: 1280 });
  expect(remoteRequests).toEqual([]);
});

test('例行牌面动作与计分朱印没有反复超过 50ms 的主线程停顿', async ({
  page,
}, testInfo) => {
  await enterPerformanceRound(page);
  await page.evaluate(() => {
    interface MotionProbe {
      active: boolean;
      readonly frameDurations: number[];
      readonly frameGaps: number[];
      readonly longTasks: number[];
      readonly timerDrifts: number[];
      observer: PerformanceObserver | null;
      timerId: number | null;
      consecutiveLongFrameGaps: number;
      maximumConsecutiveLongFrameGaps: number;
    }
    const scope = window as typeof window & { __bxMotionProbe?: MotionProbe };
    const probe: MotionProbe = {
      active: true,
      frameDurations: [],
      frameGaps: [],
      longTasks: [],
      timerDrifts: [],
      observer: null,
      timerId: null,
      consecutiveLongFrameGaps: 0,
      maximumConsecutiveLongFrameGaps: 0,
    };
    if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
      probe.observer = new PerformanceObserver((entries) => {
        for (const entry of entries.getEntries()) probe.longTasks.push(entry.duration);
      });
      probe.observer.observe({ entryTypes: ['longtask'] });
    }
    let previous = performance.now();
    const sampleFrame = (now: number) => {
      if (!probe.active) return;
      const gap = now - previous;
      probe.frameDurations.push(gap);
      if (gap > 50) {
        probe.frameGaps.push(gap);
        probe.consecutiveLongFrameGaps += 1;
        probe.maximumConsecutiveLongFrameGaps = Math.max(
          probe.maximumConsecutiveLongFrameGaps,
          probe.consecutiveLongFrameGaps,
        );
      } else {
        probe.consecutiveLongFrameGaps = 0;
      }
      previous = now;
      requestAnimationFrame(sampleFrame);
    };
    scope.__bxMotionProbe = probe;
    let previousTimer = performance.now();
    probe.timerId = window.setInterval(() => {
      const now = performance.now();
      const drift = now - previousTimer - 10;
      if (drift > 50) probe.timerDrifts.push(drift);
      previousTimer = now;
    }, 10);
    requestAnimationFrame(sampleFrame);
  });

  const firstCard = page.locator('[data-card-id]').first();
  const firstCardId = await firstCard.getAttribute('data-card-id');
  if (!firstCardId) throw new Error('牌面缺少稳定 ID');
  await firstCard.click();
  await landPerformance(page);
  await page.locator(`[data-card-id="${firstCardId}"]`).click();
  await landPerformance(page);
  await page.getByRole('button', { name: '按点数' }).click();
  await landPerformance(page);
  await page.getByRole('button', { name: '按花色' }).click();
  await landPerformance(page);
  await page.waitForTimeout(500);

  await firstCard.click();
  await landPerformance(page);
  await page.getByRole('button', { name: '出牌' }).click();
  const scorePerformance = page.locator('[data-sequence-id][data-speed="full"]');
  await expect(scorePerformance).toBeVisible();
  await page.waitForTimeout(1_200);
  await landPerformance(page);
  await page.waitForTimeout(300);

  const result = await page.evaluate(() => {
    interface MotionProbe {
      active: boolean;
      readonly frameGaps: number[];
      readonly frameDurations: number[];
      readonly longTasks: number[];
      readonly timerDrifts: number[];
      readonly observer: PerformanceObserver | null;
      readonly timerId: number | null;
      readonly maximumConsecutiveLongFrameGaps: number;
    }
    const scope = window as typeof window & { __bxMotionProbe?: MotionProbe };
    const probe = scope.__bxMotionProbe;
    if (!probe) throw new Error('性能探针未安装');
    probe.active = false;
    probe.observer?.disconnect();
    if (probe.timerId !== null) window.clearInterval(probe.timerId);
    const sortedFrames = [...probe.frameDurations].sort((left, right) => left - right);
    const p95FrameDuration =
      sortedFrames[
        Math.min(sortedFrames.length - 1, Math.floor(sortedFrames.length * 0.95))
      ] ?? 0;
    return {
      frameGaps: probe.frameGaps,
      longTasks: probe.longTasks,
      maximumConsecutiveLongFrameGaps: probe.maximumConsecutiveLongFrameGaps,
      p95FrameDuration,
      supportedLongTaskObserver: probe.observer !== null,
      timerDrifts: probe.timerDrifts,
    };
  });

  const evidencePath = testInfo.outputPath('motion-performance.json');
  await writeFile(evidencePath, JSON.stringify(result, null, 2), 'utf8');
  await testInfo.attach(`motion-performance-${testInfo.project.name}`, {
    path: evidencePath,
    contentType: 'application/json',
  });
  expect(result.longTasks.filter((duration) => duration > 50)).toHaveLength(0);
  expect(result.timerDrifts.filter((duration) => duration > 50)).toHaveLength(0);
  expect(result.p95FrameDuration, JSON.stringify(result)).toBeLessThanOrEqual(50);
});
