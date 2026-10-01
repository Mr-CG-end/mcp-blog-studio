import React from 'react'
export default function BeforeDashboard() {
  return (
    <section>
      <h2>博客管理</h2>
      <p>
        管理文章、媒体和分类。文章保存为“已发布”后立即公开，删除后进入回收站；恢复文章后需要重新发布。
      </p>
      <p>
        <a href="/posts" target="_blank" rel="noreferrer">
          查看博客
        </a>
      </p>
    </section>
  )
}
