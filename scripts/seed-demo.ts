import { loadEnv } from 'payload/node'
import { randomBytes } from 'node:crypto'
import { mkdir, writeFile } from 'node:fs/promises'
import type { Post } from '../src/payload-types'
loadEnv()
const url = new URL(process.env.DATABASE_URL || '')
if (!['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/blog_studio')
  throw new Error('此脚本仅允许写入本地 blog_studio 开发数据库')
const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })
const context = { bootstrap: true, disableRevalidate: true }
const credentials: string[] = []
function paragraph(value: string) {
  return {
    type: 'paragraph',
    version: 1,
    direction: null,
    format: '' as const,
    indent: 0,
    children: [
      { type: 'text', version: 1, text: value, detail: 0, format: 0, mode: 'normal', style: '' },
    ],
  }
}
const richText = (value: string): Post['content'] => ({
  root: {
    type: 'root',
    version: 1,
    direction: null,
    format: '',
    indent: 0,
    children: value.split('\n\n').map(paragraph),
  },
})
try {
  async function user(email: string, name: string, role: 'admin' | 'author') {
    const found = await payload.find({
      collection: 'users',
      overrideAccess: true,
      where: { email: { equals: email } },
      limit: 1,
    })
    if (found.docs[0]) return found.docs[0]
    const password = randomBytes(18).toString('base64url')
    const created = await payload.create({
      collection: 'users',
      overrideAccess: true,
      context,
      data: { email, name, role, active: true, password },
    })
    credentials.push(`- ${name}：${email}\n  密码：${password}`)
    return created
  }
  const admin = await user('admin@blog.local', '博客管理员', 'admin')
  const author = await user('author@blog.local', '林间', 'author')
  await user('author2@blog.local', '知远', 'author')
  const topics = ['技术手记', '生活观察', '阅读笔记']
  const ids: number[] = []
  for (const [i, title] of topics.entries()) {
    const slug = ['technology', 'life', 'reading'][i]
    const found = await payload.find({
      collection: 'categories',
      overrideAccess: false,
      user: admin,
      where: { slug: { equals: slug } },
    })
    const category =
      found.docs[0] ||
      (await payload.create({
        collection: 'categories',
        overrideAccess: false,
        user: admin,
        data: { title, slug },
      }))
    ids.push(category.id)
  }
  const stories = [
    [
      'welcome',
      '从这里开始，记录每一次探索',
      '一篇文章，可以是一个问题的答案，也可以是一段尚未完成的思考。',
      '欢迎来到这个小小的写作空间。\n\n这里会分享技术实践、阅读所得，以及生活里值得记住的瞬间。文章不必一开始就完美，重要的是持续观察和记录。\n\n这是普通博客版本的演示文章，你可以登录后台修改、发布或移入回收站。',
    ],
    [
      'small-tools',
      '让日常工作更轻松的小工具',
      '从重复步骤中发现机会，把简单的事情做得顺手。',
      '每次遇到需要反复复制粘贴的工作，我都会停下来想一想：这一步能否被自动化？\n\n最有价值的工具往往从很小的需求开始。先明确输入和输出，再做一个可验证的版本，比追求完整的功能清单更有效。\n\n保持工具简单，记录使用方式，并为失败保留清晰的提示。',
    ],
    [
      'slow-walk',
      '在城市里，留一点慢下来的时间',
      '离开屏幕走一段路，熟悉的街道也会出现新的细节。',
      '傍晚的光线落在街角，平时匆忙走过的地方突然有了不同的颜色。\n\n散步不需要目的地。留意树叶、风和人群的声音，让注意力从待办事项里慢慢回到眼前。',
    ],
    [
      'reading-notes',
      '读完一本书之后，留下些什么',
      '比摘抄更多一句话：它怎样改变了我的理解？',
      '阅读笔记不只是保存原文。试着用自己的语言描述一个观点，再写下同意或不同意的理由。\n\n将书里的问题连接到自己的经验，笔记就会成为下一次思考的起点。',
    ],
  ]
  for (const [i, [slug, title, summary, body]] of stories.entries()) {
    const exists = await payload.find({
      collection: 'posts',
      overrideAccess: false,
      user: admin,
      where: { slug: { equals: slug } },
      limit: 1,
      trash: true,
    })
    if (exists.docs.length) continue
    await payload.create({
      collection: 'posts',
      overrideAccess: false,
      user: author,
      context,
      data: {
        slug,
        title,
        summary,
        content: richText(body),
        owner: author.id,
        authors: [author.id],
        revision: 1,
        categories: [ids[i < 2 ? 0 : i - 1]],
        _status: 'published',
      },
    })
  }
  const site = await payload.findGlobal({ slug: 'site-settings', overrideAccess: false })
  if (!site.about)
    await payload.updateGlobal({
      slug: 'site-settings',
      overrideAccess: false,
      user: admin,
      context,
      data: {
        title: 'MCP Blog Studio',
        description: '记录想法、分享实践与探索。',
        about: richText(
          '这是一个关于技术、阅读与生活的博客。\n\n每篇文章都是一次整理思路的过程。欢迎阅读，也欢迎带着新的问题回来。',
        ),
      },
    })
  if (credentials.length) {
    await mkdir('.local', { recursive: true })
    await writeFile(
      '.local/demo-accounts.md',
      `# 本地演示账号\n\n仅用于本机验证，请勿用于生产。\n\n${credentials.join('\n\n')}\n`,
      { mode: 0o600 },
    )
  }
  console.log('本地示例内容已就绪；已有内容未覆盖。新账号保存在 .local/demo-accounts.md。')
} finally {
  await payload.destroy()
}

process.exit(0)
