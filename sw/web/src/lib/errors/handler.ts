import type { PostgrestError } from '@supabase/supabase-js'
import type { ActionResult, ErrorCode, SupabaseErrorCode } from './types'
import { ERROR_MESSAGES, SUPABASE_ERROR_MAP, CONTEXT_MESSAGES } from './codes'

type ErrorContext = keyof typeof CONTEXT_MESSAGES

interface HandleErrorOptions {
  context?: ErrorContext
  fallbackCode?: ErrorCode
  logPrefix?: string
}

// #region Supabase 에러 → ActionResult 변환
export function handleSupabaseError(
  error: PostgrestError,
  options: HandleErrorOptions = {}
): ActionResult<never> {
  const { context, fallbackCode = 'DB_ERROR', logPrefix } = options

  // 콘솔 로깅
  const prefix = logPrefix ?? `[${context ?? 'DB'}]`
  console.error(`${prefix} Error:`, error)

  // 에러 코드 매핑
  const errorCode = SUPABASE_ERROR_MAP[error.code as SupabaseErrorCode] ?? fallbackCode

  // 컨텍스트별 메시지 또는 기본 메시지
  const message = context
    ? (CONTEXT_MESSAGES[context]?.[errorCode] ?? ERROR_MESSAGES[errorCode])
    : ERROR_MESSAGES[errorCode]

  return {
    success: false,
    error: errorCode,
    message,
  }
}
// #endregion

// #region 성공 결과 생성 헬퍼
export function success<T>(data: T): ActionResult<T> {
  return { success: true, data }
}
// #endregion

// #region 실패 결과 생성 헬퍼
export function failure(
  code: ErrorCode,
  customMessage?: string
): ActionResult<never> {
  return {
    success: false,
    error: code,
    message: customMessage ?? ERROR_MESSAGES[code],
  }
}
// #endregion

// #region 인증 체크 헬퍼
export function requireAuth(user: unknown): ActionResult<never> | null {
  if (!user) {
    return failure('UNAUTHORIZED')
  }
  return null
}
// #endregion
