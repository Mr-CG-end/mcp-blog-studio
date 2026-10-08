import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import type { ActorContext } from '../contracts'
import { BlogError, errorCodes, toolFailure } from '../errors'

function unwrapEffects(schema: z.ZodTypeAny): z.ZodTypeAny {
  let current = schema
  while (current instanceof z.ZodEffects) {
    current = current.innerType()
  }
  return current
}

export function registerTool<I extends z.ZodTypeAny, O extends z.ZodTypeAny>(
  server: McpServer, actor: ActorContext, name: string, description: string,
  input: I, output: O, readOnly: boolean, invoke: (input: z.infer<I>) => Promise<z.infer<O>>,
) {
  server.registerTool(name, {
    description, inputSchema: unwrapEffects(input),
    outputSchema: z.object({ ok: z.boolean(), data: output.optional(),
      error: z.object({ code: z.enum(errorCodes), message: z.string() }).optional(), requestId: z.string() }),
    annotations: { readOnlyHint: readOnly, destructiveHint: !readOnly, openWorldHint: false },
  }, (async (args: unknown) => {
    try {
      let parsedInput: z.infer<I>
      try {
        parsedInput = input.parse(args)
      } catch (err) {
        if (err instanceof z.ZodError) {
          throw new BlogError('VALIDATION_ERROR', err.issues.map((i) => i.message).join('; '))
        }
        throw err
      }
      // Parse again so refinements and the whitelist are enforced across SDK versions.
      const data = output.parse(await invoke(parsedInput))
      const result = { ok: true, data, requestId: actor.requestID }
      return { content: [{ type: 'text' as const, text: JSON.stringify(result) }], structuredContent: result }
    } catch (error) {
      const result = toolFailure(error, actor.requestID)
      return { isError: true, content: [{ type: 'text' as const, text: JSON.stringify(result) }], structuredContent: result }
    }
  }) as never)
}

