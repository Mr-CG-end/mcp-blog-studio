# MCP Blog Studio

中文多人协作博客，基于 Next.js 16、Payload CMS 3 和 PostgreSQL。

**版本路线：v0 普通博客 → v1 远程 MCP → v2 WebMCP。当前只实施 v0，用户验收后再做 v1。** 已完成前端模块适配与极简纸面美学整合。详见 [使用手册](docs/user-guide.md) 与 [总体技术设计](docs/technical-design.md)。

## 本地运行

使用 Node.js 24 和 pnpm 10.34.6（版本记录在 `.node-version`、`package.json`）。如果本机 pnpm 版本不同，可将以下 `pnpm` 命令替换为 `npx --yes pnpm@10.34.6`。

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
# 编辑 .env.local，替换数据库密码、PAYLOAD_SECRET、PREVIEW_SECRET。
docker compose --env-file .env.local up -d postgres
pnpm db:migrate
pnpm seed:demo
pnpm dev --hostname 127.0.0.1
```

- 前台：<http://127.0.0.1:3000>
- 后台：<http://127.0.0.1:3000/admin>
- 示例账号：运行 `seed:demo` 后保存在 `.local/demo-accounts.md`（已加入 Git 忽略规则）。
- 数据库：独立 Docker volume，绑定本机 `5433`，不占用原配置的 `5432`。
- 停止数据库：`docker compose --env-file .env.local stop`。正常停止不会删除数据。
- 不要执行 `docker compose down -v`，该命令会删除开发数据库卷。

`seed:demo` 仅允许本机 `blog_studio` 数据库，创建缺失的示例账号、分类与文章，不清空或覆盖既有内容。不用于生产初始化。

## 管理博客

管理员创建作者账号、维护分类和站点设置。作者创建自己的文章并上传图片。

文章状态在编辑页右侧选择：

- **草稿 / 已下架**：仅所有者及管理员可见。
- **已发布**：保存后立即出现在前台；后续修改保存也立即生效。
- **回收站**：后台删除操作默认移入回收站。恢复后变为草稿，需要重新选择已发布并保存。
- 永久删除仅管理员可操作；账号使用停用功能，以保留文章归属与审计记录。

文章版本号用于防止同时编辑导致覆盖。提示版本冲突时，请刷新并重新合并修改。

前台支持首页、文章列表与分页、详情、分类、标题/摘要/正文搜索、关于页、深浅色主题、404。后台聚焦文章、媒体、分类、账号、操作日志及站点设置；非核心模板导航隐藏。

## 检查

```sh
pnpm typecheck
pnpm lint
pnpm test:unit
pnpm test:int
pnpm build
pnpm start --hostname 127.0.0.1
```

集成测试只允许连接本地 `blog_studio`，以随机前缀建立测试数据，结束后清理本次数据。不要将测试配置改为生产数据库。

浏览器回归用例位于 `tests/e2e`，运行前安装 Playwright Chromium：`pnpm exec playwright install chromium`。用例依赖 `seed:demo` 的示例文章；执行 `pnpm test:e2e`。

详细说明：

- [完整文档导航](docs/README.md)
- [需求与版本路线](docs/requirements.md)
- [技术设计](docs/technical-design.md)
- [双人分工与 MCP 模块归属](docs/work-allocation.md)
- [MCP 工具契约（v1 规划）](docs/mcp-tools.md)
- [部署与迁移指南](docs/deployment.md)
- [测试方案与用例规范](docs/testing.md)
