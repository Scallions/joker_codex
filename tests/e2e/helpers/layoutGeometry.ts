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
