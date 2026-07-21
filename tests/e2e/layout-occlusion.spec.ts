import { expect, test, type Page } from '@playwright/test';

import {
  expectInsideStage,
  expectNoOuterScroll,
  expectSeparated,
  layoutZone,
} from './helpers/layoutGeometry';

const VIEWPORTS = [
  { width: 1280, height: 720 },
  { width: 1920, height: 1080 },
] as const;

async function createOrdinaryTable(page: Page) {
  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  await page.getByRole('button', { name: '在此建档' }).first().click();
  await page.getByLabel('档案名').fill('布局验收人');
  await page.getByRole('button', { name: '落印建档' }).click();
  await page.getByRole('button', { name: '暂时跳过教程' }).click();
  await page.getByRole('button', { name: '普通战役' }).click();
  await page.getByLabel('演出种子').fill('LAYOUT01');
  await page.getByRole('button', { name: '开始普通战役' }).click();
  await page.getByRole('button', { name: '登台应战' }).click();
  await expect(page.getByRole('button', { name: '出牌' })).toBeVisible();
  const performer = page.getByRole('button', { name: '落定演出，显示已提交结果' });
  if (await performer.isVisible()) await performer.click();
  await page.mouse.move(640, 240);
  await page.waitForTimeout(500);
}

async function assertTableGeometry(page: Page) {
  const audio = layoutZone(page, 'audio-controls');
  const status = layoutZone(page, 'playing-status');
  const navigation = layoutZone(page, 'playing-navigation');
  const inventory = layoutZone(page, 'table-inventory');
  const ledger = layoutZone(page, 'table-ledger');
  const center = layoutZone(page, 'table-center');
  const hand = layoutZone(page, 'table-hand');
  const actions = layoutZone(page, 'table-actions');

  for (const [label, locator] of [
    ['声场控制', audio],
    ['状态提示', status],
    ['牌局导航', navigation],
    ['奇牌栏', inventory],
    ['八幕账簿', ledger],
    ['中央戏台', center],
    ['手牌区', hand],
    ['出弃牌区', actions],
  ] as const) {
    await expectInsideStage(page, locator, label);
  }

  await expectSeparated(audio, inventory, '声场控制 / 百戏奇牌与奇牌栏');
  await expectSeparated(status, inventory, '状态提示 / 奇牌栏');
  await expectSeparated(navigation, inventory, '牌局导航 / 奇牌栏');
  await expectSeparated(inventory, ledger, '奇牌栏 / 八幕账簿');
  await expectSeparated(inventory, center, '奇牌栏 / 中央戏台');
  await expectSeparated(ledger, hand, '八幕账簿 / 手牌区');
  await expectSeparated(center, hand, '中央戏台 / 手牌区');
  await expectSeparated(
    page.locator('[data-score-status]'),
    page.locator('[data-hand-meta="true"]'),
    '计分印章文案 / 手牌提示',
  );
  await expectSeparated(hand, actions, '手牌区 / 出弃牌区');
  await expectSeparated(
    ledger,
    page.getByRole('button', { name: '按点数' }),
    '八幕账簿 / 按点数',
  );
  await expectSeparated(
    ledger,
    page.getByTestId('playing-card').first(),
    '八幕账簿 / 第一张手牌',
  );
  await expectNoOuterScroll(page);
}

test('牌桌固定区域在两档桌面视口互不遮挡', async ({ page }) => {
  await createOrdinaryTable(page);
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(250);
    await assertTableGeometry(page);
  }
});

test('教程提示留在顶栏且详细讲解是明确模态层', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '在此建档' }).first().click();
  await page.getByLabel('档案名').fill('教程布局人');
  await page.getByRole('button', { name: '落印建档' }).click();
  await page.getByRole('button', { name: '开始八步教程' }).click();

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    await expectSeparated(
      layoutZone(page, 'playing-status'),
      page.getByRole('heading', { name: '第 1 幕 · 择幕登台' }),
      '教程提示 / 盲注标题',
    );
    await expectNoOuterScroll(page);
  }

  await page.getByRole('button', { name: '查看讲解' }).click();
  await expect(page.locator('[data-layout-overlay="tutorial-detail"]')).toBeVisible();
  await expect(page.getByRole('dialog', { name: '先看盲注' })).toBeVisible();
  await page.getByRole('button', { name: '关闭讲解' }).click();
  await expect(page.locator('[data-layout-overlay="tutorial-detail"]')).toHaveCount(0);
});
