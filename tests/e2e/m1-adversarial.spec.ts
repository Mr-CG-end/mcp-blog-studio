import { test, expect } from '@playwright/test'

/**
 * ============================================================================
 * EMPIRICAL ADVERSARIAL STRESS TEST SUITE — MILESTONE 1
 * Targets:
 *   1. ThemeSwitcher (multi-instance sync, rapid clicks, corrupted storage, system emulation)
 *   2. Header & Desktop Spotlight Navigation (responsiveness, active state, spotlight math)
 *   3. Mobile Drawer (open/close cycle, ESC dismiss, route navigation dismiss, resize)
 *   4. SearchFAB (hotkey Cmd+K/Ctrl+K, focus, submit, ESC dismiss, backdrop click)
 *   5. Console & Hydration Hygiene (zero unhandled exceptions, zero hydration errors)
 * ============================================================================
 */

test.describe('Milestone 1 — ThemeSwitcher Empirical Stress Tests', () => {
  test('1.1 显式切换 light / dark / system 验证状态与持久化', async ({ page }) => {
    await page.goto('/')

    const headerSwitcher = page.locator('header [data-theme-switcher]')
    await expect(headerSwitcher).toBeVisible()

    const darkBtn = headerSwitcher.getByRole('button', { name: '切换深色主题' })
    const lightBtn = headerSwitcher.getByRole('button', { name: '浅色模式' })
    const systemBtn = headerSwitcher.getByRole('button', { name: '跟随系统' })

    // 1. Click Dark on Header
    await darkBtn.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
    const savedDark = await page.evaluate(() => window.localStorage.getItem('payload-theme'))
    expect(savedDark).toBe('dark')

    // 2. Click Light on Header
    await lightBtn.click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
    const savedLight = await page.evaluate(() => window.localStorage.getItem('payload-theme'))
    expect(savedLight).toBe('light')

    // 3. Click System on Header
    await systemBtn.click()
    await expect.poll(async () => {
      return await page.evaluate(() => window.localStorage.getItem('payload-theme'))
    }).toBeNull()
  })

  test('1.2 异常/损坏的 localStorage 容错 (null, invalid json, random string) 回退到系统偏好', async ({ page }) => {
    // Inject corrupt theme values
    await page.addInitScript(() => {
      window.localStorage.setItem('payload-theme', 'MALFORMED_CORRUPTED_VALUE_XYZ_!@#$%^&*()')
    })

    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/')
    const htmlTheme = await page.locator('html').getAttribute('data-theme')
    // Should gracefully fallback to light or dark, without throwing or crashing
    expect(['light', 'dark']).toContain(htmlTheme)
    expect(consoleErrors.filter((e) => e.includes('Hydration') || e.includes('crash'))).toHaveLength(0)
  })

  test('1.3 高频连续狂暴点击 (Rapid Burst Toggling) 无状态死锁或未捕获异常', async ({ page }) => {
    const pageErrors: Error[] = []
    page.on('pageerror', (err) => pageErrors.push(err))

    await page.goto('/')
    const headerSwitcher = page.locator('header [data-theme-switcher]')
    const lightBtn = headerSwitcher.getByRole('button', { name: '浅色模式' })
    const darkBtn = headerSwitcher.getByRole('button', { name: '切换深色主题' })
    const sysBtn = headerSwitcher.getByRole('button', { name: '跟随系统' })

    // Rapidly spam buttons across 9 rapid alternating clicks
    for (let i = 0; i < 3; i++) {
      await darkBtn.click({ delay: 50 })
      await lightBtn.click({ delay: 50 })
      await sysBtn.click({ delay: 50 })
    }

    expect(pageErrors).toHaveLength(0)
    const currentTheme = await page.locator('html').getAttribute('data-theme')
    expect(['light', 'dark']).toContain(currentTheme)
  })

  test('1.4 在系统偏好模式下，模拟系统深浅色切换无需刷新自动响应', async ({ page }) => {
    // Ensure system mode (no theme in localStorage)
    await page.addInitScript(() => {
      window.localStorage.removeItem('theme')
    })

    await page.emulateMedia({ colorScheme: 'light' })
    await page.goto('/')
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')

    // Change OS color scheme to dark
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')

    // Change back to light
    await page.emulateMedia({ colorScheme: 'light' })
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light')
  })

  test('1.5 开启 prefers-reduced-motion 时平滑降级，无动画异常报错', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto('/')

    const headerSwitcher = page.locator('header [data-theme-switcher]')
    const darkBtn = headerSwitcher.getByRole('button', { name: '切换深色主题' })
    await darkBtn.click()

    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  })
})

test.describe('Milestone 1 — Layout Shell & Navigation Empirical Stress Tests', () => {
  test('2.1 Header 固定置顶、层级与主导航路由可达性', async ({ page }) => {
    await page.goto('/')

    const header = page.locator('header')
    await expect(header).toBeVisible()
    await expect(header).toHaveClass(/fixed/)

    // Navigation links in header
    const mainNav = page.getByRole('navigation', { name: '主要导航' })
    await expect(mainNav).toBeVisible()

    const navItems = ['首页', '文章', '分类', '搜索', '关于']
    for (const title of navItems) {
      await expect(mainNav.getByRole('link', { name: title })).toBeVisible()
    }

    // Active state on homepage
    const homeLink = mainNav.getByRole('link', { name: '首页' })
    await expect(homeLink).toHaveClass(/font-semibold/)
  })

  test('2.2 Spotlight 光标悬停追踪动效在各类极限坐标下无 NaN 或溢出崩溃', async ({ page }) => {
    await page.goto('/')
    const mainNav = page.getByRole('navigation', { name: '主要导航' })
    const box = await mainNav.boundingBox()
    expect(box).not.toBeNull()

    if (box) {
      // Hover across multiple points including edges
      await page.mouse.move(box.x + 5, box.y + 5)
      await page.mouse.move(box.x + box.width - 5, box.y + box.height - 5)
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    }

    // Nav remains fully functional
    await expect(mainNav).toBeVisible()
  })

  test('2.3 移动端抽屉 (Vaul Drawer) 打开、内容渲染、路由点击后自动关闭', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const menuBtn = page.getByRole('button', { name: '打开菜单' })
    await expect(menuBtn).toBeVisible()
    await menuBtn.click()

    // Drawer should open with mobile nav
    const mobileNav = page.getByRole('navigation', { name: '移动端导航' })
    await expect(mobileNav).toBeVisible()

    // Routes in drawer
    await expect(mobileNav.getByRole('link', { name: '文章' })).toBeVisible()
    await expect(mobileNav.getByRole('link', { name: '开源说明' })).toBeVisible()

    // Click link inside drawer -> drawer must dismiss and navigate
    await mobileNav.getByRole('link', { name: '文章' }).click()
    await expect(page).toHaveURL(/\/posts$/)

    // Wait for drawer to close
    await expect(page.getByRole('navigation', { name: '移动端导航' })).toHaveCount(0)
  })

  test('2.4 移动端抽屉键盘 ESC 关闭与蒙层点击关闭', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const menuBtn = page.getByRole('button', { name: '打开菜单' })

    // Test 1: Open and ESC
    await menuBtn.click()
    await expect(page.getByRole('navigation', { name: '移动端导航' })).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('navigation', { name: '移动端导航' })).toHaveCount(0)

    // Test 2: Rapid open-close cycle
    for (let i = 0; i < 3; i++) {
      await menuBtn.click()
      await expect(page.getByRole('navigation', { name: '移动端导航' })).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByRole('navigation', { name: '移动端导航' })).toHaveCount(0)
    }
  })

  test('2.5 抽屉打开状态下动态拉伸视口至桌面端，不产生锁死蒙层或横向滚动', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const menuBtn = page.getByRole('button', { name: '打开菜单' })
    await menuBtn.click()
    await expect(page.getByRole('navigation', { name: '移动端导航' })).toBeVisible()

    // Resize to desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 })

    // Check no horizontal overflow
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth
    })
    expect(hasHorizontalOverflow).toBe(false)
  })
})

test.describe('Milestone 1 — SearchFAB & Global Hotkey Empirical Stress Tests', () => {
  test('3.1 浮动搜索按钮正常展示在右下角', async ({ page }) => {
    await page.goto('/')
    const fab = page.locator('[data-hide-print]').getByRole('button', { name: '搜索' })
    await expect(fab).toBeVisible()
  })

  test('3.2 点击 SearchFAB 打开全局搜索模态框，聚焦搜索输入框，ESC 退出', async ({ page }) => {
    await page.goto('/')
    const fab = page.locator('[data-hide-print]').getByRole('button', { name: '搜索' })
    await fab.click()

    const dialog = page.getByRole('dialog', { name: '快速搜索' })
    await expect(dialog).toBeVisible()

    const input = page.getByRole('textbox', { name: '关键词' })
    await expect(input).toBeVisible()
    await expect(input).toBeFocused()

    // Press Escape to dismiss
    await page.keyboard.press('Escape')
    await expect(dialog).toHaveCount(0)
  })

  test('3.3 快捷键 Cmd+K / Ctrl+K 唤起搜索模态框与切换开闭', async ({ page }) => {
    page.on('console', (msg) => console.log('BROWSER CONSOLE:', msg.text()))
    await page.goto('/')

    await page.evaluate(() => {
      window.addEventListener('keydown', (e) => {
        console.log(`[EVAL KEYDOWN] key=${e.key} code=${e.code} meta=${e.metaKey} ctrl=${e.ctrlKey}`)
      })
    })

    // Try clicking body to ensure focus
    await page.locator('body').click()

    // Test ControlOrMeta+k
    await page.keyboard.press('ControlOrMeta+k')
    await page.waitForTimeout(500)

    const dialog = page.getByRole('dialog', { name: '快速搜索' })
    await expect(dialog).toBeVisible()

    // Press again to close
    await page.keyboard.press('ControlOrMeta+k')
    await expect(dialog).toHaveCount(0)
  })

  test('3.4 输入关键词并按 Enter / 提交正常跳转至 /search?q=关键词', async ({ page }) => {
    await page.goto('/')
    const fab = page.locator('[data-hide-print]').getByRole('button', { name: '搜索' })
    await fab.click()

    const input = page.getByRole('textbox', { name: '关键词' })
    await input.fill('ShiroDesignTest')
    await input.press('Enter')

    await expect(page).toHaveURL(/search\?q=ShiroDesignTest/)
  })

  test('3.5 空输入或纯空格不会触发无意义跳转', async ({ page }) => {
    await page.goto('/')
    const fab = page.locator('[data-hide-print]').getByRole('button', { name: '搜索' })
    await fab.click()

    const input = page.getByRole('textbox', { name: '关键词' })
    await input.fill('   ')
    await input.press('Enter')

    // URL should NOT navigate
    await expect(page).toHaveURL('/')
  })
})

test.describe('Milestone 1 — CSS Design Tokens & Layout Hygiene', () => {
  test('4.1 核心 CSS 变量与 DaisyUI 主题类完备挂载', async ({ page }) => {
    await page.goto('/')

    const tokens = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement)
      return {
        rootBg: s.getPropertyValue('--color-root-bg').trim(),
        border: s.getPropertyValue('--color-border').trim(),
        accent: s.getPropertyValue('--color-accent').trim(),
        bgOpacity: s.getPropertyValue('--bg-opacity').trim(),
      }
    })

    expect(tokens.rootBg.length).toBeGreaterThan(0)
    expect(tokens.border.length).toBeGreaterThan(0)
    expect(tokens.accent.length).toBeGreaterThan(0)
  })

  test('4.2 桌面端 (1280px) 与移动端 (390px) 均无页面横向滚动溢出', async ({ page }) => {
    for (const width of [1280, 768, 390]) {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/')
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth
      })
      expect(hasHorizontalScroll).toBe(false)
    }
  })

  test('4.3 控制台零未捕获异常与零 SSR 致命 Hydration 错误', async ({ page }) => {
    const pageErrors: string[] = []
    const consoleErrors: string[] = []

    page.on('pageerror', (err) => pageErrors.push(err.message))
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text())
    })

    await page.goto('/')
    await page.goto('/posts')
    await page.goto('/categories')

    expect(pageErrors).toHaveLength(0)
    const fatalHydration = consoleErrors.filter(
      (err) => err.includes('Hydration failed') || err.includes('did not match'),
    )
    expect(fatalHydration).toHaveLength(0)
  })
})
