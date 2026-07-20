import { expect, test } from '@playwright/test';

const ENSEMBLE_LABELS = [
  '主台笑匠',
  '面具幻术',
  '幕后机关',
  '乐舞杂技',
  '夜场精怪',
  '造化秘戏',
  '失序机关',
  '云路贵客',
  '夜市账房',
  '异兽散场',
  '铜线急报',
  '四色巡游',
  '镜局重台',
  '百相压轴',
  '星火终章',
] as const;

test('150 张奇牌均由本地审定素材解码，并为十五个班目留下画面证据', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  const remoteRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4173') remoteRequests.push(request.url());
  });

  await page.goto('/?catalog-audit=jokers');
  await expect(page.getByTestId('catalog-audit-screen')).toBeVisible();
  await expect(page.getByRole('heading', { name: '奇牌图鉴总账' })).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const contentIds = new Set<string>();
  const focalKeys = new Set<string>();
  for (;;) {
    const cards = page.getByTestId('catalog-card');
    await expect(cards).toHaveCount(10);
    for (let index = 0; index < 10; index += 1) {
      const card = cards.nth(index);
      const image = card.locator('img');
      contentIds.add((await card.getAttribute('data-content-id')) ?? '');
      focalKeys.add((await image.getAttribute('data-focal-key')) ?? '');
      await expect(image).toHaveJSProperty('complete', true);
      expect(
        await image.evaluate((element: HTMLImageElement) => element.naturalWidth),
      ).toBe(768);
      expect(
        await image.evaluate((element: HTMLImageElement) => element.naturalHeight),
      ).toBe(1024);
    }
    const next = page.getByRole('button', { name: '下一页' });
    if (await next.isDisabled()) break;
    await next.click();
  }

  expect(contentIds.size).toBe(150);
  expect(focalKeys.size).toBe(150);
  expect(remoteRequests).toEqual([]);

  for (const label of ENSEMBLE_LABELS) {
    await page.getByRole('button', { name: label }).click();
    await expect(page.getByTestId('catalog-card')).toHaveCount(10);
    await expect(page.getByText(`${label} · 10 项`)).toBeVisible();
    await testInfo.attach(`joker-catalog-${label}-${testInfo.project.name}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
  }
});
