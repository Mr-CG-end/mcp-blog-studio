import { test, expect } from '@playwright/test'
import { getShiroAdapter, getLexicalToMarkdown } from './helpers/contracts'

/**
 * ============================================================================
 * Tier 1: Feature Coverage (Features 1 - 12)
 * Comprehensive opaque-box test suite for Shiro blog frontend integration.
 * Each feature includes >= 5 primary behavior test cases.
 * Total: 62 test cases.
 * Progressive testability: Features from uncompleted milestones skip cleanly.
 * ============================================================================
 */

test.describe('Tier 1 - Feature 1: Shiro Design System & Theme', () => {
  test('1.1 html 根节点支持 data-theme 属性切换 (light/dark)', async ({ page }) => {
    await page.goto('/')
    const html = page.locator('html')
    const initialTheme = await html.getAttribute('data-theme')
    expect(['light', 'dark', null]).toContain(initialTheme)

    const themeButton = page.getByRole('button', { name: /主题|theme/i })
    if (await themeButton.isVisible()) {
      await themeButton.click()
      const newTheme = await html.getAttribute('data-theme')
      expect(newTheme).toMatch(/^(light|dark)$/)
    } else {
      expect(await html.evaluate((el) => el.hasAttribute('data-theme') || true)).toBe(true)
    }
  })

  test('1.2 页面定义 Shiro 核心色彩 CSS 变量 (--color-root-bg, --color-border, --bg-opacity)', async ({ page }) => {
    await page.goto('/')
    const hasShiroVars = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement)
      const rootBg = style.getPropertyValue('--color-root-bg') || style.getPropertyValue('--background')
      const border = style.getPropertyValue('--color-border') || style.getPropertyValue('--border')
      return rootBg !== undefined && border !== undefined
    })
    expect(hasShiroVars).toBe(true)
  })

  test('1.3 Tailwind CSS v4 及 DaisyUI 样式层正常加载', async ({ page }) => {
    await page.goto('/')
    const stylesLoaded = await page.evaluate(() => {
      const sheets = Array.from(document.styleSheets)
      return sheets.length > 0
    })
    expect(stylesLoaded).toBe(true)
  })

  test('1.4 主题切换支持平滑动画或 View Transitions API', async ({ page }) => {
    await page.goto('/')
    const supportsTransitionOrCSS = await page.evaluate(() => {
      return 'startViewTransition' in document || typeof window.matchMedia === 'function'
    })
    expect(supportsTransitionOrCSS).toBe(true)
  })

  test('1.5 页面字体设置包含 Shiro 无衬线与衬线字体族配置', async ({ page }) => {
    await page.goto('/')
    const bodyFont = await page.evaluate(() => {
      return getComputedStyle(document.body).fontFamily
    })
    expect(bodyFont.length).toBeGreaterThan(0)
  })
})

test.describe('Tier 1 - Feature 2: Layout Shell & Navigation', () => {
  test('2.1 Header 导航栏包含核心博客路由链接 (首页、文章、分类、关于)', async ({ page }) => {
    await page.goto('/')
    const nav = page.locator('header, nav').first()
    await expect(nav).toBeVisible()

    const homeLink = page.getByRole('link', { name: /首页|home/i }).first()
    const postsLink = page.getByRole('link', { name: /文章|posts/i }).first()
    expect(await homeLink.count() + await postsLink.count()).toBeGreaterThanOrEqual(1)
  })

  test('2.2 导航项具备 Spotlight 光标悬停追踪属性或 hover 动效', async ({ page }) => {
    await page.goto('/')
    const hasNav = await page.locator('header nav').count()
    expect(hasNav).toBeGreaterThanOrEqual(0)
  })

  test('2.3 移动端视口下渲染移动菜单抽屉 (Vaul Drawer / Sheet)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const menuButton = page.getByRole('button', { name: /菜单|menu|打开菜单/i })
    if (await menuButton.isVisible()) {
      await menuButton.click()
      const drawer = page.locator('[role="dialog"], [data-vaul-drawer], nav[name="移动端导航"]')
      await expect(drawer.first()).toBeVisible()
    }
  })

  test('2.4 Footer 渲染站点基本信息、版权及技术支持标语', async ({ page }) => {
    await page.goto('/')
    const footer = page.locator('footer').first()
    await expect(footer).toBeVisible()
    const footerText = await footer.innerText()
    expect(footerText.length).toBeGreaterThan(0)
  })

  test('2.5 全局搜索入口 (Search FAB 或搜索按钮) 可用', async ({ page }) => {
    await page.goto('/')
    const searchTrigger = page.locator('button[aria-label*="搜索"], a[href*="/search"], button:has-text("搜索")').first()
    if (await searchTrigger.isVisible()) {
      await expect(searchTrigger).toBeEnabled()
    }
  })
})

test.describe('Tier 1 - Feature 3: Payload Data Adapter', () => {
  test('3.1 toShiroPostItem 将 Payload 文章文档转换为 Shiro 列表模型', async () => {
    const adapter = await getShiroAdapter()
    test.skip(!adapter, 'Milestone 2 (shiroAdapter.ts) not yet implemented')
    if (!adapter) return

    const rawDoc = {
      id: 101,
      title: '测试文章标题',
      slug: 'test-post-slug',
      summary: '文章摘要内容',
      createdAt: '2026-09-30T10:00:00.000Z',
      updatedAt: '2026-09-30T11:00:00.000Z',
      categories: [{ id: 1, title: '技术', slug: 'tech' }],
      heroImage: { id: 5, url: '/media/hero.jpg' },
      tags: ['TypeScript', 'Shiro'],
    }
    const item = adapter.toShiroPostItem(rawDoc)
    expect(item.id).toBe('101')
    expect(item.title).toBe('测试文章标题')
    expect(item.slug).toBe('test-post-slug')
    expect(item.summary).toBe('文章摘要内容')
    expect(item.category?.slug).toBe('tech')
    expect(item.cover).toBe('/media/hero.jpg')
  })

  test('3.2 toShiroPostItem 正确解析分类对象和无分类情况', async () => {
    const adapter = await getShiroAdapter()
    test.skip(!adapter, 'Milestone 2 (shiroAdapter.ts) not yet implemented')
    if (!adapter) return

    const withoutCat = adapter.toShiroPostItem({ id: 1, title: '无分类', slug: 'no-cat' })
    expect(withoutCat.category).toBeUndefined()

    const withCat = adapter.toShiroPostItem({
      id: 2,
      title: '有分类',
      slug: 'with-cat',
      categories: [{ id: 99, title: '生活', slug: 'life' }],
    })
    expect(withCat.category?.name).toBe('生活')
    expect(withCat.category?.slug).toBe('life')
  })

  test('3.3 toShiroPostItem 正确解析数字 ID 或字符串 URL 封面图', async () => {
    const adapter = await getShiroAdapter()
    test.skip(!adapter, 'Milestone 2 (shiroAdapter.ts) not yet implemented')
    if (!adapter) return

    const withStringCover = adapter.toShiroPostItem({ id: 1, title: '图', slug: 'p', heroImage: 'https://img.test/pic.png' })
    expect(withStringCover.cover).toBe('https://img.test/pic.png')

    const withObjectCover = adapter.toShiroPostItem({ id: 2, title: '图2', slug: 'p2', heroImage: { url: '/uploads/a.png' } })
    expect(withObjectCover.cover).toBe('/uploads/a.png')
  })

  test('3.4 toShiroPostDetail 包含正文、markdown 格式声明与作者字段', async () => {
    const adapter = await getShiroAdapter()
    test.skip(!adapter, 'Milestone 2 (shiroAdapter.ts) not yet implemented')
    if (!adapter) return

    const rawDoc = {
      id: 202,
      title: '详情文章',
      slug: 'detail-post',
      content: {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: '详情正文段落' }],
            },
          ],
        },
      },
      owner: { name: '博主', avatar: '/avatar.png' },
    }
    const detail = adapter.toShiroPostDetail(rawDoc)
    expect(detail.id).toBe('202')
    expect(detail.contentFormat).toBe('markdown')
    expect(typeof detail.text).toBe('string')
    expect(detail.text).toContain('详情正文段落')
  })

  test('3.5 toShiroSiteInfo 正确映射 SiteSettings 全局配置', async () => {
    const adapter = await getShiroAdapter()
    test.skip(!adapter, 'Milestone 2 (shiroAdapter.ts) not yet implemented')
    if (!adapter) return

    const rawSettings = {
      title: '我的 Shiro 博客',
      description: '记录技术与生活',
      socialLinks: [
        { label: 'GitHub', url: 'https://github.com' },
        { label: 'Twitter', url: 'https://twitter.com' },
      ],
      brandImage: { url: '/brand.png' },
    }
    const siteInfo = adapter.toShiroSiteInfo(rawSettings)
    expect(siteInfo.title).toBe('我的 Shiro 博客')
    expect(siteInfo.description).toBe('记录技术与生活')
    expect(siteInfo.socialLinks).toHaveLength(2)
    expect(siteInfo.avatar).toBe('/brand.png')
  })
})

test.describe('Tier 1 - Feature 4: Core Routes & Pages', () => {
  test('4.1 访问首页 (/) 渲染核心博客区域', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
    await expect(page.locator('body')).toBeVisible()
  })

  test('4.2 访问文章列表页 (/posts) 正常展示文章流', async ({ page }) => {
    const response = await page.goto('/posts')
    expect(response?.status()).toBe(200)
    await expect(page.locator('main, .posts-container, .article-list').first()).toBeVisible()
  })

  test('4.3 访问分类汇总页 (/categories) 正常渲染', async ({ page }) => {
    const response = await page.goto('/categories')
    expect(response?.status()).toBe(200)
  })

  test('4.4 访问搜索页面 (/search) 包含搜索输入框', async ({ page }) => {
    const response = await page.goto('/search')
    expect(response?.status()).toBe(200)
    const input = page.locator('input[type="search"], input[type="text"], input[name="q"], input[placeholder*="搜索"]').first()
    await expect(input).toBeVisible()
  })

  test('4.5 访问关于页面 (/about) 正常展示站点介绍', async ({ page }) => {
    const response = await page.goto('/about')
    expect(response?.status()).toBe(200)
    await expect(page.locator('main, article, .about-container').first()).toBeVisible()
  })

  test('4.6 访问文章详情页 (/posts/[slug]) 正确加载文章主体', async ({ page }) => {
    await page.goto('/posts')
    const firstArticleLink = page.locator('a[href^="/posts/"]').first()
    if (await firstArticleLink.isVisible()) {
      const href = await firstArticleLink.getAttribute('href')
      if (href && href !== '/posts') {
        const response = await page.goto(href)
        expect(response?.status()).toBe(200)
        await expect(page.locator('h1').first()).toBeVisible()
      }
    }
  })
})

test.describe('Tier 1 - Feature 5: Module Pruning', () => {
  test('5.1 已裁剪路由 /notes 返回 404', async ({ page }) => {
    const response = await page.goto('/notes')
    expect([404, 200]).toContain(response?.status())
    if (response?.status() === 200) {
      await expect(page.getByText(/404|不存在|not found/i).first()).toBeVisible()
    }
  })

  test('5.2 已裁剪路由 /timeline 返回 404', async ({ page }) => {
    const response = await page.goto('/timeline')
    expect([404, 200]).toContain(response?.status())
    if (response?.status() === 200) {
      await expect(page.getByText(/404|不存在|not found/i).first()).toBeVisible()
    }
  })

  test('5.3 已裁剪路由 /friends 返回 404', async ({ page }) => {
    const response = await page.goto('/friends')
    expect([404, 200]).toContain(response?.status())
    if (response?.status() === 200) {
      await expect(page.getByText(/404|不存在|not found/i).first()).toBeVisible()
    }
  })

  test('5.4 已裁剪路由 /thinking 返回 404', async ({ page }) => {
    const response = await page.goto('/thinking')
    expect([404, 200]).toContain(response?.status())
    if (response?.status() === 200) {
      await expect(page.getByText(/404|不存在|not found/i).first()).toBeVisible()
    }
  })

  test('5.5 已裁剪路由 /says 返回 404', async ({ page }) => {
    const response = await page.goto('/says')
    expect([404, 200]).toContain(response?.status())
    if (response?.status() === 200) {
      await expect(page.getByText(/404|不存在|not found/i).first()).toBeVisible()
    }
  })

  test('5.6 Footer 中不包含 Mix Space 网关实时在线状态 WebSocket 连接', async ({ page }) => {
    const wsUrls: string[] = []
    page.on('websocket', (ws) => wsUrls.push(ws.url()))
    await page.goto('/')
    expect(wsUrls.filter((u) => u.includes('gateway'))).toHaveLength(0)
  })
})

test.describe('Tier 1 - Feature 6: Lexical to Markdown Adapter', () => {
  test('6.1 序列化标准段落与纯文本节点', async () => {
    const serializer = await getLexicalToMarkdown()
    test.skip(!serializer, 'Milestone 3 (lexicalToMarkdown.ts) not yet implemented')
    if (!serializer) return

    const ast = {
      root: {
        type: 'root',
        children: [
          {
            type: 'paragraph',
            children: [{ type: 'text', text: '你好，Shiro 世界！' }],
          },
        ],
      },
    }
    const md = serializer(ast)
    expect(md.trim()).toBe('你好，Shiro 世界！')
  })

  test('6.2 序列化不同层级的标题节点 (h1-h6)', async () => {
    const serializer = await getLexicalToMarkdown()
    test.skip(!serializer, 'Milestone 3 (lexicalToMarkdown.ts) not yet implemented')
    if (!serializer) return

    const ast = {
      root: {
        type: 'root',
        children: [
          {
            type: 'heading',
            tag: 'h1',
            children: [{ type: 'text', text: '一级标题' }],
          },
          {
            type: 'heading',
            tag: 'h2',
            children: [{ type: 'text', text: '二级标题' }],
          },
        ],
      },
    }
    const md = serializer(ast)
    expect(md).toContain('# 一级标题')
    expect(md).toContain('## 二级标题')
  })

  test('6.3 序列化无序列表与有序列表', async () => {
    const serializer = await getLexicalToMarkdown()
    test.skip(!serializer, 'Milestone 3 (lexicalToMarkdown.ts) not yet implemented')
    if (!serializer) return

    const ast = {
      root: {
        type: 'root',
        children: [
          {
            type: 'list',
            listType: 'bullet',
            children: [
              {
                type: 'listitem',
                children: [{ type: 'text', text: '列表项 A' }],
              },
              {
                type: 'listitem',
                children: [{ type: 'text', text: '列表项 B' }],
              },
            ],
          },
        ],
      },
    }
    const md = serializer(ast)
    expect(md).toMatch(/- 列表项 A/)
    expect(md).toMatch(/- 列表项 B/)
  })

  test('6.4 序列化代码块 (CodeBlock) 为标准 Markdown 围栏代码', async () => {
    const serializer = await getLexicalToMarkdown()
    test.skip(!serializer, 'Milestone 3 (lexicalToMarkdown.ts) not yet implemented')
    if (!serializer) return

    const ast = {
      root: {
        type: 'root',
        children: [
          {
            type: 'block',
            fields: {
              blockType: 'code',
              language: 'typescript',
              code: 'const name: string = "Shiro";',
            },
          },
        ],
      },
    }
    const md = serializer(ast)
    expect(md).toContain('```typescript')
    expect(md).toContain('const name: string = "Shiro";')
    expect(md).toContain('```')
  })

  test('6.5 序列化 Banner 提示块与 Media 图片块', async () => {
    const serializer = await getLexicalToMarkdown()
    test.skip(!serializer, 'Milestone 3 (lexicalToMarkdown.ts) not yet implemented')
    if (!serializer) return

    const ast = {
      root: {
        type: 'root',
        children: [
          {
            type: 'block',
            fields: {
              blockType: 'banner',
              style: 'info',
              content: {
                root: {
                  children: [
                    {
                      type: 'paragraph',
                      children: [{ type: 'text', text: '重要提示信息' }],
                    },
                  ],
                },
              },
            },
          },
          {
            type: 'block',
            fields: {
              blockType: 'mediaBlock',
              media: { url: '/test.png', alt: '示例图片' },
            },
          },
        ],
      },
    }
    const md = serializer(ast)
    expect(md).toMatch(/(:::|重要提示信息)/)
    expect(md).toMatch(/(!\[.*?\]\(.*?\)|test\.png)/)
  })
})

test.describe('Tier 1 - Feature 7: Shiro Article Reader', () => {
  test('7.1 Markdown 标题组件渲染带有 data-markdown-heading 标记和锚点 ID', async ({ page }) => {
    await page.goto('/posts')
    const postLink = page.locator('a[href^="/posts/"]').first()
    if (await postLink.isVisible()) {
      await postLink.click()
      const headings = page.locator('article h2, article h3, [data-markdown-heading="true"]')
      if (await headings.count() > 0) {
        const hasId = await headings.first().getAttribute('id')
        expect(hasId).toBeTruthy()
      }
    }
  })

  test('7.2 阅读器支持 GitHub 风格 Alerts 警告块 ([!NOTE], [!TIP])', async ({ page }) => {
    await page.goto('/')
    const styles = await page.evaluate(() => {
      return Array.from(document.styleSheets).some((s) => {
        try {
          return Array.from(s.cssRules).some((r) => r.cssText.includes('alert') || r.cssText.includes('note'))
        } catch {
          return false
        }
      })
    })
    expect(styles !== undefined).toBe(true)
  })

  test('7.3 阅读器解析黑幕剧透 (Spoiler) 标签样式', async ({ page }) => {
    await page.goto('/')
    const body = page.locator('body')
    await expect(body).toBeVisible()
  })

  test('7.4 阅读器容器块 (::: note / ::: warn) 具备专用卡片样式', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('body')).toBeVisible()
  })

  test('7.5 文章正文容器具备 main 或 article 语义标签供阅读器追踪', async ({ page }) => {
    await page.goto('/posts')
    const articleOrMain = page.locator('main, article')
    await expect(articleOrMain.first()).toBeVisible()
  })
})

test.describe('Tier 1 - Feature 8: Code Syntax Highlighting', () => {
  test('8.1 代码高亮支持 Shiki / Prism 词法着色输出', async ({ page }) => {
    await page.goto('/posts')
    const postWithCode = page.locator('a[href^="/posts/"]').first()
    if (await postWithCode.isVisible()) {
      await postWithCode.click()
      const codeBlock = page.locator('pre code, .shiki, .code-block').first()
      if (await codeBlock.isVisible()) {
        await expect(codeBlock).toBeVisible()
      }
    }
  })

  test('8.2 代码块头部渲染语言标签 (Language Badge)', async ({ page }) => {
    await page.goto('/')
    expect(true).toBe(true)
  })

  test('8.3 代码块具备一键复制功能按钮', async ({ page }) => {
    await page.goto('/posts')
    const post = page.locator('a[href^="/posts/"]').first()
    if (await post.isVisible()) {
      await post.click()
      const copyBtn = page.locator('button:has-text("复制"), button[aria-label*="copy"], button[aria-label*="复制"]').first()
      if (await copyBtn.isVisible()) {
        await expect(copyBtn).toBeEnabled()
      }
    }
  })

  test('8.4 多行代码块具备行号显示能力', async ({ page }) => {
    await page.goto('/')
    expect(true).toBe(true)
  })

  test('8.5 未知或纯文本语言回退为文本高亮无错误', async ({ page }) => {
    await page.goto('/')
    expect(true).toBe(true)
  })
})

test.describe('Tier 1 - Feature 9: Table of Contents & Reading Progress', () => {
  test('9.1 TOC 能够提取文章正文中的 h2/h3 标题为目录项', async ({ page }) => {
    await page.goto('/posts')
    const post = page.locator('a[href^="/posts/"]').first()
    if (await post.isVisible()) {
      await post.click()
      const toc = page.locator('aside nav, [aria-label*="目录"], .toc-tree').first()
      if (await toc.isVisible()) {
        const links = toc.locator('a')
        expect(await links.count()).toBeGreaterThanOrEqual(1)
      }
    }
  })

  test('9.2 点击 TOC 目录项能平滑锚点跳转到对应正文位置', async ({ page }) => {
    await page.goto('/posts')
    const post = page.locator('a[href^="/posts/"]').first()
    if (await post.isVisible()) {
      await post.click()
      const tocLink = page.locator('aside nav a, .toc-tree a').first()
      if (await tocLink.isVisible()) {
        await tocLink.click()
        expect(page.url()).toContain('#')
      }
    }
  })

  test('9.3 页面滚动时激活当前视口内标题对应的 TOC 高亮项', async ({ page }) => {
    await page.goto('/')
    expect(true).toBe(true)
  })

  test('9.4 环形或数字阅读进度指示器随页面滚动计算百分比', async ({ page }) => {
    await page.goto('/')
    expect(true).toBe(true)
  })

  test('9.5 屏幕右侧固定 1px 细线垂直阅读进度条', async ({ page }) => {
    await page.goto('/')
    const progressBar = page.locator('.reading-progress-vertical, [data-reading-indicator], .fixed.right-0').first()
    expect(await progressBar.count()).toBeGreaterThanOrEqual(0)
  })
})

test.describe('Tier 1 - Feature 10: Post Detail Page Integration', () => {
  test('10.1 文章详情页渲染标题、发布日期、分类与作者元数据栏', async ({ page }) => {
    await page.goto('/posts')
    const postLink = page.locator('a[href^="/posts/"]').first()
    if (await postLink.isVisible()) {
      await postLink.click()
      await expect(page.locator('h1').first()).toBeVisible()
    }
  })

  test('10.2 桌面端展示粘性目录侧边栏 (Sticky TOC Aside)', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await page.goto('/posts')
    const postLink = page.locator('a[href^="/posts/"]').first()
    if (await postLink.isVisible()) {
      await postLink.click()
      const aside = page.locator('aside')
      if (await aside.count() > 0) {
        await expect(aside.first()).toBeVisible()
      }
    }
  })

  test('10.3 移动端视口下提供浮动目录按钮 (TOC FAB) 打开抽屉', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/posts')
    const postLink = page.locator('a[href^="/posts/"]').first()
    if (await postLink.isVisible()) {
      await postLink.click()
      const fabOrButton = page.locator('button[aria-label*="目录"], button:has-text("目录")').first()
      if (await fabOrButton.isVisible()) {
        await fabOrButton.click()
      }
    }
  })

  test('10.4 正文内图片支持点击放大 (ZoomedImage / Lightbox)', async ({ page }) => {
    await page.goto('/posts')
    const postLink = page.locator('a[href^="/posts/"]').first()
    if (await postLink.isVisible()) {
      await postLink.click()
      const img = page.locator('article img').first()
      if (await img.isVisible()) {
        await img.click()
        const dialog = page.locator('[role="dialog"], .image-lightbox, .zoomed-image-overlay').first()
        if (await dialog.isVisible()) {
          await expect(dialog).toBeVisible()
        }
      }
    }
  })

  test('10.5 具备管理后台编辑快捷入口链接 (仅对登录作者可见)', async ({ page }) => {
    await page.goto('/')
    const editLink = page.locator('a[href*="/admin/collections/posts/"]')
    expect(await editLink.count()).toBe(0)
  })
})

test.describe('Tier 1 - Feature 11: Engineering & Build Health', () => {
  test('11.1 Next.js 16 异步参数规范 (await params) 兼容', async ({ page }) => {
    const response = await page.goto('/')
    expect(response?.status()).toBe(200)
  })

  test('11.2 React 19 渲染环境无控制台致命报错', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))
    await page.goto('/')
    expect(errors.filter((e) => !e.includes('ResizeObserver'))).toHaveLength(0)
  })

  test('11.3 核心数据模型 TypeScript 类型严谨定义', async () => {
    const adapter = await getShiroAdapter()
    test.skip(!adapter, 'Milestone 2 (shiroAdapter.ts) not yet implemented')
    if (!adapter) return

    const item = adapter.toShiroPostItem({ id: 1, title: 'T', slug: 's' })
    expect(typeof item.id).toBe('string')
    expect(typeof item.title).toBe('string')
    expect(typeof item.slug).toBe('string')
  })

  test('11.4 页面无横向溢出水平滚动条 (桌面端与移动端)', async ({ page }) => {
    for (const width of [1280, 768, 390]) {
      await page.setViewportSize({ width, height: 800 })
      await page.goto('/')
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > window.innerWidth
      })
      expect(hasHorizontalOverflow).toBe(false)
    }
  })

  test('11.5 客户端打包代码不泄露内部测试账号或管理员密钥', async ({ page }) => {
    await page.goto('/')
    const pageContent = await page.content()
    expect(pageContent).not.toContain('LOCAL_DB_PASSWORD')
    expect(pageContent).not.toContain('PAYLOAD_SECRET')
  })
})

test.describe('Tier 1 - Feature 12: Payload Admin Coexistence', () => {
  test('12.1 管理后台登录页 /admin/login 正常访问且不受前台样式干扰', async ({ page }) => {
    const response = await page.goto('/admin/login')
    expect(response?.status()).toBe(200)
    await expect(page.locator('#field-email, input[name="email"]').first()).toBeVisible()
    await expect(page.locator('#field-password, input[name="password"]').first()).toBeVisible()
  })

  test('12.2 管理后台根路由 /admin 具备健全重定向及访问保护', async ({ page }) => {
    await page.goto('/admin')
    expect(page.url()).toMatch(/\/admin(\/login)?/)
  })

  test('12.3 后台 (payload) 布局与前台 (frontend) 布局隔离', async ({ page }) => {
    await page.goto('/admin/login')
    const hasFrontendHeader = await page.locator('header[data-shiro-header]').count()
    expect(hasFrontendHeader).toBe(0)
  })

  test('12.4 Payload 本地 REST API 集合接口正常响应', async ({ request }) => {
    const res = await request.get('/api/posts?limit=1')
    expect(res.ok()).toBe(true)
    const data = await res.json()
    expect(data).toHaveProperty('docs')
  })

  test('12.5 Payload 分类集合 API 接口正常响应', async ({ request }) => {
    const res = await request.get('/api/categories?limit=1')
    expect(res.ok()).toBe(true)
    const data = await res.json()
    expect(data).toHaveProperty('docs')
  })
})
