import React from 'react'

export default function BeforeDashboard() {
  return (
    <section style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>
        MCP Blog Studio 创作工作台
      </h2>
      <p style={{ margin: '0.25rem 0', opacity: 0.8 }}>
        面向人机协同时代的内容管理系统。在此管理博客文章、插图媒体、分类归档与站点配置。
      </p>
      <p style={{ margin: '0.25rem 0', opacity: 0.65, fontSize: '0.875rem' }}>
        文章状态为“已发布”后即刻在博客前台公开呈现；删除后移入回收站保护。
      </p>
      <p style={{ marginTop: '0.75rem' }}>
        <a
          href="/posts"
          target="_blank"
          rel="noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.35rem',
            fontWeight: 600,
            textDecoration: 'underline',
          }}
        >
          <span>浏览博客前台 ↗</span>
        </a>
      </p>
    </section>
  )
}
