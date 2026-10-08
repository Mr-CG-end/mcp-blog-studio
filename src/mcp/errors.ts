export const errorCodes = ['FORBIDDEN', 'NOT_FOUND', 'VALIDATION_ERROR', 'INVALID_REFERENCE',
  'VERSION_CONFLICT', 'REQUEST_CONFLICT', 'INVALID_STATE', 'UNSUPPORTED_CONTENT', 'INTERNAL_ERROR', 'NOT_IMPLEMENTED'] as const
export type ErrorCode = (typeof errorCodes)[number]

/** Messages must be safe for clients; never pass database errors or credentials. */
export class BlogError extends Error {
  constructor(public readonly code: ErrorCode, message: string) { super(message) }
}
export function toolFailure(error: unknown, requestId: string) {
  return { ok: false as const, error: error instanceof BlogError
    ? { code: error.code, message: error.message }
    : { code: 'INTERNAL_ERROR' as const, message: '服务暂时不可用，请记录 requestId。' }, requestId }
}
