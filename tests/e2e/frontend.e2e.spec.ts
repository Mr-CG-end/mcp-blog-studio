import { test, expect } from '@playwright/test'
test('浏览首页、文章、分类和搜索', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'MCP Blog Studio', exact: true })).toBeVisible()
  await page.getByRole('link', { name: '技术手记', exact: true }).first().click()
  await expect(page).toHaveURL(/categories\/technology/)
  await page.getByRole('link', { name: '从这里开始，记录每一次探索', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('从这里开始，记录每一次探索')
  await page.getByRole('link', { name: '搜索', exact: true }).click()
  await page.getByRole('textbox', { name: '关键词' }).fill('自动化')
  await page.getByRole('button', { name: '搜索', exact: true }).click()
  await expect(page.getByRole('link', { name: '让日常工作更轻松的小工具' })).toBeVisible()
})
test('移动端页面没有横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('主题切换持久化、移动菜单、空搜索及 404', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '切换深色主题' }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '打开菜单' }).click()
  await page
    .getByRole('navigation', { name: '移动端导航' })
    .getByRole('link', { name: '文章' })
    .click()
  await expect(page).toHaveURL(/\/posts$/)
  await expect(page.getByRole('navigation', { name: '移动端导航' })).toHaveCount(0)
  await page.goto('/search?q=不存在的关键词987654321')
  await expect(page.getByText('共 0 篇文章')).toBeVisible()
  await page.goto('/posts/does-not-exist-987654321')
  await expect(page.getByRole('heading', { name: '页面不存在' })).toBeVisible()
})

test('提供源码包与许可入口', async ({ page }) => {
  await page.goto('/credits')
  const response = await page.request.get('/source/blog-source.tar.gz')
  expect(response.ok()).toBeTruthy()
  expect((await response.body()).length).toBeGreaterThan(10000)
  await expect(page.getByRole('heading', { name: '开源说明' })).toBeVisible()
})
