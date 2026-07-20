import { expect, test } from '@playwright/test';

test('档案重置可一步恢复，永久删除必须输入精确档案名', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  await page.getByRole('button', { name: '在此建档' }).first().click();
  await page.getByLabel('档案名').fill('恢复验收人');
  await page.getByRole('button', { name: '落印建档' }).click();
  await page.getByRole('button', { name: '暂时跳过教程' }).click();
  await expect(page.getByRole('button', { name: '重温教程' })).toBeVisible();

  await page.getByRole('button', { name: '档案维护' }).click();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: '重置当前档案' }).click();
  await expect(
    page.getByRole('heading', { name: '要先走一遍八步入门吗？' }),
  ).toBeVisible();

  await page.getByRole('button', { name: '档案维护' }).click();
  page.once('dialog', (dialog) => void dialog.accept());
  await page.getByRole('button', { name: '恢复上次档案操作' }).click();
  await expect(page.getByRole('button', { name: '重温教程' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '要先走一遍八步入门吗？' })).toHaveCount(
    0,
  );

  await page.getByRole('button', { name: '档案维护' }).click();
  const deleteButton = page.getByRole('button', { name: '永久删除档案' });
  await page.getByLabel('输入档案名以确认').fill('恢复验收');
  await expect(deleteButton).toBeDisabled();
  await page.getByLabel('输入档案名以确认').fill('恢复验收人');
  await expect(deleteButton).toBeEnabled();
  page.once('dialog', (dialog) => void dialog.accept());
  await deleteButton.click();
  await expect(page.getByText('三方戏台，三份命数')).toBeVisible();
  await expect(page.getByText('恢复验收人')).toHaveCount(0);
});
