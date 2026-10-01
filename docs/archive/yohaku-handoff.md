# Yohaku 中文复刻续做交接（2026-10-01）

## 用户要求与授权

继续执行已确认计划：以 https://innei.in/ 中文版为准，抓公开代码、样式、文章数据，转换成 React，数据导入本地 Docker/Payload。最新 30 篇 + 排版样本。首页、列表、分类、详情、关于、导航、目录、搜索、图片与动效一致。无法支持模块可删改，必须登记。仅本地，不部署。用户明确允许上下文过多时开新任务交接继续。不要再次问是否继续，不要把近似实现称为完成。

## 环境与已完成

- 仓库 `/Users/wanghong/Projects/personal/mcp-blog-studio`，Next 16.3.3，Payload 3.90.2。遵守 AGENTS.md：代码前读 `node_modules/next/dist/docs/` 相关指南。大量原有文件 untracked，不能 reset/清理用户工作。
- Docker `mcp-blog-studio-postgres-1`，postgres17，127.0.0.1:5433，blog_studio。凭据从环境读取，不打印。
- `.local/yohaku-zh/` 保存中文原始 HTML、resolved HTML、696 个候选资源（约43MB）、manifest。约48页，选定最新30篇。robots允许公开页面，禁止preview，未访问preview。
- `scripts/yohaku/capture.mjs`：缓存、三次重试、小并发、CSS URL 递归资源采集。解析 `$RS(S,P)` 和 `$RC(B,S)` 还原流式插槽，已验证 article 位于 main 内。抓取缓存固定，capturedAt保持不变。原始归档不运行远程JS。
- 30篇全部导入成功。首轮29成功，最后一篇54110字搜索内容超Payload默认textarea限制，searchText maxLength已设1000000；重试新建1、跳过29、失败0。batch `yohaku-20261001012607`。原有文章未覆盖。
- 导入脚本 `scripts/yohaku/import.ts`：`--dry-run`、正常执行、`--undo`。通过source URL去重，跳过人工编辑；图片用Sharp WebP导入media；内嵌data SVG也处理。作者来源单独显示，管理owner仍是本地管理员。批次journal、last-run报告在归档目录。撤销只软删revision1原样文章，保留共享媒体/分类和改过的文章。需进一步验证撤销/恢复语义与资源持久化文档。
- `src/fields/importSource.ts` 加到Posts/Media/Categories：URL、capturedAt、hash、batch、author、headings。迁移 `20261001_012115_yohaku_import` 已应用。迁移前备份 `.local/yohaku-zh/before-import.dump`。
- Posts加入EXPERIMENTAL_TableFeature，生成类型和admin import map。`scripts/yohaku/lexical.mjs`转h1-h6、格式、列表、引用、代码、表格、media。缺嵌入记录omissions。需审计转换质量，代码行号/复杂包装可能有遗漏。
- RichText接受sourceHeadings并按匹配文本保留原锚点；ArticleReader覆盖h1-h6。详情底部显示作者/原文链接。adapter优先来源作者。
- profile脚本已把标题Innei、介绍、about正文导入site-settings，原设置备份 `site-before-import.json`，marker防重写。about图片目前未完整本地化。`.env.local`设 `YOHAKU_SOURCE_MODE=1`，listPublicPosts仅展示来源文章（不删原文章）。categories/search直接端点需核查模式一致性。
- `scripts/yohaku/prepare-ui.mjs` 从中文首页DOM生成真实JSX `CapturedHero.tsx`，保留内联字重、AI徽章、原始社交图标；标题/介绍/头像接后台props。字体和全部首页CSS复制为public/yohaku/captured.css（CSS依赖字体本地化），layout link加载，不执行来源JS。配置profile JSON含头像本地路径和字体class。
- 首页已换CapturedHero；近期标题改近期笔墨、增加英文小标题。Hero当前统计384/164万/2948天是固定抓取基准，应作为明确snapshot数据或入后台，不要冒充本地真实统计。原slogan保留。首页notes/musings/letters/timeline/订阅暂删，需删改表。
- 正文CSS已把桌面max宽修至1152，内容952+目录200，padding16。目录改sticky而非fixed。主标题字号/位置尚需视觉校准。旧shiro-markdown.css仍导入，可能冲突。captured.css与本地css层级需浏览器核实。
- 最新 `pnpm build`已成功（TypeScript和10静态路由）。单元测试 `tests/unit/yohaku-import.test.ts` 已写并运行，检查结果待读取；只测转换3项，未跑完整E2E。

## 必须继续完成（不要止于状态报告）

1. 查单测、lint并修错；重新导入运行验证30篇均skip。审计归档缺失样本：duplicateHeadings未找到真实文章，可从更多公开分页寻找；构造重复标题仅作功能测试，不能声称原站样本已覆盖。
2. 抓取4条失败记录：一个`nextjs+vite-hack-combined`fetch失败（不在选定30篇）、Figma图片403、两个CSS SVG fragment误解析404。fragment应跳过。不要绕访问限制，登记缺图。omissions中Whiteboard/Interactive component服务模块可删除，但渲染出的图/文本应尽量保留。
3. **桌面Header目前还是之前错误的右侧大抽屉**，必须替换为原站居中细导航条。手机保留底部纸面dock（需要测量height动画、焦点等）。不要把桌面右上登录按钮当菜单！原站桌面左头像触发导航条，右上是账号操作（可删）。
4. 目录当前还是平铺所有层级，应还原原站当前章节展开子标题、滚动高亮/进度/返回顶部。手机sheet退场180ms已做，但需核实滚动锁与焦点回归。目录前次没可靠验收。
5. 搜索还是旧Shiro SearchFAB和dialog，图片预览也是旧版。按源站实际DOM/样式重建，连接本地搜索；检查快速搜索浮标与手机dock重叠。源站登录/评论/实时数据服务删改记录。
6. 列表页实际原站10条含置顶，当前12条，无pin；原站最新30内有置顶旧文，需识别并建字段或明确删改。分类页实际结构、关于页标题/纸面/字体需要对照。
7. 导入内容体与本地图片：核查长文表格/代码/引用/图片完整性、后台可编辑、draft不可公开、旧数据保留；本地链接含hash时映射需完善。sourceHeadings text目前简单child.text拼接，带嵌套强调可能不匹配，要修。媒体保留原长宽，WebP转换SVG CSS变量可能效果差需要视觉检查。
8. 对照截图390/768/1440、浅/深色、滚动状态和开关动画；录制/逐帧证据。不能只build通过就称一致。更新docs/yohaku-conversion.md（目前大段过期）、THIRD_PARTY_NOTICES及操作说明。

## 原站已观察的精确依据

- 当前源码基准资产 `.local/yohaku-zh/assets/fcd04db042ec5827947b.js`：Hero ease=[.22,1,.36,1]、duration=.6s、y=12px、opacity .001->1；头像delay.1，h1纯淡入delay.2，介绍.4，引语/统计.6，社交.8。背景淡入1s。JS仅分析。
- `.capture-rise/.capture-fade`已按上述600ms写到yohaku.css。生成JSX inner徽章aiTwinkle2.4s，aiShimmerLoop4.8s，blink1.2s，需确保keyframes来自加载CSS，否则补解析原style节点。
- 原站font body = Instrument Sans + MiSans/system/PingFang，14px root。serif Noto Serif SC；已归档全部Noto字体。accent #c56473、背景#fefefb。原spring为linear(0,.009 2.2%,.035 4.5%,.141 9.4%,.447 18.5%,.718 27.4%,.843 32%,.929 36.8%,.978 41.8%,1.003 47.3%,1.014 52.8%,1.016 58.6%,1.013 64.4%,1.007 70.5%,1.003 76.7%,1.001 83.1%,1)。
- 桌面header网格：max-w-7xl，h4.5rem，grid 4.5rem 1fr 4.5rem，px8；头像40px squircle。点头像显示fixed inset-x0 top4居中nav，bg white/.38 backdrop-blur-lg，border rgba(200,180,160,.08)，rounded-sm；ul flex px2 font-medium；链接px3 py1.5 text14。原项首页/文稿/手记/时光/思考/更多，本站仅保留可用首页/文稿/分类/关于/搜索，删改登记。active pill左右width .45s spring，opacity.2s。
- 原站文章electron-ota在viewport1440x852，main顶部63，container margin-top120，内容slot x144 w952，内h1 x160 w920 y183 h45 font36 line45；toc x1096 w200，sticky top120，aside margin-top120，内部margin-left35。原正文x160 w871（额外49px评论gutter），font16 line28；评论删可去除gutter但记录。正文前AI摘要模块使正文y534，当前未实现摘要，不要凭空加空白。
- 目录li350ms cubic(.4,0,.2,1)，ripple delay每50ms capped450；a margin-bottom1.5px、opacity.35、text-neutral8、300ms opacity/color，padding-left1rem+(depth-root)*.6rem。非当前h2下h3包height0 opacity0。目录底部波浪分隔svg，进度和回顶部待完整提取。
- 手机源sheet：right0 bottom5rem；button w3rem h3.5rem rounded-left1rem。sheet bottom.5rem padding.875rem，card radius20px；backdrop neutral9/25；入场transform260ms ease(.22,1,.36,1),opacity220；退出180ms ease(.4,0,1,1)。

## 浏览器与进程

必须用CUA做浏览器操作，不用终端Playwright。本任务已使用iab browser1，用户tab1当前原站`https://innei.in/posts/tech/electron-ota-updater`。新任务须自己读取CUA文档/绑定。当前viewport override1440x900但实测innerHeight852（UI占48），宽1440可靠。上轮错位已改善，本轮click头像后dom正确，goto原站正确。getScreenshot有时与DOM时点不同，操作后读状态。
CUA只读evaluate可读DOM、getComputedStyle，不能执行任意页面JS；document.getAnimations不支持。截图保存方式按可用文档，不要猜接口。切页后等正常dom/screenshot内部等待，无sleep。
原本本地3102/3103有旧生产server，最新build覆盖.next后必须查进程再重启或开新端口。不要误杀其它服务。当前没有新建验收服务。本轮命令会需要sandbox require_escalated访问网络/DB/启动端口，auto review已批准多次。
临时脚本tsx可能payload.destroy后保留句柄，import/profile末尾process.exit已修，旧dry-run进程1625/1945已终止。capture缓存复跑不写DB。

## 交接期的工作边界

新任务接手后独占编辑此项目，本任务停止代码写入。可直接继续，不需要用户再次批准。遵守本计划直到完成或报告实际不可解阻碍；不要向用户承诺尚未验证的一致性。

## 2026-10-01 本轮续做结果

以 `docs/yohaku-conversion.md` 为最新事实记录。已替换桌面导航、目录子级收起、搜索几何、图片380ms放大器；分类改年份时间线；关于自述标题与本地图片；文稿10条含快照置顶。正文转换修复列表内代码、按钮/链接图片、hash链接。30篇只对revision1原导入内容修复，修复前备份 `before-content-repair/`，当前revision2，journal记录revision以保护后续人工修改。审计所有标题/表格/pre/img计数匹配且无媒体缺文件。保留原文章4篇，匿名草稿0。重跑导入0创建/30跳过/0失败，转换4项单测通过。

浏览器工作被明确策略拦截：CUA在用户“继续，还剩多少”后失去原绑定，重新getTab本地http URL时返回URL policy blocks，明确禁止绕行。未尝试其它浏览器或间接方式。因此多尺寸/主题/动画矩阵及新组件视觉验收仍未完成；没有声称一致。继续前需用户恢复浏览器工具访问。3104 dev服务已启动（node next dev），生产build后应重启独立验收server。本轮没有部署。

## 新任务接续与额度检查

用户要求新开任务继续，若额度不足先记录进度和后续任务。本任务停止写入，新任务独占同一目录。最新检查：5小时已用28%，周额度已用99%，普通使用当前仍允许；账户共享，新任务不重置。不擅自消费重置权益或切模型。

最新事实见conversion的10:16/10:17段：本轮修移动列表顺序/置顶样式、菜单和目录跨1024断点关闭、目录波浪SVG、关于details扁平化、SiteSettings.about媒体块注册。关于单段备份后恢复17块，匿名媒体读取有URL。5项单测、tsc、改动文件lint、build通过。截图docs/yohaku-evidence非完整矩阵。

下一步：正常CUA访问恢复后验关于图片及空src错误；390/768/1440深浅色逐页配对；手机菜单/目录跨断点滚动锁与焦点；导航pill、搜索结果行、目录动效；动态图表提取及删改清单、真实重复标题样本。getTab当前localhost:3104/about在用户消息后再次被URL安全策略明确拒绝，不得绕过或改用替代浏览器。新开任务不构成绕过授权。

dev服务曾session96694绑定127.0.0.1:3104；先查活跃状态，勿误杀其它服务。生产build刚完成。未部署/提交/清理。额度不足时更新交接和conversion：改动、证据、未验收项、进程与阻碍、具体下一步，然后如实停止。
