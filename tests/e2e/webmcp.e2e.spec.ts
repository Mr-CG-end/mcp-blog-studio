import { expect, test, type Locator, type Page } from '@playwright/test'
import { readFile, mkdir } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

interface Account { id: number; email: string; password: string }
interface Fixture {
  prefix: string
  mcpKey: string
  admin: Account
  authorA: Account
  authorB: Account
  disabled: Account
  category: { id: number; slug: string }
  publicPost: { id: number; slug: string; title: string }
  ownDraft: { id: number; slug: string; title: string }
  otherDraft: { id: number; slug: string }
}
interface NativeTool { name: string; description: string; inputSchema: Record<string, unknown> }
interface NativeContext {
  getTools(): Promise<NativeTool[]>
  // Chrome 150 accepts serialized arguments. Chrome 155 deprecates that overload.
  executeTool(tool: NativeTool, argumentsJSON: string): Promise<string | null>
}
interface NativeDocument extends Document { modelContext: NativeContext }
interface Result { success: boolean; message: string; data: { path?: string; headingID?: string } | null; code?: number }
const fixture = JSON.parse(await readFile('.local/webmcp-browser-fixture.json', 'utf8')) as Fixture
const names = ['filter_posts', 'open_admin_panel', 'open_post', 'open_post_editor', 'preview_post', 'scroll_to_section', 'set_search_query']

async function discovery(page: Page) {
  await expect.poll(() => page.evaluate(async () => {
    const context = (document as NativeDocument).modelContext
    return context ? (await context.getTools()).map((tool) => tool.name).sort() : []
  })).toEqual(names)
}

async function execute(page: Page, name: string, input: Record<string, unknown>): Promise<Result | null> {
  await discovery(page)
  const raw = await page.evaluate(async ({ name, input }) => {
    const context = (document as NativeDocument).modelContext
    const tool = (await context.getTools()).find((candidate) => candidate.name === name)
    if (!tool) throw new Error(`Native tool missing: ${name}`)
    return context.executeTool(tool, JSON.stringify(input))
  }, { name, input })
  return raw === null ? null : JSON.parse(raw) as Result
}

async function navigation(page: Page, name: string, input: Record<string, unknown>, path: string | RegExp) {
  // Native execution can return null when full document navigation replaces the caller.
  await execute(page, name, input)
  await expect(page).toHaveURL(path instanceof RegExp ? path : new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`))
}

async function expectInViewport(heading: Locator) {
  // Read actual geometry directly: native Chrome 150 can defer the
  // IntersectionObserver callback used by Playwright after tool navigation.
  await expect.poll(() => heading.evaluate((element) => {
    const rect = element.getBoundingClientRect()
    return rect.top >= -1 && rect.top < window.innerHeight && rect.bottom > 0
  })).toBe(true)
}

async function screenshot(page: Page, name: string) {
  await mkdir('.local/webmcp-acceptance', { recursive: true })
  // Chrome 150 can suspend compositor frames after native tool navigation.
  // Capture a fresh rendering of the already verified URL in the same session;
  // all native execution and DOM assertions still run in the original page.
  const evidencePage = await page.context().newPage()
  await evidencePage.goto(page.url())
  await expect(evidencePage.getByRole('heading').first().or(evidencePage.getByRole('textbox').first()).first()).toBeVisible()
  const scrollY = await page.evaluate(() => window.scrollY)
  await evidencePage.evaluate((position) => window.scrollTo(0, position), scrollY)
  try {
    await evidencePage.screenshot({ path: `.local/webmcp-acceptance/${name}.png`, animations: 'disabled', timeout: 5000 })
  } catch (error) {
    test.info().annotations.push({ type: 'screenshot-warning', description: error instanceof Error ? error.message : 'Chrome screenshot failed' })
  } finally {
    await evidencePage.close()
  }
}

test('native Chrome: all seven tools, actual search, category pagination, article scroll and lifecycle', async ({ page, browser }) => {
  expect(browser.version()).toMatch(/^1[5-9]\d\./)
  await page.goto('/')
  await discovery(page)
  await navigation(page, 'set_search_query', { query: fixture.publicPost.title }, `/search?q=${encodeURIComponent(fixture.publicPost.title).replace(/%20/g, '+')}`)
  await expect(page.getByRole('textbox', { name: '关键词' })).toHaveValue(fixture.publicPost.title)
  await expect(page.locator('.yohaku-post-list').getByRole('heading', { name: fixture.publicPost.title, exact: true })).toBeVisible()
  await screenshot(page, 'native-search')
  // Dispatch the real Link click handler; Chrome 150 may suspend frame-based
  // stability checks immediately after native WebMCP full navigation.
  await page.locator('.yohaku-post-list').getByRole('link').filter({ has: page.getByRole('heading', { name: fixture.publicPost.title, exact: true }) }).dispatchEvent('click')
  await expect(page).toHaveURL(new RegExp(`/posts/${fixture.publicPost.slug}$`))
  await discovery(page)
  await page.goBack()
  await discovery(page)
  await navigation(page, 'filter_posts', { categorySlug: fixture.category.slug }, `/posts?categorySlug=${fixture.category.slug}&page=1`)
  await expect(page.locator('.yohaku-post-item')).toHaveCount(10)
  await expect(page.getByRole('navigation', { name: '文章分页' }).getByRole('link', { name: '下一页' })).toHaveAttribute('href', `/posts?categorySlug=${fixture.category.slug}&page=2`)
  await navigation(page, 'filter_posts', { page: 2 }, `/posts?categorySlug=${fixture.category.slug}&page=2`)
  await expect(page.locator('.yohaku-post-item')).toHaveCount(2)
  await expect(page.locator('.yohaku-post-item h2').first()).toContainText(fixture.prefix)
  await screenshot(page, 'native-category-page-2')
  await navigation(page, 'open_post', { slug: fixture.publicPost.slug }, `/posts/${fixture.publicPost.slug}`)
  await expect(page.getByRole('heading', { name: fixture.publicPost.title, exact: true })).toBeVisible()
  const heading = page.locator('[data-article-content] h2').first()
  const headingID = await heading.getAttribute('id')
  expect(headingID).toBeTruthy()
  expect(await execute(page, 'scroll_to_section', { headingID })).toMatchObject({ success: true, data: { headingID } })
  await expectInViewport(heading)
  expect(await execute(page, 'scroll_to_section', { headingID: 'missing-acceptance-heading' })).toMatchObject({ success: false, code: 404 })
  await screenshot(page, 'native-article-heading')
  await page.reload()
  await discovery(page)
  await page.goBack()
  await discovery(page)
  await navigation(page, 'open_admin_panel', {}, /\/admin(?:\/login)?(?:\?.*)?$/)
  await expect(page.getByRole('textbox', { name: /^电子邮件/ })).toBeVisible()
  await screenshot(page, 'native-admin-login')
})

test('native Chrome: anonymous protection and real cookie session ownership/preview checks', async ({ page, context }) => {
  await page.goto('/')
  expect(await execute(page, 'open_post_editor', { id: fixture.ownDraft.id })).toMatchObject({ success: false, code: 401 })
  expect(await execute(page, 'preview_post', { id: fixture.ownDraft.id })).toMatchObject({ success: false, code: 401 })
  expect(await execute(page, 'open_post', { slug: fixture.ownDraft.slug })).toMatchObject({ success: false, code: 404 })
  expect((await context.request.get(`/next/webmcp-preview?id=${fixture.ownDraft.id}`, { maxRedirects: 0 })).status()).toBe(401)
  expect((await context.request.get(`/posts/${fixture.ownDraft.slug}`)).status()).toBe(404)
  const login = await context.request.post('/api/users/login', { data: { email: fixture.authorA.email, password: fixture.authorA.password } })
  expect(login.ok()).toBeTruthy()
  await page.reload()
  expect(await execute(page, 'open_post_editor', { id: fixture.otherDraft.id })).toMatchObject({ success: false, code: 404 })
  expect(await execute(page, 'preview_post', { id: fixture.otherDraft.id })).toMatchObject({ success: false, code: 404 })
  expect((await context.request.get(`/next/webmcp-preview?id=${fixture.otherDraft.id}`, { maxRedirects: 0 })).status()).toBe(404)
  expect((await context.request.get(`/next/webmcp-preview?id=${fixture.ownDraft.id}`, { headers: { Origin: 'https://foreign.example', 'Sec-Fetch-Site': 'cross-site' }, maxRedirects: 0 })).status()).toBe(403)
  await navigation(page, 'open_post_editor', { id: fixture.ownDraft.id }, `/admin/collections/posts/${fixture.ownDraft.id}`)
  await expect(page.getByRole('textbox', { name: /^标题/ })).toHaveValue(fixture.ownDraft.title)
  await screenshot(page, 'native-own-editor')
  await page.goto('/')
  await navigation(page, 'preview_post', { id: fixture.ownDraft.id }, `/posts/${fixture.ownDraft.slug}`)
  await expect(page.getByRole('heading', { name: fixture.ownDraft.title, exact: true })).toBeVisible()
  await screenshot(page, 'native-own-draft-preview')
})

test('simulated unsupported browser: normal navigation and search remain usable', async ({ page }) => {
  // Explicit fallback simulation only. Native tests above never replace modelContext.
  await page.addInitScript(() => Object.defineProperty(document, 'modelContext', { value: undefined, configurable: true }))
  await page.goto('/search')
  expect(await page.evaluate(() => (document as NativeDocument).modelContext)).toBeUndefined()
  await page.getByRole('textbox', { name: '关键词' }).fill(fixture.publicPost.title)
  await page.getByRole('button', { name: '搜索', exact: true }).click()
  await expect(page.locator('.yohaku-post-list').getByRole('heading', { name: fixture.publicPost.title, exact: true })).toBeVisible()
  await screenshot(page, 'simulated-unsupported-search')
})

test('native Chrome: deactivation invalidates an already authenticated cookie session', async ({ page, context, playwright, baseURL }) => {
  const admin = await playwright.request.newContext({ baseURL })
  try {
    expect((await admin.post('/api/users/login', { data: { email: fixture.admin.email, password: fixture.admin.password } })).ok()).toBe(true)
    expect((await admin.patch(`/api/users/${fixture.disabled.id}`, { data: { active: true } })).ok()).toBe(true)
    expect((await context.request.post('/api/users/login', { data: { email: fixture.disabled.email, password: fixture.disabled.password } })).ok()).toBe(true)
    await page.goto('/')
    expect((await context.request.get(`/api/webmcp?action=editor&id=${fixture.publicPost.id}`)).status()).toBe(404)
    expect((await context.request.get(`/api/webmcp?action=preview&id=${fixture.publicPost.id}`)).status()).toBe(200)
    expect((await admin.patch(`/api/users/${fixture.disabled.id}`, { data: { active: false } })).ok()).toBe(true)
    expect(await execute(page, 'preview_post', { id: fixture.publicPost.id })).toMatchObject({ success: false, code: 404 })
    expect((await context.request.get(`/next/webmcp-preview?id=${fixture.publicPost.id}`, { maxRedirects: 0 })).status()).toBe(404)
  } finally {
    await admin.patch(`/api/users/${fixture.disabled.id}`, { data: { active: false } })
    await admin.dispose()
  }
})

test('joint v1 HTTP MCP publication to v2 native Chrome search, article and heading', async ({ page, baseURL }) => {
  const client = new Client({ name: 'webmcp-browser-acceptance', version: '1.0.0' })
  interface PostResult { ok: boolean; data?: { id: number; revision: number; slug: string }; error?: { code: string } }
  async function call(name: string, input: Record<string, unknown>) {
    const result = await client.callTool({ name, arguments: input })
    const response = result.structuredContent as unknown as PostResult
    expect(response.ok, response.error?.code).toBe(true)
    expect(result.isError).not.toBe(true)
    if (!response.data) throw new Error('MCP post result missing')
    return response.data
  }
  try {
    await client.connect(new StreamableHTTPClientTransport(new URL('/mcp', baseURL), {
      requestInit: { headers: { Authorization: `Bearer ${fixture.mcpKey}` } },
    }))
    const title = `${fixture.prefix} joint ${randomUUID().slice(0, 8)}`
    const draft = await call('create_post', { requestId: randomUUID(), title, markdown: '## Joint browser acceptance\n\nPublished by the real MCP HTTP transport.' })
    const read = await call('get_post', { id: draft.id })
    expect(read.id).toBe(draft.id)
    const updated = await call('update_post', { id: draft.id, expectedRevision: draft.revision, markdown: '## Joint browser acceptance\n\nUpdated by the real MCP HTTP transport.' })
    const published = await call('publish_post', { id: updated.id, expectedRevision: updated.revision })
    await page.goto('/')
    await navigation(page, 'set_search_query', { query: title }, /\/search\?q=/)
    await expect(page.locator('.yohaku-post-list').getByRole('heading', { name: title, exact: true })).toBeVisible()
    await navigation(page, 'open_post', { slug: published.slug }, `/posts/${published.slug}`)
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    const heading = page.locator('[data-article-content] h2').first()
    const headingID = await heading.getAttribute('id')
    expect(headingID).toBeTruthy()
    expect(await execute(page, 'scroll_to_section', { headingID })).toMatchObject({ success: true })
    await expectInViewport(heading)
    await screenshot(page, 'native-joint-mcp-publication')
  } finally {
    await client.close()
  }
})
