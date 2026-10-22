import type { Payload, Where } from 'payload'
import type { Post, User } from '@/payload-types'
import { publishedWhere } from '@/access/roles'

type WebMCPPayload = Pick<Payload, 'find' | 'auth'>
type Action = 'post' | 'category' | 'editor' | 'preview'
type Target = { action: Action; slug?: string; id?: number }

function result(status: number, path?: string): Response {
  return Response.json({
    success: status === 200,
    message: status === 200 ? '成功' : status === 400 ? '参数无效' : status === 401 ? '请先登录' : status === 403 ? '请求被拒绝' : status === 404 ? '未找到资源' : '请求失败',
    data: path ? { path } : null,
    ...(status === 200 ? {} : { code: status }),
  }, { status, headers: { 'Cache-Control': 'no-store' } })
}

function parseTarget(request: Request, preview = false): Target | null {
  const query = new URL(request.url).searchParams
  const action = preview ? 'preview' : query.get('action')
  if (action !== 'post' && action !== 'category' && action !== 'editor' && action !== 'preview') return null
  const field = action === 'post' || action === 'category' ? 'slug' : 'id'
  const allowed = preview ? ['id'] : ['action', field]
  if ([...query.keys()].some((key) => !allowed.includes(key) || query.getAll(key).length !== 1)) return null
  const value = query.get(field)
  if (!value) return null
  if (field === 'slug') {
    if (value.length > 120 || /[\s/\\?#\u0000-\u001f\u007f]/u.test(value) || value === '.' || value === '..') return null
    return { action, slug: value }
  }
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value))) return null
  return { action, id: Number(value) }
}

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  return (!origin || origin === new URL(request.url).origin) && request.headers.get('sec-fetch-site') !== 'cross-site'
}

async function currentUser(request: Request, payload: WebMCPPayload): Promise<User | Response> {
  if (!request.headers.get('cookie')) return result(401)
  // Browser page tools use the existing cookie session, never bearer/API keys.
  const headers = new Headers({ cookie: request.headers.get('cookie')! })
  const { user } = await payload.auth({ headers })
  if (!user || user.collection !== 'users') return result(401)
  const fresh = await payload.find({ collection: 'users', where: { id: { equals: user.id } }, limit: 1, depth: 0, overrideAccess: true })
  return fresh.docs[0] ?? result(404)
}

async function protectedPost(request: Request, payload: WebMCPPayload, target: Target): Promise<Post | Response> {
  const user = await currentUser(request, payload)
  if (user instanceof Response) return user
  if (user.active === false || (user.role !== 'admin' && user.role !== 'author')) return result(404)
  const conditions: Where[] = [{ id: { equals: target.id } }, { deletedAt: { exists: false } }]
  if (user.role !== 'admin') conditions.push(target.action === 'editor'
    ? { owner: { equals: user.id } }
    : { or: [publishedWhere, { owner: { equals: user.id } }] })
  const found = await payload.find({ collection: 'posts', where: { and: conditions }, user, overrideAccess: false, depth: 0, limit: 1, draft: true })
  const post = found.docs[0]
  const owner = post && (typeof post.owner === 'number' ? post.owner : post.owner?.id)
  // Defense in depth: reject trashed or unauthorized documents even if adapters ignore filters.
  if (!post || post.deletedAt || (user.role !== 'admin' && owner !== user.id && (target.action === 'editor' || post._status !== 'published'))) return result(404)
  return post
}

export async function handleWebMCP(request: Request, payload: WebMCPPayload, enabled = false): Promise<Response> {
  if (!enabled) return result(404)
  if (!sameOrigin(request)) return result(403)
  const target = parseTarget(request)
  if (!target) return result(400)
  try {
    if (target.action === 'post' || target.action === 'category') {
      const isPost = target.action === 'post'
      const found = await payload.find({ collection: isPost ? 'posts' : 'categories', where: { and: [{ slug: { equals: target.slug } }, ...(isPost ? [publishedWhere] : [])] }, overrideAccess: false, depth: 0, limit: 1 })
      const doc = found.docs[0]
      if (!doc || !doc.slug || (isPost && ('deletedAt' in doc && doc.deletedAt || !('_status' in doc) || doc._status !== 'published'))) return result(404)
      return result(200, isPost ? `/posts/${encodeURIComponent(doc.slug)}` : `/posts?${new URLSearchParams({ categorySlug: doc.slug })}`)
    }
    const post = await protectedPost(request, payload, target)
    if (post instanceof Response) return post
    return result(200, target.action === 'editor' ? `/admin/collections/posts/${post.id}` : `/next/webmcp-preview?id=${post.id}`)
  } catch {
    return result(500)
  }
}

export async function handleWebMCPPreview(request: Request, payload: WebMCPPayload, enable: () => void | Promise<void>, enabled = false): Promise<Response> {
  if (!enabled) return result(404)
  if (!sameOrigin(request)) return result(403)
  const target = parseTarget(request, true)
  if (!target) return result(400)
  try {
    const post = await protectedPost(request, payload, target)
    if (post instanceof Response) return post
    if (!post.slug) return result(404)
    await enable()
    return new Response(null, { status: 307, headers: { Location: `/posts/${encodeURIComponent(post.slug)}`, 'Cache-Control': 'no-store' } })
  } catch {
    return result(500)
  }
}
