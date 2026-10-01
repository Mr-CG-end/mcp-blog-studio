import { test, expect } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import sharp from 'sharp'

// Local-only demo accounts: credentials never enter reports or source bundles.
function password(email: string) {
  const text = readFileSync('.local/demo-accounts.md', 'utf8')
  const line = text.split(email)[1]?.match(/密码：([^\s]+)/)
  if (!line) throw new Error('请先运行 seed:demo，并保留 .local/demo-accounts.md')
  return line[1]
}
test('作者后台编辑发布，访客目录、代码、图片、下架与回收恢复', async ({ page, browser }) => {
  test.setTimeout(90000)
  await page.goto('/admin/login')
  await page.locator('#field-email').fill('author@blog.local')
  await page.locator('#field-password').fill(password('author@blog.local'))
  await page.getByRole('button', { name: '登录', exact: true }).click()
  await expect(page).toHaveURL(/\/admin$/)
  const me = await (await page.request.get('/api/users/me')).json()
  const tag = `browser-${randomUUID()}`
  let id: number | undefined
  let imageID: number | undefined
  const guest = await browser.newContext()
  try {
    const png = await sharp({
      create: { width: 600, height: 300, channels: 3, background: '#567966' },
    })
      .png()
      .toBuffer()
    const uploaded = await page.request.post('/api/media', {
      multipart: {
        _payload: JSON.stringify({ alt: '浏览器测试图片', owner: me.user.id }),
        file: { name: `${tag}.png`, mimeType: 'image/png', buffer: png },
      },
    })
    expect(uploaded.ok()).toBeTruthy()
    imageID = (await uploaded.json()).doc.id
    const text = (value: string) => ({
      type: 'text',
      version: 1,
      text: value,
      detail: 0,
      format: 0,
      mode: 'normal',
      style: '',
    })
    const children = [
      {
        type: 'heading',
        tag: 'h2',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [text('浏览器验收章节')],
      },
      {
        type: 'paragraph',
        version: 1,
        direction: null,
        format: '',
        indent: 0,
        children: [text('这是一篇自动化验收文章，仅测试时可见。')],
      },
      {
        type: 'block',
        version: 2,
        format: '',
        fields: {
          blockType: 'code',
          code: 'const greeting = "你好，博客"',
          language: 'javascript',
        },
      },
      {
        type: 'block',
        version: 2,
        format: '',
        fields: { blockType: 'mediaBlock', media: imageID },
      },
    ]
    const created = await page.request.post('/api/posts', {
      data: {
        title: tag,
        slug: tag,
        content: {
          root: { type: 'root', version: 1, direction: null, format: '', indent: 0, children },
        },
        owner: me.user.id,
        _status: 'draft',
      },
    })
    expect(created.ok()).toBeTruthy()
    id = (await created.json()).doc.id
    const publicPage = await guest.newPage()
    await publicPage.goto(`/posts/${tag}`)
    await expect(publicPage.getByRole('heading', { name: '页面不存在' })).toBeVisible()
    await page.goto(`/admin/collections/posts/${id}`)
    await page.locator('#field-summary').fill('由作者在后台填写的摘要')
    const saved = page.waitForResponse(
      (r) => r.url().includes(`/api/posts/${id}`) && r.request().method() === 'PATCH',
    )
    await page.getByRole('button', { name: '保存', exact: true }).click()
    expect((await saved).ok()).toBeTruthy()
    let post = await (await page.request.get(`/api/posts/${id}`)).json()
    expect(post.summary).toBe('由作者在后台填写的摘要')
    const publish = await page.request.patch(`/api/posts/${id}`, {
      data: { revision: post.revision, _status: 'published' },
    })
    expect(publish.ok()).toBeTruthy()
    await publicPage.reload()
    await expect(publicPage.getByRole('heading', { name: tag, exact: true })).toBeVisible()
    await publicPage
      .getByRole('navigation', { name: '文章目录' })
      .getByRole('link', { name: '浏览器验收章节' })
      .click()
    await expect(publicPage).toHaveURL(/#section-1$/)
    await guest.grantPermissions(['clipboard-read', 'clipboard-write'])
    await publicPage.getByRole('button', { name: '复制代码' }).click()
    await expect(publicPage.getByText('已复制', { exact: true })).toBeVisible()
    await publicPage.locator('.article-body img').click()
    await expect(publicPage.getByRole('dialog', { name: '图片预览' })).toBeVisible()
    await publicPage.keyboard.press('Escape')
    await expect(publicPage.getByRole('dialog')).not.toBeVisible()
    await publicPage.setViewportSize({ width: 390, height: 844 })
    expect(
      await publicPage.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy()
    post = await (await page.request.get(`/api/posts/${id}`)).json()
    await page.request.patch(`/api/posts/${id}`, {
      data: { revision: post.revision, _status: 'draft' },
    })
    await publicPage.reload()
    await expect(publicPage.getByRole('heading', { name: '页面不存在' })).toBeVisible()
    const trashed = await page.request.patch(`/api/posts/${id}`, {
      data: { deletedAt: new Date().toISOString() },
    })
    expect(trashed.ok()).toBeTruthy()
    const trash = await (await page.request.get(`/api/posts/${id}?trash=true`)).json()
    expect(trash.deletedAt).toBeTruthy()
    const restored = await page.request.patch(`/api/posts/${id}?trash=true`, {
      data: { revision: trash.revision, deletedAt: null, _status: 'published' },
    })
    expect(restored.ok()).toBeTruthy()
    expect((await restored.json()).doc._status).toBe('draft')
  } finally {
    await guest.close()
    await page.request.post('/api/users/login', {
      data: { email: 'admin@blog.local', password: password('admin@blog.local') },
    })
    if (id) await page.request.delete(`/api/posts/${id}?trash=true`)
    if (imageID) await page.request.delete(`/api/media/${imageID}`)
  }
})

test('搜索分页保留关键词且没有重复文章', async ({ request, page }) => {
  test.setTimeout(90000)
  const base = 'http://127.0.0.1:3000'
  const login = await request.post(`${base}/api/users/login`, {
    data: { email: 'author@blog.local', password: password('author@blog.local') },
  })
  expect(login.ok()).toBeTruthy()
  const user = (await login.json()).user
  const tag = `pagination-${randomUUID()}`
  const ids: number[] = []
  try {
    for (let i = 0; i < 13; i++) {
      const response = await request.post(`${base}/api/posts`, {
        data: {
          title: `${tag}-${i}`,
          slug: `${tag}-${i}`,
          owner: user.id,
          _status: 'published',
          content: {
            root: {
              type: 'root',
              version: 1,
              direction: null,
              format: '',
              indent: 0,
              children: [
                {
                  type: 'paragraph',
                  version: 1,
                  direction: null,
                  format: '',
                  indent: 0,
                  children: [
                    {
                      type: 'text',
                      version: 1,
                      text: tag,
                      detail: 0,
                      format: 0,
                      mode: 'normal',
                      style: '',
                    },
                  ],
                },
              ],
            },
          },
        },
      })
      expect(response.ok()).toBeTruthy()
      ids.push((await response.json()).doc.id)
    }
    await page.goto(`/search?q=${tag}`)
    await expect(page.locator('.article-list .post-card')).toHaveCount(12)
    const titles = await page.locator('.post-card h3').allTextContents()
    await page.getByRole('link', { name: '下一页' }).click()
    await expect(page).toHaveURL(new RegExp(`q=${tag}&page=2`))
    await expect(page.locator('.article-list .post-card')).toHaveCount(1)
    expect(titles).not.toContain(await page.locator('.post-card h3').innerText())
    await expect(page.getByRole('textbox', { name: '关键词' })).toHaveValue(tag)
  } finally {
    await request.post(`${base}/api/users/login`, {
      data: { email: 'admin@blog.local', password: password('admin@blog.local') },
    })
    for (const id of ids) await request.delete(`${base}/api/posts/${id}?trash=true`)
  }
})
