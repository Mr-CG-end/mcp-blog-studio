# v2 WebMCP 设计（用户已确认）

状态（2026-10-20）：已按本设计实现，落地结果与验收见 [实施清单](../plans/2026-10-20-webmcp.md) 和 [WebMCP 使用与验收](../../webmcp.md#验收记录2026-10-20)。

目标：在既有博客中实现页面操作工具，不复制远程 MCP 的文章写入接口，不改变视觉样式。

采用 Chrome 原生 `document.modelContext` Imperative API，薄适配层处理功能检测、注册与取消。React 挂载、路由变更及页面离开时注销工具；不支持 API 或关闭开关时正常展示网站。不添加第三方运行时依赖。

工具：`set_search_query(query)`、`filter_posts(categorySlug?, page?)`、`open_post(slug)`、`open_admin_panel()`、`open_post_editor(id)`、`preview_post(id)`、`scroll_to_section(headingID)`。搜索与筛选导航沿用真实 URL 和服务端查询；滚动仅允许当前正文标题。导航由浏览器接管，旧页面不承诺返回新页面渲染成功。

公开导航通过只读路径解析接口验证目标。编辑与预览使用当前后台会话，服务器实时检查账号状态、角色与文章权限。预览入口独立复查权限，启用草稿模式后跳转本站文章；不向页面传递 MCP 密钥或预览密钥。无权访问与不存在的文章统一 404。新增 HTTP 响应使用 `{ success, message, data, code? }`。

`NEXT_PUBLIC_WEBMCP_ENABLED=true` 在构建时开启；默认关闭。服务端解析与预览入口也遵守开关。

验收分层：单测覆盖参数、权限、取消和生命周期；浏览器回归验证页面效果和不支持降级；使用真实原生 API 验证发现与调用，记录 Chrome 版本、开关和执行结果。模拟接口只作为回归测试，不替代原生验收。线上部署单独记录，不将本地实现宣称已上线。

范围不含：OAuth、浏览器扩展、自建 Agent 聊天界面、上传和持久化内容写操作。
