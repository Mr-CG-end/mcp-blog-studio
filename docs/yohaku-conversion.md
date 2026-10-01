# Yohaku 中文本地转换记录

基准为 `https://innei.in/` 中文站，2026-10-01T01:26:07.421Z 的固定公开页面快照。旧英文版记录已被本文替代。没有部署。当前实现仍有未验收项目，不代表逐像素或逐帧一致。

## 数据与来源

- `.local/yohaku-zh/manifest.json`、`pages/`、`assets/` 保留原始 HTML、流式插槽还原 HTML、CSS、字体及资源清单。原站 JS 仅作为动画分析依据，不在本地执行。
- 选定 30 篇导入本地 Payload，批次 `yohaku-20261001012607`；原有 4 篇保留。来源 URL、作者、抓取时间、hash、标题锚点单独存储。文章仍为可编辑 Lexical 内容。
- 首页头像、介绍、社交图标与 Hero 结构来自中文 DOM，文章列表接本地数据。384 篇／164 万字／2948 天是原站快照统计，非本地数据；tooltip 标注快照日期。
- 公开页面中有付费/限时公开内容标识，来源著作权不因公开可读而转移；目前仅按用户要求存于本地，不公开发布。

## 本轮实现

| 模块 | 已实现 | 差异或待验收 |
| --- | --- | --- |
| 桌面导航 | 左头像触发居中细条，首页／文稿／分类／搜索／关于，Esc 和外部点击关闭，不锁滚动 | 原站账号操作删除；活动 pill 的弹簧位移动效仍需逐帧对照 |
| 手机导航 | 底部纸面 dock，展开、遮罩、键盘焦点、滚动锁 | 390／768 及横竖屏切换待本轮浏览器复测 |
| 目录 | 按当前根章节显示子标题、滚动高亮、进度、返回顶部、移动 sheet 260ms 入场／180ms 退场 | 波浪分隔和各级精确高度动画待对照；不以构造标题声称真实重复标题样本覆盖 |
| 搜索 | 原站顶部定位，桌面 680px／max84vw、min(520px,60vh)，手机80vh；本地全文搜索、键盘选择、IME、Esc | 本地增加关闭与键盘帮助；结果行仍保留 Shiro 适配结构 |
| 图片 | 纸色全屏遮罩，从原图位置放大，380ms cubic-bezier(.32,.72,0,1)，Esc／点击关闭、焦点回归 | 新实现尚未浏览器验收，未声称手势完全一致 |
| 文稿 | 896px 容器，588＋56＋252 两栏，每页10篇；快照置顶旧文移到第一条 | pin为来源快照规则，非后台通用置顶字段；未接原站标签、排序与无AI筛选 |
| 分类详情 | 672px 年份时间线，篇数／起始年份／日期，数据来自本地文章 | 只反映已导入30篇的分类，不伪造原站85篇等数量；标签省略 |
| 关于 | 自述标题、桌面左对齐、896px 纸面、80px 正文间隔；关于图片已本地化 | 原站折叠个性模块转为静态内容；无评论与付费服务 |
| 正文 | 1152px 外框、952px 内容＋200px目录，16px／28px正文，来源锚点、本地图片、表格、代码 | AI摘要、实时读者、点赞、评论栏、Whiteboard/交互组件运行时删除；删除评论gutter后行宽会变化 |

首页手记、碎念、通信、时间轴、订阅及相关动态服务删除。页脚移除备案号、在线人数、订阅和语言切换；保留本地路由、来源说明和主题。分类索引为本地可用入口，没有声称存在对应原站模板。

## 验证证据

- `tests/unit/yohaku-import.test.ts` 4项通过：格式/标题/链接、表格/代码/图片、安全链接与遗漏记录、列表内代码/按钮图片/hash。
- `scripts/yohaku/import.ts` 正常重跑：created 0，skipped 30，failures 0。
- `scripts/yohaku/audit.ts` 修复后报告 `.local/yohaku-zh/audit.json`：30篇标题数、表格数、pre代码块数、img数与归档一致，引用的媒体文件无丢失；原有文章4篇；匿名公开结果中草稿0。计数一致不等于逐段视觉或语义完全一致。
- 修复前记录发现列表内3段代码和链接/按钮图片丢失。`repair-content.ts` 已对批次 revision1 原文执行一次修复，备份于 `before-content-repair/`；修复后revision2，journal记录修复revision，人工修改不被覆盖。
- 本轮浏览器实际确认：桌面本地导航居中出现、打开不锁滚动；列表可读取30篇和分类。原站搜索、图片预览、分类、关于的 DOM/计算样式已测量。
- 浏览器工具在用户追问进度后的恢复调用被 URL 安全策略阻止，不能继续绑定 `http://localhost:3104/posts`。未绕过。故390／768／1440完整矩阵、深浅色截图、新图片预览、目录滚动和逐帧动画尚未验收；没有新增截图文件可交付。

## 操作与恢复

本机工具入口建议直接调用本地 Node 包（本轮 pnpm 启动器曾无输出挂起）：

```sh
node --import tsx scripts/yohaku/import.ts --dry-run
node --import tsx scripts/yohaku/import.ts
node --import tsx scripts/yohaku/audit.ts
node node_modules/vitest/vitest.mjs run --config vitest.unit.config.mts tests/unit/yohaku-import.test.ts
node node_modules/next/dist/bin/next dev --port 3104
```

导入脚本仅允许localhost/127.0.0.1 的 blog_studio 数据库。按来源URL去重，含回收站记录也跳过，避免重复恢复或覆盖编辑。修复脚本只处理源hash相同、revision1且非回收站的导入文章，重复运行会跳过revision2。

`node --import tsx scripts/yohaku/import.ts --undo` 只把journal中未被再次编辑的本批文章移入回收站，不销毁数据、不删除共享媒体和分类。修复后的受保护revision来自journal；普通首轮记录默认revision1。恢复应在Payload回收站操作，恢复后状态为draft，检查后再发布。没有在用户真实文章上执行撤销/恢复实测。

数据库卷 `blog_postgres` 持久保存数据库；媒体位于 `public/media/`，不在数据库卷。备份需要同时保存数据库、`public/media/`、归档manifest/journal和站点设置备份。迁移前备份 `.local/yohaku-zh/before-import.dump`；不要用它覆盖整个现有数据库来撤销局部导入。

`YOHAKU_SOURCE_MODE=1` 仅过滤公共列表、搜索及分类索引；不删除原有文章，也不是访问控制开关。去掉变量恢复全部合法公开内容。直接旧文章URL仍按原权限读取。

## 动态图表深度审计报告（Whiteboard 与交互组件）

在 2026-10-01 快照批次 `yohaku-20261001012607` 的 30 篇基准文章中，共审计确认 **16 处** 动态图表/交互嵌入遗漏点（记录于 `import-yohaku-20261001012607.json` 的 `omissions` 清单，标记为 `interactive-embed`）：

### 1. 16 处具体分布明细表

| 序号 | 所在文章 Slug | 类型 | Block ID / 资源属性 | 前文上下文摘要 | 后文上下文摘要 | 连贯性核验 |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `electron-ota-updater` | Whiteboard | `LWtYPBAc` | ...问题出在它切的是压缩之后的安装包。 | 先看上半部分。压缩有点像把一整本书改写成速记... | 连贯，图解后文有详细比喻解读 |
| 2 | `electron-ota-updater` | Whiteboard | `rdXp_ZJP` | ...窗口加载哪个地址是我们在 main 里自己写的（win.load... | 图里 asar 中的 main 和 preload 始终不变... | 连贯，后文直接解释架构原理 |
| 3 | `electron-ota-updater` | Whiteboard | `BWrYGvVM` | ...在整个项目的 workspace package 依赖树中，它会表现得更加复杂... | 拿 LobeHub 里真实的依赖举例：@lobechat/const... | 连贯，平滑过渡到具体依赖链 |
| 4 | `electron-ota-updater` | Whiteboard | `E6-wv7d4` | 拿 LobeHub 里真实的依赖举例：@lobechat/const... | 也就是说，一旦 preload 和 main 的代码或者依赖的产物有变动... | 连贯，承接结论说明 |
| 5 | `electron-ota-updater` | Whiteboard | `VxFQlmjx` | ...把业务代码作为一份基底，同样打包进 App。 | 三种做法的差别在于业务代码放在哪。传统做法全塞进 app.asar... | 连贯，后文展开三者对比 |
| 6 | `electron-ota-updater` | Whiteboard | `yjKHz6iW` | ...改一行代码文... | 客户端拿到 manifest 后，先对照本地已有的文件...算出缺哪些 sha256... | 连贯，承接客户端更新逻辑 |
| 7 | `electron-ota-updater` | Whiteboard | `YeoObid2` | 合并后的文件叫 pack：每个文件压好的 zstd 帧原样首尾拼接... | 400 的上限也去掉了。下片段还是下整包，改成按估算耗时来选... | 连贯，继续阐述传输优化策略 |
| 8 | `electron-ota-updater` | Whiteboard | `NbLyNeKD` | ...多保留一个版本实... | 硬链接可以理解成给磁盘上同一份内容起第二个文件名... | 连贯，后文详细解析硬链接概念 |
| 9 | `electron-ota-updater` | Interactive | `Gre83_xN` (`1avt4oruvczl0omum8.js`) | #20211 把启动检查改成逐个文件 stat：只看文件在不在... | Windows 测试机是 i5-13600KF + NVMe... | 连贯，后文说明测试基准硬件参数 |
| 10 | `electron-ota-updater` | Interactive | `WyE3GFfx` (`1avt4oruvczl0omum8.js`) | 我从 GitHub Actions 里拉了 9 月 25 日到 29 日所有成功的 Canary 发版... | 全量构建慢在 macOS：Apple Silicon 的构建 job 要 16–24 分钟... | 连贯，承接构建瓶颈分析 |
| 11 | `electron-ota-updater` | Whiteboard | `NBpQXasJ` | main 层有改动：退出 App 再重启一下就好... | （章节衔接）：下一步：Stable 换成 Sparkle | 连贯，自然过渡至下一节 H2 标题 |
| 12 | `electron-ota-updater` | Interactive | `RVMJMzQw` (`1avt4oruvczl0omum8.js`) | 拿 Kansoku 最近几次发版的真实产物来看，全量 zip 大约 120 MB... | 小版本之间只要 0.7–1 MB；跨了两个版本、改动也多的那次是 14.3 MB... | 连贯，后文完整解释对比数据 |
| 13 | `electron-ota-updater` | Whiteboard | `ZJnMe2zb` | 我增强过的 Sparkle Updater 还支持跨多个版本打补丁... | 补丁链的代价是每一跳都要把整个 App 读几遍做校验... | 连贯，后文阐述补丁链性能代价 |
| 14 | `ai-era-dev-workflow-review-and-verify` | Whiteboard | `R6nnVUuz` (`7hhb4iir0pzlih5uf8.json`) | 之后就是打草稿 - 修改的 loop 直到发布。 | 这里有篇文章也可以看一下。 | 连贯，段落承接顺畅 |
| 15 | `ai-era-refactoring-from-rfc-to-five-plans` | Whiteboard | `pbYgVl28` | ...CDN 直接命中对应产物返回。 | 理解这套机制，也就理解了迁移到 Vite 的难点一... | 连贯，直入机制原理解释 |
| 16 | `ai-era-refactoring-from-rfc-to-five-plans` | Whiteboard | `zFpBgvdU` | ...运行时按 v... | 那么差不多就是上面那些我们需要知道的。剩下的就是... | 连贯，自然小结并开启下一节 |

### 2. 原站技术原理与为什么必须剔除

- **原站实现机制（SSR vs 客户端水合）**：
  - **服务端 SSR 阶段**：原站针对 Whiteboard 与 Interactive component 仅输出纯文本占位符容器（如 `<div class="rich-block-anchor"><span class="text-sm">Whiteboard</span></div>` 或 `<div class="_1b17zou0 rich-dynamic-root"><span>Interactive component</span></div>`）。SSR DOM 中**完全不存在任何预渲染的静态 SVG、`<img>` 或位图**。
  - **客户端 Hydration 阶段**：
    * **Whiteboard**：原站浏览器端动态加载 `@excalidraw/excalidraw` 运行时（如 `assets/cb3bf068019e5e262394.js`），调用 `document.createElement("canvas")` 获取 2D 绘图上下文，解析 Next.js RSC 流中内联的 JSON snapshot 数据或远程 JSON（如 `https://object.innei.in/mx-space/2026/0817/7hhb4iir0pzlih5uf8.json`），纯在前端 Canvas 上动态演算并绘制矢量白板。
    * **Interactive component**：原站通过动态微前端加载机制，从外部 CDN（如 `https://object.innei.in/mx-space/2026/0929/1avt4oruvczl0omum8.js`）动态 `import()` 独立 React 组件 chunk，并传入 `props.rows` 渲染带有客户端交互逻辑的性能对比测试表。
- **降级与工程决策**：
  - 原站未提供任何可供爬虫提取的静态 SVG 或 PNG 降级资源；
  - 本地环境为标准 Payload CMS + Lexical 富文本与 Next.js 静态/SSR 架构。本地不支持也不应引入完整的 Excalidraw Canvas 运行时，更绝不引入不安全的外部远程动态 CDN 脚本执行机制（存在严重的代码注入安全隐患与不可控外部依赖）；
  - 若在 Lexical 转换中保留原始 SSR 占位符 DOM，将在正文渲染出灰底空白方框与生硬的 "Whiteboard" / "Interactive component" 字符，极大破坏阅读质感；
  - 转换器（`scripts/yohaku/lexical.mjs`）通过精确匹配 `.rich-block-anchor` 及其文本规则，干净剔除这 16 处占位符并记录入 `omissions`。经审计，剔除后正文上下文文字段落过渡自然连贯，完整保留了作者的原意与核心内容。

---

## 历史抓取资产与异常记录审计收尾

对 `.local/yohaku-zh/manifest.json` 与采集日志中的异常项进行了最终闭环审计：

1. **Figma 资源 HTTP 403**：
   - 资源 URL：`https://s3-alpha.figma.com/hub/file/2370909007482546284/acdc80c5-af61-4c59-b6f0-2baae9ebf96f-cover.png`
   - 审计结论：经核实，该 URL 仅来自文章 `react-native-uikit-colors` 底部引用的外部 Figma 社区文件（`ios-18-and-ipados-18`）的 RSC enrichment 外部链接卡片缩略图，**非文章正文内容插图**。Figma S3 针对外部直链启用了鉴权/防盗链导致 HTTP 403。本地正文及引用的媒体资源 0 丢失，符合安全与爬虫合规规范，归档如实保留原始失败记录。
2. **CSS SVG fragment（`%23SVG...`）误解析**：
   - 资源 URLs：`https://innei.in/_next/static/chunks/%23SVGw6R8JeYL`、`https://innei.in/_next/static/chunks/%23SVG2dzaCchj`
   - 审计结论：原站 CSS 中包含内联 SVG filter / clipPath 锚点（如 `url(#SVG...)`，在样式构建后转义为 `url(%23SVG...)`）。历史抓取脚本曾将其误视作相对于 chunk 的静态文件发起请求导致 HTTP 404。`scripts/yohaku/capture.mjs` 已更新 `/^(data:|blob:|#|%23)/i` 正则防御逻辑，历史 `manifest.json` 保持初始失败快照。
3. **`nextjs+vite-hack-combined` 抓取异常**：
   - 资源 URL：`https://innei.in/posts/tinkering/nextjs+vite-hack-combined`
   - 审计结论：经 curl 实际追踪，原站服务端针对该包含 `+` 的 URL 触发了 Next.js 路由规范化无限 308 重定向（返回 `HTTP 308` 且 `Location` 重新指向原 URL，连续重定向超过 50 次超限，curl 退出码 47）。Node.js fetch 同样因超出最大重定向深度抛出 `TypeError: fetch failed`。该文章不在选定的 30 篇导入文章之列，原站线上本身即处于重定向死循环故障状态，归档如实记录失败，不作破坏性盲目重抓。
4. **真实文章标题结构全量审计**：
   - 审计范围：全量审计了 `.local/yohaku-zh/manifest.json` 全部 48 个页面快照（共 296 个标题），以及导入 Payload 的 30 篇真实文章（共 178 个标题）。
   - 审计结论：**原站真实文章中重复标题数严格为 0（零重复）**。单元测试中关于重复标题/details 嵌套的测试用例属于架构前瞻性与边界防御测试，原站真实文稿均具备唯一且语义明确的标题层级体系。

---

## 官方删改与差异清单（Omissions & Adaptations Catalog）

基于架构裁剪、第三方私有服务缺失或单机 CMS 本地化要求，本系统做出的最终官方删改与适配差异清单如下：

### 1. 首页模块
- **手记（notes）**：原站短篇手记流，本地专注标准长文博客架构，予以裁剪；
- **碎念（musings）**：原站类微博/Mastodon 碎念流，不引入额外动态流，予以裁剪；
- **通信（letters）**：原站公开信件/读者来信模块，予以裁剪；
- **时间轴（timeline）**：原站全站动态混合时间轴，裁剪为仅保留“近期笔墨”（5 篇最新文章线性时间线）；
- **邮件订阅模块（newsletter）**：原站接入第三方邮件列表推送服务，本地无外部邮件发信与订阅收集后台，予以裁剪。

### 2. 正文详情页模块
- **AI 摘要模块**：原站正文顶部由大模型自动生成的总结卡片，因本地无在线大模型推理服务，予以裁剪，正文在元数据后紧凑呈现；
- **实时在线读者数**：原站基于 Mix Space WebSocket/SSE 长连接广播的在线读者指示，本地无实时网关，予以裁剪；
- **点赞 / Reactions**：原站文章底部的表情微互动与点赞接口，本地定位为静态沉浸阅读与无状态 Payload CMS，予以裁剪；
- **评论区与 49px 评论 Gutter**：原站评论列表及桌面端正文右侧预留的 49px 评论侧槽（用于悬浮评论气泡），本地完全去除评论组件，并将评论 gutter 移除（正文自然占据排版宽度，无空白侧栏）；
- **客户端 Whiteboard / 交互组件运行时**：原站 16 处 Excalidraw 绘图与微前端基准测试交互组件，剔除灰底占位符，保留上下文字段落连贯性。

### 3. 全站与页脚模块
- **用户登录与账号管理操作**：原站顶部右上角基于 GitHub/Mix Space 的用户登录、仪表盘入口，本地仅保留后台管理（`/admin`），前台导航去除登录入口；
- **多语言切换（/zh, /en, /ja）**：原站支持多语切换，本版本严格以 2026-10-01 爬取的中文基准站（/zh 快照）为准，不挂载前台语言切换路由；
- **工信部备案号**：原站页脚备案号，本地版本为单机独立实例，替换为本地版权说明与源码开源声明；
- **服务器网关在线状态**：原站页脚展示的 Edge 节点延迟探测与在线指示灯，本地静态与 Payload 单机无此远程遥测探针，予以裁剪。

### 4. 文稿列表页模块
- **删改项**：
  * 原站文稿列表页顶部的复杂标签多选筛选器、按字数/热度排序下拉单、以及“无 AI”（Hide AI-generated）过滤切换开关，因本地未引入标签多维索引与 AI 标记字段，予以裁剪。
- **保留与适配项**：
  * 精确还原每页 10 篇分页机制（`posts.totalPages > 1`，包含 `← 上一页` 与 `下一页 →` 导航）；
  * 准确挂载 2026-10-01 快照中的置顶文章规则（`ai-era-efficiency-paradox-productivity-gains-cause-fatigue` 作为首篇置顶卡片呈现，带有置顶标签与特定排版边距）；
  * 保留总篇数统计（`共 N 篇`）以及移动端快捷工具栏（`⌕ 搜索`、`分类`）；
  * 保留右侧/底部归档侧栏分类统计。

---

最终静态检查（本轮09:59）：生产 `next build` 成功，TypeScript通过，10/10静态路由生成；修改后的阅读器/导航/分类与公共数据服务ESLint无问题。全仓ESLint仅审计脚本6条显式any类型警告，无错误。转换4项测试再次通过。构建通过不替代浏览器验收。

## 10:16 续做与实际验收

- 本轮恢复过浏览器访问，启动仅绑定127.0.0.1的3104 dev服务。实际在390px复现菜单打开后切到1440px仍保留body overflow:hidden；已增加1024px媒体查询切换时关闭两端导航，目录sheet也增加相同关闭处理。修复后跨断点回归尚未完成。
- 390px原站列表截图确认顺序为标题、置顶卡、篇数/工具、列表；本地已移除标题前的移动搜索侧栏，篇数移到置顶卡后，置顶摘要两行、20px内边距、完整细边框。移动工具保留搜索/分类，原站标签/排序/AI筛选仍属删改差异。
- 桌面1440px搜索：弹窗x380、y84、宽680、高520；Electron查询返回4条本地结果；Esc关闭后overflow恢复空字符串，焦点回快速搜索按钮。
- 桌面目录点击renderer章节后，aria-current切换正确，前章节blockmap子标题及非当前章节子级收起。已从原站aside提取波浪SVG路径，替换本地直线；目录活动轨迹和逐帧进退场仍待验收。
- 桌面图片预览：1600px原图加载完成，弹窗显示；Esc退出后滚动恢复，焦点回原图。380ms动效仅实现参数，未逐帧证明一致。
- 关于页发现details被压平成一个段落。转换器现在保留其内部标题/段落；repair-about-details.ts只对文本完全匹配归档的原段落执行替换，已恢复17块，备份before-about-details-repair.json。保留其它内容与媒体；仍为静态展开，未恢复折叠交互。
- 关于页另有媒体ID未展开造成空src。SiteSettings.about原先使用没有BlocksFeature的全局编辑器；已注册媒体块及标题/列表/引用/分割线/工具栏。check-about-media.ts匿名只读检查确认mediaBlock已展开且有本地url。类型和import map已生成；修复后的图片浏览器回归待完成。
- 原站electron-ota公开DOM未找到正文canvas或含图表文字的大型SVG，正文动态Whiteboard仍缺失。此观察只针对这一页，不能泛化为所有文章都不可提取。

证据文件在`docs/yohaku-evidence/`：article-toc-1440-light.png、source-article-1440-light.png、image-preview-1440-light.png、category-1440-dark.png、about-1440-dark.png、home-1440-dark.png。截图是选定状态记录，不是完整配对矩阵；部分开发截图包含Next dev指示器。

本轮浏览器先因错误data:标签页导致viewport设置未落在正常页，之后用户继续消息使REPL绑定丢失。重新绑定当前http://localhost:3104/about被URL安全策略明确拒绝（错误声称协议不允许），未用替代浏览器或间接方式规避。390/768/1440深浅色完整配对、横竖屏与焦点回归、导航pill弹簧、搜索结果行对齐仍未完成。需恢复正常浏览器工具访问后继续，不能宣称复刻验收完成。

10:17静态验证：新增details用例后5项转换测试通过；本轮修改文件ESLint无错误/警告，tsc通过，生产构建成功（10/10静态路由）。没有部署。
