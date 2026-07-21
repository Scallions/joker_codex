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

export async function expectContained(container: Locator, child: Locator, label: string) {
  const containerBox = await container.boundingBox();
  const childBox = await child.boundingBox();
  expect(containerBox, `${label} 的容器不可见`).not.toBeNull();
  expect(childBox, `${label} 的内容不可见`).not.toBeNull();
  if (!containerBox || !childBox) return;

  expect(childBox.x, `${label} 越过容器左边界`).toBeGreaterThanOrEqual(containerBox.x);
  expect(childBox.y, `${label} 越过容器上边界`).toBeGreaterThanOrEqual(containerBox.y);
  expect(childBox.x + childBox.width, `${label} 越过容器右边界`).toBeLessThanOrEqual(
    containerBox.x + containerBox.width,
  );
  expect(childBox.y + childBox.height, `${label} 越过容器下边界`).toBeLessThanOrEqual(
    containerBox.y + containerBox.height,
  );
}

export async function expectStackedAbove(
  upper: Locator,
  lower: Locator,
  label: string,
  minimumGap = 4,
) {
  const upperBox = await upper.boundingBox();
  const lowerBox = await lower.boundingBox();
  expect(upperBox, `${label} 的上方区域不可见`).not.toBeNull();
  expect(lowerBox, `${label} 的下方区域不可见`).not.toBeNull();
  if (!upperBox || !lowerBox) return;

  expect(
    lowerBox.y - (upperBox.y + upperBox.height),
    `${label} 的垂直间距不足`,
  ).toBeGreaterThanOrEqual(minimumGap);
}

export async function expectCenteredHorizontally(
  container: Locator,
  items: Locator,
  label: string,
  tolerance = 20,
) {
  const containerBox = await container.boundingBox();
  const boxes = await items.evaluateAll((elements) =>
    elements.map((element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right };
    }),
  );
  expect(containerBox, `${label} 的容器不可见`).not.toBeNull();
  expect(boxes.length, `${label} 没有可见项目`).toBeGreaterThan(0);
  if (!containerBox || boxes.length === 0) return;

  const contentLeft = Math.min(...boxes.map(({ left }) => left));
  const contentRight = Math.max(...boxes.map(({ right }) => right));
  const leftGap = contentLeft - containerBox.x;
  const rightGap = containerBox.x + containerBox.width - contentRight;
  expect(Math.abs(leftGap - rightGap), `${label} 没有水平居中`).toBeLessThanOrEqual(
    tolerance,
  );
}

export async function expectLoadedLocalArtwork(
  artwork: Locator,
  label: string,
  minimumWidth: number,
  minimumHeight: number,
) {
  await expect(artwork, `${label} 不可见`).toBeVisible();
  const details = await artwork.evaluate((image) => {
    if (!(image instanceof HTMLImageElement)) throw new Error('素材目标不是图片');
    const box = image.getBoundingClientRect();
    return {
      src: image.getAttribute('src') ?? '',
      width: box.width,
      height: box.height,
      naturalWidth: image.naturalWidth,
      naturalHeight: image.naturalHeight,
      complete: image.complete,
    };
  });
  expect(details.src, `${label} 不是本地素材`).toMatch(/^\/assets\//);
  expect(details.complete, `${label} 尚未完成加载`).toBe(true);
  expect(details.naturalWidth, `${label} 解码失败`).toBeGreaterThan(0);
  expect(details.naturalHeight, `${label} 解码失败`).toBeGreaterThan(0);
  expect(details.width, `${label} 宽度不足`).toBeGreaterThanOrEqual(minimumWidth);
  expect(details.height, `${label} 高度不足`).toBeGreaterThanOrEqual(minimumHeight);
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
