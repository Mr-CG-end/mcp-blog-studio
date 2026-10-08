<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Git Commit Specification

本项目统一 Git 提交规范：**Conventional Commit 英文前缀类型，中文简要描述**。

### 格式要求
```text
<type>(<scope>): <中文简要描述>

- <可选中文要点 1>
- <可选中文要点 2>
```

- **首行（Subject）**：前缀类型与 scope 使用英文（如 `feat(mcp):`, `fix(admin):`, `refactor:`, `docs:`, `test:` 等），冒号后接**中文描述**概括改动。
- **正文（Body，可选）**：如有必要分点阐述具体实现细节，可换行使用无序列表列出。

