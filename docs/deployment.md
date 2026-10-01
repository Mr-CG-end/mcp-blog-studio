# 部署与迁移

当前没有创建或部署任何云端资源。版本路线为 v0 普通博客、v1 远程 MCP、v2 WebMCP。以下首先覆盖 v0 部署，后附 v1/v2 的增量步骤。

## 运行环境

- Node.js 24；pnpm 10.34.6；版本由项目文件固定。
- 本地开发：Docker PostgreSQL 17，5433 端口，独立卷 `blog_postgres`。
- 生产：Vercel 承载 Next.js 与 Payload，Neon PostgreSQL 存储数据，Vercel Blob 存储公开图片。
- Git 忽略 `.env*`（保留示例文件）、`.local`、媒体文件、依赖和构建产物。

## 环境变量

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | 当前环境的 PostgreSQL URL；Neon 使用其提供的 SSL 连接字符串 |
| `PAYLOAD_SECRET` | 独立随机签名密钥，至少 32 字符，各环境不同 |
| `PREVIEW_SECRET` | 独立预览密钥，不能使用占位符 |
| `NEXT_PUBLIC_SERVER_URL` | 完整站点 URL，包含 https，无末尾斜线 |
| `DATABASE_PUSH` | 保持 `false`，生产配置同时强制关闭自动推送结构 |
| `BLOB_READ_WRITE_TOKEN` | 生产图片存储凭据，只在服务端使用 |
| `BLOB_PUBLIC_HOST` | Blob 公开存储主机名，用于 Next.js 图片白名单，不含协议和路径 |
| `LOCAL_DB_PASSWORD` | 仅本地 Docker PostgreSQL 使用 |
| `ADMIN_EMAIL`、`ADMIN_PASSWORD` | 仅首次运行 `pnpm bootstrap` 使用，不需要长期留在应用环境中 |

开发、预览、生产分别使用隔离数据库和存储；Vercel Preview 不连接生产数据。不要把数据库连接、密码或 Blob token 贴入文档、Git 或客户端代码。

## 首次部署

1. 建立用户自己的 Git 远程仓库并推送代码。当前本地已初始化 Git，但尚未配置远程或创建提交。
2. 在 Neon 创建生产数据库。创建 Vercel 项目并配置环境变量。
3. 创建公开 Blob store，设置 token 和主机名。适配器字段始终加入 schema，避免本地/生产的媒体表结构不一致。
4. 安装：`pnpm install --frozen-lockfile`。构建：`pnpm build`。Vercel 使用 Next.js preset。
5. 在受控发布作业中运行 `pnpm db:migrate`，确保同一生产库只有一个迁移作业。首次创建表可以先迁移再构建；后续更新先确认新旧应用与数据库的兼容性。
6. 使用生产环境配置单独运行 `pnpm bootstrap`，先设置管理员邮箱与不少于 12 字符的密码。脚本检测已有用户后拒绝重复初始化。
7. 登录后台，在用户集合创建作者，在站点设置填写名称、介绍和关于页。不要运行本地 `seed:demo`，它会主动拒绝远程数据库。
8. 验证首页、后台登录、图片上传、文章发布/下架、搜索、草稿隔离、预览与站点地图。

生产禁止使用本地 `public/media` 作为长期存储。Vercel Blob 的真实上传流程、额度和 5 MB 限制须在建立云资源后再次验收；本次仅验证本地上传。

## 数据库变更

当前提交了从空库创建全部表的初始迁移，适用于新数据库。**不要将它直接用于已有 Payload 数据库**；既有数据库需先做差异迁移和所有者字段回填方案。

```sh
# 修改模型之后，在开发环境生成并审核迁移
pnpm db:migrate:create descriptive-name
# 在隔离数据库验证迁移后，部署时单次执行
pnpm db:migrate
```

迁移前备份数据库；保留应用版本、迁移版本及备份标识。大规模表结构变更采用先兼容再清理的步骤，避免新旧代码交叉运行时失败。

## 运行与回退

- Vercel 日志用于请求和错误排查，后台操作日志用于文章写入追踪。
- 免费额度优先，部署时核对 Neon、Vercel 和 Blob 的实际限制；不自动升级付费。
- 发生问题可以回退应用部署，但数据库变更不会跟随自动回退。根据备份和迁移审核结果决定恢复方式，不盲目执行破坏性的 down migration。
- 本地可用 `pnpm build` 后 `pnpm start --hostname 127.0.0.1` 验证生产模式；不要让 dev 和 build 同时写入同一个 `.next` 目录。
- 本项目不配置定时任务、邮件邀请或密码邮件找回。账号由管理员创建和重置；首个管理员凭据由部署者妥善保存。

参考：[Payload PostgreSQL](https://payloadcms.com/docs/database/postgres)、[迁移](https://payloadcms.com/docs/database/migrations)、[存储适配器](https://payloadcms.com/docs/upload/storage-adapters)。


## v1 MCP 增量发布（规划）

1. 在独立预览数据库执行密钥、幂等及审计相关迁移，验证撤销、失败回滚和权限测试。
2. 部署 `/mcp`，使用 HTTPS 默认域名，核对 Host/Origin 配置、响应体大小及运行时超时。
3. 管理员和作者在后台创建各自密钥，密钥只保存在使用者的本机环境变量/凭据管理器。数据库仅存摘要；不设置共享的全局 MCP_API_KEY。
4. B 按实施时 Codex 官方文档提供匹配该客户端版本的远程服务配置；将配置示例中的 token 替换为环境变量引用，不写实际密钥。
5. 使用两个独立用户执行 [MCP 验收脚本](testing.md)，同时验证 `/mcp` 没有依赖某一个常驻进程的会话状态。
6. 验收成功后发布，记录应用版本、SDK/协议版本和客户端版本；失败则关闭该入口或回退应用，普通博客继续可用。

## v2 WebMCP 增量发布（规划）

1. 先在支持的浏览器和隔离预览域名核验实际接口及试验条件，不把页面 mock 验证当作上线依据。
2. 注册代码作为普通前端增强发布，不新增公网 MCP 服务，也不向浏览器下发个人 MCP token。
3. 用配置开关控制注册逻辑：关闭时仅取消页面工具，不能影响普通网站或 v1 远程 MCP。
4. 记录浏览器版本、Agent、平台所需开关/试验配置；如需 Origin Trial，按平台实际要求配置，并跟踪到期时间。
5. 完成无支持环境、导航/卸载/取消、后台权限与 v1+v2 联合演示；异常时先关闭 WebMCP 注册，再排查。

## Shiro 适配增量

新增迁移 `20260930_105100_frontend_branding` 只添加品牌图片字段和社交链接表。迁移前保留备份，执行后检查站点设置可保存。

部署构建使用 `pnpm build`，其 prebuild 会生成对应源码包。部署后核验 `/credits` 与 `/source/blog-source.tar.gz`。源码包不得包含环境变量、账号文件或上传内容。当前许可证为 AGPLv3 并保留 Shiro 附加条款，商业用途需按上游说明另行确认授权。

浏览器测试使用本机 Google Chrome；CI 需要安装 Chrome 或把 Playwright channel 调整为已安装的 Chromium。测试前执行 build 和 seed:demo，编辑流程用例读取本机忽略文件中的演示账号，只创建并清理临时内容。
