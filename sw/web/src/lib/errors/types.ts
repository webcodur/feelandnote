// #region ActionResult 타입
export type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: ErrorCode; message: string }
// #endregion

// #region ErrorCode 타입
export type ErrorCode =
  // 인증 관련
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  // 리소스 관련
  | 'NOT_FOUND'
  | 'ALREADY_EXISTS'
  | 'CONFLICT'
  // 검증 관련
  | 'VALIDATION_ERROR'
  | 'INVALID_INPUT'
  // Supabase 관련
  | 'DB_ERROR'
  | 'RLS_VIOLATION'
  // 비즈니스 로직
  | 'SELF_ACTION'
  | 'LIMIT_EXCEEDED'
  | 'NOT_IN_ARCHIVE'
  // 기타
  | 'UNKNOWN_ERROR'
// #endregion

// #region Supabase 에러 코드
export type SupabaseErrorCode =
  | '23505' // unique_violation
  | '23503' // foreign_key_violation
  | '42501' // insufficient_privilege (RLS)
  | 'PGRST116' // not found (single query)
  | 'PGRST301' // request timeout
// #endregion
