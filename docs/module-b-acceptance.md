# B 模块与 develop 联调验收

2026-10-20 补充：v1 已在 Vercel 线上站点完成初始化、身份查询和创建→发布→公开访问实测。下文桌面客户端与云部署“未执行”描述属于 2026-10-17 的历史边界，不代表当前完全未上线。v2 新增实现与验证独立记录于 [WebMCP 使用与验收](webmcp.md)，不将此次线上冒烟扩大为全部线上权限测试通过。

日期：2026-10-17。当前分支 `feature/module-b`，合入 `origin/develop` 的 `61a4b57`（fast-forward，无冲突）。

## 已完成

- `/mcp` 使用 Node.js runtime、无状态 Streamable HTTP 和 JSON 响应。每次请求独立认证、requestID、server 和 transport；不在全局会话中保存身份。GET/DELETE 经认证后返回 405；所有响应 no-store。
- 使用数据库个人密钥；每请求检查撤销时间、用户 active 和当前角色。Host/Origin 校验、1 MiB 请求体上限，有限 JSON 响应读取完毕后释放 SDK 资源。
- 真实查询支持分类过滤、媒体关键字、分页、回收站显式查询；私有文章和不存在均返回 NOT_FOUND。回收文章不返回 publicURL。
- 读写统一使用 Posts 实际配置的 Payload Lexical 转换器，保留原 B 异步接口。媒体解析通过注入解析器使用既有资源，不下载外部图片。代码、嵌套列表、混合格式与图片覆盖测试；Banner、表格、未知区块禁止整体替换。原始 HTML、危险链接及行内图片明确拒绝。
- 写入统一建立请求级事务并沿用现有媒体锁顺序；文章、成功审计和创建幂等记录同事务提交。每次更新向 enforcePost 传入 expectedRevision，由钩子自增一次；重复目标状态先检查权限和版本，再直接返回当前对象。
- 创建幂等以 userID/requestId 隔离，SHA-256 输入摘要包含 slug，保存原始成功 DTO。既有媒体事务锁使并发创建串行检查，数据库唯一键继续兜底；回滚后单独记录失败审计。
- 审计补充 requestID/keyID；MCP 成功日志来源为 mcp，失败日志保留追踪。内部幂等集合禁止公开读写。
- 密钥始终由服务器生成，忽略客户端提供的摘要、前缀和 owner；仅创建响应显示明文。更新仅接受撤销时间，已失效密钥不能重新激活。

## 复验

```sh
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:int
pnpm build
```

本轮结果：类型检查通过；lint 0 错误、0 警告；6 个单测文件共 54 项通过；2 个集成测试文件共 13 项通过；Next 16.3.3 生产构建通过。

`tests/int/mcp-http.int.spec.ts` 启动临时端口的真实 Next 服务，使用官方 SDK 1.31.0 与本机 PostgreSQL，不以内存传输替代 HTTP。测试创建随机 admin/authorA/authorB、个人密钥和文章，结束时清理本次资源。

覆盖 initialize、tools/list、全部 12 工具真实调用，创建→读取→编辑→发布→搜索→下架→回收→恢复；并行身份隔离、相同创建并发、同键异参、编辑后重放原 DTO、同版本并发更新仅一个成功、草稿及回收站隔离、已发布文章越权状态操作、重复发布不增版本、成功审计次数与失败追踪、角色变更、停用、撤销、摘要不公开、来源与请求大小限制。

本机开发库在迁移前备份到 Docker 容器 `/tmp/blog-studio-before-mcp.dump`，已执行两项 develop MCP 迁移及 `20261017_070000_mcp_integration`。生产数据库未操作。

## 客户端与演示

从后台“个人 MCP 密钥”创建真实密钥；旧的 dev-mcp-token/admin-token/author-token 不再支持。

- Cursor：复制 `config/mcp/cursor_config.json`，替换占位密钥。
- Claude Desktop：`config/mcp/claude_desktop_config.json` 使用 mcp-remote 桥接模板；替换环境变量占位符。此模板未做真实桌面客户端验收，不承诺具体客户端版本兼容性。
- SDK 演示：启动博客后，在本地环境设置 `MCP_SERVER_URL`（默认 http://localhost:3000/mcp）和 `MCP_TOKEN`，执行 `pnpm demo:mcp`。脚本真实调用 12 工具，会创建并短暂发布一篇演示文章，最终恢复为私有草稿并打印文章 ID。凭据不会打印。

## 验收边界

已完成本地 SDK/HTTP/数据库联调；桌面客户端 UI、HTTPS 云部署及线上验证未执行。Banner、表格、未知区块继续在后台编辑，MCP 元数据更新保留原正文。已有 v0 集成测试会输出 pg 并发查询弃用提示；`scripts/yohaku/audit.ts` 的两项 any 警告已改用 unknown、节点结构和媒体类型守卫修复。


## 本地项目实操补验

- 使用 `next start` 启动本地生产构建，地址 http://127.0.0.1:3000；通过真实浏览器确认首页、文章正文及目录、搜索 Electron 命中 4 篇、后台登录页、仪表板及文章列表。
- 使用本地现有作者账号通过 `/api/users/login` 登录，再通过 `/api/mcp-keys/create-with-key` 创建临时个人密钥。执行项目 `scripts/demo-mcp-tools.ts`，实际调用 12 工具，确认恢复后的草稿访客访问 404；通过后台 REST 撤销密钥后 MCP 返回 401。临时文章、幂等、审计和密钥已清理。
- 首次使用旧构建时 create_post 返回 INTERNAL_ERROR；重新构建并重启后，演示闭环及复用当前服务的专项测试通过。新增服务端诊断仅记录请求 ID、方法、错误类型及调用位置，不记录 SQL、正文或凭据。
- MCP 专项测试可直接复用正在运行的本地项目：`MCP_TEST_SERVER_URL=http://127.0.0.1:3000 pnpm test:int`。限定 localhost/127.0.0.1，未设置时仍启动隔离端口的开发服务。
- 测试清理改为先查询指定测试记录，再顺序删除，避免批量删除在同一事务客户端并发执行。MCP 专项三项在当前生产服务上通过且未出现 pg 弃用提示；既有博客 API 套件仍会触发依赖内部的 pg 查询弃用提示，没有禁用或屏蔽日志。
- 实际运行内容审计脚本：30 篇导入文章，公开草稿 0，导入文章图片文件缺失 0。另清理此前迁移未完成导致中断的本次测试残留（7 篇文章、1 个媒体、3 个测试账号，按唯一 UUID 和测试邮箱限定）。
- 本地未配置邮件适配器，Payload 保留“邮件输出到控制台”的环境提示。未将此提示计为 lint 问题，也未配置外部邮件服务。
- 本地截图保存在 `.local/acceptance/local-search.png` 与 `.local/acceptance/local-admin.png`，不提交后台截图及本地凭据。
