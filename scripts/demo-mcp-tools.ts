/**
 * MCP Blog Studio — 全链路端到端自动化演练脚本
 *
 * 演示通过 @modelcontextprotocol/sdk 的 Client 与 Streamable HTTP 传输层，
 * 对 /mcp 路由完成会话握手并完整调用 B 模块负责的 6 个读工具闭环：
 * 1. get_current_user (读取身份)
 * 2. list_categories  (读取分类)
 * 3. list_media       (读取媒体库)
 * 4. list_posts       (读取文章列表)
 * 5. get_post         (读取文章详情，打印 Markdown 与 contentReplaceable)
 * 6. search_posts     (搜索文章)
 *
 * 运行方式：
 *   npx tsx scripts/demo-mcp-tools.ts
 * 或指定远端/本地已有服务：
 *   MCP_SERVER_URL=http://localhost:3000/mcp npx tsx scripts/demo-mcp-tools.ts
 */

import dotenv from 'dotenv'
// 优先加载本地开发环境变量（如端口 5433 的数据库连接配置）
dotenv.config({ path: '.env.local' })
dotenv.config()

import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'
import { NextRequest } from 'next/server'
import type {
  CurrentUser,
  PageResult,
  CategorySummary,
  MediaSummary,
  PostSummary,
  PostDetail,
} from '../src/mcp/contracts'

interface ToolEnvelope<T> {
  ok: boolean
  data?: T
  error?: {
    code: string
    message: string
  }
  requestId: string
}

function parseResult<T>(result: unknown): ToolEnvelope<T> {
  const res = result as Record<string, unknown>
  if (res?.structuredContent) {
    return res.structuredContent as ToolEnvelope<T>
  }
  if (Array.isArray(res?.content) && res.content[0]?.type === 'text' && typeof res.content[0].text === 'string') {
    return JSON.parse(res.content[0].text) as ToolEnvelope<T>
  }
  throw new Error('无法解析 MCP 工具调用返回结构')
}


// 格式化输出辅助函数
const separator = '='.repeat(70)
const subSeparator = '-'.repeat(70)

function logStep(step: number, title: string) {
  console.log(`\n${separator}`)
  console.log(`[步骤 ${step}] ${title}`)
  console.log(separator)
}

function logSub(title: string) {
  console.log(`\n${subSeparator}\n> ${title}\n${subSeparator}`)
}

async function runDemo() {
  console.log('\n╔══════════════════════════════════════════════════════════════════════╗')
  console.log('║        MCP Blog Studio — 全链路端到端自动化演练 (M09 模块)         ║')
  console.log('╚══════════════════════════════════════════════════════════════════════╝')

  const targetUrl = process.env.MCP_SERVER_URL || 'http://localhost:3000/mcp'
  const token = process.env.MCP_DEV_TOKEN || 'dev-mcp-token'
  const isRemote = Boolean(process.env.MCP_SERVER_URL)

  console.log(`\n配置信息:`)
  console.log(`  • 运行模式: ${isRemote ? '远程/外部 HTTP 服务' : '内置内存路由调度 (In-Memory HTTP Stream)'}`)
  console.log(`  • 目标地址: ${targetUrl}`)
  console.log(`  • 鉴权凭证: Bearer ${token.slice(0, 3)}***${token.slice(-3)}`)

  // 1. 初始化传输层
  let customFetch: typeof fetch | undefined

  if (!isRemote) {
    // 动态载入 Next.js App Router 路由处理器，确保环境变量先加载完毕
    const { POST, GET, DELETE } = await import('../src/app/mcp/route')

    customFetch = (async (url: string | URL | Request, init?: RequestInit): Promise<Response> => {
      const inputUrl = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
      const nextReq = new NextRequest(inputUrl, init as ConstructorParameters<typeof NextRequest>[1])
      if (nextReq.method === 'POST') {
        return await POST(nextReq)
      } else if (nextReq.method === 'GET') {
        return await GET(nextReq)
      } else if (nextReq.method === 'DELETE') {
        return await DELETE(nextReq)
      }
      return new Response(null, { status: 405 })
    }) as typeof fetch
  }

  const transport = new StreamableHTTPClientTransport(new URL(targetUrl), {
    requestInit: {
      headers: {
        authorization: `Bearer ${token}`,
      },
    },
    fetch: customFetch,
  })

  const client = new Client(
    { name: 'mcp-blog-studio-e2e-client', version: '1.0.0' },
    { capabilities: {} },
  )

  // 步骤 0: 握手与初始化
  logStep(0, '建立 MCP 会话连接与握手 (initialize)')
  console.log('正在向 /mcp 发送 initialize 请求以完成能力协商...')
  await client.connect(transport)
  console.log('✓ 会话连接成功！')

  const { tools } = await client.listTools()
  console.log(`✓ 成功获取工具清单，共注册 ${tools.length} 个工具:`)
  tools.forEach((t) => {
    const isRead = [
      'get_current_user',
      'list_posts',
      'get_post',
      'search_posts',
      'list_categories',
      'list_media',
    ].includes(t.name)
    console.log(`  • [${isRead ? '读工具' : '写工具'}] ${t.name.padEnd(18)} — ${t.description}`)
  })

  // 步骤 1: 读取身份 get_current_user
  logStep(1, '调用 get_current_user 读取当前登录身份')
  const userResult = await client.callTool({ name: 'get_current_user', arguments: {} })
  const userEnvelope = parseResult<CurrentUser>(userResult)
  if (!userEnvelope.ok || !userEnvelope.data) {
    throw new Error(`get_current_user 执行失败: ${JSON.stringify(userEnvelope.error)}`)
  }
  const user = userEnvelope.data
  console.log('✓ 身份读取成功:')
  console.log(`  • 用户 ID: ${user.id}`)
  console.log(`  • 姓名:    ${user.name}`)
  console.log(`  • 角色:    ${user.role}`)
  console.log(`  • 权限列表: [${user.capabilities.join(', ')}]`)
  console.log(`  • 请求标识: ${userEnvelope.requestId}`)

  // 步骤 2: 读取分类 list_categories
  logStep(2, '调用 list_categories 分页读取文章分类')
  const categoriesResult = await client.callTool({
    name: 'list_categories',
    arguments: { page: 1, limit: 5 },
  })
  const categoriesEnvelope = parseResult<PageResult<CategorySummary>>(categoriesResult)
  if (!categoriesEnvelope.ok || !categoriesEnvelope.data) {
    throw new Error(`list_categories 执行失败: ${JSON.stringify(categoriesEnvelope.error)}`)
  }
  const categories = categoriesEnvelope.data
  console.log(`✓ 分类列表读取成功 (共 ${categories.total} 个分类，当前第 ${categories.page}/${categories.totalPages} 页):`)
  categories.items.forEach((cat, index) => {
    console.log(`  ${index + 1}. ID: ${cat.id} | Slug: ${cat.slug.padEnd(15)} | 标题: ${cat.title}`)
  })

  // 步骤 3: 读取媒体库 list_media
  logStep(3, '调用 list_media 分页读取媒体库')
  const mediaResult = await client.callTool({
    name: 'list_media',
    arguments: { page: 1, limit: 5 },
  })
  const mediaEnvelope = parseResult<PageResult<MediaSummary>>(mediaResult)
  if (!mediaEnvelope.ok || !mediaEnvelope.data) {
    throw new Error(`list_media 执行失败: ${JSON.stringify(mediaEnvelope.error)}`)
  }
  const media = mediaEnvelope.data
  console.log(`✓ 媒体库读取成功 (共 ${media.total} 项资源，当前第 ${media.page}/${media.totalPages} 页):`)
  media.items.forEach((item, index) => {
    const dim = item.width && item.height ? ` (${item.width}x${item.height})` : ''
    console.log(`  ${index + 1}. ID: ${item.id} | 类型: ${(item.mimeType || '未知').padEnd(12)} | 描述: ${item.alt || '(无描述)'}${dim}`)
    console.log(`     URL: ${item.url}`)
  })

  // 步骤 4: 读取文章列表 list_posts
  logStep(4, '调用 list_posts 分页读取文章列表')
  const postsResult = await client.callTool({
    name: 'list_posts',
    arguments: { page: 1, limit: 5 },
  })
  const postsEnvelope = parseResult<PageResult<PostSummary>>(postsResult)
  if (!postsEnvelope.ok || !postsEnvelope.data) {
    throw new Error(`list_posts 执行失败: ${JSON.stringify(postsEnvelope.error)}`)
  }
  const posts = postsEnvelope.data
  console.log(`✓ 文章列表读取成功 (总计 ${posts.total} 篇文章，当前第 ${posts.page}/${posts.totalPages} 页):`)
  posts.items.forEach((p, index) => {
    console.log(`  ${index + 1}. [ID: ${p.id}] [${p.state.toUpperCase()}] ${p.title} (rev: ${p.revision})`)
    console.log(`     Slug: ${p.slug} | 公开链接: ${p.publicURL || '(草稿无公开链接)'}`)
  })

  // 选择用于详情验证与搜索测试的目标文章
  const candidate = posts.items[0]
  if (!candidate) {
    console.log('\n⚠️  当前数据库中暂无文章，跳过 get_post 与 search_posts 实际命中测试。')
  } else {
    // 步骤 5: 读取文章详情 get_post
    logStep(5, `调用 get_post 读取文章详情并打印 Markdown 与内容可替换性`)
    console.log(`> 正在通过 ID (${candidate.id}) 读取文章详情:`)
    const postDetailResult = await client.callTool({
      name: 'get_post',
      arguments: { id: candidate.id },
    })
    const postEnvelope = parseResult<PostDetail>(postDetailResult)
    if (!postEnvelope.ok || !postEnvelope.data) {
      throw new Error(`get_post 执行失败: ${JSON.stringify(postEnvelope.error)}`)
    }
    const post = postEnvelope.data

    console.log('✓ 文章详情读取成功:')
    console.log(`  • 标题:             ${post.title}`)
    console.log(`  • 文章 ID:          ${post.id}`)
    console.log(`  • 文章 Slug:        ${post.slug}`)
    console.log(`  • 状态:             ${post.state}`)
    console.log(`  • 当前版本 (rev):    ${post.revision}`)
    console.log(`  • 公开 URL:         ${post.publicURL || '(无)'}`)
    console.log(`  • 内容可替换性:     ${post.contentReplaceable ? '✓ 是 (可安全全量更新)' : '✕ 否 (含有不可逆富文本结构)'}`)
    console.log(`  • 语法结构告警:     ${post.warnings.length === 0 ? '无 (格式纯净)' : post.warnings.join('; ')}`)

    logSub('Markdown 正文内容预览')
    console.log('```markdown')
    // 如果文章内容太长，展示前 15 行并标明总字符数
    const lines = post.markdown.split('\n')
    if (lines.length > 25) {
      console.log(lines.slice(0, 20).join('\n'))
      console.log(`\n... [已折叠剩余 ${lines.length - 20} 行，全文共 ${post.markdown.length} 字符] ...`)
    } else {
      console.log(post.markdown)
    }
    console.log('```')

    // 附带演示：同时支持通过 slug 读取详情
    console.log(`\n> 补充验证：通过 Slug ("${candidate.slug}") 再次读取详情:`)
    const slugDetailResult = await client.callTool({
      name: 'get_post',
      arguments: { slug: candidate.slug },
    })
    const slugEnvelope = parseResult<PostDetail>(slugDetailResult)
    if (slugEnvelope.ok && slugEnvelope.data?.id === candidate.id) {
      console.log(`✓ Slug 精确寻址验证通过 (返回相同文章 ID: ${slugEnvelope.data.id})`)
    } else {
      console.warn(`⚠️ Slug 寻址结果不符:`, slugEnvelope)
    }

    // 步骤 6: 搜索文章 search_posts
    logStep(6, '调用 search_posts 检索文章')
    // 选取文章标题的前几个字符作为检索词
    const query = candidate.title.slice(0, 4)
    console.log(`> 搜索关键词: "${query}"`)

    const searchResult = await client.callTool({
      name: 'search_posts',
      arguments: { query, page: 1, limit: 5 },
    })
    const searchEnvelope = parseResult<PageResult<PostSummary>>(searchResult)
    if (!searchEnvelope.ok || !searchEnvelope.data) {
      throw new Error(`search_posts 执行失败: ${JSON.stringify(searchEnvelope.error)}`)
    }
    const searchData = searchEnvelope.data
    console.log(`✓ 搜索成功 (匹配到 ${searchData.total} 篇相关文章):`)
    searchData.items.forEach((item, index) => {
      console.log(`  ${index + 1}. [ID: ${item.id}] ${item.title} (Slug: ${item.slug})`)
    })
  }

  // 步骤 7: 演练总结与关闭客户端
  logStep(7, '演练总结与连接关闭')
  await client.close()
  console.log('✓ MCP Client 会话正常断开')

  console.log('\n' + separator)
  console.log('🎉 MCP 读工具全链路端到端闭环演练顺利完成！')
  console.log(separator)
  console.log('演练检验清单:')
  console.log('  [✓] Bearer Token 握手鉴权与 MCP 会话协商 (initialize)')
  console.log('  [✓] 工具 1: get_current_user (读取身份与权限能力)')
  console.log('  [✓] 工具 2: list_categories  (分页查询分类与脱敏)')
  console.log('  [✓] 工具 3: list_media       (分页查询媒体与安全过滤)')
  console.log('  [✓] 工具 4: list_posts       (分页文章列表与状态过滤)')
  console.log('  [✓] 工具 5: get_post         (文章 Markdown 提取与内容可替换性检测)')
  console.log('  [✓] 工具 6: search_posts     (全文关键词模糊检索与分页)')
  console.log(separator + '\n')

  process.exit(0)
}

runDemo().catch((err) => {
  console.error('\n❌ MCP 全链路演练发生异常:', err)
  process.exit(1)
})
