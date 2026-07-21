import { expect, test, type Locator, type Page } from '@playwright/test';

import type { RunStateV2 } from '../../src/game-core/model/runV2';

async function readActiveRun(page: Page): Promise<RunStateV2> {
  return page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('baixiqipai');
      request.onerror = () => reject(request.error ?? new Error('无法打开本地数据库'));
      request.onsuccess = () => resolve(request.result);
    });
    const read = (request: IDBRequest<unknown>) =>
      new Promise<unknown>((resolve, reject) => {
        request.onerror = () => reject(request.error ?? new Error('无法读取本地数据库'));
        request.onsuccess = () => resolve(request.result);
      });
    const meta = await read(
      database.transaction('meta', 'readonly').objectStore('meta').get('state'),
    );
    if (
      !meta ||
      typeof meta !== 'object' ||
      !('activeProfileId' in meta) ||
      typeof meta.activeProfileId !== 'string'
    ) {
      throw new Error('没有活动档案');
    }
    const run = await read(
      database
        .transaction('runs', 'readonly')
        .objectStore('runs')
        .get(meta.activeProfileId),
    );
    database.close();
    if (!run) throw new Error('没有活动牌局');
    return run as RunStateV2;
  });
}

async function enterRound(page: Page, seed = 'PRES0001') {
  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  await page.getByRole('button', { name: '在此建档' }).first().click();
  await page.getByLabel('档案名').fill('朱印验收人');
  await page.getByRole('button', { name: '落印建档' }).click();
  await page.getByRole('button', { name: '暂时跳过教程' }).click();
  await page.getByRole('button', { name: '普通战役' }).click();
  await page.getByLabel('演出种子').fill(seed);
  await page.getByRole('button', { name: '开始普通战役' }).click();
  await page.getByRole('button', { name: '登台应战' }).click();
  await expect(page.getByRole('button', { name: '出牌' })).toBeVisible();
}

async function landCurrentPresentation(page: Page) {
  const button = page.getByRole('button', {
    name: '落定演出，显示已提交结果',
  });
  try {
    await expect(button).toBeVisible({ timeout: 1_000 });
    await button.click({ timeout: 1_000 });
  } catch {
    // A short routine cue may already have completed by the time the DOM settles.
  }
}

async function selectFirstCard(page: Page) {
  await page.locator('[data-card-id]').first().click();
  await landCurrentPresentation(page);
}

async function waitForScorePresentation(page: Page) {
  const performance = page.locator('[data-sequence-id]');
  await expect(performance).toBeVisible();
  await expect(performance).toHaveCount(0, { timeout: 12_000 });
}

async function expectSettledHandToMatchCommittedPose(page: Page) {
  const run = await readActiveRun(page);
  const committedIds = run.round?.handIds ?? [];

  await expect
    .poll(
      async () => {
        const poses = await page.locator('[data-card-id]').evaluateAll((cards) =>
          cards.map((card) => {
            const element = card as HTMLElement;
            const rect = element.getBoundingClientRect();
            const transform = getComputedStyle(element).transform;
            const matrix = new DOMMatrixReadOnly(
              transform === 'none' ? undefined : transform,
            );
            return {
              id: element.dataset.cardId,
              centerX: rect.left + rect.width / 2,
              entryState: element.dataset.cardEntryState,
              opacity: Number.parseFloat(getComputedStyle(element).opacity),
              scale: Math.hypot(matrix.a, matrix.b),
              translateY: matrix.f,
              rotation: (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI,
            };
          }),
        );
        const center = (poses.length - 1) / 2;
        return {
          ids: poses.map(({ id }) => id),
          allSettled: poses.every(({ entryState }) => entryState === 'settled'),
          allVisible: poses.every(({ opacity }) => opacity >= 0.99),
          leftToRight: poses.every(
            ({ centerX }, index) => index === 0 || poses[index - 1]!.centerX < centerX,
          ),
          currentFanPose: poses.every(
            ({ rotation, scale, translateY }, index) =>
              Math.abs(rotation - (index - center) * 2.2) <= 0.25 &&
              Math.abs(scale - 1) <= 0.005 &&
              Math.abs(translateY - Math.abs(index - center) * 2.2) <= 0.5,
          ),
        };
      },
      { timeout: 8_000 },
    )
    .toEqual({
      ids: committedIds,
      allSettled: true,
      allVisible: true,
      leftToRight: true,
      currentFanPose: true,
    });
}

interface CardMotionPose {
  readonly hovered: boolean;
  readonly scale: number;
  readonly translateX: number;
  readonly translateY: number;
  readonly rotation: number;
}

function settledCardMotionPose(
  index: number,
  count: number,
): Omit<CardMotionPose, 'hovered'> {
  const center = (count - 1) / 2;
  return {
    scale: 1,
    translateX: 0,
    translateY: Math.abs(index - center) * 2.2,
    rotation: (index - center) * 2.2,
  };
}

async function readCardMotionPose(card: Locator): Promise<CardMotionPose> {
  return card.evaluate((element) => {
    const style = getComputedStyle(element);
    const transform = style.transform;
    const matrix = new DOMMatrixReadOnly(transform === 'none' ? undefined : transform);
    const translateParts = style.translate === 'none' ? [] : style.translate.split(' ');
    const interactionTranslateY = Number.parseFloat(translateParts[1] ?? '0');
    const interactionScale =
      style.scale === 'none' ? 1 : Number.parseFloat(style.scale.split(' ')[0] ?? '1');
    return {
      hovered: element.matches(':hover'),
      scale: Math.hypot(matrix.a, matrix.b) * interactionScale,
      translateX: matrix.e,
      translateY: matrix.f + interactionTranslateY,
      rotation: (Math.atan2(matrix.b, matrix.a) * 180) / Math.PI,
    };
  });
}

async function expectCardMotionPose(
  card: Locator,
  expected: Omit<CardMotionPose, 'hovered'>,
  hovered: boolean,
) {
  await expect
    .poll(
      async () => {
        const actual = await readCardMotionPose(card);
        const comparisons = {
          hovered: actual.hovered,
          scale: Math.abs(actual.scale - expected.scale) <= 0.005,
          translateX: Math.abs(actual.translateX - expected.translateX) <= 0.5,
          translateY: Math.abs(actual.translateY - expected.translateY) <= 0.5,
          rotation: Math.abs(actual.rotation - expected.rotation) <= 0.25,
        };
        if (
          comparisons.hovered === hovered &&
          comparisons.scale &&
          comparisons.translateX &&
          comparisons.translateY &&
          comparisons.rotation
        ) {
          return comparisons;
        }
        return {
          ...comparisons,
          actual: {
            scale: Number(actual.scale.toFixed(4)),
            translateX: Number(actual.translateX.toFixed(2)),
            translateY: Number(actual.translateY.toFixed(2)),
            rotation: Number(actual.rotation.toFixed(2)),
          },
        };
      },
      { timeout: 5_000 },
    )
    .toEqual({
      hovered,
      scale: true,
      translateX: true,
      translateY: true,
      rotation: true,
    });
}

async function expectCardSelected(page: Page, cardId: string, selected: boolean) {
  await expect
    .poll(async () =>
      (await readActiveRun(page)).round?.selectedCardIds.some((id) => id === cardId),
    )
    .toBe(selected);
  const card = page.locator(`[data-card-id="${cardId}"]`);
  if (selected) {
    await expect(card).toHaveClass(/selectedCard/);
  } else {
    await expect(card).not.toHaveClass(/selectedCard/);
  }
}

test('完整与利落朱印都只呈现已提交结果，一点落定不会重发牌局命令', async ({ page }) => {
  await enterRound(page);
  await landCurrentPresentation(page);
  await selectFirstCard(page);
  const beforeFull = await readActiveRun(page);

  await page.getByRole('button', { name: '出牌' }).click();
  const fullPerformance = page.locator('[data-sequence-id][data-speed="full"]');
  await expect(fullPerformance).toBeVisible();
  const committedFull = await readActiveRun(page);
  expect(committedFull.checkpointId).toBe(beforeFull.checkpointId + 1);
  expect(committedFull).not.toEqual(beforeFull);
  await page.getByRole('button', { name: '落定演出，显示已提交结果' }).click();
  await expect(fullPerformance).toHaveCount(0);
  expect(await readActiveRun(page)).toEqual(committedFull);

  await page.getByRole('button', { name: '打开声场设置' }).click();
  const drawer = page.getByRole('dialog', { name: '声场控制台' });
  await drawer.getByRole('button', { name: '利落演出' }).click();
  await expect(drawer.getByText('正在落印…')).toHaveCount(0);
  await drawer.getByRole('button', { name: '收起声场' }).click();
  await selectFirstCard(page);
  const beforeBrisk = await readActiveRun(page);

  await page.getByRole('button', { name: '出牌' }).click();
  const briskPerformance = page.locator('[data-sequence-id][data-speed="brisk"]');
  await expect(briskPerformance).toBeVisible();
  await page.getByRole('button', { name: '落定演出，显示已提交结果' }).click();
  await expect(briskPerformance).toHaveCount(0);
  const committedBrisk = await readActiveRun(page);
  expect(committedBrisk.checkpointId).toBe(beforeBrisk.checkpointId + 1);

  await page.reload();
  expect(await readActiveRun(page)).toEqual(committedBrisk);
});

test('连续出牌后点数与花色手牌保持已提交顺序和完整扇形姿态', async ({ page }) => {
  await enterRound(page, 'BOUND001');
  await landCurrentPresentation(page);
  await expectSettledHandToMatchCommittedPose(page);

  await selectFirstCard(page);
  await page.getByRole('button', { name: '出牌' }).click();
  await waitForScorePresentation(page);
  await expectSettledHandToMatchCommittedPose(page);

  await page.getByRole('button', { name: '按花色' }).click();
  await landCurrentPresentation(page);
  await selectFirstCard(page);
  await page.getByRole('button', { name: '出牌' }).click();
  await waitForScorePresentation(page);
  await expectSettledHandToMatchCommittedPose(page);

  const committed = await readActiveRun(page);
  await page.reload();
  await expect(page.getByRole('button', { name: '出牌' })).toBeVisible();
  await expectSettledHandToMatchCommittedPose(page);
  expect(await readActiveRun(page)).toEqual(committed);
});

test('取消选中立即恢复完整扇形姿态，离开后重新启用悬停反馈', async ({ page }) => {
  await enterRound(page, 'BOUND001');
  await landCurrentPresentation(page);
  await page.mouse.move(4, 4);

  const cards = page.locator('[data-card-id]');
  const cardCount = await cards.count();
  const leftmostCard = cards.first();
  const leftmostId = await leftmostCard.getAttribute('data-card-id');
  if (!leftmostId) throw new Error('最左侧手牌缺少稳定 ID');

  const settledPose = settledCardMotionPose(0, cardCount);
  await expectCardMotionPose(leftmostCard, settledPose, false);

  await leftmostCard.click();
  await expectCardSelected(page, leftmostId, true);
  await expect
    .poll(async () => (await readCardMotionPose(leftmostCard)).translateY)
    .toBeLessThan(settledPose.translateY - 20);

  await leftmostCard.click();
  await expectCardSelected(page, leftmostId, false);
  await expectCardMotionPose(leftmostCard, settledPose, true);

  await page.mouse.move(4, 4);
  await expectCardMotionPose(leftmostCard, settledPose, false);

  await leftmostCard.hover();
  await expectCardMotionPose(
    leftmostCard,
    {
      ...settledPose,
      scale: 1.025,
      translateY: -10,
    },
    true,
  );
  await page.mouse.move(4, 4);
  await expectCardMotionPose(leftmostCard, settledPose, false);

  await leftmostCard.click();
  await expectCardSelected(page, leftmostId, true);
  await leftmostCard.click();
  await expectCardSelected(page, leftmostId, false);
  await expectCardMotionPose(leftmostCard, settledPose, true);
  await page.mouse.move(4, 4);
  await expectCardMotionPose(leftmostCard, settledPose, false);

  const middleCard = cards.nth(3);
  const middleId = await middleCard.getAttribute('data-card-id');
  if (!middleId) throw new Error('中间手牌缺少稳定 ID');
  const middleSettledPose = settledCardMotionPose(3, cardCount);
  await expectCardMotionPose(middleCard, middleSettledPose, false);

  await middleCard.click();
  await expectCardSelected(page, middleId, true);
  await middleCard.click();
  await expectCardSelected(page, middleId, false);
  await expectCardMotionPose(middleCard, middleSettledPose, true);
  await page.mouse.move(4, 4);
  await expectCardMotionPose(middleCard, middleSettledPose, false);
  await expectSettledHandToMatchCommittedPose(page);
});
