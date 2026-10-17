/** Real HTTP demo. Creates one article and leaves it restored as a private draft. */
import dotenv from 'dotenv'
import { randomUUID } from 'node:crypto'
import assert from 'node:assert/strict'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { outputs, type BlogMethod, type BlogOutput, type PostSummary } from '../src/mcp/contracts'

dotenv.config({ path: '.env.local' })
dotenv.config()

async function main() {
  const token = process.env.MCP_TOKEN
  const endpoint = process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp'
  if (!token) throw new Error('请设置后台创建的 MCP_TOKEN；开发固定口令已不再支持')
  const client = new Client({ name: 'blog-studio-demo', version: '1.0.0' })
  const names = new Set<string>()
  async function call<K extends BlogMethod>(
    method: K,
    name: string,
    args: Record<string, unknown> = {},
  ): Promise<BlogOutput<K>> {
    const result = await client.callTool({ name, arguments: args })
    const envelope = result.structuredContent as {
      ok: boolean
      data?: unknown
      error?: { code: string }
      requestId: string
    }
    assert(envelope?.ok, `${name}: ${envelope?.error?.code || '调用失败'} (${envelope?.requestId})`)
    assert(!result.isError)
    const data = outputs[method].parse(envelope.data) as BlogOutput<K>
    names.add(name)
    console.log(`✓ ${name} (${envelope.requestId})`)
    return data
  }
  try {
    await client.connect(
      new StreamableHTTPClientTransport(new URL(endpoint), {
        requestInit: { headers: { Authorization: `Bearer ${token}` } },
      }),
    )
    assert.equal((await client.listTools()).tools.length, 12)
    await call('getIdentity', 'get_current_user')
    await call('listCategories', 'list_categories')
    await call('listMedia', 'list_media')
    const requestId = randomUUID()
    const input = {
      requestId,
      title: `MCP 联调 ${requestId.slice(0, 8)}`,
      markdown: '# 联调演示\n\n由 MCP 创建的草稿。',
    }
    let post: PostSummary = await call('createPost', 'create_post', input)
    const original = post
    assert.deepEqual(await call('createPost', 'create_post', input), original)
    await call('getPost', 'get_post', { id: post.id })
    await call('listPosts', 'list_posts', { state: 'draft' })
    post = await call('updatePost', 'update_post', {
      id: post.id,
      expectedRevision: post.revision,
      summary: '12 工具真实 HTTP 联调',
    })
    post = await call('publishPost', 'publish_post', {
      id: post.id,
      expectedRevision: post.revision,
    })
    const search = await call('searchPosts', 'search_posts', { query: input.title })
    assert(search.items.some((item) => item.id === post.id))
    for (const [method, name, state] of [
      ['unpublishPost', 'unpublish_post', 'draft'],
      ['trashPost', 'trash_post', 'trashed'],
      ['restorePost', 'restore_post', 'draft'],
    ] as const) {
      post = await call(method, name, { id: post.id, expectedRevision: post.revision })
      assert.equal(post.state, state)
      assert.equal(post.publicURL, null)
    }
    assert.equal(names.size, 12)
    console.log(`12 工具闭环通过。演示文章 ${post.id} 已恢复为草稿，可在后台查看。`)
  } finally {
    await client.close()
  }
}
main().catch((error) => {
  console.error(error instanceof Error ? error.message : '联调失败')
  process.exitCode = 1
})
