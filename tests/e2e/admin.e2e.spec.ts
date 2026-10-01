import { test, expect } from '@playwright/test'
test('后台登录页可用且不展示 MCP 入口', async ({ page }) => {
  await page.goto('/admin/login')
  await expect(page.locator('#field-email')).toBeVisible()
  await expect(page.locator('#field-password')).toBeVisible()
  await expect(page.getByText('账号由管理员创建', { exact: false })).toBeVisible()
})
