# v2 WebMCP 使用与验收

## 范围

v1 `/mcp` 管理持久化文章，v2 操作当前网页。WebMCP 使用 Chrome 原生 `document.modelContext`，不引入独立 Agent、扩展或浏览器内 MCP 密钥。前台和 Payload 后台均通过无 UI 组件注册工具，现有页面布局保持不变。

## 启用与浏览器

在目标环境设置 `NEXT_PUBLIC_WEBMCP_ENABLED=true`，重新构建并重启应用。默认 `false`。回退时改为 `false` 并重新构建、部署；v1 `/mcp` 不受影响。开关是构建配置，不能只修改运行中进程的变量就宣称浏览器工具已关闭。

浏览器必须支持原生 Imperative API。本机验收目标是 Chrome 150.0.7871.187，开启实验性 Web Platform 功能和 WebMCP；不同 Chrome 版本、平台和 Agent 的可用条件应重新核验。普通浏览器不支持时不注册工具，页面继续正常使用。不注入 polyfill 模拟支持。

Chrome 官方说明：[Imperative API](https://developer.chrome.com/docs/ai/webmcp/imperative-api)。本实现使用 `registerTool(tool, { signal })`、执行回调的取消信号及注册生命周期信号。工具由支持该接口的浏览器 Agent 发现；远程 MCP 客户端不会因此自动获得网页工具。

## 工具契约

| 工具 | 参数 | 行为 |
| --- | --- | --- |
| `set_search_query` | `query: string`，最多 200 字符 | 打开 `/search?q=...`，服务端搜索后显示真实结果；空字符串清空关键词 |
| `filter_posts` | `categorySlug?: string`、`page?: integer`（1–10000，默认 1） | 打开真实文章列表，分类查询和分页写入 URL；省略分类保留当前分类，空字符串清除分类 |
| `open_post` | `slug: string`，1–120 字符 | 先检查公开且未回收，再打开本站文章；不通过它查看私有草稿 |
| `open_admin_panel` | 无 | 打开 `/admin`；未登录由后台展示登录页 |
| `open_post_editor` | `id: positive safe integer` | 使用当前后台 cookie 会话；作者只能打开自己的文章，管理员可打开所有非回收文章 |
| `preview_post` | `id: positive safe integer` | 使用当前会话查看有权读取的非回收内容，预览入口再次检查权限后启用草稿模式 |
| `scroll_to_section` | `headingID: string`，1–300 字符 | 仅定位当前正文真实存在的 h1–h6，不接受正文外元素 |

slug 不允许空白、路径分隔符、查询/片段分隔符、控制字符和 `.`/`..`。工具拒绝额外参数。页面工具不写文章、发布或删除内容。

工具执行返回 JSON 字符串，内容为 `{ success, message, data, code? }`。取消返回 499；无效参数 400；未登录 401；无权访问和不存在的资源统一 404；未预期错误返回通用消息。导航采用真实文档跳转，原生 API 可能返回 `null`，以目标 URL 和页面内容为完成依据，不把“已提交导航”当成“目标已渲染”。

Chrome 150 的原生回调实测仅提供输入参数，不提供逐次执行的取消信号；实现兼容该形式并保留页面生命周期取消。新版浏览器提供执行信号时会合并处理。不能把 Chrome 150 的本地结果视为逐次取消能力已通过原生验收；该能力有单测覆盖，仍需在提供执行信号的浏览器版本中复验。

## 安全与生命周期

- `/api/webmcp` 只解析预定义动作和安全的本站路径；不接收任意 URL、SQL 或 Payload 查询。
- 编辑/预览只使用 cookie 会话，忽略传入的 Authorization。服务器重新读取当前账号角色和启用状态。
- `/next/webmcp-preview?id=...` 独立验证访问权；不向客户端输出 `PREVIEW_SECRET`、个人密钥或正文。
- 所有解析响应和预览跳转均 `Cache-Control: no-store`；跨来源或跨站请求被拒绝。
- React 挂载、路由变更、卸载、页面离开、BFCache 恢复均处理注册生命周期；失败的部分注册一并取消。
- 操作取消或旧页面失效后，未完成查询不能继续跳转。

## 演示步骤

1. 使用 v1 远程 MCP 创建并发布一篇含标题的文章，记录 slug。
2. 在支持 WebMCP 的浏览器打开本站，确认原生工具列表包含上述 7 工具。
3. 调用 `set_search_query` 搜索文章，确认搜索框、URL 与结果一致。
4. 调用 `open_post` 打开文章，再用实际标题 ID 调用 `scroll_to_section`。
5. 在同一浏览器登录作者后台，调用 `open_post_editor` 和 `preview_post`；切换另一个作者验证他人草稿被拒绝。
6. 检查刷新、后退和取消操作后无重复注册；普通浏览器继续可读文章。

## 验证说明

单元测试位于 `tests/unit/webmcp.test.ts` 和 `tests/unit/webmcp-server.test.ts`；原生 Chrome 回归位于 `tests/e2e/webmcp.e2e.spec.ts`，独立配置为 `playwright.webmcp.config.ts`。测试仅允许本机 `blog_studio` 数据库，使用专用 fixture；禁止连接生产库运行创建/停用/清理测试。

实际执行环境、结果与边界见下文[验收记录](#验收记录2026-10-20)。本地实现与验收不等于已部署到 Vercel；线上启用需要将本次改动部署并设置构建开关。

### 复现本地验收

以下测试命令只应在已完成迁移的隔离本地 `blog_studio` 数据库中运行：fixture 会创建随机前缀账号、分类、文章和 MCP 密钥，并将测试凭据写入被 Git 忽略的 `.local/webmcp-browser-fixture.json`。不修改既有记录；重复执行会保留先前测试记录，建议使用专用测试数据库。测试结束可停止专用测试服务/容器，数据保留供复验，不提供自动删除整库行为。

测试进程需预先设置数据库和 Payload 密钥等环境变量，也可将测试专用的字符串键值对象保存至被忽略的 `.local/webmcp-test-env.json`。该文件只用于 fixture 和本次本地运行，不上传、不提交；内容字段沿用 `.env.example`，站点地址设为测试端口，WebMCP 开关设为 `true`。

在相同测试环境变量下构建并启动本地应用，确认服务地址为 `http://127.0.0.1:3100`（或通过 `E2E_PORT` 指定端口）。下列第一条创建测试数据，第二条只对这些数据运行浏览器验收；首次运行原生浏览器失败时应检查 Chrome 安装和实验性功能，不安装未知扩展。

```sh
node --import=tsx/esm scripts/webmcp-test-fixture.ts
node node_modules/@playwright/test/cli.js test --config playwright.webmcp.config.ts --workers=1
```

普通 `pnpm test:e2e` 不运行这套需要专用环境的测试。单测不需要浏览器或数据库；TypeScript、lint 和构建仍按 README 既有检查执行。

## 验收记录（2026-10-20）

### 环境

| 项 | 值 |
| --- | --- |
| 浏览器 | Chrome 150.0.7871.187，开启实验性 Web Platform 功能与 WebMCP |
| 数据库 | 本机隔离的 `blog_studio`，迁移完成后由 `scripts/webmcp-test-fixture.ts` 写入随机前缀数据 |
| 应用 | 本地构建，`NEXT_PUBLIC_WEBMCP_ENABLED=true`，服务地址 `http://127.0.0.1:3100` |
| 证据 | 11 张界面截图位于 `.local/webmcp-acceptance/`；该目录随 `.local/` 一并忽略，不入库 |

### 结果

静态检查与构建：`pnpm typecheck`、`pnpm lint` 通过；`pnpm build` 生产构建通过（Payload 静态页预渲染与 sitemap 生成正常）。单测：`pnpm test:unit` 共 91 例通过，其中 WebMCP 相关 37 例（`webmcp.test.ts` 12 例、`webmcp-server.test.ts` 25 例）。

原生浏览器回归 5 例通过（`playwright.webmcp.config.ts`，`workers=1`）：

1. 七工具原生发现与调用：搜索词写入 URL 且结果一致；分类筛选与分页 URL 正确（分类 10 篇、第 2 页 2 篇）；`open_post` 打开公开文章；`scroll_to_section` 使真实标题进入视口，缺失标题返回 404；刷新与后退后工具重新注册；`open_admin_panel` 在未登录时进入登录页。
2. 匿名与越权：未登录调用编辑/预览返回 401，直接访问预览入口同为 401；另一个作者的草稿在工具与预览入口均返回 404；跨来源预览请求返回 403；登录作者可打开自己的编辑页并预览自己的草稿。
3. 不支持原生 API 的浏览器：工具不注册，搜索框与结果列表照常可用。
4. 停用账号：已登录的 cookie 会话在管理员停用后立即失去预览与编辑权限，工具返回 404。
5. v1 与 v2 联合：通过真实 `/mcp` HTTP 传输创建、修改并发布文章，随后在浏览器中用 `set_search_query` 搜到、用 `open_post` 打开、用 `scroll_to_section` 定位正文标题。

### 边界

- Chrome 150 的原生回调只提供输入参数，不提供逐次执行取消信号；实现按页面生命周期 `signal` 注册与清理，逐次取消仅有单测覆盖，仍需在提供执行信号的浏览器版本复验。
- 导航由浏览器接管，原生调用可能返回 `null`；验收以目标 URL 与页面内容为准，不把“已提交导航”当作“目标已渲染”。
- 本次为本地验收。未在 Vercel 线上启用 WebMCP，线上部署需单独构建并设置开关；本地通过不代表生产权限矩阵全部覆盖。

