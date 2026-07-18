import { expect, test } from '@playwright/test';

const FAMILY_LABELS = [
  '起始牌组',
  '难度注',
  '挑战',
  '木牌',
  '纸戏牌',
  '星象牌',
  '灵戏牌',
  '戏签',
  '盲注',
  '卡包',
  '镶饰',
  '封印',
  '版式',
] as const;

test('230 项审计目录仅加载本地素材且每个家族都有 1280×720 画面证据', async ({
  page,
}, testInfo) => {
  const remoteRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4173') remoteRequests.push(request.url());
  });
  await page.goto('/?catalog-audit=1');
  await expect(page.getByTestId('catalog-audit-screen')).toBeVisible();
  await page.evaluate(() => document.fonts.ready);

  const contentIds = new Set<string>();
  const focalKeys = new Set<string>();
  for (;;) {
    const cards = page.getByTestId('catalog-card');
    const count = await cards.count();
    for (let index = 0; index < count; index += 1) {
      const card = cards.nth(index);
      contentIds.add((await card.getAttribute('data-content-id')) ?? '');
      focalKeys.add(
        (await card.locator('[data-focal-key]').getAttribute('data-focal-key')) ?? '',
      );
      await expect(card.locator('img')).toHaveJSProperty('complete', true);
      expect(
        await card
          .locator('img')
          .evaluate((image: HTMLImageElement) => image.naturalWidth),
      ).toBeGreaterThan(0);
    }
    const next = page.getByRole('button', { name: '下一页' });
    if (await next.isDisabled()) break;
    await next.click();
  }

  expect(contentIds.size).toBe(230);
  expect(focalKeys.size).toBe(230);
  expect(remoteRequests).toEqual([]);

  for (const label of FAMILY_LABELS) {
    await page.getByRole('button', { name: label }).click();
    await expect(page.getByTestId('catalog-card').first()).toBeVisible();
    await testInfo.attach(`catalog-${label}-${testInfo.project.name}`, {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
  }
});
