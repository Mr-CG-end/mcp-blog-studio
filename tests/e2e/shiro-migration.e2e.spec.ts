import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
const fixture = {} as {
  slug: string
  draftSlug: string
  prefix: string
}
test.beforeAll(() => {
  Object.assign(fixture, JSON.parse(readFileSync('/tmp/shiro-browser-fixture.json', 'utf8')))
})

test('公开页面：唯一 main、正确响应、无横向溢出和运行异常', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    for (const route of [
      '/',
      '/posts',
      '/categories',
      '/categories/technology',
      '/search?q=自动化',
      '/about',
      '/credits',
      `/posts/${fixture.slug}`,
    ]) {
      const res = await page.goto(route)
      expect(res?.status(), route).toBe(200)
      await expect(page.locator('main')).toHaveCount(1)
      await expect(page.locator('#main-content')).toHaveCount(1)
      await expect(page.locator('main h1')).toBeVisible()
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
        route,
      ).toBe(true)
    }
  }
  expect(errors).toEqual([])
})

test('原版首页文章流、分类索引和文章导航', async ({ page }) => {
  await page.goto('/')
  await page.locator('#recent-posts').scrollIntoViewIfNeeded()
  await expect(
    page.locator('#recent-posts').getByRole('heading', { name: '最近文章' }),
  ).toBeVisible()
  await expect(page.locator('#recent-posts a[href^="/posts/"]').first()).toBeVisible()
  await page.goto('/categories')
  await page.getByRole('main').getByRole('link', { name: '技术手记', exact: true }).click()
  await expect(page).toHaveURL(/categories\/technology$/)
  await page.locator('main a[href="/posts/welcome"]').click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('从这里开始，记录每一次探索')
})

test('搜索面板：空键盘、真实结果、关闭和错误反馈', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '快速搜索', exact: true }).click()
  const panel = page.getByRole('dialog', { name: '快速搜索', exact: true })
  await expect(panel).toBeVisible()
  const input = panel.getByRole('textbox', { name: '关键词' })
  await input.press('ArrowDown')
  await input.press('Enter')
  await expect(panel).toBeVisible()
  await input.fill('自动化')
  await expect(panel.getByRole('link', { name: /让日常工作更轻松的小工具/ })).toBeVisible()
  await input.press('Enter')
  await expect(page).toHaveURL(/\/posts\/small-tools$/)
  await expect(panel).not.toBeVisible()
  await page.getByRole('button', { name: '快速搜索', exact: true }).click()
  await panel.getByRole('textbox', { name: '关键词' }).fill('no-such-word-539854351')
  await expect(panel.getByText('没有找到相关文章')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(panel).not.toBeVisible()
  await expect(page.getByRole('button', { name: '快速搜索', exact: true })).toBeFocused()
  await page.route('**/api/search?*', (route) => route.fulfill({ status: 503, body: '{}' }))
  await page.getByRole('button', { name: '快速搜索', exact: true }).click()
  await panel.getByRole('textbox', { name: '关键词' }).fill('失败')
  await expect(panel.getByText('搜索暂时不可用，请稍后重试。')).toBeVisible()
})

test('移动导航与明暗主题持久化', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: '打开菜单', exact: true }).click()
  const nav = page.getByRole('navigation', { name: '移动端导航' })
  await expect(nav).toBeVisible()
  await nav.getByRole('button', { name: '切换深色主题', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await nav.getByRole('link', { name: '分类', exact: true }).click()
  await expect(page).toHaveURL(/\/categories$/)
  await expect(nav).not.toBeVisible()
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.goto('/search?q=自动化')
  const inputColors = await page.getByRole('textbox', { name: '关键词' }).evaluate((el) => {
    const style = getComputedStyle(el)
    return { background: style.backgroundColor, foreground: style.color }
  })
  expect(inputColors.background).not.toBe('rgb(255, 255, 255)')
  expect(inputColors.background).not.toBe(inputColors.foreground)
  await page.getByRole('button', { name: '浅色模式', exact: true }).click()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
})

test('真实 Lexical：重复标题锚点、目录跳转、阅读进度、代码块、移动目录', async ({ page }) => {
  await page.goto(`/posts/${fixture.slug}`)
  const headings = page.locator('[data-article-content] h2, [data-article-content] h3')
  await expect(headings).toHaveCount(3)
  const ids = await headings.evaluateAll((es) => es.map((e) => e.id))
  expect(ids.every(Boolean)).toBe(true)
  expect(new Set(ids).size).toBe(3)
  const nav = page.getByRole('navigation', { name: '文章目录', exact: true })
  await expect(nav.getByRole('link')).toHaveCount(3)
  await nav.getByRole('link').last().click()
  await expect(page).toHaveURL(new RegExp(encodeURIComponent(ids[2])))
  await expect(page.locator('.code-panel')).toContainText('const shiro')
  await page.context().grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.getByRole('button', { name: /复制/ }).click()
  await expect
    .poll(() => page.evaluate(() => navigator.clipboard.readText()))
    .toBe('const shiro = "Payload";')
  await expect
    .poll(() =>
      page
        .locator('[data-reading-indicator] > div')
        .evaluate((e) => parseFloat((e as HTMLElement).style.height)),
    )
    .toBeGreaterThan(0)
  await page.reload()
  expect(await headings.evaluateAll((es) => es.map((e) => e.id))).toEqual(ids)
  await page.setViewportSize({ width: 390, height: 844 })
  await page.getByRole('button', { name: '打开目录' }).click()
  const mobileToc = page.getByRole('navigation', { name: '移动文章目录' })
  await expect(mobileToc).toBeVisible()
  await expect(mobileToc.getByRole('link')).toHaveCount(3)
  await mobileToc.getByRole('link').first().click()
  await expect(mobileToc).not.toBeVisible()
})

test('草稿不可被匿名搜索或详情访问；后台隔离', async ({ page, request }) => {
  const res = await request.get(`/api/search?q=${encodeURIComponent('Shiro 临时验收')}`)
  expect(res.ok()).toBe(true)
  const result = await res.json()
  expect(result.results.some((p: { url: string }) => p.url.endsWith(fixture.slug))).toBe(true)
  expect(result.results.some((p: { url: string }) => p.url.endsWith(fixture.draftSlug))).toBe(false)
  const draft = await page.goto(`/posts/${fixture.draftSlug}`)
  expect(draft?.status()).toBe(404)
  await page.goto('/admin/login')
  await expect(page.locator('#field-email')).toBeVisible()
  await expect(page.locator('#field-password')).toBeVisible()
  await expect(page.locator('[data-shiro-header]')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '快速搜索', exact: true })).toHaveCount(0)
})

test('旧分页重定向与无效分类', async ({ page }) => {
  await page.goto('/posts/page/2')
  await expect(page).toHaveURL(/\/posts\?page=2$/)
  const res = await page.goto('/categories/no-such-category-457843')
  expect(res?.status()).toBe(404)
  await expect(page.getByRole('heading', { name: '页面不存在' })).toBeVisible()
})
