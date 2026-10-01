'use client'
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="container py-20">
      <h1 className="text-3xl mb-4">页面暂时无法加载</h1>
      <p className="mb-6">请稍后重试。</p>
      <button className="border border-border rounded px-5 py-2" onClick={reset}>
        重新加载
      </button>
    </div>
  )
}
