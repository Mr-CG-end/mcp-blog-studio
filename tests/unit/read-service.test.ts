import { describe, expect, it, vi } from 'vitest'
import { createReadBlogService } from '@/services/blog/read'
import { BlogError } from '@/mcp/errors'
import type { ActorContext } from '@/mcp/contracts'
import type { Payload } from 'payload'

describe('M05: ReadBlogService', () => {
  const adminActor: ActorContext = {
    userID: 1,
    role: 'admin',
    keyID: 1,
    requestID: 'req-admin',
    source: 'mcp',
  }

  const authorAActor: ActorContext = {
    userID: 10,
    role: 'author',
    keyID: 2,
    requestID: 'req-author-a',
    source: 'mcp',
  }

  const mockConverter = {
    inspect: vi.fn().mockResolvedValue({ contentReplaceable: true, warnings: [] }),
    toMarkdown: vi.fn().mockResolvedValue({
      markdown: '# 文章正文 Markdown',
      contentReplaceable: true,
      warnings: [],
    }),
    fromMarkdown: vi.fn().mockResolvedValue({ content: {} }),
  }

  it('getIdentity: 根据身份角色返回正确的能力和名称', async () => {
    const mockPayload = {
      findByID: vi.fn().mockResolvedValue({ id: 1, name: '超级管理员' }),
    } as unknown as Payload

    const service = createReadBlogService(mockPayload, mockConverter)
    const adminIdentity = await service.getIdentity(adminActor, {})
    expect(adminIdentity.name).toBe('超级管理员')
    expect(adminIdentity.capabilities).toContain('read:all')
    expect(adminIdentity.capabilities).toContain('manage:settings')

    const authorIdentity = await service.getIdentity(authorAActor, {})
    expect(authorIdentity.role).toBe('author')
    expect(authorIdentity.capabilities).toEqual(['read:own', 'write:own'])
  })

  it('listPosts: 严格贯彻作者与管理员的权限隔离', async () => {
    let capturedWhere: unknown = null
    const mockPayload = {
      find: vi.fn().mockImplementation((args) => {
        capturedWhere = args.where
        return {
          docs: [
            {
              id: 101,
              slug: 'post-published',
              title: '公开文章',
              summary: '摘要',
              _status: 'published',
              owner: 10,
              revision: 2,
              categories: [{ id: 1 }],
              heroImage: 5,
              updatedAt: '2026-10-01T12:00:00.000Z',
              publishedAt: '2026-10-01T12:00:00.000Z',
            },
            {
              id: 102,
              slug: 'post-draft',
              title: '草稿文章',
              summary: null,
              _status: 'draft',
              owner: 10,
              revision: 1,
              categories: [],
              heroImage: null,
              updatedAt: '2026-10-01T13:00:00.000Z',
              publishedAt: null,
            },
          ],
          totalDocs: 2,
          page: 1,
          limit: 12,
          totalPages: 1,
          hasNextPage: false,
        }
      }),
    } as unknown as Payload

    const service = createReadBlogService(mockPayload, mockConverter)

    // 普通作者调用 listPosts：默认排除回收站，只能看已发布 + 自己的草稿
    const authorRes = await service.listPosts(authorAActor, { page: 1, limit: 12 })
    expect(authorRes.items).toHaveLength(2)
    expect(capturedWhere).toEqual({
      and: [
        {
          and: [
            { deletedAt: { exists: false } },
            {
              or: [
                { _status: { equals: 'published' } },
                { owner: { equals: 10 } },
              ],
            },
          ],
        },
      ],
    })

    // 公开文章带有 publicURL，草稿文章 publicURL 为 null
    expect(authorRes.items[0].publicURL).toContain('/posts/post-published')
    expect(authorRes.items[1].publicURL).toBeNull()

    // 显式查询回收站：作者只能查自己的回收站
    await service.listPosts(authorAActor, { page: 1, limit: 12, state: 'trashed' })
    expect(capturedWhere).toEqual({
      and: [
        {
          and: [
            { deletedAt: { exists: true } },
            { owner: { equals: 10 } },
          ],
        },
      ],
    })

    // 管理员查询回收站：查全部回收文章
    await service.listPosts(adminActor, { page: 1, limit: 12, state: 'trashed' })
    expect(capturedWhere).toEqual({
      and: [
        { deletedAt: { exists: true } },
      ],
    })
  })

  it('getPost: 越权读取他人草稿时统一抛出 NOT_FOUND', async () => {
    const mockPayload = {
      find: vi.fn().mockResolvedValue({
        docs: [
          {
            id: 200,
            slug: 'author-b-private-draft',
            title: '作者 B 的私有草稿',
            _status: 'draft',
            owner: 99, // 归属作者 B
            content: {},
            updatedAt: '2026-10-01T10:00:00.000Z',
          },
        ],
      }),
    } as unknown as Payload

    const service = createReadBlogService(mockPayload, mockConverter)

    // 作者 A 试图读取作者 B 的草稿 -> 抛出 NOT_FOUND 阻止嗅探
    await expect(service.getPost(authorAActor, { id: 200 })).rejects.toThrow(BlogError)
    await expect(service.getPost(authorAActor, { id: 200 })).rejects.toMatchObject({
      code: 'NOT_FOUND',
    })

    // 管理员读取 -> 成功
    const adminRes = await service.getPost(adminActor, { id: 200 })
    expect(adminRes.id).toBe(200)
    expect(adminRes.markdown).toBe('# 文章正文 Markdown')
  })

  it('listCategories 与 listMedia: 返回脱敏结构', async () => {
    const mockPayload = {
      find: vi.fn().mockImplementation(({ collection }) => {
        if (collection === 'categories') {
          return {
            docs: [{ id: 1, title: '技术', slug: 'tech' }],
            totalDocs: 1,
            page: 1,
            limit: 12,
            totalPages: 1,
            hasNextPage: false,
          }
        }
        if (collection === 'media') {
          return {
            docs: [
              {
                id: 1,
                alt: '封面图',
                url: 'https://cdn.example.com/cover.jpg',
                mimeType: 'image/jpeg',
                width: 1200,
                height: 630,
                secretStorageKey: 'should-not-leak',
              },
            ],
            totalDocs: 1,
            page: 1,
            limit: 12,
            totalPages: 1,
            hasNextPage: false,
          }
        }
        return { docs: [] }
      }),
    } as unknown as Payload

    const service = createReadBlogService(mockPayload, mockConverter)

    const cats = await service.listCategories(authorAActor, { page: 1, limit: 12 })
    expect(cats.items).toEqual([{ id: 1, title: '技术', slug: 'tech' }])

    const media = await service.listMedia(authorAActor, { page: 1, limit: 12 })
    expect(media.items[0]).toEqual({
      id: 1,
      alt: '封面图',
      url: 'https://cdn.example.com/cover.jpg',
      mimeType: 'image/jpeg',
      width: 1200,
      height: 630,
    })
    expect((media.items[0] as Record<string, unknown>).secretStorageKey).toBeUndefined()
  })
})
