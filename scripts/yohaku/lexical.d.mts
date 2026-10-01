export function toLexical(
  html: string,
  options?: {
    media?: Map<string, number>
    links?: Map<string, string>
    baseURL?: string
    omissions?: unknown[]
  },
): unknown
