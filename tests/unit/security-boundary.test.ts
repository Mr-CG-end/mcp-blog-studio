import { describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET, POST } from '@/app/mcp/route'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createMcpServer } from '@/mcp/server'
import { createReadBlogService } from '@/services/blog/read'
import { inspectContent } from '@/services/blog/markdown/inspect'
import { convertLexicalToMarkdown } from '@/services/blog/markdown/toMarkdown'
import { BlogError, toolFailure } from '@/mcp/errors'
import type { ActorContext, BlogService } from '@/mcp/contracts'
import type { Payload } from 'payload'

describe('Security & Boundary Tests (模块 B: 安全与越权隔离专项测试)', () => {
  // =========================================================================
  // 1. HTTP 401 拦截机制 (/mcp 鉴权守卫)
  // =========================================================================
  describe('1. HTTP 401 拦截机制 (/mcp 鉴权守卫)', () => {
    it('未携带 Authorization 请求 GET /mcp 时返回 401 Unauthorized', async () => {
      const request = new NextRequest('http://localhost:3000/mcp', {
        method: 'GET',
      })
      const response = await GET(request)

      expect(response.status).toBe(401)
      expect(response.headers.get('content-type')).toContain('application/json')
      const body = await response.json()
      expect(body).toEqual({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Unauthorized: 缺少有效 Bearer 认证 Token',
        },
        id: null,
      })
    })

    it('未携带 Authorization 请求 POST /mcp 时返回 401 Unauthorized', async () => {
      const request = new NextRequest('http://localhost:3000/mcp', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'tools/list',
          id: 1,
        }),
      })
      const response = await POST(request)

      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error.code).toBe(-32000)
      expect(body.error.message).toContain('Unauthorized')
    })

    it('携带非 Bearer 认证头 (如 Basic) 请求时返回 401', async () => {
      const request = new NextRequest('http://localhost:3000/mcp', {
        method: 'POST',
        headers: {
          authorization: 'Basic dXNlcjpwYXNz',
        },
      })
      const response = await POST(request)
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error.message).toContain('缺少有效 Bearer 认证 Token')
    })

    it('携带空 Bearer 或只有空白字符时返回 401', async () => {
      const request = new NextRequest('http://localhost:3000/mcp', {
        method: 'POST',
        headers: {
          authorization: 'Bearer ',
        },
      })
      const response = await POST(request)
      expect(response.status).toBe(401)
    })

    it('携带伪造/错误的 Bearer Token 时返回 401', async () => {
      const request = new NextRequest('http://localhost:3000/mcp', {
        method: 'POST',
        headers: {
          authorization: 'Bearer hacker-fake-token-123456',
        },
      })
      const response = await POST(request)
      expect(response.status).toBe(401)
      const body = await response.json()
      expect(body.error.message).toContain('缺少有效 Bearer 认证 Token')
    })

    it('携带不存在或已过期的 mcp-session-id 时返回 404', async () => {
      const request = new NextRequest('http://localhost:3000/mcp', {
        method: 'POST',
        headers: {
          'mcp-session-id': 'non-existent-session-uuid-9999',
        },
      })
      const response = await POST(request)
      expect(response.status).toBe(404)
      const body = await response.json()
      expect(body.error.message).toContain('Session expired or not found')
    })

    it('携带有效 Token (dev-mcp-token) 请求初始化时，鉴权守卫放行且不返回 401', async () => {
      const request = new NextRequest('http://localhost:3000/mcp', {
        method: 'POST',
        headers: {
          authorization: 'Bearer dev-mcp-token',
          'content-type': 'application/json',
          accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0' },
          },
          id: 1,
        }),
      })
      const response = await POST(request)
      expect(response.status).not.toBe(401)
      expect(response.status).toBe(200)
    })
  })

  // =========================================================================
  // 2. 普通作者无法读取或搜索到其他作者的草稿文章（返回 NOT_FOUND 阻止探测）
  // =========================================================================
  describe('2. 作者越权隔离与草稿嗅探防御', () => {
    const authorAActor: ActorContext = {
      userID: 10,
      role: 'author',
      keyID: 2,
      requestID: 'req-author-a',
      source: 'mcp',
    }

    const adminActor: ActorContext = {
      userID: 1,
      role: 'admin',
      keyID: 1,
      requestID: 'req-admin',
      source: 'mcp',
    }

    const mockConverter = {
      inspect: vi.fn().mockResolvedValue({ contentReplaceable: true, warnings: [] }),
      toMarkdown: vi.fn().mockResolvedValue({
        markdown: '# 正文内容',
        contentReplaceable: true,
        warnings: [],
      }),
      fromMarkdown: vi.fn().mockResolvedValue({ content: {} }),
    }

    it('getPost (ID 方式): 作者 A 访问作者 B 的未公开草稿，必须抛出 NOT_FOUND 阻止嗅探探测', async () => {
      const mockPayload = {
        find: vi.fn().mockResolvedValue({
          docs: [
            {
              id: 201,
              slug: 'author-b-secret-draft',
              title: '作者 B 的秘密草稿',
              _status: 'draft',
              owner: 20, // 归属作者 B (userID: 20)
              content: {},
              updatedAt: '2026-10-01T12:00:00.000Z',
            },
          ],
        }),
      } as unknown as Payload

      const service = createReadBlogService(mockPayload, mockConverter)

      // 验证必须抛出 BlogError 且 code 为 NOT_FOUND，绝不能返回 FORBIDDEN (防止攻击者确认文章 ID 存在)
      await expect(service.getPost(authorAActor, { id: 201 })).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: '文章不存在',
      })
    })

    it('getPost (Slug 方式): 作者 A 通过 slug 访问作者 B 的草稿同样返回 NOT_FOUND', async () => {
      const mockPayload = {
        find: vi.fn().mockResolvedValue({
          docs: [
            {
              id: 202,
              slug: 'confidential-post-by-b',
              title: '作者 B 的未公开草稿',
              _status: 'draft',
              owner: 20,
              content: {},
              updatedAt: '2026-10-01T12:00:00.000Z',
            },
          ],
        }),
      } as unknown as Payload

      const service = createReadBlogService(mockPayload, mockConverter)

      await expect(service.getPost(authorAActor, { slug: 'confidential-post-by-b' })).rejects.toMatchObject({
        code: 'NOT_FOUND',
        message: '文章不存在',
      })
    })

    it('getPost 权限对比: 作者 A 可正常访问自己的草稿，管理员可访问任何人的草稿', async () => {
      const mockPayload = {
        find: vi.fn().mockImplementation(({ where }) => {
          const id = where?.id?.equals
          if (id === 101) {
            // 作者 A 自己的草稿
            return {
              docs: [
                {
                  id: 101,
                  slug: 'author-a-my-draft',
                  title: '作者 A 自己的草稿',
                  _status: 'draft',
                  owner: 10,
                  content: {},
                  updatedAt: '2026-10-01T12:00:00.000Z',
                },
              ],
            }
          }
          if (id === 201) {
            // 作者 B 的草稿
            return {
              docs: [
                {
                  id: 201,
                  slug: 'author-b-draft',
                  title: '作者 B 的草稿',
                  _status: 'draft',
                  owner: 20,
                  content: {},
                  updatedAt: '2026-10-01T12:00:00.000Z',
                },
              ],
            }
          }
          return { docs: [] }
        }),
      } as unknown as Payload

      const service = createReadBlogService(mockPayload, mockConverter)

      // 作者 A 读取自己的草稿 -> 成功
      const ownDraft = await service.getPost(authorAActor, { id: 101 })
      expect(ownDraft.id).toBe(101)
      expect(ownDraft.state).toBe('draft')

      // 管理员读取作者 B 的草稿 -> 成功
      const adminRead = await service.getPost(adminActor, { id: 201 })
      expect(adminRead.id).toBe(201)
      expect(adminRead.state).toBe('draft')
    })

    it('getPost: 他人已发布的公开文章，普通作者可以正常读取', async () => {
      const mockPayload = {
        find: vi.fn().mockResolvedValue({
          docs: [
            {
              id: 203,
              slug: 'author-b-public-article',
              title: '作者 B 的公开文章',
              _status: 'published',
              owner: 20,
              content: {},
              updatedAt: '2026-10-01T12:00:00.000Z',
              publishedAt: '2026-10-01T12:00:00.000Z',
            },
          ],
        }),
      } as unknown as Payload

      const service = createReadBlogService(mockPayload, mockConverter)
      const res = await service.getPost(authorAActor, { id: 203 })
      expect(res.id).toBe(203)
      expect(res.state).toBe('published')
      expect(res.publicURL).toContain('/posts/author-b-public-article')
    })

    it('searchPosts: 严格限制作者搜索条件，草稿搜索强制限制 owner=当前用户', async () => {
      let capturedWhere: unknown = null
      const mockPayload = {
        find: vi.fn().mockImplementation((args) => {
          capturedWhere = args.where
          return {
            docs: [],
            totalDocs: 0,
            page: 1,
            limit: 12,
            totalPages: 0,
            hasNextPage: false,
          }
        }),
      } as unknown as Payload

      const service = createReadBlogService(mockPayload, mockConverter)

      // 1. 普通作者指定搜索 draft
      await service.searchPosts(authorAActor, { page: 1, limit: 12, query: '机密', state: 'draft' })
      expect(capturedWhere).toEqual({
        and: [
          {
            and: [
              {
                and: [
                  { _status: { equals: 'draft' } },
                  { deletedAt: { exists: false } },
                ],
              },
              { owner: { equals: 10 } }, // 强制绑定当前作者 ID
            ],
          },
          {
            or: [
              { title: { like: '机密' } },
              { summary: { like: '机密' } },
              { searchText: { like: '机密' } },
            ],
          },
        ],
      })

      // 2. 普通作者默认全局搜索（未显式指定 state）
      await service.searchPosts(authorAActor, { page: 1, limit: 12, query: '架构' })
      expect(capturedWhere).toEqual({
        and: [
          {
            and: [
              { deletedAt: { exists: false } },
              {
                or: [
                  { _status: { equals: 'published' } },
                  { owner: { equals: 10 } }, // 只能搜索已发布或属于自己的草稿
                ],
              },
            ],
          },
          {
            or: [
              { title: { like: '架构' } },
              { summary: { like: '架构' } },
              { searchText: { like: '架构' } },
            ],
          },
        ],
      })

      // 3. 管理员搜索草稿：不受 owner 限制
      await service.searchPosts(adminActor, { page: 1, limit: 12, query: '机密', state: 'draft' })
      expect(capturedWhere).toEqual({
        and: [
          {
            and: [
              { _status: { equals: 'draft' } },
              { deletedAt: { exists: false } },
            ],
          },
          {
            or: [
              { title: { like: '机密' } },
              { summary: { like: '机密' } },
              { searchText: { like: '机密' } },
            ],
          },
        ],
      })
    })
  })

  // =========================================================================
  // 3. 回收站文章的权限隔离（非管理员且非本人绝对不可见）
  // =========================================================================
  describe('3. 回收站文章的安全与权限隔离', () => {
    const authorAActor: ActorContext = {
      userID: 10,
      role: 'author',
      keyID: 2,
      requestID: 'req-author-a',
      source: 'mcp',
    }

    const adminActor: ActorContext = {
      userID: 1,
      role: 'admin',
      keyID: 1,
      requestID: 'req-admin',
      source: 'mcp',
    }

    const mockConverter = {
      inspect: vi.fn().mockResolvedValue({ contentReplaceable: true, warnings: [] }),
      toMarkdown: vi.fn().mockResolvedValue({ markdown: '', contentReplaceable: true, warnings: [] }),
      fromMarkdown: vi.fn().mockResolvedValue({ content: {} }),
    }

    it('getPost: 他人已回收的文章（无论此前是 draft 还是 published），作者 A 访问必须抛出 NOT_FOUND', async () => {
      const mockPayload = {
        find: vi.fn().mockImplementation(({ where }) => {
          const id = where?.id?.equals
          if (id === 301) {
            // 作者 B 的已回收草稿
            return {
              docs: [
                {
                  id: 301,
                  slug: 'trashed-b-draft',
                  title: '作者 B 的回收草稿',
                  _status: 'draft',
                  deletedAt: '2026-10-01T08:00:00.000Z',
                  owner: 20,
                  content: {},
                },
              ],
            }
          }
          if (id === 302) {
            // 作者 B 的已回收但此前是 published 的文章
            return {
              docs: [
                {
                  id: 302,
                  slug: 'trashed-b-published',
                  title: '作者 B 此前发布的回收文章',
                  _status: 'published',
                  deletedAt: '2026-10-01T08:00:00.000Z',
                  owner: 20,
                  content: {},
                },
              ],
            }
          }
          return { docs: [] }
        }),
      } as unknown as Payload

      const service = createReadBlogService(mockPayload, mockConverter)

      // 验证作者 B 的已回收草稿 -> 抛出 NOT_FOUND
      await expect(service.getPost(authorAActor, { id: 301 })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })

      // 验证即便 _status 为 published，只要存在 deletedAt，对于非本人非管理员即非公开 -> 抛出 NOT_FOUND
      await expect(service.getPost(authorAActor, { id: 302 })).rejects.toMatchObject({
        code: 'NOT_FOUND',
      })
    })

    it('getPost: 作者本人可读取自己的回收站文章，管理员可读取任意回收站文章', async () => {
      const mockPayload = {
        find: vi.fn().mockImplementation(({ where }) => {
          const id = where?.id?.equals
          if (id === 303) {
            // 作者 A 自己的回收文章
            return {
              docs: [
                {
                  id: 303,
                  slug: 'trashed-a-own',
                  title: '作者 A 自己的回收文章',
                  _status: 'draft',
                  deletedAt: '2026-10-01T09:00:00.000Z',
                  owner: 10,
                  content: {},
                },
              ],
            }
          }
          if (id === 301) {
            // 作者 B 的回收文章
            return {
              docs: [
                {
                  id: 301,
                  slug: 'trashed-b-post',
                  title: '作者 B 的回收文章',
                  _status: 'draft',
                  deletedAt: '2026-10-01T08:00:00.000Z',
                  owner: 20,
                  content: {},
                },
              ],
            }
          }
          return { docs: [] }
        }),
      } as unknown as Payload

      const service = createReadBlogService(mockPayload, mockConverter)

      // 作者 A 读取自己被回收的文章 -> 成功，返回 state: 'trashed' 且 publicURL: null
      const ownTrashed = await service.getPost(authorAActor, { id: 303 })
      expect(ownTrashed.id).toBe(303)
      expect(ownTrashed.state).toBe('trashed')
      expect(ownTrashed.publicURL).toBeNull()

      // 管理员读取作者 B 被回收的文章 -> 成功
      const adminTrashed = await service.getPost(adminActor, { id: 301 })
      expect(adminTrashed.id).toBe(301)
      expect(adminTrashed.state).toBe('trashed')
    })

    it('listPosts: 状态筛选隔离（普通列表剔除回收站，显式查回收站限制本人）', async () => {
      let capturedWhere: unknown = null
      const mockPayload = {
        find: vi.fn().mockImplementation((args) => {
          capturedWhere = args.where
          return {
            docs: [],
            totalDocs: 0,
            page: 1,
            limit: 12,
            totalPages: 0,
            hasNextPage: false,
          }
        }),
      } as unknown as Payload

      const service = createReadBlogService(mockPayload, mockConverter)

      // 默认列表：必须含有 deletedAt: { exists: false }
      await service.listPosts(authorAActor, { page: 1, limit: 10 })
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

      // 作者 A 查回收站：必须包含 deletedAt: { exists: true } 且 owner: { equals: 10 }
      await service.listPosts(authorAActor, { page: 1, limit: 10, state: 'trashed' })
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

      // 作者 A 搜索回收站：同样强制隔离只能搜索本人的回收文章
      await service.searchPosts(authorAActor, { page: 1, limit: 12, query: '回收', state: 'trashed' })
      expect(capturedWhere).toEqual({
        and: [
          {
            and: [
              { deletedAt: { exists: true } },
              { owner: { equals: 10 } },
            ],
          },
          {
            or: [
              { title: { like: '回收' } },
              { summary: { like: '回收' } },
              { searchText: { like: '回收' } },
            ],
          },
        ],
      })

      // 管理员查回收站：包含 deletedAt: { exists: true }，无 owner 限制
      await service.listPosts(adminActor, { page: 1, limit: 10, state: 'trashed' })
      expect(capturedWhere).toEqual({
        and: [
          { deletedAt: { exists: true } },
        ],
      })
    })
  })

  // =========================================================================
  // 4. 畸形或超出 Zod 边界参数与安全映射 (VALIDATION_ERROR / 堆栈与 SQL 脱敏)
  // =========================================================================
  describe('4. 参数校验防御与异常信息安全脱敏', () => {
    const actor: ActorContext = {
      userID: 1,
      role: 'admin',
      keyID: 1,
      requestID: 'req-sec-trace-id',
      source: 'mcp',
    }

    async function setupClient(services: Partial<BlogService> = {}) {
      const server = createMcpServer(actor, services as BlogService)
      const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
      await server.connect(serverTransport)
      const client = new Client({ name: 'security-test-client', version: '1.0' })
      await client.connect(clientTransport)
      return client
    }

    it('MCP 工具层 refine 二次校验失败时安全映射为 VALIDATION_ERROR', async () => {
      const client = await setupClient({
        getPost: async () => {
          throw new Error('should not be reached')
        },
        updatePost: async () => {
          throw new Error('should not be reached')
        },
      })

      // 1. get_post: 未提供任何定位参数 (触发 refine: Exactly one of id or slug is required)
      const emptyRes = await client.callTool({ name: 'get_post', arguments: {} })
      expect(emptyRes.isError).toBe(true)
      const emptyContent = emptyRes.structuredContent as Record<string, unknown>
      expect(emptyContent.ok).toBe(false)
      expect((emptyContent.error as Record<string, unknown>).code).toBe('VALIDATION_ERROR')
      expect((emptyContent.error as Record<string, unknown>).message).toContain('Exactly one of id or slug is required')
      expect(emptyContent.requestId).toBe('req-sec-trace-id')

      // 2. get_post: 同时提供 id 与 slug (触发互斥 refine 校验)
      const conflictRes = await client.callTool({ name: 'get_post', arguments: { id: 1, slug: 'test' } })
      expect(conflictRes.isError).toBe(true)
      const conflictContent = conflictRes.structuredContent as Record<string, unknown>
      expect(conflictContent.ok).toBe(false)
      expect((conflictContent.error as Record<string, unknown>).code).toBe('VALIDATION_ERROR')
      expect((conflictContent.error as Record<string, unknown>).message).toContain('Exactly one of id or slug is required')

      // 3. update_post: 仅提供 id 和 revision 但未提供任何待更新字段 (触发 refine: At least one changed field is required)
      const noFieldsRes = await client.callTool({ name: 'update_post', arguments: { id: 1, expectedRevision: 1 } })
      expect(noFieldsRes.isError).toBe(true)
      const noFieldsContent = noFieldsRes.structuredContent as Record<string, unknown>
      expect(noFieldsContent.ok).toBe(false)
      expect((noFieldsContent.error as Record<string, unknown>).code).toBe('VALIDATION_ERROR')
      expect((noFieldsContent.error as Record<string, unknown>).message).toContain('At least one changed field is required')
    })

    it('MCP 协议传输层输入校验拦截: 畸形数值与超界输入在协议边界被拦截，绝不流入服务层', async () => {
      const mockServiceHandler = vi.fn().mockResolvedValue({})
      const client = await setupClient({
        getPost: mockServiceHandler,
        listPosts: mockServiceHandler,
      })

      // 负数 ID
      const negRes = await client.callTool({ name: 'get_post', arguments: { id: -1 } })
      expect(negRes.isError).toBe(true)
      const negContent = (negRes as { content: Array<{ type: string; text: string }> }).content
      expect(negContent[0].type).toBe('text')
      expect(negContent[0].text).toContain('Input validation error')
      expect(mockServiceHandler).not.toHaveBeenCalled()

      // 分页 limit 超出 50 上限
      const overLimitRes = await client.callTool({ name: 'list_posts', arguments: { limit: 100 } })
      expect(overLimitRes.isError).toBe(true)
      const overLimitContent = (overLimitRes as { content: Array<{ type: string; text: string }> }).content
      expect(overLimitContent[0].text).toContain('Input validation error')
      expect(mockServiceHandler).not.toHaveBeenCalled()
    })

    it('Zod 契约模式深度防御: 覆盖所有工具的边界、类型、长度与 strict 注入检查', async () => {
      const { inputs } = await import('@/mcp/contracts')

      // 1. getPost 边界测试
      expect(inputs.getPost.safeParse({ id: 0 }).success).toBe(false)
      expect(inputs.getPost.safeParse({ id: 3.14 }).success).toBe(false)
      expect(inputs.getPost.safeParse({ slug: '' }).success).toBe(false)
      expect(inputs.getPost.safeParse({ slug: 'a'.repeat(121) }).success).toBe(false)
      // 严格模式 (strict) 拦截额外字段注入
      const injectionParse = inputs.getPost.safeParse({ id: 1, sql_injection: "' OR 1=1; --" })
      expect(injectionParse.success).toBe(false)
      if (!injectionParse.success) {
        expect(injectionParse.error.issues[0].message).toContain('Unrecognized key')
      }

      // 2. listPosts 边界测试
      expect(inputs.listPosts.safeParse({ page: 0 }).success).toBe(false)
      expect(inputs.listPosts.safeParse({ limit: 51 }).success).toBe(false)
      expect(inputs.listPosts.safeParse({ state: 'invalid_status' }).success).toBe(false)
      expect(inputs.listPosts.safeParse({ categoryID: -1 }).success).toBe(false)

      // 3. searchPosts 边界测试
      expect(inputs.searchPosts.safeParse({ query: '' }).success).toBe(false)
      expect(inputs.searchPosts.safeParse({ query: 'x'.repeat(201) }).success).toBe(false)

      // 4. createPost 边界测试
      expect(inputs.createPost.safeParse({ requestId: 'not-a-uuid', title: 't', markdown: 'm' }).success).toBe(false)
      expect(inputs.createPost.safeParse({ requestId: '550e8400-e29b-41d4-a716-446655440000', title: '', markdown: 'm' }).success).toBe(false)
      expect(inputs.createPost.safeParse({ requestId: '550e8400-e29b-41d4-a716-446655440000', title: 't', markdown: '' }).success).toBe(false)

      // 5. 校验 ZodError 到 BlogError(VALIDATION_ERROR) 的标准安全转换逻辑
      const badResult = inputs.getPost.safeParse({ id: -999 })
      expect(badResult.success).toBe(false)
      if (!badResult.success) {
        const blogError = new BlogError('VALIDATION_ERROR', badResult.error.issues.map((i) => i.message).join('; '))
        expect(blogError.code).toBe('VALIDATION_ERROR')
        expect(blogError.message).toContain('Number must be greater than 0')

        const toolRes = toolFailure(blogError, 'req-sec-trace-id')
        expect(toolRes).toEqual({
          ok: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: expect.stringContaining('Number must be greater than 0'),
          },
          requestId: 'req-sec-trace-id',
        })
      }
    })

    it('服务端底层未知异常与 SQL 报错安全脱敏: 绝不向客户端泄露服务端堆栈与 SQL 语句', async () => {
      const client = await setupClient({
        getPost: async () => {
          // 模拟底层 ORM / 数据库抛出带有高危 SQL 与服务器内部路径的异常
          const sensitiveError = new Error(
            'syntax error at or near "SELECT password_hash FROM payload_users WHERE id = 1"\n' +
            '    at executeQuery (/var/www/mcp-blog/node_modules/pg/lib/query.js:123:45)\n' +
            '    at Client.query (/var/www/mcp-blog/src/db/postgres.ts:67:89)',
          )
          sensitiveError.name = 'DatabaseError'
          throw sensitiveError
        },
      })

      const result = await client.callTool({ name: 'get_post', arguments: { id: 1 } })
      expect(result.isError).toBe(true)

      const structured = result.structuredContent as Record<string, unknown>
      expect(structured.ok).toBe(false)
      const error = structured.error as Record<string, unknown>

      // 错误码统一收敛为 INTERNAL_ERROR，错误信息必须为中立安全的提示文案
      expect(error.code).toBe('INTERNAL_ERROR')
      expect(error.message).toBe('服务暂时不可用，请记录 requestId。')

      // 校验请求追踪 ID 一致性
      expect(structured.requestId).toBe('req-sec-trace-id')

      // 严格断言返回给客户端的任何文本中绝对不包含 SQL 关键字、数据库表名、代码路径或堆栈信息
      const rawText = JSON.stringify(result)
      expect(rawText).not.toContain('SELECT password_hash')
      expect(rawText).not.toContain('payload_users')
      expect(rawText).not.toContain('executeQuery')
      expect(rawText).not.toContain('/var/www/')
      expect(rawText).not.toContain('postgres.ts')
    })

    it('直接单元测试 toolFailure 错误脱敏函数', () => {
      const dbErr = new Error('FATAL: connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed')
      const sanitized = toolFailure(dbErr, 'test-trace-id-123')

      expect(sanitized).toEqual({
        ok: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: '服务暂时不可用，请记录 requestId。',
        },
        requestId: 'test-trace-id-123',
      })

      // 已知 BlogError 则保留安全的业务错误码与预设消息
      const bizErr = new BlogError('NOT_FOUND', '文章不存在')
      const sanitizedBiz = toolFailure(bizErr, 'test-trace-id-123')
      expect(sanitizedBiz).toEqual({
        ok: false,
        error: {
          code: 'NOT_FOUND',
          message: '文章不存在',
        },
        requestId: 'test-trace-id-123',
      })
    })
  })

  // =========================================================================
  // 5. Banner、Table 等复杂富文本在 inspect/toMarkdown 时的 contentReplaceable=false 安全拦截
  // =========================================================================
  describe('5. 复杂富文本 (Banner / Table) contentReplaceable=false 安全拦截', () => {
    it('标准纯文本及支持的基础区块返回 contentReplaceable: true 且无警告', async () => {
      const simpleContent = {
        root: {
          type: 'root',
          children: [
            {
              type: 'heading',
              tag: 'h1',
              children: [{ type: 'text', text: '主标题', format: 0 }],
            },
            {
              type: 'paragraph',
              children: [
                { type: 'text', text: '这是一段包含', format: 0 },
                { type: 'text', text: '加粗', format: 1 },
                { type: 'text', text: '的文字。', format: 0 },
              ],
            },
            {
              type: 'block',
              fields: {
                blockType: 'code',
                language: 'typescript',
                code: 'console.log("hello")',
              },
            },
          ],
        },
      }

      const inspectResult = await inspectContent(simpleContent)
      expect(inspectResult.contentReplaceable).toBe(true)
      expect(inspectResult.warnings).toHaveLength(0)

      const markdownResult = await convertLexicalToMarkdown(simpleContent)
      expect(markdownResult.contentReplaceable).toBe(true)
      expect(markdownResult.warnings).toHaveLength(0)
      expect(markdownResult.markdown).toContain('# 主标题')
      expect(markdownResult.markdown).toContain('**加粗**')
      expect(markdownResult.markdown).toContain('```typescript\nconsole.log("hello")\n```')
    })

    it('检测到 Table 表格节点时，必须标记 contentReplaceable: false 并附带警告', async () => {
      const tableContent = {
        root: {
          type: 'root',
          children: [
            {
              type: 'paragraph',
              children: [{ type: 'text', text: '前置说明' }],
            },
            {
              type: 'table',
              children: [
                {
                  type: 'tablerow',
                  children: [
                    {
                      type: 'tablecell',
                      children: [{ type: 'text', text: '表头 1' }],
                    },
                    {
                      type: 'tablecell',
                      children: [{ type: 'text', text: '表头 2' }],
                    },
                  ],
                },
              ],
            },
          ],
        },
      }

      const inspectResult = await inspectContent(tableContent)
      expect(inspectResult.contentReplaceable).toBe(false)
      expect(inspectResult.warnings).toContain('文章包含表格结构，当前暂不支持无损转换为 Markdown 覆盖编辑')

      const markdownResult = await convertLexicalToMarkdown(tableContent)
      expect(markdownResult.contentReplaceable).toBe(false)
      expect(markdownResult.warnings).toContain('文章包含表格结构，当前暂不支持无损转换为 Markdown 覆盖编辑')
    })

    it('检测到 Banner 横幅区块时，必须标记 contentReplaceable: false 并附带警告', async () => {
      const bannerContent = {
        root: {
          type: 'root',
          children: [
            {
              type: 'block',
              fields: {
                blockType: 'banner',
                style: 'warning',
              },
            },
          ],
        },
      }

      const inspectResult = await inspectContent(bannerContent)
      expect(inspectResult.contentReplaceable).toBe(false)
      expect(inspectResult.warnings).toContain('文章包含横幅区块 (Banner)，当前暂不支持无损转换为 Markdown 覆盖编辑')

      const markdownResult = await convertLexicalToMarkdown(bannerContent)
      expect(markdownResult.contentReplaceable).toBe(false)
      expect(markdownResult.warnings).toContain('文章包含横幅区块 (Banner)，当前暂不支持无损转换为 Markdown 覆盖编辑')
      expect(markdownResult.markdown).toContain('> [!WARNING]\n> (横幅区块)')
    })

    it('检测到未知自定义区块时，必须拦截并标记 contentReplaceable: false', async () => {
      const customBlockContent = {
        root: {
          type: 'root',
          children: [
            {
              type: 'block',
              fields: {
                blockType: 'interactiveQuiz',
              },
            },
          ],
        },
      }

      const inspectResult = await inspectContent(customBlockContent)
      expect(inspectResult.contentReplaceable).toBe(false)
      expect(inspectResult.warnings[0]).toContain('未知自定义区块 (interactiveQuiz)')
    })

    it('深层嵌套的复杂结构 (如列表中包含 Table 或 Banner) 同样被递归探测并拦截', async () => {
      const nestedContent = {
        root: {
          type: 'root',
          children: [
            {
              type: 'list',
              listType: 'bullet',
              children: [
                {
                  type: 'listitem',
                  children: [
                    {
                      type: 'block',
                      fields: {
                        blockType: 'banner',
                        style: 'info',
                      },
                    },
                  ],
                },
              ],
            },
          ],
        },
      }

      const inspectResult = await inspectContent(nestedContent)
      expect(inspectResult.contentReplaceable).toBe(false)
      expect(inspectResult.warnings).toContain('文章包含横幅区块 (Banner)，当前暂不支持无损转换为 Markdown 覆盖编辑')
    })

    it('getPost 串联验证: 当文章包含 Banner 时，返回的 PostDetail 包含 contentReplaceable=false 与警告', async () => {
      const adminActor: ActorContext = {
        userID: 1,
        role: 'admin',
        keyID: 1,
        requestID: 'req-admin',
        source: 'mcp',
      }

      const mockPayload = {
        find: vi.fn().mockResolvedValue({
          docs: [
            {
              id: 501,
              slug: 'post-with-banner',
              title: '带横幅的文章',
              _status: 'published',
              owner: 1,
              content: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'block',
                      fields: {
                        blockType: 'banner',
                        style: 'info',
                      },
                    },
                    {
                      type: 'paragraph',
                      children: [{ type: 'text', text: '正文内容' }],
                    },
                  ],
                },
              },
              updatedAt: '2026-10-01T12:00:00.000Z',
              publishedAt: '2026-10-01T12:00:00.000Z',
            },
          ],
        }),
      } as unknown as Payload

      // 使用真实的 markdownConverter
      const service = createReadBlogService(mockPayload)
      const postDetail = await service.getPost(adminActor, { id: 501 })

      expect(postDetail.id).toBe(501)
      expect(postDetail.contentReplaceable).toBe(false)
      expect(postDetail.warnings).toHaveLength(1)
      expect(postDetail.warnings[0]).toContain('横幅区块 (Banner)')
      expect(postDetail.markdown).toContain('> [!INFO]\n> (横幅区块)')
      expect(postDetail.markdown).toContain('正文内容')
    })

    it('getPost 串联验证: 当文章包含 Table 时，返回的 PostDetail 包含 contentReplaceable=false 与表格警告', async () => {
      const adminActor: ActorContext = {
        userID: 1,
        role: 'admin',
        keyID: 1,
        requestID: 'req-admin',
        source: 'mcp',
      }

      const mockPayload = {
        find: vi.fn().mockResolvedValue({
          docs: [
            {
              id: 502,
              slug: 'post-with-table',
              title: '带表格的文章',
              _status: 'published',
              owner: 1,
              content: {
                root: {
                  type: 'root',
                  children: [
                    {
                      type: 'table',
                      children: [],
                    },
                    {
                      type: 'paragraph',
                      children: [{ type: 'text', text: '表格后的说明' }],
                    },
                  ],
                },
              },
              updatedAt: '2026-10-01T12:00:00.000Z',
              publishedAt: '2026-10-01T12:00:00.000Z',
            },
          ],
        }),
      } as unknown as Payload

      const service = createReadBlogService(mockPayload)
      const postDetail = await service.getPost(adminActor, { id: 502 })

      expect(postDetail.id).toBe(502)
      expect(postDetail.contentReplaceable).toBe(false)
      expect(postDetail.warnings).toHaveLength(1)
      expect(postDetail.warnings[0]).toContain('表格结构')
    })
  })
})
