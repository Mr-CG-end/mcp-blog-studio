import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { inputs, outputs, type ActorContext, type WriteBlogService } from '../contracts'
import { registerTool } from './register'

export function registerWriteTools(server: McpServer, services: WriteBlogService, actor: ActorContext) {
  registerTool(server, actor, 'create_post', '创建草稿', inputs.createPost, outputs.createPost, false, (input) => services.createPost(actor, input))
  registerTool(server, actor, 'update_post', '更新文章', inputs.updatePost, outputs.updatePost, false, (input) => services.updatePost(actor, input))
  registerTool(server, actor, 'publish_post', '发布文章', inputs.publishPost, outputs.publishPost, false, (input) => services.publishPost(actor, input))
  registerTool(server, actor, 'unpublish_post', '下架文章', inputs.unpublishPost, outputs.unpublishPost, false, (input) => services.unpublishPost(actor, input))
  registerTool(server, actor, 'trash_post', '回收文章', inputs.trashPost, outputs.trashPost, false, (input) => services.trashPost(actor, input))
  registerTool(server, actor, 'restore_post', '恢复为草稿', inputs.restorePost, outputs.restorePost, false, (input) => services.restorePost(actor, input))
}
