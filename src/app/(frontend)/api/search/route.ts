import { listPublicPosts } from '@/services/publicBlog'
import { toShiroPostItem } from '@/services/shiroAdapter'
export async function GET(request: Request) {
  const query = (new URL(request.url).searchParams.get('q') || '').trim().slice(0, 200)
  if (!query) return Response.json({ results: [] })
  const posts = await listPublicPosts({ query, limit: 10 })
  return Response.json({
    results: posts.docs.map((doc) => {
      const p = toShiroPostItem(doc)
      return {
        id: p.id,
        title: p.title,
        url: p.url,
        subtitle: p.categories.map((c) => c.name).join('、'),
      }
    }),
  })
}
