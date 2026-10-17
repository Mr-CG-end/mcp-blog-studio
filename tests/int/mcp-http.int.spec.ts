import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { spawn, type ChildProcess } from 'node:child_process'
import { once } from 'node:events'
import { createServer } from 'node:net'
import { randomUUID } from 'node:crypto'
import dotenv from 'dotenv'
import type { Payload } from 'payload'
import type { User } from '@/payload-types'
import type { PostSummary } from '@/mcp/contracts'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

dotenv.config({ path: '.env.local', override: true })
const dbURL = new URL(process.env.DATABASE_URL || 'http://invalid')
if (!['127.0.0.1', 'localhost'].includes(dbURL.hostname) || dbURL.pathname !== '/blog_studio')
  throw new Error('MCP 联调仅允许连接本地 blog_studio 数据库')
const prefix = `mcp-test-${randomUUID()}`
let payload: Payload, server: ChildProcess, url: string
const users: User[] = [],
  keys: { id: number; key: string }[] = [],
  clients: Client[] = []
const postIDs = new Set<number>()
let output = ''

async function connect(key: string) {
  const client = new Client({ name: 'blog-http-integration', version: '1.0.0' })
  await client.connect(
    new StreamableHTTPClientTransport(new URL(`${url}/mcp`), {
      requestInit: { headers: { Authorization: `Bearer ${key}` } },
    }),
  )
  clients.push(client)
  return client
}
async function call(client: Client, name: string, args: Record<string, unknown> = {}) {
  const result = await client.callTool({ name, arguments: args })
  const envelope = result.structuredContent as {
    ok: boolean
    data: PostSummary & {
      items: PostSummary[]
      id: number
      markdown: string
      contentReplaceable: boolean
    }
    error: { code: string }
    requestId: string
  }
  expect(JSON.parse((result.content as { text: string }[])[0].text)).toEqual(envelope)
  expect(result.isError === true).toBe(!envelope.ok)
  return envelope
}

beforeAll(async () => {
  const { getPayload } = await import('payload')
  payload = await getPayload({ config: (await import('@/payload.config')).default })
  for (const role of ['admin', 'author', 'author'] as const) {
    const user = await payload.create({
      collection: 'users',
      overrideAccess: true,
      context: { bootstrap: true },
      data: {
        email: `${prefix}-${users.length}@test.invalid`,
        password: randomUUID(),
        name: prefix,
        role,
        active: true,
      },
    })
    users.push(user)
    const key = await payload.create({
      collection: 'mcp-keys',
      user,
      overrideAccess: false,
      data: { label: prefix, owner: user.id, prefix: '', hash: '' },
    })
    keys.push(key as unknown as { id: number; key: string })
  }
  const listener = createServer()
  listener.listen(0, '127.0.0.1')
  await once(listener, 'listening')
  const port = (listener.address() as { port: number }).port
  await new Promise<void>((resolve, reject) =>
    listener.close((error) => (error ? reject(error) : resolve())),
  )
  url = `http://127.0.0.1:${port}`
  server = spawn(
    process.execPath,
    ['node_modules/next/dist/bin/next', 'dev', '--hostname', '127.0.0.1', '--port', String(port)],
    {
      env: { ...process.env, NEXT_PUBLIC_SERVER_URL: url, DATABASE_PUSH: 'false' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  server.stdout?.on('data', (chunk) => {
    output = (output + chunk).slice(-10000)
  })
  server.stderr?.on('data', (chunk) => {
    output = (output + chunk).slice(-10000)
  })
  const deadline = Date.now() + 90000
  while (true) {
    if (server.exitCode !== null) throw new Error(`Next exited: ${output}`)
    try {
      const response = await fetch(`${url}/mcp`, { signal: AbortSignal.timeout(15000) })
      if ([401, 403].includes(response.status)) break
    } catch {
      /* wait for readiness */
    }
    if (Date.now() > deadline) throw new Error(`Next startup timeout: ${output}`)
    await new Promise((resolve) => setTimeout(resolve, 300))
  }
}, 120000)

afterAll(async () => {
  for (const client of clients) await client.close().catch(() => {})
  if (server && server.exitCode === null) {
    server.kill('SIGTERM')
    await once(server, 'exit')
  }
  if (!payload) return
  const context = { disableRevalidate: true }
  // Include data created by a request whose response was lost.
  const posts = await payload.find({
    collection: 'posts',
    trash: true,
    pagination: false,
    where: { owner: { in: users.map((u) => u.id) } },
  })
  for (const post of posts.docs) postIDs.add(post.id)
  for (const id of postIDs)
    await payload.delete({ collection: 'posts', id, overrideAccess: true, trash: true, context })
  await payload.delete({
    collection: 'mcp-idempotency',
    overrideAccess: true,
    where: { postID: { in: [...postIDs] } },
  })
  await payload.delete({
    collection: 'mcp-keys',
    overrideAccess: true,
    where: { owner: { in: users.map((u) => u.id) } },
  })
  await payload.delete({
    collection: 'audit-logs',
    overrideAccess: true,
    where: { actor: { in: users.map((u) => u.id) } },
  })
  for (const user of users)
    await payload.delete({ collection: 'users', id: user.id, overrideAccess: true })
  await payload.destroy()
}, 30000)

describe('真实 Next HTTP + SDK + PostgreSQL 联调', () => {
  it('鉴权、来源、方法、协议及请求体限制', async () => {
    expect((await fetch(`${url}/mcp`, { method: 'DELETE' })).status).toBe(401)
    const headers = { Authorization: `Bearer ${keys[1].key}` }
    expect((await fetch(`${url}/mcp`, { headers })).status).toBe(405)
    expect((await fetch(`${url}/mcp`, { method: 'DELETE', headers })).status).toBe(405)
    expect(
      (
        await fetch(`${url}/mcp`, {
          method: 'POST',
          headers: { ...headers, Origin: 'https://attacker.invalid' },
        })
      ).status,
    ).toBe(403)
    expect(
      (await fetch(`${url}/mcp`, { method: 'POST', headers, body: 'x'.repeat(1024 * 1024 + 1) }))
        .status,
    ).toBe(413)
    const response = await fetch(`${url}/mcp`, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
        Accept: 'application/json, text/event-stream',
      },
      body: '{',
    })
    expect(response.status).toBe(400)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })

  it('12 工具闭环、隔离、并发版本冲突、幂等、回收恢复及审计', async () => {
    const [admin, a, b] = await Promise.all(keys.map((key) => connect(key.key)))
    expect((await a.listTools()).tools).toHaveLength(12)
    const [identityA, identityB] = await Promise.all([
      call(a, 'get_current_user'),
      call(b, 'get_current_user'),
    ])
    expect(identityA.data.id).toBe(users[1].id)
    expect(identityB.data.id).toBe(users[2].id)
    const requestIDs = new Set([identityA.requestId, identityB.requestId])
    for (const name of ['list_categories', 'list_media'])
      expect((await call(a, name)).ok).toBe(true)
    const input = {
      requestId: randomUUID(),
      title: prefix,
      slug: prefix,
      markdown: '# 联调\n\n**正文**\n\n```ts\nconst n = 1\n```',
    }
    const [first, replay] = await Promise.all([
      call(a, 'create_post', input),
      call(a, 'create_post', input),
    ])
    expect(first.ok, JSON.stringify(first)).toBe(true)
    expect(replay.data).toEqual(first.data)
    let post = first.data
    postIDs.add(post.id)
    expect(post.state).toBe('draft')
    expect((await call(b, 'get_post', { id: post.id })).error.code).toBe('NOT_FOUND')
    expect((await call(b, 'search_posts', { query: prefix })).data.items).toHaveLength(0)
    expect((await call(admin, 'get_post', { id: post.id })).ok).toBe(true)
    expect((await call(a, 'get_post', { slug: prefix })).data.markdown).toContain('const n = 1')
    const concurrent = await Promise.all(
      ['A', 'B'].map((suffix) =>
        call(a, 'update_post', {
          id: post.id,
          expectedRevision: post.revision,
          title: `${prefix}-${suffix}`,
        }),
      ),
    )
    expect(concurrent.filter((r) => r.ok)).toHaveLength(1)
    expect(concurrent.find((r) => !r.ok)?.error.code).toBe('VERSION_CONFLICT')
    post = concurrent.find((r) => r.ok)!.data
    expect((await call(a, 'create_post', input)).data).toEqual(first.data)
    expect(
      (await call(a, 'create_post', { ...input, slug: `${prefix}-different` })).error.code,
    ).toBe('REQUEST_CONFLICT')
    const published = await call(a, 'publish_post', {
      id: post.id,
      expectedRevision: post.revision,
    })
    expect(published.ok, JSON.stringify(published)).toBe(true)
    post = published.data
    expect(post.state).toBe('published')
    expect(post.publicURL).toBe(`${url}/posts/${prefix}`)
    expect((await call(b, 'get_post', { id: post.id })).ok).toBe(true)
    expect(
      (await call(b, 'publish_post', { id: post.id, expectedRevision: post.revision })).error.code,
    ).toBe('FORBIDDEN')
    expect(
      (await call(a, 'publish_post', { id: post.id, expectedRevision: post.revision })).data
        .revision,
    ).toBe(post.revision)
    expect(
      (await call(a, 'search_posts', { query: prefix })).data.items.some(
        (item) => item.id === post.id,
      ),
    ).toBe(true)
    for (const [name, state] of [
      ['unpublish_post', 'draft'],
      ['trash_post', 'trashed'],
      ['restore_post', 'draft'],
    ]) {
      const result = await call(a, name, { id: post.id, expectedRevision: post.revision })
      expect(result.ok, JSON.stringify(result)).toBe(true)
      expect(result.data.revision).toBe(post.revision + 1)
      post = result.data
      expect(post.state).toBe(state)
      expect(post.publicURL).toBeNull()
      requestIDs.add(result.requestId)
      if (state === 'trashed') {
        expect(
          (await call(a, 'list_posts', { state: 'trashed' })).data.items.some(
            (item) => item.id === post.id,
          ),
        ).toBe(true)
        expect((await call(a, 'list_posts')).data.items.some((item) => item.id === post.id)).toBe(
          false,
        )
        expect((await call(a, 'get_post', { id: post.id })).data.state).toBe('trashed')
        expect((await call(b, 'get_post', { id: post.id })).error.code).toBe('NOT_FOUND')
      }
    }
    expect(requestIDs.size).toBe(5)
    const logs = await payload.find({
      collection: 'audit-logs',
      where: { target: { equals: String(post.id) } },
      pagination: false,
    })
    expect(logs.docs).toHaveLength(6)
    expect(
      logs.docs.every((log) => log.source === 'mcp' && log.requestID && log.keyID === keys[1].id),
    ).toBe(true)
    const failure = await payload.find({
      collection: 'audit-logs',
      where: { requestID: { equals: concurrent.find((r) => !r.ok)!.requestId } },
    })
    expect(failure.docs[0].code).toBe('VERSION_CONFLICT')
    const count = await payload.count({
      collection: 'posts',
      where: { owner: { equals: users[1].id } },
    })
    expect(count.totalDocs).toBe(1)
  }, 60000)

  it('真实密钥摘要不泄露，角色变更、停用和撤销立即生效', async () => {
    const client = await connect(keys[2].key)
    const stored = await payload.findByID({
      collection: 'mcp-keys',
      id: keys[2].id,
      user: users[2],
      overrideAccess: false,
    })
    expect(stored).not.toHaveProperty('hash')
    expect(stored).not.toHaveProperty('key')
    await payload.update({
      collection: 'users',
      id: users[2].id,
      data: { role: 'admin' },
      overrideAccess: true,
    })
    expect((await call(client, 'get_current_user')).data).toMatchObject({ role: 'admin' })
    await payload.update({
      collection: 'users',
      id: users[2].id,
      data: { active: false },
      overrideAccess: true,
    })
    await expect(client.listTools()).rejects.toThrow()
    await payload.update({
      collection: 'users',
      id: users[2].id,
      data: { active: true },
      overrideAccess: true,
    })
    await payload.update({
      collection: 'mcp-keys',
      id: keys[2].id,
      data: { revokedAt: new Date().toISOString() },
      user: users[2],
      overrideAccess: false,
    })
    await expect(client.listTools()).rejects.toThrow()
  })
})
