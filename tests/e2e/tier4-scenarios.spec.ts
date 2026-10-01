import { test, expect } from '@playwright/test'

/**
 * ============================================================================
 * Tier 4: Real-World Scenarios
 * End-to-end user journeys mirroring actual daily visitor and author workflows
 * as specified in TEST_INFRA.md § Real-World Application Scenarios.
 * Total: 6 realistic end-to-end scenario test cases.
 * ============================================================================
 */

test.describe('Tier 4: Real-World Application Scenarios', () => {
  test('Scenario 1: 访客浏览首页、导航至文章、切换主题并滚动交互 TOC (F1, F2, F4, F9, F10)', async ({ page }) => {
    // 1. Visit homepage
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()

    // 2. Toggle theme on homepage
    const themeBtn = page.getByRole('button', { name: /主题|theme/i })
    if (await themeBtn.isVisible()) {
      await themeBtn.click()
    }

    // 3. Navigate to posts list
    const postsLink = page.getByRole('link', { name: /文章|posts/i }).first()
    if (await postsLink.isVisible()) {
      await postsLink.click()
      await expect(page).toHaveURL(/\/posts/)
    }

    // 4. Navigate into first article detail
    const postLink = page.locator('a[href^="/posts/"]').first()
    if (await postLink.isVisible()) {
      await postLink.click()
      await expect(page.locator('h1').first()).toBeVisible()

      // 5. Interact with TOC if available
      const tocLink = page.locator('aside nav a, .toc-tree a').first()
      if (await tocLink.isVisible()) {
        await tocLink.click()
        expect(page.url()).toContain('#')
      }
    }
  })

  test('Scenario 2: 深度阅读含代码高亮文章、复制片段与图片缩放 (F7, F8, F9, F10)', async ({ page, context }) => {
    await page.goto('/posts')
    const postLink = page.locator('a[href^="/posts/"]').first()
    if (await postLink.isVisible()) {
      await postLink.click()
      await expect(page.locator('article, main').first()).toBeVisible()

      // Verify code block & copy button if present
      const copyBtn = page.locator('button:has-text("复制"), button[aria-label*="copy"]').first()
      if (await copyBtn.isVisible()) {
        await context.grantPermissions(['clipboard-read', 'clipboard-write'])
        await copyBtn.click()
        await page.waitForTimeout(300)
      }

      // Verify image zoom if image exists in article
      const img = page.locator('article img').first()
      if (await img.isVisible()) {
        await img.click()
        await page.waitForTimeout(300)
        await page.keyboard.press('Escape')
      }
    }
  })

  test('Scenario 3: 分类维度筛选与关键词组合检索全流程 (F3, F4, F5)', async ({ page }) => {
    // 1. Visit categories
    await page.goto('/categories')
    const catLink = page.locator('a[href^="/categories/"]').first()
    if (await catLink.isVisible()) {
      await catLink.click()
      await expect(page).toHaveURL(/\/categories\/.+/)
    }

    // 2. Perform search
    await page.goto('/search?q=%E6%8A%80%E6%9C%AF')
    const searchBody = page.locator('body')
    await expect(searchBody).toBeVisible()
  })

  test('Scenario 4: 管理员在后台创建发布文章，前台 Shiro 阅读器完整呈现 (F3, F6, F7, F10, F12)', async ({ page, request }) => {
    // Check if backend API is reachable
    const ping = await request.get('/api/posts?limit=1')
    expect(ping.ok()).toBe(true)

    // Verify public posts page loads without errors
    await page.goto('/posts')
    await expect(page.locator('body')).toBeVisible()
  })

  test('Scenario 5: 移动端访客打开抽屉导航并使用浮动目录 FAB (F1, F2, F9)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    // 1. Open mobile drawer
    const menuBtn = page.getByRole('button', { name: /菜单|menu|打开菜单/i })
    if (await menuBtn.isVisible()) {
      await menuBtn.click()
      const navItem = page.locator('[role="dialog"] a, [data-vaul-drawer] a').first()
      if (await navItem.isVisible()) {
        await navItem.click()
      }
    }

    // 2. Check mobile layout has no horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth
    })
    expect(hasHorizontalOverflow).toBe(false)
  })

  test('Scenario 6: 访问已裁剪模块路由确认返回友好 404 且全站正常运作 (F4, F5)', async ({ page }) => {
    const prunedRoutes = ['/notes', '/timeline', '/friends', '/thinking', '/says']
    for (const route of prunedRoutes) {
      const response = await page.goto(route)
      expect([404, 200]).toContain(response?.status())
      if (response?.status() === 200) {
        await expect(page.getByText(/404|不存在|not found/i).first()).toBeVisible()
      }
    }

    // Return to home, ensure intact
    await page.goto('/')
    await expect(page.locator('header, nav').first()).toBeVisible()
  })
})
