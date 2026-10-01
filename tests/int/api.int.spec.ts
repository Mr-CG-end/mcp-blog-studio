import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'
import type { Payload } from 'payload'
import type { Post, User } from '@/payload-types'
import sharp from 'sharp'

dotenv.config({ path: '.env.local', override: true })
const dbURL = new URL(process.env.DATABASE_URL || 'http://invalid')
if (!['127.0.0.1', 'localhost'].includes(dbURL.hostname) || dbURL.pathname !== '/blog_studio')
  throw new Error('集成测试仅允许连接本地 blog_studio 数据库')
const context = { disableRevalidate: true }
const prefix = `test-${randomUUID()}`
const content: Post['content'] = {
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
            text: '正文检索关键词：樱桃星球',
            detail: 0,
            format: 0,
            mode: 'normal',
            style: '',
          },
        ],
      },
    ],
  },
}
let payload: Payload
let admin: User, a: User, b: User
const users: number[] = [],
  posts: number[] = [],
  media: number[] = []
const auth = (user?: User) => ({ user, overrideAccess: false, context: { ...context } })
async function createPost(status: 'draft' | 'published' = 'draft') {
  const post = await payload.create({
    collection: 'posts',
    ...auth(a),
    data: {
      title: prefix,
      slug: `${prefix}-${posts.length}`,
      content,
      owner: a.id,
      revision: 1,
      _status: status,
    },
  })
  posts.push(post.id)
  return post
}
beforeAll(async () => {
  const { getPayload } = await import('payload')
  const { default: config } = await import('@/payload.config')
  payload = await getPayload({ config })
  for (const [i, role] of ['admin', 'author', 'author'].entries()) {
    const user = await payload.create({
      collection: 'users',
      overrideAccess: true,
      context: { bootstrap: true },
      data: {
        email: `${prefix}-${i}@test.invalid`,
        password: randomUUID(),
        name: `测试${i}`,
        role: role as 'admin' | 'author',
        active: true,
      },
    })
    users.push(user.id)
    if (i === 0) admin = user
    else if (i === 1) a = user
    else b = user
  }
})
afterAll(async () => {
  if (!payload) return
  for (const id of posts)
    await payload
      .delete({ collection: 'posts', id, overrideAccess: true, context, trash: true })
      .catch(() => {})
  for (const id of media)
    await payload.delete({ collection: 'media', id, overrideAccess: true, context }).catch(() => {})
  await payload.delete({
    collection: 'audit-logs',
    overrideAccess: true,
    where: { actor: { in: users } },
  })
  for (const id of users) await payload.delete({ collection: 'users', id, overrideAccess: true })
  await payload.destroy()
})
describe('博客权限与生命周期（真实 PostgreSQL）', () => {
  it('拒绝匿名注册及作者提权', async () => {
    await expect(
      payload.create({
        collection: 'users',
        ...auth(),
        data: {
          email: `${prefix}-bad@test.invalid`,
          password: randomUUID(),
          name: '未授权',
          role: 'admin',
        },
      }),
    ).rejects.toThrow()
    const changed = await payload.update({
      collection: 'users',
      id: a.id,
      ...auth(a),
      data: { role: 'admin' },
    })
    expect(changed.role).toBe('author')
  })
  it('公开查询和其他作者无法读取草稿或其版本', async () => {
    const post = await createPost()
    await expect(
      payload.findByID({ collection: 'posts', id: post.id, ...auth() }),
    ).rejects.toThrow()
    await expect(
      payload.findByID({ collection: 'posts', id: post.id, ...auth(b) }),
    ).rejects.toThrow()
    const versions = await payload.findVersions({
      collection: 'posts',
      ...auth(b),
      where: { parent: { equals: post.id } },
    })
    expect(versions.docs).toHaveLength(0)
    expect((await payload.findByID({ collection: 'posts', id: post.id, ...auth(a) })).id).toBe(
      post.id,
    )
  })
  it('所有者不可伪造，其他作者无法修改文章', async () => {
    const post = await createPost()
    const updated = await payload.update({
      collection: 'posts',
      id: post.id,
      ...auth(a),
      data: { owner: b.id, revision: post.revision },
    })
    expect(typeof updated.owner === 'object' ? updated.owner.id : updated.owner).toBe(a.id)
    await expect(
      payload.update({
        collection: 'posts',
        id: post.id,
        ...auth(b),
        data: { title: '越权', revision: updated.revision },
      }),
    ).rejects.toThrow()
  })
  it('发布、立即更新、下架、回收、恢复为草稿', async () => {
    let post = await createPost()
    post = await payload.update({
      collection: 'posts',
      id: post.id,
      ...auth(a),
      data: { revision: post.revision, _status: 'published' },
    })
    expect((await payload.findByID({ collection: 'posts', id: post.id, ...auth() }))._status).toBe(
      'published',
    )
    post = await payload.update({
      collection: 'posts',
      id: post.id,
      ...auth(a),
      data: { revision: post.revision, title: '已修改' },
    })
    expect((await payload.findByID({ collection: 'posts', id: post.id, ...auth() })).title).toBe(
      '已修改',
    )
    const found = await payload.find({
      collection: 'posts',
      ...auth(),
      where: { and: [{ id: { equals: post.id } }, { searchText: { like: '樱桃星球' } }] },
    })
    expect(found.totalDocs).toBe(1)
    post = await payload.update({
      collection: 'posts',
      id: post.id,
      ...auth(a),
      data: { revision: post.revision, _status: 'draft' },
    })
    await expect(
      payload.findByID({ collection: 'posts', id: post.id, ...auth() }),
    ).rejects.toThrow()
    post = await payload.update({
      collection: 'posts',
      id: post.id,
      ...auth(a),
      data: { revision: post.revision, deletedAt: new Date().toISOString() },
    })
    expect(post.deletedAt).toBeTruthy()
    const publicTrash = await payload.find({
      collection: 'posts',
      ...auth(),
      trash: true,
      where: { id: { equals: post.id } },
    })
    expect(publicTrash.totalDocs).toBe(0)
    await expect(
      payload.delete({ collection: 'posts', id: post.id, ...auth(a), trash: true }),
    ).rejects.toThrow()
    post = await payload.update({
      collection: 'posts',
      id: post.id,
      ...auth(a),
      trash: true,
      data: { revision: post.revision, deletedAt: null, _status: 'published' },
    })
    expect(post._status).toBe('draft')
    expect(post.deletedAt).toBeNull()
  })
  it('数据库行锁保证同时更新只有一个成功，拒绝旧版本覆盖', async () => {
    const post = await createPost('published')
    const result = await Promise.allSettled(
      ['版本甲', '版本乙'].map((title) =>
        payload.update({
          collection: 'posts',
          id: post.id,
          ...auth(a),
          data: { revision: post.revision, title },
        }),
      ),
    )
    expect(result.filter((r) => r.status === 'fulfilled')).toHaveLength(1)
    expect(result.filter((r) => r.status === 'rejected')).toHaveLength(1)
    await expect(
      payload.update({
        collection: 'posts',
        id: post.id,
        ...auth(a),
        data: { revision: post.revision, title: '旧版' },
      }),
    ).rejects.toThrow(/VERSION_CONFLICT/)
  })
  it('历史版本恢复保留归属和递增版本，恢复为草稿', async () => {
    const post = await createPost('published')
    const versions = await payload.findVersions({
      collection: 'posts',
      ...auth(a),
      where: { parent: { equals: post.id } },
    })
    const oldVersion = versions.docs[0]
    const changed = await payload.update({
      collection: 'posts',
      id: post.id,
      ...auth(a),
      data: { revision: post.revision, title: '新标题' },
    })
    await expect(
      payload.restoreVersion({ collection: 'posts', id: oldVersion.id, ...auth(b) }),
    ).rejects.toThrow()
    const restored = await payload.restoreVersion({
      collection: 'posts',
      id: oldVersion.id,
      ...auth(a),
    })
    expect(restored.title).toBe(post.title)
    expect(restored.revision).toBe(changed.revision + 1)
    expect(restored._status).toBe('draft')
  })
  it('分类及站点设置仅管理员可写', async () => {
    await expect(
      payload.create({
        collection: 'categories',
        ...auth(a),
        data: { title: '拒绝分类', slug: 'rejected-category' },
      }),
    ).rejects.toThrow()
    await expect(
      payload.updateGlobal({ slug: 'site-settings', ...auth(a), data: { title: '越权修改' } }),
    ).rejects.toThrow()
  })
  it('图片所属权限和引用保护', async () => {
    const data = await sharp({
      create: { width: 24, height: 24, channels: 3, background: '#398a62' },
    })
      .png()
      .toBuffer()
    const image = await payload.create({
      collection: 'media',
      ...auth(a),
      data: { alt: '测试图片', owner: a.id },
      file: { data, name: `${prefix}.png`, mimetype: 'image/png', size: data.length },
    })
    media.push(image.id)
    await expect(
      payload.update({ collection: 'media', id: image.id, ...auth(b), data: { alt: '越权' } }),
    ).rejects.toThrow()
    const post = await createPost()
    const updated = await payload.update({
      collection: 'posts',
      id: post.id,
      ...auth(a),
      data: { revision: post.revision, heroImage: image.id },
    })
    await expect(payload.delete({ collection: 'media', id: image.id, ...auth(a) })).rejects.toThrow(
      /引用/,
    )
    await payload.update({
      collection: 'posts',
      id: post.id,
      ...auth(a),
      data: { revision: updated.revision, heroImage: null },
    })
    await payload.delete({ collection: 'media', id: image.id, ...auth(a) })
    media.splice(media.indexOf(image.id), 1)
  })
  it('操作日志不可伪造且作者仅可读自己的记录', async () => {
    const post = await createPost()
    const own = await payload.find({
      collection: 'audit-logs',
      ...auth(a),
      where: { target: { equals: String(post.id) } },
    })
    expect(own.totalDocs).toBeGreaterThan(0)
    const other = await payload.find({
      collection: 'audit-logs',
      ...auth(b),
      where: { target: { equals: String(post.id) } },
    })
    expect(other.totalDocs).toBe(0)
    await expect(
      payload.update({
        collection: 'audit-logs',
        id: own.docs[0].id,
        ...auth(admin),
        data: { action: '伪造' },
      }),
    ).rejects.toThrow()
  })
  it('停用账号无法继续写入', async () => {
    const disabled = await payload.update({
      collection: 'users',
      id: b.id,
      ...auth(admin),
      data: { active: false },
    })
    await expect(
      payload.create({
        collection: 'posts',
        ...auth(disabled),
        data: {
          title: '拒绝',
          slug: 'rejected-post',
          owner: b.id,
          revision: 1,
          content,
          _status: 'draft',
        },
      }),
    ).rejects.toThrow()
  })
})
