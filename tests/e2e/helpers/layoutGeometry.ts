import { expect, type Locator, type Page } from '@playwright/test';

export const layoutZone = (page: Page, name: string): Locator =>
  page.locator(`[data-layout-zone="${name}"]`);

export async function expectInsideStage(page: Page, locator: Locator, label: string) {
  const stage = await page.getByRole('region', { name: '午夜百戏舞台' }).boundingBox();
  const box = await locator.boundingBox();
  expect(stage, `${label} 缺少舞台边界`).not.toBeNull();
  expect(box, `${label} 不可见`).not.toBeNull();
  if (!stage || !box) return;
  expect(box.x, `${label} 越过舞台左边界`).toBeGreaterThanOrEqual(stage.x);
  expect(box.y, `${label} 越过舞台上边界`).toBeGreaterThanOrEqual(stage.y);
  expect(box.x + box.width, `${label} 越过舞台右边界`).toBeLessThanOrEqual(
    stage.x + stage.width,
  );
  expect(box.y + box.height, `${label} 越过舞台下边界`).toBeLessThanOrEqual(
    stage.y + stage.height,
  );
}

export async function expectSeparated(
  first: Locator,
  second: Locator,
  label: string,
  minimumGap = 8,
) {
  const firstBox = await first.boundingBox();
  const secondBox = await second.boundingBox();
  expect(firstBox, `${label} 的第一个区域不可见`).not.toBeNull();
  expect(secondBox, `${label} 的第二个区域不可见`).not.toBeNull();
  if (!firstBox || !secondBox) return;

  const horizontalOverlap = Math.max(
    0,
    Math.min(firstBox.x + firstBox.width, secondBox.x + secondBox.width) -
      Math.max(firstBox.x, secondBox.x),
  );
  const verticalOverlap = Math.max(
    0,
    Math.min(firstBox.y + firstBox.height, secondBox.y + secondBox.height) -
      Math.max(firstBox.y, secondBox.y),
  );
  expect(horizontalOverlap * verticalOverlap, `${label} 出现遮挡`).toBe(0);

  const horizontalGap = Math.max(
    0,
    Math.max(firstBox.x, secondBox.x) -
      Math.min(firstBox.x + firstBox.width, secondBox.x + secondBox.width),
  );
  const verticalGap = Math.max(
    0,
    Math.max(firstBox.y, secondBox.y) -
      Math.min(firstBox.y + firstBox.height, secondBox.y + secondBox.height),
  );
  expect(
    Math.max(horizontalGap, verticalGap),
    `${label} 的安全间距不足 ${String(minimumGap)}px`,
  ).toBeGreaterThanOrEqual(minimumGap);
}

export async function expectNoOuterScroll(page: Page) {
  const scroll = await page.evaluate(() => ({
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    x: window.scrollX,
    y: window.scrollY,
  }));
  expect(scroll).toEqual({
    width: scroll.viewportWidth,
    height: scroll.viewportHeight,
    viewportWidth: scroll.viewportWidth,
    viewportHeight: scroll.viewportHeight,
    x: 0,
    y: 0,
  });
}

export async function expectDirectHitTarget(locator: Locator, label: string) {
  await expect(locator, `${label} 不可见`).toBeVisible();
  const result = await locator.evaluate((target) => {
    const rect = target.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const hit = document.elementFromPoint(x, y);
    return {
      direct: hit !== null && (hit === target || target.contains(hit)),
      hitTag: hit?.tagName ?? null,
      hitText: hit?.textContent?.trim().slice(0, 80) ?? null,
      x,
      y,
    };
  });
  expect(
    result.direct,
    `${label} 中心点 (${result.x.toFixed(1)}, ${result.y.toFixed(1)}) 命中 ${result.hitTag ?? '空'}：${result.hitText ?? ''}`,
  ).toBe(true);
}

export async function expectPairwiseNonOverlapping(locator: Locator, label: string) {
  const boxes = await locator.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }),
  );
  for (let first = 0; first < boxes.length; first += 1) {
    for (let second = first + 1; second < boxes.length; second += 1) {
      const left = boxes[first]!;
      const right = boxes[second]!;
      const horizontal = Math.max(
        0,
        Math.min(left.x + left.width, right.x + right.width) - Math.max(left.x, right.x),
      );
      const vertical = Math.max(
        0,
        Math.min(left.y + left.height, right.y + right.height) -
          Math.max(left.y, right.y),
      );
      expect(
        horizontal * vertical,
        `${label} 的第 ${String(first + 1)} 与第 ${String(second + 1)} 项发生重叠`,
      ).toBe(0);
    }
  }
}
