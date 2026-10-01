import { loadEnv } from 'payload/node'
loadEnv()

import { toLexical } from './yohaku/lexical.mjs'

const { getPayload } = await import('payload')
const { default: config } = await import('../src/payload.config')
const payload = await getPayload({ config })

console.log('Writing MCP Blog Studio article to About page...')

const aboutHtml = `
<p>欢迎来到 <strong>MCP Blog Studio</strong>。这是一个面向人机协同时代构建的现代中文博客工作台，也是探索现代 Web 架构与 <strong>Model Context Protocol (MCP)</strong> 协议深度融合的开源实践。</p>

<h2>项目愿景：打破内容孤岛</h2>
<p>在生成式 AI 与大语言模型重构生产力的当下，人类的写作与记录方式正在经历深刻的范式转移：创作不再仅仅局限于孤立的人类键盘敲击，而是演变为人与智能体（AI Agent）之间高密度的对话、推敲、重构与共生。</p>
<p>然而，现有的内容管理系统（CMS）大多诞生于传统 Web 时代。面对现代 AI 编程助手与自主 Agent，传统后台往往只能依靠人工反复复制粘贴，或者暴露缺乏权限约束与版本控制的粗粒度接口，极易导致内容覆盖与协作冲突。</p>
<blockquote><p>让工具隐于无形，让思考与创造在人机共生中自在流动。</p></blockquote>
<p><strong>MCP Blog Studio</strong> 正是为解决这一痛点而生：我们不仅为人类读者打造温润沉浸的日系纸面阅读体验，更为 AI Agent 提供符合开放标准的协议接口，使 AI 成为具备身份认证、权限范围和版本防撞保护的真实协作伙伴。</p>

<h2>三阶段演进路线</h2>
<p>项目按照严谨的软件工程规范，制定了清晰的三阶段交付路线图：</p>
<ul>
  <li><strong>v0 普通博客（当前基准阶段）</strong>：打磨纯粹的阅读与写作体验。基于 Next.js 16 App Router 与 Payload CMS 3，建立原子化草稿、发布、已下架与软删除回收站全生命周期管理；前端深度复刻并融合 Innei Shiro 与 Yohaku 设计语言，带来日系纸面质感、顶置居中常驻毛玻璃胶囊导航、长文目录按根章节折叠高亮、680px 全文检索（IME 拼音防冲突）与 380ms 纸色全屏 Lightbox 预览。</li>
  <li><strong>v1 远程 MCP（智能体协同阶段）</strong>：对外暴露标准化的 Streamable HTTP <code>/mcp</code> 端点。外部 AI Agent（以 Codex、Claude Desktop、Cursor 为首要验收客户端）通过独立 Bearer 密钥接入，调用结构化的文章检索、草稿创建、协同编辑与版本校验工具，实现真正安全可靠的内容协同闭环。</li>
  <li><strong>v2 WebMCP（浏览器端交互感知）</strong>：在客户端引入 WebMCP 协议，赋予浏览器端 Agent 直接感知与操作当前页面的能力，实现无需切换窗口的页面交互控制、智能筛选与动态内容辅助呈现。</li>
</ul>

<h2>技术架构与设计哲学</h2>
<p>为了兼顾极速的渲染性能、可靠的数据持久化与优雅的代码组织，系统选用了现代全栈领域的前沿技术栈：</p>
<ul>
  <li><strong>应用框架</strong>：Next.js 16（App Router，结合 Turbopack 编译引擎与混合渲染）；</li>
  <li><strong>内容底座</strong>：Payload CMS 3（无缝嵌入 Next.js 运行时，提供 Native TypeScript 类型安全与原子事务）；</li>
  <li><strong>数据存储</strong>：PostgreSQL 17（Docker 独立容器部署，保障数据持久与复杂查询性能）；</li>
  <li><strong>交互美学</strong>：继承 Shiro / Yohaku 极简留白与 Spring 弹簧物理动效（<code>cubic-bezier(0.22, 1, 0.36, 1)</code>），配合精细打磨的毛玻璃与无杂质纸色底衬；</li>
  <li><strong>协议核心</strong>：Model Context Protocol（遵循最新 MCP 规范的 Streamable HTTP 传输协议与严格 Revision 乐观锁机制）。</li>
</ul>

<h2>开放与共创</h2>
<p>MCP Blog Studio 秉持开源与知识共享理念。每一次文字与代码的迭代，都是对未来人机协作创作范式的探索。无论你是读者、写作者还是关注 AI Agent 落地实践的开发者，都欢迎与我们一同探索创作与思考的新边界。</p>
`

const lexicalAbout = toLexical(aboutHtml)

await payload.updateGlobal({
  slug: 'site-settings',
  context: { disableRevalidate: true },
  data: {
    title: 'MCP Blog Studio',
    description: '面向人机协同时代构建的现代中文博客工作台，融合 Next.js 16、Payload CMS 3 与 Model Context Protocol。',
    heroSlogan: 'Crafting ideas into software with modern workflows',
    siteStartDate: '2026-10-01T00:00:00.000Z',
    aboutTitle: '关于 MCP Blog Studio',
    aboutSubtitle: '探索人机协同内容创作：基于 Next.js、Payload CMS 与 Model Context Protocol',
    about: lexicalAbout as any,
    socialLinks: [
      { platform: 'github', label: 'GitHub', url: 'https://github.com/Mr-CG-end/mcp-blog-studio' },
      { platform: 'rss', label: 'RSS 订阅', url: 'http://127.0.0.1:3000/feed' },
      { platform: 'email', label: '联系我们', url: 'mailto:admin@blog.local' },
    ],
  },
})

console.log('Successfully updated About page with MCP Blog Studio article!')
process.exit(0)
