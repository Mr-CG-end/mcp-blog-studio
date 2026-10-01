# v0 前端适配与维护（历史记录）

> 后续执行以 [Shiro 源码移植计划](shiro-integration-guide.md) 为准。用户已明确要求直接移植上游页面模块；下文“本地实现视觉”的方案仅记录旧版，不再作为执行要求。当前已安装 Jotai、Motion、DaisyUI，公共布局也已切换到 components/shiro，下文依赖和布局说明不代表最新状态。

更新：2026-09-30。用户选择 Shiro，并接受以非商业开源 Demo 方式复用所需模块。

## 来源和实现边界

固定来源：Innei/Shiro，提交 `891bb24cd59aff7c9baaf4d9a3579ca4275da3b7`。文章列表 Card 从上游 PostLooseItem 结构适配；导航、首页和阅读交互在当前项目实现，延续简洁、留白、柔和配色的方向。不是对上游整个网站的逐像素复刻。

保留 Next.js + Payload 和现有路由；不引入 Mix Space、Socket.IO、Jotai、独立后台或 Shiroi 付费内容。组件依赖沿用已有 lucide-react、Prism 和 Tailwind。

## 页面与配置

| 页面/功能 | 实现和维护位置 |
| --- | --- |
| 全站主题、移动菜单、导航 | Header、Footer、components/BlogChrome、前台 blog.css |
| 首页 | 站点介绍、品牌图（可选）、文章、分类、侧栏介绍 |
| 列表/分类/搜索 | 共用 Card/BlogList；分页参数 page，搜索参数 q |
| 阅读 | Payload RichText；目录、进度、返回顶部、图片弹窗、代码复制 |
| 关于 | SiteSettings.about 和 socialLinks |
| 开源说明 | /credits，源码下载 /source/blog-source.tar.gz |

内容以 Payload 富文本为唯一持久化正文。目录依据实际渲染标题生成 section-N 锚点；修改标题顺序会改变锚点序号。图片可点击或用键盘打开，Esc 关闭。无标题文章不显示虚构目录项。动画尊重 prefers-reduced-motion。

默认品牌图由 CSS 和图标组成，不需要远程图片服务。管理员可通过站点设置替换为媒体库图片。品牌图片也受引用删除保护。首页固定引导文案如需定制，修改首页组件；站点名称、介绍、关于及社交链接在后台修改。

## 许可与部署

见根目录 LICENSE、ADDITIONAL_TERMS.md 和 THIRD_PARTY_NOTICES.md。复用代码文件包含来源和改动说明。页脚提供开源说明入口。

`pnpm build` 前自动执行源码打包，使用明确允许的源码目录和配置文件，不打包 .env、.local、public/media、node_modules 或数据库。`pnpm source:package` 可独立更新源码包。源码包是部署产物，不提交 Git；部署时必须保留源码下载。应用构建完成后不要修改源代码再发布旧构建，以保证包与运行代码一致。

## 后续交接

v0 由 Codex 完成。用户验收后，两位开发者按 work-allocation.md 接续 v1/v2。新增 MCP 工具不直接访问前台组件；WebMCP 后续使用现有路由和语义控件。后台保留模板 Pages/Forms/Redirects 的数据结构但隐藏非核心导航，表单提交已禁用，避免引入本次未要求的功能。
