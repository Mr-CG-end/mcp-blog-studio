import Link from 'next/link'
export default function NotFound() {
  return (
    <div className="container py-20">
      <h1 className="text-4xl mb-4">页面不存在</h1>
      <p className="mb-6">文章可能尚未发布、已下架，或链接有误。</p>
      <Link className="underline" href="/posts">
        浏览已发布文章
      </Link>
    </div>
  )
}
