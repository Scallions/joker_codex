import { expect, test, type Page } from '@playwright/test';

async function waitUntilMixerSettles(page: Page) {
  await expect(page.getByText('正在落印…')).toHaveCount(0);
}

test('声场在真实手势后开启，设备混音、演出速度与静音跨刷新保留', async ({ page }) => {
  const remoteRequests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.origin !== 'http://127.0.0.1:4173') remoteRequests.push(request.url());
  });

  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  await expect(page.locator('[data-audio-status="locked"]')).toHaveCount(1);

  await page.getByRole('button', { name: '打开声场设置' }).click();
  await expect(page.locator('[data-audio-status="ready"]')).toHaveCount(1, {
    timeout: 20_000,
  });
  const drawer = page.getByRole('dialog', { name: '声场控制台' });
  const master = drawer.getByLabel('总音量');
  const music = drawer.getByLabel('音乐');
  const sfx = drawer.getByLabel('音效');

  await master.fill('0.55');
  await waitUntilMixerSettles(page);
  await music.fill('0.35');
  await waitUntilMixerSettles(page);
  await sfx.fill('0.65');
  await waitUntilMixerSettles(page);
  await drawer.getByRole('button', { name: '利落演出' }).click();
  await waitUntilMixerSettles(page);
  await expect(drawer.getByRole('button', { name: '利落演出' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await drawer.getByRole('button', { name: '收起声场' }).click();

  await page.getByRole('button', { name: '在此建档' }).first().click();
  await page.getByLabel('档案名').fill('声场验收人');
  await page.getByRole('button', { name: '落印建档' }).click();
  await page.getByRole('button', { name: '暂时跳过教程' }).click();
  await page.getByRole('button', { name: '普通战役' }).click();
  await page.getByLabel('演出种子').fill('AUDIO001');
  await page.getByRole('button', { name: '开始普通战役' }).click();
  await page.getByRole('button', { name: '一键静音' }).click();
  await expect(page.getByRole('button', { name: '恢复声场' })).toBeEnabled();

  await page.reload();
  await expect(page.getByRole('heading', { name: '第 1 幕 · 择幕登台' })).toBeVisible();
  await expect(page.getByRole('button', { name: '恢复声场' })).toBeVisible();
  await page.getByRole('button', { name: '打开声场设置' }).click();
  const restoredDrawer = page.getByRole('dialog', { name: '声场控制台' });
  await expect(restoredDrawer.getByLabel('总音量')).toHaveValue('0.55');
  await expect(restoredDrawer.getByLabel('音乐')).toHaveValue('0.35');
  await expect(restoredDrawer.getByLabel('音效')).toHaveValue('0.65');
  await expect(restoredDrawer.getByRole('button', { name: '利落演出' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(restoredDrawer.getByText('总场已静音，原音量仍保留')).toBeVisible();
  await restoredDrawer.getByRole('button', { name: '收起声场' }).click();

  await page.getByRole('button', { name: '恢复声场' }).click();
  await expect(page.getByRole('button', { name: '一键静音' })).toBeEnabled();
  await page.getByRole('button', { name: '打开声场设置' }).click();
  await expect(page.getByRole('dialog').getByLabel('总音量')).toHaveValue('0.55');
  expect(remoteRequests).toEqual([]);
});

test('本地音频读取失败只让声场静默，建档与导航仍可继续', async ({ page }) => {
  await page.route('**/assets/presentation/audio/*.wav', (route) => route.abort());
  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  await page.getByRole('button', { name: '打开声场设置' }).click();
  await expect(page.locator('[data-audio-status="error"]')).toContainText(
    '声场暂时静默，牌局仍可继续',
  );
  await page.getByRole('button', { name: '收起声场' }).click();

  await page.getByRole('button', { name: '在此建档' }).first().click();
  await page.getByLabel('档案名').fill('静默验收人');
  await page.getByRole('button', { name: '落印建档' }).click();
  await expect(page.getByRole('heading', { name: '今晚演哪一出' })).toBeVisible();
});
