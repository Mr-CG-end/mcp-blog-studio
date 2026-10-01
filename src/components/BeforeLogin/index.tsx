import React from 'react'

export default function BeforeLogin() {
  return (
    <div style={{ marginBottom: '1.25rem', textAlign: 'center' }}>
      <p style={{ margin: 0, fontSize: '0.9rem', opacity: 0.85 }}>
        欢迎登录 <strong>MCP Blog Studio</strong> 内容管理后台
      </p>
      <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', opacity: 0.6 }}>
        系统仅限授权作者与管理员登录，不开放公开注册
      </p>
    </div>
  )
}
