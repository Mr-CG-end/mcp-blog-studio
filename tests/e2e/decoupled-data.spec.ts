import { test, expect } from '@playwright/test'

test.describe('Decoupled Data & CMS Verification', () => {
  test('1. 首页 Hero 数据动态化验证（Slogan、名言、统计、社交图标）', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000')

    // 验证 Slogan 存在且享有动效结构
    const heading = page.locator('h1')
    await expect(heading).toBeVisible()
    await expect(heading).toContainText("Hi, I'm")

    // 验证名言区域存在
    const quoteContainer = page.locator('.yohaku-home .font-serif.italic')
    await expect(quoteContainer).toBeVisible()
    const quoteText = await quoteContainer.textContent()
    expect(quoteText).toContain('「')
    expect(quoteText).toContain('」')

    // 验证统计数据由本地真实数据库驱动（篇数包含真实篇数）
    const statsContainer = page.locator('.yohaku-home .text-caption-10.tracking-wide')
    await expect(statsContainer).toBeVisible()
    const statsText = await statsContainer.textContent()
    expect(statsText).toMatch(/\d+\s*篇/)
    expect(statsText).toMatch(/·/)

    // 验证社交链接
    const socialLinks = page.locator('.yohaku-home a[aria-label]')
    expect(await socialLinks.count()).toBeGreaterThan(0)
  })

  test('2. 文章置顶（Pinned Post）由数据库字段驱动验证', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/posts')

    // 验证文章列表中有且仅有标记为 pinned 的文章带有置顶标签
    const pinnedItem = page.locator('.yohaku-post-item[data-pinned]')
    await expect(pinnedItem.first()).toBeVisible()
    await expect(pinnedItem.first().locator('.yohaku-pin-label')).toHaveText('置顶')
  })

  test('3. 导航与页脚链接由 CMS Global 驱动验证', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000')

    // 验证页脚菜单项
    const footerLinks = page.locator('.yohaku-footer-row a')
    const linkTexts = await footerLinks.allTextContents()
    expect(linkTexts).toContain('关于本站')
    expect(linkTexts).toContain('开源说明')
    expect(linkTexts).toContain('文章')
    expect(linkTexts).toContain('分类')
  })

  test('4. 关于页标题由 CMS 数据驱动验证', async ({ page }) => {
    await page.goto('http://127.0.0.1:3000/about')

    const heading = page.locator('.yohaku-reading-heading h1')
    await expect(heading).toHaveText('关于 MCP Blog Studio')

    const subtitle = page.locator('.yohaku-reading-heading p')
    await expect(subtitle).toHaveText(
      '探索人机协同内容创作：基于 Next.js、Payload CMS 与 Model Context Protocol',
    )

    const articleBody = page.locator('[data-article-content]')
    await expect(articleBody).toBeVisible()
    await expect(articleBody).toContainText('欢迎来到 MCP Blog Studio')
    await expect(articleBody).toContainText('Model Context Protocol (MCP)')
  })
})
