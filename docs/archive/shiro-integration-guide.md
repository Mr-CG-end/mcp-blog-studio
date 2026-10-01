# Shiro 源码移植：代码核对与执行计划

> **最新续作**：已按用户后续要求改为抓取 Yohaku 网页后转换 React，见 [当前转换记录](yohaku-conversion.md)。下文 Shiro 验收属于历史记录。

更新：2026-09-30。本文件取代旧版“Milestone 1 全部完成”的交接结论。

> **目标来源纠正（2026-09-30）**：用户指定的 https://innei.in/en 当前使用 Yohaku。作者公开仓库 https://github.com/Innei/Yohaku 的 README 明确说明，线上 Web 实现在私有仓库 https://github.com/Innei-dev/Yohaku 中维护；公开仓库仅含 iOS、设计系统及跨端渲染包。现有 Shiro 改动不是该线上页面的直接移植，下文“完成”仅指旧 Shiro 适配和所列功能测试，不能代表用户的视觉目标已完成。
>
> 本次读取检查：匿名 Web 访问返回 404；本机 HTTPS Git 没有可用认证身份（禁用交互提示时无法读取 Username），无法确认用户是否持有该仓库权限。尚未取得完整 Web 源码，因此暂停进一步页面替换，保留现有实现。下一步需要可读取的授权源码目录/压缩包，或为本机配置已获授权的仓库访问。获取入口见公开仓库 README 的“获取访问权限”。不会用设计系统或 iOS 页面冒充 Web 源码，也不会继续自行仿写后宣称直接移植。

## 当前交付（旧 Shiro 适配，未达到 Yohaku 页面目标）

首页 Hero / TwoColumnLayout / ActivityPostList、Header 网格及 spotlight 导航、Footer、PostLooseItem 与磁吸效果、搜索面板及结果行、详情标题/元信息/侧栏、目录项与阅读指示已按固定上游源码迁入并适配 Payload。具体源文件和修改见根目录 `THIRD_PARTY_NOTICES.md`。

- 新增 `/categories` 和公开 `/api/search`；`/search` 与弹窗共用结果 UI。
- `shiroAdapter.ts` 保留多作者、多分类和本地文章链接。
- layout 接通 SiteSettings；全站只有一个 main/主内容 ID。
- 已移除旧 `blog.css`，前台使用迁入的 Markdown 样式与必要 Payload 互操作样式。
- 正文保持 Lexical；重复标题锚点服务端生成并去重；支持桌面和移动目录、阅读进度、现有 Prism 代码复制及图片预览。
- 旧分页路由原本已经重定向到 query 分页，本次保留并验收。
- 搜索使用 360ms 防抖，取消过期请求，处理空结果、错误、输入法及空列表键盘操作；只返回公开文章字段。

必要适配差异：无品牌图时使用本站 favicon；首页不展示无数据的活动、手记、天气等模块；分类页面组合原有 UI；关于页采用 NormalContainer + Payload RichText；原搜索 Radix/Jotai 查询链路改为原生 dialog + Payload；图片预览和代码高亮保留本地实现。没有运行上游 Mix Space 站点做逐像素截图比较，视觉核对依据固定源码结构、样式和本地截图，不宣称整站逐像素一致。

以下第 2、3 节保留为**移植前核对记录**；第 5 节为执行顺序参考，当前结果以本节和文末验收记录为准。

## 1. 目标与执行约束

直接从 Shiro 复制所需页面模块及依赖文件，在其基础上适配 Payload CMS。保留上游布局、样式、字体、间距、响应式规则和动画，不再自行设计“Shiro 风格”的页面、Bento 卡片、装饰或文案区块。

- 上游：https://github.com/Innei/Shiro
- 本次实际下载并核对的提交：`891bb24cd59aff7c9baaf4d9a3579ca4275da3b7`，与 `THIRD_PARTY_NOTICES.md` 现有记录一致。
- 本次临时源码目录：`/tmp/mcp-shiro-audit-0930`。仅供本机核对，不作为持久依赖；执行前重新确认目录及提交。
- 最初核对仅修改文档；用户随后授权页面移植，本轮已实施，见顶部交付记录。
- 保留 Next.js + Payload、现有内容模型、权限、预览、SEO 与公开路由。Mix Space 请求替换为 Payload 数据读取。
- 必需的上游 UI 依赖按实际 import 安装；不以“减少依赖”为由重写视觉，也不整套引入 Mix Space 后端、登录、推送或在线状态系统。
- 保留源码许可、来源、修改记录和现有 `/credits`、源码下载机制。

## 2. 移植前本地代码核对结果

以下是源码状态，不等同于浏览器功能或视觉验收通过。

| 范围 | 当前代码与证据 | 结论 / 后续处理 |
| --- | --- | --- |
| 全站布局 | `src/app/(frontend)/layout.tsx` 已接入 `components/shiro` 的 Header、Footer、SearchFAB，保留 Providers、AdminBar、InitTheme | 已接线，不代表上游移植完成；重新对照原组件 |
| Header | 本地为 flex 布局、文字“白”Logo；上游使用 `header--grid`、HeaderArea、AnimatedLogo 和数据 Provider | 结构不同，按上游结构重移植，替换站点数据并裁剪登录功能 |
| Footer | 本地站点介绍、链接分栏及版权区域 | 按上游 footer 模块核对与替换；不能以目录名作为来源证明 |
| 搜索弹窗 | 本地 SearchFAB 自建弹窗，提交后跳转 `/search?q=`；上游包含 SearchPanel、Radix Dialog、结果查询与展示 | 当前交互不是上游实现，移植原面板并替换查询 |
| 首页 | `src/app/(frontend)/page.tsx` 使用 `home-hero`、羽毛装饰、数字花园文案、自定义侧栏 | 本地自行实现，整体替换为上游首页模块 |
| 文章列表 | `/posts/page.tsx` → BlogList → CollectionArchive → Card | 数据与分页可利用，页面呈现需要移植 |
| 文章卡片 | `src/components/Card/index.tsx` 有 PostLooseItem 来源注释；第三方说明也记录了改写及动画删除 | 部分结构复用，不算原卡片视觉完成；对照 PostItem 重新适配 |
| 分类 | 存在 `/categories/[slug]/page.tsx`；没有 `/categories/page.tsx`，Header/Footer 却链接 `/categories` | 缺分类索引；该 URL 可能落入通用 `[slug]` CMS 页面，不能认定已有分类功能 |
| 搜索页 | `/search/page.tsx` 已调用 listPublicPosts，支持 q/page | 保留 URL 和查询能力，复用上游结果组件来呈现 |
| 关于页 | `/about/page.tsx` 读取 SiteSettings.about/socialLinks | 保留数据，用上游通用内容页布局适配 |
| 文章详情 | `/posts/[slug]/page.tsx` 已接入 PostHero、RichText、RelatedPosts、ArticleReader 和预览 | 已有业务页面，尚未移植上游详情结构 |
| 阅读交互 | `src/components/ArticleReader/index.tsx` 已有目录、IntersectionObserver 高亮、滚动进度、返回顶部、图片 dialog | 旧文档称这些待新建不准确；以原组件替换视觉时保留功能 |
| 富文本 | `src/components/RichText/index.tsx` 已支持 Lexical、代码/图片/Banner/CTA 块 | 保留正文模型，不预先开发 Lexical → Markdown 转换器 |
| 数据适配 | `publicBlog.ts` 有 listPublicPosts/listCategories/getSite；没有 shiroAdapter.ts | 依据实际移入组件定义最小适配契约，删除旧文档臆定模型 |
| 样式 | 前台同时引入 globals.css、blog.css；前者再引入 src/styles/globals.css 和 DaisyUI 等 | 存在多套样式，按组件迁移并清除被替代规则；仅安装依赖不代表设计系统完成 |
| 后台 | `(payload)` 与 `(frontend)` 有独立 layout | 源码上分离；运行及样式隔离需要浏览器回归 |

额外需在移植中修复的问题：

- layout 和多页均声明 `<main id="main-content">`，造成嵌套 main 与重复 ID。统一为一个主内容区域。
- layout 渲染 `<Header />`、`<Footer />` 时未传站点设置，仍使用默认品牌名称。接入 `getSite()`，不要继续硬编码。
- 现有 `/posts/page/[pageNumber]` 与 `/posts?page=` 两种分页入口并存；迁移时核对兼容或重定向，不留下旧模板视觉。
- 公开列表通过 `publishedWhere` 排除草稿及软删除；详情通过 `overrideAccess: false` 和集合 read 权限过滤，预览会传入认证用户。不要误写成“所有查询都已显式过滤 published”，也不要在迁移中丢失这些边界。

## 3. 移植前检查与测试状态

本次检查：

| 检查 | 结果 |
| --- | --- |
| `./node_modules/.bin/tsc --noEmit --incremental false` | 通过，退出码 0 |
| `./node_modules/.bin/eslint .` | 通过，退出码 0 |
| `pnpm run typecheck` / `pnpm run lint` | 启动后长时间无输出，已中止；改用上述本地可执行文件完成检查，未确认 pnpm 等待原因 |
| 生产 build | 本次未运行，不沿用旧文档“9/9 路由”作为当前证据 |
| 浏览器 E2E、截图对照、后台登录 | 本次未运行 |

`tests/e2e/runner.ts` 只检查文件是否存在、打印硬编码覆盖矩阵，并调用 `playwright test --list`。它不执行浏览器测试，退出码 0 不能证明功能完成。

`tier1-features.spec.ts` 等测试需要整理：存在 `expect(true).toBe(true)`、数量 `>= 0`、仅检查 body 可见等无效验收；某些测试在元素不存在时不做断言，适配器和 Markdown 转换器不存在时会跳过。不能用测试数量或注册成功认定阅读器、目录、图片放大已验收。

## 4. 已核实的上游移植入口

下表上游路径均相对于 `apps/web/src/`。这是入口清单，执行时继续沿 import 追踪 CSS、hooks、providers、图标和 UI 原语，不只复制一个页面文件。

| 本地目标 | 上游入口 | 适配方法 |
| --- | --- | --- |
| 前台公共布局 | `components/layout/header/`、`components/layout/footer/`、`styles/` | 连带 grid.css、容器、主题与实际依赖迁入；站点信息替换为 Payload |
| 首页 `/` | `app/[locale]/(home)/layout.tsx`、`components/Hero.tsx`、`ActivityScreen.tsx`、`ActivityPostList.tsx`、`TwoColumnLayout.tsx`、`Windsock.tsx` | 可视主体在 layout；page.tsx 主要是 JSON-LD 与推送注册，不能只复制它。保留有数据支撑的原模块，移除无数据模块 |
| 列表 `/posts` | `app/[locale]/posts/page.tsx`、`components/modules/post/PostItem.tsx`、`PostItemComposer.tsx`、`PostItemHoverOverlay.tsx` | 使用原列表及卡片，替换 apiClient/definePrerenderPage，适配现有分页 |
| 详情 `/posts/[slug]` | `app/[locale]/posts/(post-detail)/[category]/[slug]/page.tsx`、同目录 `PostContent.tsx`、`pageExtra.tsx` | 拷贝原详情结构与子模块，保留本地 slug 路由、权限和预览 |
| 目录和阅读指示 | `components/modules/toc/`、`components/modules/shared/ReadIndicator.tsx`、`ArticleRightAside.tsx` | 复用原 UI，将标题来源适配为 Lexical 渲染结果 |
| 正文样式 | `components/ui/markdown/markdown.css`、`markdown-variants.css`、`renderers/` | 先核对 DOM/class 契约，再让 Lexical converters 输出兼容结构；仅套 prose 不算完成 |
| 搜索弹窗与 `/search` | `components/modules/shared/SearchFAB.tsx` | 原仓库没有独立 search/page.tsx；保留原面板和结果视觉，抽取结果组件供独立页复用 |
| 关于 `/about` | `app/[locale]/(page-detail)/[slug]/page.tsx`、同目录 `PageContent.tsx` | 上游是通用内容页，不是专用 about 页；适配 SiteSettings.about |
| 分类索引及详情 | 复用上游文章列表、容器、导航/筛选相关原语 | 上游无独立 categories 页面，不能声称有可直接拷贝的分类页；组合现有原语并记录必要差异 |

注意：上游 `posts/(post-detail)/[category]/page.tsx` 实际调用 getFullUrl 并重定向，不是分类文章列表，不能错拷为 `/categories/[slug]`。

不迁入：手记、说说、友链、独立动态时间线、天气/在线状态、评论后端、推送与 Mix Space 登录。首页中的原文章流模块可保留；混合手记/动态模块只保留已有文章数据能够支撑的部分。不制造虚假统计或占位活动。

## 5. 分阶段执行计划

### A. 固定来源与依赖清单

1. 确认上游固定提交；逐模块列出源路径、目标路径、必要依赖和裁剪项。
2. 将来源及修改原因写入 `THIRD_PARTY_NOTICES.md` 和被移植文件注释。状态分为待迁入、已迁入、数据已接通、视觉已验收。
3. 编写业务代码前，按 AGENTS.md 读取本地 `node_modules/next/dist/docs/` 对应的路由、布局、服务端/客户端组件和数据获取指南。
4. 基于真实组件 props 定义 `src/services/shiroAdapter.ts`。保留多作者、多分类，处理缺图、未展开 relationship、空摘要、日期、分页和 URL；不能简单丢掉除首项外的分类。

交付：可追溯的文件清单及最小数据适配契约，不先重建一套抽象设计系统。

### B. 公共外壳与首页，作为第一批可视交付

1. 移入 Header/Footer 及实际所需的主题、抽屉、容器、样式和动画依赖。
2. 接入 SiteSettings，统一 main 与跳转锚点，处理分类入口所指向的真实路由。
3. 从上游 `(home)/layout.tsx` 及 components 移植首页；接通站点介绍、品牌图、社交链接与已发布文章。
4. 删除被替代的首页装饰、侧栏文案及专属 CSS；先查引用，避免误删仍供其他页面使用的样式。
5. 对照固定版本的上游代码/可运行预览验证桌面、移动、明暗主题，记录因功能裁剪产生的差异。

交付：一批能打开、能对照来源的首页和公共布局。通过后继续下一批，避免先改完所有页再统一发现视觉偏差。

### C. 文章列表、分类、搜索和关于

1. 移入 PostItem 系列及分页/空状态模块，接通 `/posts`。
2. 分类详情复用同一个列表；分类索引用上游现有容器、链接原语组合，补齐 `/categories`。
3. 移入原搜索面板；用受公开权限约束的服务端查询入口替换 Mix Space，保持键盘操作与结果呈现。客户端不得导入 Payload Local API；搜索接口只返回公开字段。
4. `/search` 复用结果组件并保留 q/page；`/about` 使用上游通用内容页布局。
5. 统一链接映射，不把上游 `/posts/[category]/[slug]` 泄漏到本项目导航。保留已有合法链接、分页及 SEO。

交付：所有保留的导航均可访问，空数据和无结果状态可用，列表视觉有对应上游来源。

### D. 文章详情和阅读器

1. 迁入上游详情布局、标题/元信息、目录、侧栏、阅读指示及必要图片/代码 UI。
2. 保留 Payload Lexical，按上游正文样式与目录要求适配 converters、标题 ID 和容器结构；逐项覆盖代码、图片、表格、引用和现有自定义块。
3. 用上游阅读交互替换本地 ArticleReader 中对应 UI，完成前保持旧功能可用。不要同时叠两套目录、进度条或图片弹窗。
4. 保留多人作者、多分类、相关推荐、认证预览与 LivePreviewListener。对无标题、长标题、重复标题、缺封面文章验证。
5. 只有出现具体且无法通过 converter 解决的兼容问题，才评估局部转换；不默认新增整篇 Markdown 序列化链路。

交付：原版阅读布局适配真实 Payload 文章，内容不丢失、锚点稳定、移动目录可用。

### E. 清理与验收

1. 删除无引用的旧组件、被替代 CSS 和确定不需要的依赖；同步维护文档、来源记录。
2. 用固定测试数据修正 E2E，移除恒真断言与“元素缺失就通过”逻辑。必需功能缺失应失败；明确裁剪的功能不再列为必过项。
3. 运行类型检查、lint、生产构建，再执行真实浏览器测试。Playwright 配置默认使用 next start 和本机 Chrome，需要构建产物、数据库、测试数据及浏览器；不要将已有 dev server 混作生产验收。
4. 覆盖首页→列表→详情、分类筛选、搜索分页、主题持久化、移动菜单、目录跳转、代码复制、图片预览、匿名草稿隔离、认证预览、后台登录。
5. 对桌面/移动和明暗主题截图对照，记录来源版本、视口、数据及有意裁剪。仅无报错或截图存在不足以证明还原完成。

建议执行命令（环境满足后）：

```bash
pnpm run typecheck
pnpm run lint
pnpm run build
pnpm run test:e2e
```

每批完成记录实际命令、退出码、浏览器结果、截图路径和未完成事项。未运行或被跳过的检查明确标记，不能重新写成“全部通过”。

## 6. 完成标准

- 页面主体能够追溯到固定版本上游文件；新增代码集中于数据、路由和框架适配。
- 页面保留上游视觉与交互；必要裁剪有记录，没有自创替代版视觉。
- 核心公开路由、正文、分页、预览及后台不退化。
- 类型、lint、build、有效 E2E 和视觉对照都有实际证据。
- 当前状态：已按 A → B → C → D 完成适配，E 的实际验收记录见下文。

## 7. 本轮验收方式

原 `tests/e2e/runner.ts` 已替换为真实浏览器测试运行器，负责生成独立临时文章、执行 `shiro-migration.e2e.spec.ts` 并清理本次记录，不再打印硬编码覆盖矩阵。旧 tier 测试包含过时契约及无效断言，不作为本轮完成证据。

复验前需要本地 `blog_studio` 数据库、已有管理员及演示分类/文章、安装 Chrome，并完成生产构建：

```bash
node node_modules/next/dist/bin/next build
E2E_PORT=3100 node --import tsx tests/e2e/runner.ts
```

运行器不会复用/覆盖已有文章；只创建独立前缀的已发布及草稿文章，清理时核对 ID 和 slug 前缀。若中断留下 `/tmp/shiro-browser-fixture.json`，先运行 `node --import tsx scripts/shiro-test-fixture.ts --cleanup` 再复验。

### 最终验收记录（2026-09-30）

- TypeScript：`tsc --noEmit --incremental false` 通过；最新生产构建中的 TypeScript 检查也通过。
- ESLint：`./node_modules/.bin/eslint .` 通过。
- 生产构建：`node node_modules/next/dist/bin/next build` 通过，10/10 静态生成任务完成。
- Chrome：`E2E_PORT=3100 node node_modules/@playwright/test/cli.js test shiro-migration.e2e.spec.ts --workers=1`，**7 passed (15.6s)**。
- 覆盖：公开页面桌面/移动视口、唯一 main、无横向溢出与客户端异常、分类导航、真实搜索/空结果/失败反馈、键盘操作、主题持久化、重复标题锚点、目录跳转、移动目录、代码复制、阅读进度、匿名草稿隔离、旧分页重定向与 404、后台登录入口隔离。
- 截图检查发现并修复旧 `:root:root` 覆盖暗色变量的问题，增加暗色搜索输入框样式断言；修复后重新构建及七项验收均通过。
- 最终截图保存在本机 `.local/shiro-acceptance/`：home-desktop.png、home-mobile.png、reader-desktop-dark.png、search-mobile-dark.png。桌面 1440×900，移动 390×900；使用本地演示文章与站点信息。
- 两篇临时验收文章已按 manifest 中的 ID 和 slug 前缀校验并删除，临时 manifest 已清理。
- 限制：未与运行中的上游站点逐像素比对；图片弹窗、认证预览和后台编辑全流程没有纳入这七项测试，不声称已全部回归。
- 服务端在快速切页验收中仍记录 `The destination stream closed early`（digest 1819283730）；测试页面响应和浏览器运行断言均通过，日志原因尚未专项定位，不将其描述为零服务端日志错误。

本轮页面移植与上述范围的验收已完成，尚未发布到生产环境。
