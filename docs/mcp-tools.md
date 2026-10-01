# v1 MCP 工具契约

状态：**设计冻结候选，待 v0 验收后实施**。本文是双人开发交接基线，不表示 `/mcp` 已可调用。v2 页面工具见文末。

## 1. 通用约定

- 传输：Streamable HTTP，端点 `/mcp`；首个验收客户端 Codex。
- 认证：每人独立 Bearer 密钥，不接受 URL query token。
- ID：沿用当前 PostgreSQL 正整数 ID。外部工具不支持任意集合名、任意 SQL 或 Payload 查询表达式。
- 分页：`page` 默认 1；`limit` 默认 12，最大 50。排序固定为最近更新时间倒序。
- `state`：`draft | published | trashed`。列表默认非回收内容，再与用户访问权限取交集。
- 既有文章写入必须携带 `expectedRevision` 正整数。工具输入名与数据库 `revision` 通过适配器映射。
- 修改字段采用白名单；未提供表示保留。`heroImageID: null` 表示移除封面，`categoryIDs: []` 表示清空分类。
- `get_post` 的 `id` 和 `slug` 必须且只能提供一个。slug 最大 120 字符。
- 标题 1–200 字符、摘要最多 500 字符、Markdown 正文 1–100000 字符；参数校验错误不写库。
- 所有时间输出 ISO 8601 字符串；公开 URL 只在文章已发布且未回收时返回。

### DTO

```ts
type PostSummary = {
  id: number
  slug: string
  title: string
  summary: string | null
  state: 'draft' | 'published' | 'trashed'
  revision: number
  categoryIDs: number[]
  heroImageID: number | null
  updatedAt: string
  publishedAt: string | null
  publicURL: string | null
}
type PostDetail = PostSummary & {
  markdown: string
  contentReplaceable: boolean
  warnings: string[]
}
type PageResult<T> = {
  items: T[]
  page: number
  limit: number
  total: number
  totalPages: number
  hasNextPage: boolean
}
```

DTO 不返回用户邮箱、密码字段、密钥摘要、内部数据库元数据。媒体列表返回 ID、alt、URL、mimeType、尺寸；不返回存储凭据。

## 2. 只读工具（B 负责）

| 工具 | 输入 | 输出 | 权限/语义 |
| --- | --- | --- | --- |
| `get_current_user` | 无 | id、name、role、capabilities | 仅当前密钥用户；不返回密钥本身 |
| `list_posts` | page?、limit?、state?、categoryID? | PageResult<PostSummary> | 已发布文章 + 自己的草稿；管理员可看全部；回收站须显式 state=trashed |
| `get_post` | id 或 slug | PostDetail | 对无权读取和不存在的目标统一返回 NOT_FOUND |
| `search_posts` | query、page?、limit?、state?、categoryID? | PageResult<PostSummary> | query 1–200 字符，标题/摘要/正文搜索；权限与 list 一致 |
| `list_categories` | page?、limit? | 分类 ID/title/slug 分页 | 查询已有分类，不能创建 |
| `list_media` | query?、page?、limit? | 媒体 ID/alt/URL/尺寸分页 | 可引用全部公开媒体，不因此获得他人媒体写权限 |

只读工具声明 `readOnlyHint: true`，但注解不能代替服务端访问校验。内容来自用户编辑，客户端应视为数据而非新的系统指令。[MCP 工具规范](https://modelcontextprotocol.io/specification/2025-11-25/server/tools)

## 3. 写入工具（A 负责）

| 工具 | 必填输入 | 可选输入 | 输出与状态 |
| --- | --- | --- | --- |
| `create_post` | requestId、title、markdown | summary、categoryIDs、heroImageID、slug | 创建草稿，返回 PostSummary；owner 取当前用户 |
| `update_post` | id、expectedRevision | title、summary、markdown、categoryIDs、heroImageID | 至少一个修改字段；公开文章保存立即生效 |
| `publish_post` | id、expectedRevision | 无 | 草稿 → published；校验完整内容与引用 |
| `unpublish_post` | id、expectedRevision | 无 | published → draft |
| `trash_post` | id、expectedRevision | 无 | draft/published → trashed |
| `restore_post` | id、expectedRevision | 无 | trashed → draft，绝不直接重新公开 |

作者仅操作自己的文章，管理员可操作全部文章。`update_post` 不能修改 slug、owner、authors、状态或任意底层字段。展示作者在创建时默认为当前用户，后续由后台维护。

传入的分类和媒体必须存在且允许引用；错误不能产生部分写入。回收状态禁止 update/publish/unpublish。已处于目标状态的生命周期操作在版本匹配时返回当前对象，不再增加版本；旧版本仍返回冲突。

### 创建幂等

`requestId` 使用 UUID。相同用户 + 相同 requestId + 相同输入只创建一篇文章；相同 requestId 不同输入返回 `REQUEST_CONFLICT`。幂等记录与创建动作同事务，不能仅依赖内存缓存或“先查后建”。暂不自动清理记录；Demo 数据量增大时另设保留策略。

### Markdown 边界

- 支持段落、标题、强调、列表、引用、链接、代码块、分隔线及媒体库图片。
- `get_post` 的 `contentReplaceable=false` 时，携带 markdown 的更新返回 `UNSUPPORTED_CONTENT`；仅修改标题/摘要/封面/分类仍允许。
- 图片引用通过已存在媒体 URL 解析，不获取任意远程 URL，不支持隐式上传。
- 每次转换保留结构语义；不得因不能识别区块而默默删去它。

## 4. 返回与错误

成功结果同时提供可读 `content` 文本与机器可读 `structuredContent`，保证两者一致，并为工具声明对应 outputSchema。写入响应带最新 revision 和状态。

示例业务结果：

```json
{
  "ok": false,
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "文章已被修改，请重新读取后再提交。"
  },
  "requestId": "服务端追踪标识"
}
```

SDK 的工具返回在业务失败时设置 `isError: true`；示例对象放入结构化结果并提供简短文本。参数/协议错误使用 SDK 的协议错误机制，认证失败在 HTTP 层返回，不能伪装成成功工具结果。

| 错误码 | 使用场景 | 客户端动作 |
| --- | --- | --- |
| UNAUTHENTICATED | 无效/撤销密钥、停用用户；HTTP 401 | 更换密钥或联系管理员，不自动重复写入 |
| FORBIDDEN | 明确无权执行某类动作 | 停止操作 |
| NOT_FOUND | 目标不存在或不能查看 | 不泄露是否存在他人草稿 |
| VALIDATION_ERROR | 类型、必填、长度或值错误 | 修正参数 |
| INVALID_REFERENCE | 分类/媒体不可引用 | 重新查询可用对象 |
| VERSION_CONFLICT | expectedRevision 过期 | 重新读取、合并后提交 |
| REQUEST_CONFLICT | 创建幂等 ID 被用于不同输入 | 使用新 requestId |
| INVALID_STATE | 对回收内容发布等非法转换 | 先执行正确状态转换 |
| UNSUPPORTED_CONTENT | 富文本无法无损替换 | 使用后台编辑，或仅更新元数据 |
| INTERNAL_ERROR | 未预期故障 | 记录 requestId，禁止盲目重试非幂等操作 |

## 5. 双人交接

双方共同确认 `ActorContext`、DTO、BlogError、PostSummary、PostDetail 和 PageResult。A 维护权限/事务及写工具；B 维护协议层、读工具和转换器。

转换器对外接口：

```ts
fromMarkdown(markdown, resolvedMedia): RichText
inspectRichText(content): { contentReplaceable: boolean; warnings: string[] }
toMarkdown(content, resolvedMedia): { markdown: string; warnings: string[] }
```

B 提供普通段落、代码、图片、未知区块四类固定样本。A 先用桩转换器完成写入状态与权限测试；B 先用模拟服务完成协议测试，之后替换真实服务。

## 6. v2 页面工具契约草案

| 工具 | 输入 | 可见结果 | 授权 |
| --- | --- | --- | --- |
| `set_search_query` | query | 搜索框与 URL 一致，结果已更新 | 公开 |
| `filter_posts` | categorySlug?、page? | 分类/分页状态与结果一致 | 公开 |
| `open_post` | slug | 进入本站文章详情 | 仅可公开阅读的文章 |
| `open_admin_panel` | 无 | 打开后台或登录页 | 导航不授予登录权限 |
| `open_post_editor` | id | 打开有权编辑的文章 | 当前后台会话 |
| `preview_post` | id | 显示有权阅读的草稿预览 | 当前后台会话与服务端校验 |
| `scroll_to_section` | headingID | 当前文章对应标题滚入视野 | 当前页面存在的锚点 |

最终 v2 参数 schema 在该版本启动时按浏览器实测冻结。导航可能终止旧文档中的执行环境，成功条件以新页面可见状态为准，不假定旧页面一定能返回完成消息。
