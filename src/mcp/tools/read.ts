import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { inputs, outputs, type ActorContext, type ReadBlogService } from '../contracts'
import { registerTool } from './register'

export function registerReadTools(server: McpServer, services: ReadBlogService, actor: ActorContext) {
  registerTool(server, actor, 'get_current_user', '读取当前身份', inputs.getIdentity, outputs.getIdentity, true, (input) => services.getIdentity(actor, input))
  registerTool(server, actor, 'list_posts', '分页读取文章', inputs.listPosts, outputs.listPosts, true, (input) => services.listPosts(actor, input))
  registerTool(server, actor, 'get_post', '读取文章详情', inputs.getPost, outputs.getPost, true, (input) => services.getPost(actor, input))
  registerTool(server, actor, 'search_posts', '搜索文章', inputs.searchPosts, outputs.searchPosts, true, (input) => services.searchPosts(actor, input))
  registerTool(server, actor, 'list_categories', '分页读取分类', inputs.listCategories, outputs.listCategories, true, (input) => services.listCategories(actor, input))
  registerTool(server, actor, 'list_media', '分页读取媒体', inputs.listMedia, outputs.listMedia, true, (input) => services.listMedia(actor, input))
}
