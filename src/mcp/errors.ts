import { APIError, Forbidden, NotFound, ValidationError } from 'payload'

export const errorCodes = [
  'FORBIDDEN',
  'NOT_FOUND',
  'VALIDATION_ERROR',
  'INVALID_REFERENCE',
  'VERSION_CONFLICT',
  'REQUEST_CONFLICT',
  'INVALID_STATE',
  'UNSUPPORTED_CONTENT',
  'INTERNAL_ERROR',
  'NOT_IMPLEMENTED',
] as const
export type ErrorCode = (typeof errorCodes)[number]

/** Messages must be safe for clients; never pass database errors or credentials. */
export class BlogError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
  ) {
    super(message)
  }
}
const safeMessages: Record<ErrorCode, string> = {
  FORBIDDEN: '无权执行此操作',
  NOT_FOUND: '文章不存在',
  VALIDATION_ERROR: '输入参数无效',
  INVALID_REFERENCE: '引用的分类或媒体无效',
  VERSION_CONFLICT: '文章已被修改，请重新读取后再提交',
  REQUEST_CONFLICT: '此 requestId 已被用于不同的输入',
  INVALID_STATE: '当前文章状态不允许此操作',
  UNSUPPORTED_CONTENT: '正文包含无法安全转换的内容，请使用后台编辑',
  INTERNAL_ERROR: '服务暂时不可用，请记录 requestId。',
  NOT_IMPLEMENTED: '此功能尚未实现',
}
export function toolFailure(error: unknown, requestId: string) {
  if (!(error instanceof BlogError)) {
    let code: ErrorCode = 'INTERNAL_ERROR'
    if (error instanceof NotFound) code = 'NOT_FOUND'
    else if (error instanceof Forbidden) code = 'FORBIDDEN'
    else if (error instanceof ValidationError) code = 'VALIDATION_ERROR'
    else if (error instanceof APIError && error.status === 409) code = 'VERSION_CONFLICT'
    else if (
      error instanceof Error &&
      'code' in error &&
      errorCodes.includes(error.code as ErrorCode)
    )
      code = error.code as ErrorCode
    error = new BlogError(code, safeMessages[code])
  }
  return {
    ok: false as const,
    error:
      error instanceof BlogError
        ? { code: error.code, message: error.message }
        : { code: 'INTERNAL_ERROR' as const, message: '服务暂时不可用，请记录 requestId。' },
    requestId,
  }
}
