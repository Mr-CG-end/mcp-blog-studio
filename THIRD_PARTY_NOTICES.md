# 第三方来源与修改说明

## Shiro

- 作者：Innei；Copyright (C) 2024 Innei。
- 仓库：https://github.com/Innei/Shiro
- 固定提交：891bb24cd59aff7c9baaf4d9a3579ca4275da3b7。
- 许可：AGPL-3.0，另见根目录 ADDITIONAL_TERMS.md。
- 2026-09-30：src/components/Card/index.tsx 由 apps/web/src/components/modules/post/PostItem.tsx 的 PostLooseItem 结构改写，使用 Payload 数据、多人作者和多个分类，移除 Mix Space、磁吸动画及登录状态依赖。
- 2026-09-30 后续移植：固定同一提交，直接迁入下列源码结构、样式与动画，再适配 Payload 数据。未使用 Shiroi 付费素材或上游用户内容。

| 上游（apps/web/src/ 下） | 本地文件 | 修改 |
| --- | --- | --- |
| app/[locale]/(home)/components/Hero.tsx、TwoColumnLayout.tsx、ActivityPostList.tsx | src/components/shiro/home/ | SiteSettings 与文章 props；去除远程名言、手记、动态和 Mix Space 数据 Provider；标题使用本站名称，头像使用本站品牌图或 favicon |
| components/layout/header/Header.tsx、internal/HeaderArea.tsx、HeaderContent.tsx、HeaderDrawerContent.tsx、HeaderDrawerButton.tsx、HeaderActionButton.tsx、grid.css | src/components/shiro/layout/Header*.tsx、grid.css | 保留网格、导航 spotlight 和抽屉菜单结构；本地路由、品牌与 Vaul 集成；裁剪上游登录、多级菜单和滚动状态 Provider |
| components/layout/footer/Footer.tsx、FooterInfo.tsx | src/components/shiro/layout/Footer.tsx | 保留布局与主题开关位置；本站版权和链接；去除语言、订阅和网关信息 |
| components/layout/container/Normal.tsx | src/components/shiro/layout/NormalContainer.tsx | 去除 HeaderHideBg atom；移动端横向 padding 改为 1rem |
| components/modules/post/PostItem.tsx (PostLooseItem) | src/components/shiro/post/PostItem.tsx、src/components/Card/index.tsx | 保留结构、class 与磁吸 hover；Payload 多分类/多作者/日期；无置顶和 owner 操作；纯文本摘要 |
| components/modules/post/PostPagination.tsx | src/components/BlogList/index.tsx | Payload 分页，分类与搜索参数；链接不再嵌套按钮 |
| components/ui/effect/MagneticHoverEffect.tsx、constants/spring.ts | src/components/shiro/ui/MagneticHoverEffect.tsx、spring.ts | 本地 import、类型适配；减少动态效果偏好 |
| components/ui/transition/BottomToUpTransitionView.tsx | src/components/shiro/ui/Transition.tsx | 保留弹簧进入方式，简化为本站需要的 div/li，统一 MotionConfig |
| components/modules/shared/SearchFAB.tsx | src/components/shiro/ui/SearchFAB.tsx、SearchResults.tsx | 原面板尺寸和结果行；原 Radix/Jotai/Algolia 改为原生 dialog、本地状态、公开 Payload 查询；独立搜索页复用结果 |
| components/ui/fab/FABContainer.tsx | SearchFAB.tsx、src/components/ArticleReader/index.tsx | 复用悬浮按钮 class；固定本地按钮位置，无全站 portal/滚动状态系统 |
| app/[locale]/posts/(post-detail)/[category]/[slug]/page.tsx、pageExtra.tsx | src/app/(frontend)/posts/[slug]/page.tsx | 原标题、元信息、正文和侧栏结构；本地 slug、权限、预览；保留 Payload RichText 和相关推荐 |
| components/modules/toc/TocItem.tsx、TocTree.tsx、TocFAB.tsx；modules/shared/ArticleRightAside.tsx、ReadIndicator.tsx | src/components/ArticleReader/index.tsx | 移植目录行、高亮、侧栏和进度 UI；本地标题观察与移动 Sheet；保留原有图片 dialog |
| components/ui/markdown/markdown.css；styles/tailwindcss.css 中 prose 规则 | src/app/(frontend)/shiro-markdown.css、shiro.css | 引用路径调整；保留 Payload Lexical converters、自定义块、Prism 和图片预览互操作样式 |
| components/ui/theme-switcher/ThemeSwitcher.tsx | src/components/shiro/ui/ThemeSwitcher.tsx | 本地主题 Provider、存储、系统主题和可访问性；修正 View Transition 调用 |

分类索引及分类详情由上游容器、timeline 链接和 PostLooseItem 组合；上游不存在对应独立分类索引。关于页保留 Payload Lexical，采用上游内容容器，不宣称逐文件移植上游 Haklex 渲染器。
- 修改版不代表上游作者官方作品。上游声明商业使用须另获许可。

## Payload website template 与依赖

本项目最初基于 Payload website template（MIT）。保留原始代码中的第三方声明。各 npm 依赖维持其各自许可证，详见对应包目录和锁文件。

MIT License — Payload CMS
Copyright (c) Payload CMS, Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Yohaku 网页转换（2026-09-30）

- 视觉来源：https://innei.in/en 的公开 HTML/CSS，首页、文章列表、详情、关于页面；转换映射与裁剪见 `docs/yohaku-conversion.md`。
- `src/styles/yohaku/tokens.css` 来自 Innei/Yohaku 公开 design-system 包（0.0.3），MIT 全文随附于 `src/styles/yohaku/LICENSE`。
- `src/components/yohaku/`、首页及 `yohaku.css` 将采集的页面结构/尺寸转换为 React 和本地选择器，适配 Payload 内容及本站路由。网页本身不因可抓取而被声明为 MIT；公开设计系统许可不延伸为私有 Web 源码许可。
- 保留的 Shiro 阅读器、搜索等代码继续遵循以上 Shiro 来源声明。修改版不代表原作者官方作品。

## Yohaku 中文快照与内容导入（2026-10-01，替代此前英文基准）

- 当前视觉与内容基准为 https://innei.in/ 中文站。固定快照时间为2026-10-01T01:26:07.421Z；本地归档位于 `.local/yohaku-zh/`。
- 30篇文章、来源作者、头像、关于内容与静态资源按用户指示用于本地对照。来源内容保持作者原有权利，不随本项目代码许可证重新授权；文章底部提供来源链接。上述早期“未使用上游用户内容”只描述9月30日版本，不适用于当前快照。
- Header、分类时间线、搜索面板、图片放大器按中文原站可观察DOM/CSS及动画重写，运行本地React逻辑，不执行归档JS。部分Shiro Markdown/搜索结果行代码仍保留原AGPL来源。
- 动态图表与客户端运行时剥离：原站部分文稿中的 Whiteboard（Excalidraw Canvas 动态绘图）与 Interactive component（外部动态微前端组件）纯属客户端 JS 运行时；本地 Payload CMS + Lexical 转换中已安全剔除此类 SSR 占位符，未打包上游 Excalidraw 依赖或动态脚本执行器，亦未声称包含此类客户端交互运行时。
- 服务裁剪与删改差异：原站涉及的第三方/私有微服务（首页手记/碎念/通信/动态时间轴/邮件订阅、正文 AI 摘要/实时在线读者/点赞/评论区与 49px 评论侧槽、全站用户登录/多语言切换/备案号/服务器状态探针、文稿列表复杂标签与排序/无 AI 过滤）均因架构与无状态设计作了官方删改，详见 `docs/yohaku-conversion.md` 中的《官方删改与差异清单》。
- 字体来自归档样式引用，包括Instrument Sans、Noto Serif SC等；依赖字体保持各自许可。设计系统MIT许可不覆盖原站文章、图片或整个网页。
- 差异、服务删除与未验收范围见 `docs/yohaku-conversion.md`。未部署或发布；本地修改版不是原作者官方产品。
