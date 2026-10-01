import { describe, expect, it } from 'vitest'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js'
import { createMcpServer } from '@/mcp/server'
import { BlogError } from '@/mcp/errors'
import type { ActorContext, BlogService } from '@/mcp/contracts'

describe('MCP Server & Tools', () => {
  const actor: ActorContext = {
    userID: 1,
    role: 'admin',
    keyID: 1,
    requestID: 'req-test-uuid',
    source: 'mcp',
  }

  async function setupClient(services: Partial<BlogService> = {}) {
    const server = createMcpServer(actor, services as BlogService)
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair()
    await server.connect(serverTransport)
    const client = new Client({ name: 'test-client', version: '1.0' })
    await client.connect(clientTransport)
    return client
  }

  it('注册全部 12 个读写工具，且 refine 校验不丢失 schema 属性', async () => {
    const client = await setupClient()
    const { tools } = await client.listTools()
    expect(tools).toHaveLength(12)

    const toolNames = tools.map((t) => t.name)
    expect(toolNames).toContain('get_current_user')
    expect(toolNames).toContain('list_posts')
    expect(toolNames).toContain('get_post')
    expect(toolNames).toContain('search_posts')
    expect(toolNames).toContain('list_categories')
    expect(toolNames).toContain('list_media')
    expect(toolNames).toContain('create_post')
    expect(toolNames).toContain('update_post')
    expect(toolNames).toContain('publish_post')
    expect(toolNames).toContain('unpublish_post')
    expect(toolNames).toContain('trash_post')
    expect(toolNames).toContain('restore_post')

    const getPost = tools.find((t) => t.name === 'get_post')
    expect(getPost?.inputSchema?.properties).toHaveProperty('id')
    expect(getPost?.inputSchema?.properties).toHaveProperty('slug')

    const updatePost = tools.find((t) => t.name === 'update_post')
    expect(updatePost?.inputSchema?.properties).toHaveProperty('id')
    expect(updatePost?.inputSchema?.properties).toHaveProperty('expectedRevision')
    expect(updatePost?.inputSchema?.properties).toHaveProperty('title')
  })

  it('成功调用工具返回 ok: true 及一致的 requestId', async () => {
    const client = await setupClient({
      getIdentity: async (a) => ({
        id: a.userID,
        name: '管理员',
        role: a.role,
        capabilities: ['read', 'write'],
      }),
    })

    const result = await client.callTool({ name: 'get_current_user', arguments: {} })
    expect(result.isError).toBeFalsy()
    expect(result.structuredContent).toEqual({
      ok: true,
      data: {
        id: 1,
        name: '管理员',
        role: 'admin',
        capabilities: ['read', 'write'],
      },
      requestId: 'req-test-uuid',
    })
  })

  it('参数二次校验失败时映射为 VALIDATION_ERROR 错误', async () => {
    const client = await setupClient({
      getPost: async () => {
        throw new Error('should not reach service')
      },
    })

    const result = await client.callTool({ name: 'get_post', arguments: {} })
    expect(result.isError).toBe(true)
    const content = result.structuredContent as Record<string, unknown>
    expect(content?.ok).toBe(false)
    expect((content?.error as Record<string, unknown>)?.code).toBe('VALIDATION_ERROR')
    expect(content?.requestId).toBe('req-test-uuid')
  })

  it('已知业务异常正确映射对应 code 与 message', async () => {
    const client = await setupClient({
      getPost: async () => {
        throw new BlogError('NOT_FOUND', '文章不存在')
      },
    })

    const result = await client.callTool({ name: 'get_post', arguments: { id: 999 } })
    expect(result.isError).toBe(true)
    expect(result.structuredContent).toEqual({
      ok: false,
      error: {
        code: 'NOT_FOUND',
        message: '文章不存在',
      },
      requestId: 'req-test-uuid',
    })
  })
})
