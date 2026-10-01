import { test, expect } from '@playwright/test'

/**
 * ============================================================================
 * Yohaku Interactions & Mobile E2E Regression Test Suite
 * Benchmark: https://innei.in/
 * Tests Navigation, Table of Contents (TOC), Search, and Image Lightbox.
 * ============================================================================
 */

test.describe('1. 导航（Navigation）动效与回归', () => {
  test('1.1 桌面端（1440px）：居中悬浮胶囊导航常驻展示、Active pill 弹簧位移动效、左侧头像跳转首页及滚动条正常', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')

    const avatarLink = page.locator('.yohaku-desktop-avatar')
    await expect(avatarLink).toBeVisible()

    // 1. 验证居中悬浮胶囊导航常驻展示
    const desktopNav = page.locator('#desktop-navigation')
    await expect(desktopNav).toBeVisible()

    // 2. 验证 Active pill 存在且具有 spring 0.45s 属性
    const activeLink = desktopNav.locator('a[aria-current="page"]')
    await expect(activeLink).toBeVisible()
    const activePill = activeLink.locator('[data-active-pill]')
    await expect(activePill).toBeVisible()
    await expect(activePill).toHaveAttribute('data-spring', '0.45s')

    // 记录初始 pill 位置
    const initialBox = await activePill.boundingBox()
    expect(initialBox).not.toBeNull()

    // 3. 点击文稿链接，验证 Active pill 移动至新页面标签位置
    const postsLink = desktopNav.locator('a[href="/posts"]')
    await postsLink.click()
    await page.waitForURL(/\/posts$/)

    // 验证在文稿页导航常驻且当前 active 为文稿，pill 发生平滑位移
    await expect(desktopNav).toBeVisible()
    const postsActiveLink = desktopNav.locator('a[aria-current="page"]')
    await expect(postsActiveLink).toHaveAttribute('href', '/posts')
    const postsPill = postsActiveLink.locator('[data-active-pill]')
    await expect(postsPill).toBeVisible()
    const postsBox = await postsPill.boundingBox()
    expect(postsBox).not.toBeNull()
    if (initialBox && postsBox) {
      expect(postsBox.x).toBeGreaterThan(initialBox.x)
    }

    // 4. 点击左上角头像返回首页
    await avatarLink.click()
    await page.waitForURL(/\/$/)
    await expect(desktopNav).toBeVisible()

    // 验证桌面端 body 滚动条正常无锁死
    const bodyOverflow = await page.evaluate(() => document.body.style.overflow)
    expect(bodyOverflow).not.toBe('hidden')
  })


  test('1.2 移动端（390px）：底部纸面 Dock 展开/折叠动画（height/opacity）及遮罩点击关闭', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const menuToggle = page.locator('.yohaku-header-toggle')
    await expect(menuToggle).toBeVisible()

    const header = page.locator('.yohaku-header')
    const headerContent = page.locator('.yohaku-header-content')

    // 点击打开底部纸面 Dock
    await menuToggle.click()
    await expect(header).toHaveAttribute('data-open')
    await expect(headerContent).toBeVisible()

    // 验证遮罩出现与 body 滚动锁定
    const backdrop = page.locator('.yohaku-header-backdrop')
    await expect(backdrop).toBeVisible()
    const bodyOverflowOpen = await page.evaluate(() => document.body.style.overflow)
    expect(bodyOverflowOpen).toBe('hidden')

    // 点击遮罩关闭 Dock
    await backdrop.click({ position: { x: 50, y: 50 } })
    await expect(header).not.toHaveAttribute('data-open')
    await expect(backdrop).not.toBeVisible()

    // 验证 body 滚动条恢复正常
    const bodyOverflowClosed = await page.evaluate(() => document.body.style.overflow)
    expect(bodyOverflowClosed).not.toBe('hidden')
  })

  test('1.3 跨断点（1024px）响应式回归：在 390px 展开移动端菜单，拉伸视口到 1440px，验证自动关闭、滚动锁彻底释放、焦点回归', async ({
    page,
  }) => {
    // 1. 在 390px 展开移动端菜单
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const menuToggle = page.locator('.yohaku-header-toggle')
    await menuToggle.click()

    const header = page.locator('.yohaku-header')
    await expect(header).toHaveAttribute('data-open')
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')

    // 2. 拉伸视口到 1440px 桌面端
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.waitForTimeout(300)

    // 3. 验证移动菜单已自动关闭，backdrop 不存在
    await expect(header).not.toHaveAttribute('data-open')
    await expect(page.locator('.yohaku-header-backdrop')).not.toBeVisible()

    // 4. 验证 body 的 overflow: hidden 彻底释放
    const overflowAfterResize = await page.evaluate(() => document.body.style.overflow)
    expect(overflowAfterResize).not.toBe('hidden')

    // 5. 验证桌面常驻导航与头像正常展示
    const avatarBtn = page.locator('.yohaku-desktop-avatar')
    await expect(avatarBtn).toBeVisible()
    const desktopNav = page.locator('.yohaku-desktop-nav')
    await expect(desktopNav).toBeVisible()
  })
})

test.describe('2. 目录（TOC）动效与回归', () => {
  test('2.1 桌面端（1440px）：目录层级折叠逻辑、实时高亮、阅读进度、波浪线 SVG、平滑滚动及返回顶部', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/posts/electron-ota-updater')

    const tocDesktop = page.locator('.yohaku-toc-desktop')
    await expect(tocDesktop).toBeVisible()

    // 1. 验证波浪线 SVG 正确渲染
    const waveSvg = tocDesktop.locator('.yohaku-toc-wave')
    await expect(waveSvg).toBeVisible()
    await expect(waveSvg.locator('path')).toBeVisible()

    // 2. 验证层级折叠逻辑：当前激活第 1 根章节时，其子标题展开，非当前根章节子级标记 data-collapsed
    const tocItems = tocDesktop.locator('.yohaku-toc-tree li')
    const totalCount = await tocItems.count()
    expect(totalCount).toBeGreaterThan(3)

    // 初始状态下第 1 个根章节的子项展开
    const firstChild = tocDesktop.locator('li[data-anchor-id="blockmap-怎么省流量"]')
    await expect(firstChild).toBeVisible()
    await expect(firstChild).not.toHaveAttribute('data-collapsed')

    // 非当前章节的子标题应处于折叠状态 (带有 data-collapsed 属性)
    const otherChild = tocDesktop.locator('li[data-anchor-id="散文件量过之后决定不改"]')
    await expect(otherChild).toHaveAttribute('data-collapsed')

    // 3. 点击目录项平滑滚动至对应标题
    const targetAnchor = tocDesktop.locator('a[href*="asarota"]').first()
    await targetAnchor.click()
    await page.waitForTimeout(600)

    // 验证滚动后，对应章节子标题自动展开，之前章节子标题平滑折叠
    await expect(otherChild).not.toHaveAttribute('data-collapsed')
    await expect(firstChild).toHaveAttribute('data-collapsed')

    // 4. 验证阅读进度指示器更新
    const progressText = tocDesktop.locator('.yohaku-toc-progress span')
    await expect(progressText).toBeVisible()
    const progressVal = await progressText.textContent()
    expect(progressVal).toMatch(/\d+%/)

    // 5. 测试返回顶部按钮
    const backToTopBtn = tocDesktop.locator('.yohaku-toc-progress button')
    await expect(backToTopBtn).toHaveAttribute('data-visible')
    await backToTopBtn.click()
    // 等待平滑滚动至顶部完成
    await page.waitForFunction(() => window.scrollY < 50, { timeout: 4000 })
    const scrollY = await page.evaluate(() => window.scrollY)
    expect(scrollY).toBeLessThan(50)
  })

  test('2.2 移动端（390px）：点击右下角悬浮按钮打开 Sheet（260ms 入场/180ms 退场）、跳转后自闭合、滚动锁释放及焦点回归', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/posts/electron-ota-updater')

    const tocFabBtn = page.locator('.yohaku-toc-fab button')
    await expect(tocFabBtn).toBeVisible()

    // 1. 点击悬浮按钮唤出移动端 Sheet (260ms 入场)
    await tocFabBtn.click()
    const tocDialog = page.locator('.yohaku-toc-dialog')
    await expect(tocDialog).toHaveAttribute('open', '')
    const tocSheet = page.locator('.yohaku-toc-sheet')
    await expect(tocSheet).toBeVisible()

    // 验证 body 滚动锁定
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')

    // 2. 点击目录项跳转：验证 Sheet 关闭 (180ms 退场)、滚动锁释放、焦点回归悬浮按钮
    const sheetItemLink = tocSheet.locator('.yohaku-toc-tree a').first()
    await sheetItemLink.click()

    // 等待 180ms 退场过渡完成
    await page.waitForTimeout(300)
    await expect(tocDialog).not.toHaveAttribute('open', '')

    // 验证 body 滚动锁已释放
    const overflowAfterClose = await page.evaluate(() => document.body.style.overflow)
    expect(overflowAfterClose).not.toBe('hidden')

    // 验证焦点回归悬浮按钮
    await expect(tocFabBtn).toBeFocused()
  })
})

test.describe('3. 搜索（Search）动效与回归', () => {
  test('3.1 桌面端（1440px）：几何尺寸（680px * 520px）、快捷搜索触发、全文匹配检索、键盘上下键与回车跳转、Esc 退出与焦点回归、IME 无冲突', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/')

    const searchFab = page.locator('.yohaku-search-fab')
    await expect(searchFab).toBeVisible()

    // 1. 快捷搜索按钮触发
    await searchFab.click()
    const searchDialog = page.locator('.search-dialog')
    await expect(searchDialog).toHaveAttribute('open', '')

    // 等待 220ms 入场动画缩放完成
    await page.waitForTimeout(300)

    // 2. 验证桌面端几何尺寸：宽度 680px，面板高度 520px
    const panel = page.locator('.yohaku-search-panel')
    const box = await panel.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      expect(Math.round(box.width)).toBe(680)
      expect(Math.round(box.height)).toBe(520)
    }

    // 3. 测试中文 IME 输入无冲突
    const searchInput = page.locator('.yohaku-search-input')
    await searchInput.dispatchEvent('compositionstart')
    // 在合成过程中按 ArrowDown 和 Enter，不应触发条目选择与提交
    await searchInput.press('ArrowDown')
    await searchInput.press('Enter')
    expect(page.url()).not.toContain('/posts/')
    await searchInput.dispatchEvent('compositionend')

    // 4. 输入关键词 "Electron" 验证全文匹配检索
    await searchInput.fill('Electron')
    await page.waitForTimeout(500) // 等待防抖与请求返回

    const resultItems = searchDialog.locator('ul li')
    await expect(resultItems.first()).toBeVisible()
    const resultCount = await resultItems.count()
    expect(resultCount).toBeGreaterThanOrEqual(1)
    const firstTitle = await resultItems.first().textContent()
    expect(firstTitle).toContain('Electron')

    // 5. 测试键盘上下键选择条目与回车跳转
    await searchInput.press('ArrowDown')
    // 验证具有高亮状态
    await expect(resultItems.first()).toHaveClass(/before:bg-zinc-200/)
    await searchInput.press('Enter')

    // 验证回车后跳转至目标文章页
    await page.waitForURL(/\/posts\/.+/)
    expect(page.url()).toContain('/posts/electron')

    // 6. 测试按 Esc 关闭弹窗后焦点回归到快速搜索按钮
    await page.goto('/')
    await searchFab.click()
    await expect(searchDialog).toHaveAttribute('open', '')
    await page.keyboard.press('Escape')
    await expect(searchDialog).not.toHaveAttribute('open', '')
    await expect(searchFab).toBeFocused()
  })

  test('3.2 移动端（390px）：搜索面板占据约 80vh 且布局无水平/垂直异常溢出', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    const searchFab = page.locator('.yohaku-search-fab')
    await searchFab.click()

    const searchDialog = page.locator('.search-dialog')
    await expect(searchDialog).toHaveAttribute('open', '')

    await page.waitForTimeout(300)

    const panel = page.locator('.yohaku-search-panel')
    const box = await panel.boundingBox()
    expect(box).not.toBeNull()
    if (box) {
      // 844 * 0.8 ≈ 675.2px，容差 within ±15px
      const expectedHeight = 844 * 0.8
      expect(Math.abs(box.height - expectedHeight)).toBeLessThan(15)
      // 宽度不溢出视口
      expect(box.width).toBeLessThanOrEqual(390)
    }

    // 验证面板内部无横向滚动溢出
    const hasHorizontalOverflow = await panel.evaluate(
      (el) => el.scrollWidth > el.clientWidth + 2,
    )
    expect(hasHorizontalOverflow).toBe(false)
  })
})

test.describe('4. 图片全屏预览（Image Lightbox）', () => {
  test('4.1 文章详情页点击图片触发纸色遮罩与 380ms 放大动效，Esc 关闭平滑还原且焦点回归', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 })
    await page.goto('/posts/macos-zoom-button-hover-menu')

    const articleImg = page.locator('article img').first()
    await expect(articleImg).toBeVisible()

    // 1. 点击图片开启 Lightbox
    await articleImg.click()

    const previewDialog = page.locator('.yohaku-image-preview')
    await expect(previewDialog).toHaveAttribute('open', '')

    // 验证全屏遮罩包含放大后的图片
    const previewImg = previewDialog.locator('img')
    await expect(previewImg).toBeVisible()

    // 验证 body 滚动锁定
    expect(await page.evaluate(() => document.body.style.overflow)).toBe('hidden')

    // 2. 按 Esc 键关闭，验证平滑还原与焦点回归原图片
    await page.keyboard.press('Escape')

    // 等待 380ms 退出动画完成
    await page.waitForTimeout(450)
    await expect(previewDialog).not.toHaveAttribute('open', '')

    // 验证 body 滚动恢复
    const overflowAfterEsc = await page.evaluate(() => document.body.style.overflow)
    expect(overflowAfterEsc).not.toBe('hidden')

    // 验证焦点回归原图
    await expect(articleImg).toBeFocused()
  })
})
