import { describe, expect, it, vi } from 'vitest'
import type { Payload } from 'payload'
import { handleWebMCP, handleWebMCPPreview } from '@/services/webmcp'
import { GET as resolveRoute } from '@/app/(frontend)/api/webmcp/route'
import { GET as previewRoute } from '@/app/(frontend)/next/webmcp-preview/route'

const getPayload = vi.hoisted(() => vi.fn(async () => { throw new Error('Database unavailable') }))
vi.mock('payload', () => ({ getPayload }))
vi.mock('@payload-config', () => ({ default: {} }))

function fixture(options: { role?: string; active?: boolean; owner?: number; status?: string; deleted?: boolean; missing?: boolean; slug?: string } = {}) {
  const user = { id: 1, collection: 'users', role: options.role ?? 'author', active: options.active ?? true }
  const post = { id: 7, slug: options.slug ?? 'hello-世界', owner: options.owner ?? 1, _status: options.status ?? 'draft', deletedAt: options.deleted ? '2026-01-01' : null }
  const find = vi.fn(async (args: { collection: string }) => ({ docs: options.missing ? [] : [args.collection === 'users' ? user : post] }))
  const auth = vi.fn(async (_args: { headers: Headers }) => ({ user }))
  const payload = { find, auth } as unknown as Pick<Payload, 'find' | 'auth'>
  const request = (query: string, headers: Record<string, string> = { cookie: 'payload-token=session' }) => new Request(`https://blog.example/api/webmcp?${query}`, { headers })
  return { payload, request, find, auth }
}

describe('WebMCP server boundary', () => {
  it('does not initialize the database when routes are disabled', async () => {
    vi.stubEnv('NEXT_PUBLIC_WEBMCP_ENABLED', 'false')
    try {
      for (const route of [resolveRoute, previewRoute]) expect((await route(new Request('https://blog.example/api/webmcp'))).status).toBe(404)
      expect(getPayload).not.toHaveBeenCalled()
    } finally { vi.unstubAllEnvs() }
  })
  it('is disabled by default and returns no-store responses', async () => {
    const f = fixture()
    const response = await handleWebMCP(f.request('action=post&slug=hello'), f.payload)
    expect(response.status).toBe(404)
    expect(response.headers.get('cache-control')).toBe('no-store')
  })
  it.each(['action=nope', 'action=post&slug=a&slug=b', 'action=editor&id=0', 'action=editor&id=9007199254740992', 'action=post&slug=../evil', 'action=post&slug=a&extra=x', 'action=post&slug=hello%20world', `action=post&slug=${'a'.repeat(121)}`])('rejects invalid query %s', async (query) => {
    const f = fixture()
    expect((await handleWebMCP(f.request(query), f.payload, true)).status).toBe(400)
    expect(f.find).not.toHaveBeenCalled()
  })
  it('resolves only published public posts without privileged access', async () => {
    const f = fixture({ status: 'published' })
    const response = await handleWebMCP(f.request('action=post&slug=hello-%E4%B8%96%E7%95%8C'), f.payload, true)
    expect(await response.json()).toMatchObject({ success: true, data: { path: '/posts/hello-%E4%B8%96%E7%95%8C' } })
    expect(f.find).toHaveBeenCalledWith(expect.objectContaining({ overrideAccess: false, where: expect.objectContaining({ and: expect.arrayContaining([expect.objectContaining({ and: expect.arrayContaining([{ _status: { equals: 'published' } }]) })]) }) }))
    expect(f.auth).not.toHaveBeenCalled()
  })
  it('resolves public category slugs', async () => {
    const f = fixture()
    expect(await (await handleWebMCP(f.request('action=category&slug=hello-%E4%B8%96%E7%95%8C'), f.payload, true)).json()).toMatchObject({ data: { path: '/posts?categorySlug=hello-%E4%B8%96%E7%95%8C' } })
  })
  it('uses consistent query encoding for punctuation in category slugs', async () => {
    const f = fixture({ slug: 'a~b!' })
    const response = await handleWebMCP(f.request('action=category&slug=a~b!'), f.payload, true)
    expect(await response.json()).toMatchObject({ data: { path: '/posts?categorySlug=a%7Eb%21' } })
  })
  it('requires cookie authentication and rejects cross-origin requests', async () => {
    const f = fixture()
    expect((await handleWebMCP(f.request('action=editor&id=7', { authorization: 'Bearer token' }), f.payload, true)).status).toBe(401)
    expect((await handleWebMCP(f.request('action=editor&id=7', { origin: 'https://evil.example' }), f.payload, true)).status).toBe(403)
  })
  it('rejects expired cookie sessions with 401', async () => {
    const f = fixture()
    f.auth.mockResolvedValueOnce({ user: null } as unknown as Awaited<ReturnType<typeof f.auth>>)
    expect((await handleWebMCP(f.request('action=editor&id=7'), f.payload, true)).status).toBe(401)
  })
  it('drops bearer headers and uses the fresh database role', async () => {
    const f = fixture({ owner: 2 })
    f.auth.mockResolvedValueOnce({ user: { id: 1, collection: 'users', role: 'admin', active: true } })
    expect((await handleWebMCP(f.request('action=editor&id=7', { cookie: 'payload-token=session', authorization: 'Bearer secret' }), f.payload, true)).status).toBe(404)
    expect(f.auth.mock.calls[0]?.[0].headers.get('authorization')).toBeNull()
  })
  it.each([{ owner: 2 }, { deleted: true }, { active: false }, { role: 'reader' }, { missing: true }])('hides inaccessible editor targets %j', async (options) => {
    const f = fixture(options)
    expect((await handleWebMCP(f.request('action=editor&id=7'), f.payload, true)).status).toBe(404)
  })
  it('allows author own editor and admin other editor', async () => {
    for (const options of [{}, { role: 'admin', owner: 2 }]) {
      const f = fixture(options)
      expect(await (await handleWebMCP(f.request('action=editor&id=7'), f.payload, true)).json()).toMatchObject({ data: { path: '/admin/collections/posts/7' } })
    }
  })
  it('allows previews of own drafts and published others, hides others drafts', async () => {
    for (const [options, status] of [[{}, 200], [{ owner: 2, status: 'published' }, 200], [{ owner: 2 }, 404]] as const) {
      const f = fixture(options)
      expect((await handleWebMCP(f.request('action=preview&id=7'), f.payload, true)).status).toBe(status)
    }
  })
  it('independently checks preview authorization before enabling draft mode', async () => {
    const enable = vi.fn()
    const denied = fixture({ owner: 2 })
    expect((await handleWebMCPPreview(denied.request('id=7'), denied.payload, enable, true)).status).toBe(404)
    expect(enable).not.toHaveBeenCalled()
    const allowed = fixture()
    const response = await handleWebMCPPreview(allowed.request('id=7'), allowed.payload, enable, true)
    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('/posts/hello-%E4%B8%96%E7%95%8C')
    expect(enable).toHaveBeenCalledOnce()
    expect((await handleWebMCPPreview(allowed.request('id=7', { cookie: 'payload-token=session', 'sec-fetch-site': 'cross-site' }), allowed.payload, enable, true)).status).toBe(403)
  })
  it('returns generic errors when storage fails', async () => {
    const f = fixture()
    f.find.mockRejectedValueOnce(new Error('secret database connection'))
    const response = await handleWebMCP(f.request('action=post&slug=hello'), f.payload, true)
    expect(response.status).toBe(500)
    expect(await response.text()).not.toContain('secret')
  })
})
