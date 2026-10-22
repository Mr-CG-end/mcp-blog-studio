export type PageResult<T> = {
  success: boolean
  message: string
  data: T | null
  code?: number
}

export type PageTool = {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean }
  execute: (input: unknown, context?: { signal: AbortSignal }) => Promise<string>
}

/** Chrome Imperative API subset used by this application. No global polyfill. */
export type WebMCPContext = {
  registerTool: (tool: PageTool, options: { signal: AbortSignal }) => Promise<void> | void
}

export type PageEnvironment = {
  document: Document
  getURL: () => URL
  navigate: (path: string) => void
  fetch: typeof fetch
}
