import type { PageTool, WebMCPContext } from './types'

export async function registerPageTools(
  context: WebMCPContext | undefined,
  tools: PageTool[],
  controller: AbortController,
): Promise<void> {
  if (!context || typeof context.registerTool !== 'function') return
  try {
    for (const tool of tools) {
      if (controller.signal.aborted) return
      await context.registerTool(tool, { signal: controller.signal })
    }
  } catch (error) {
    // Native registration uses this signal to remove even partially registered tools.
    controller.abort()
    throw error
  }
}
