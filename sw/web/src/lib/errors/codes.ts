import type { ErrorCode, SupabaseErrorCode } from './types'

// #region 에러 코드별 한국어 메시지
export const ERROR_MESSAGES: Record<ErrorCode, string> = {
  // 인증
  UNAUTHORIZED: '로그인이 필요하다.',
  FORBIDDEN: '접근 권한이 없다.',
  // 리소스
  NOT_FOUND: '요청한 데이터를 찾을 수 없다.',
  ALREADY_EXISTS: '이미 존재하는 데이터다.',
  CONFLICT: '데이터 충돌이 발생했다.',
  // 검증
  VALIDATION_ERROR: '입력값이 올바르지 않다.',
  INVALID_INPUT: '잘못된 입력이다.',
  // Supabase
  DB_ERROR: '데이터베이스 오류가 발생했다.',
  RLS_VIOLATION: '접근이 거부되었다.',
  // 비즈니스 로직
  SELF_ACTION: '자기 자신에게는 할 수 없다.',
  LIMIT_EXCEEDED: '허용 한도를 초과했다.',
  NOT_IN_ARCHIVE: '기록관에 추가된 콘텐츠만 가능하다.',
  // 기타
  UNKNOWN_ERROR: '알 수 없는 오류가 발생했다.',
}
// #endregion

// #region Supabase 에러 코드 → ErrorCode 매핑
export const SUPABASE_ERROR_MAP: Partial<Record<SupabaseErrorCode, ErrorCode>> = {
  '23505': 'ALREADY_EXISTS',
  '23503': 'NOT_FOUND',
  '42501': 'RLS_VIOLATION',
  PGRST116: 'NOT_FOUND',
  PGRST301: 'DB_ERROR',
}
// #endregion

// #region 컨텍스트별 메시지 오버라이드
type ErrorContext = 'content' | 'follow' | 'guestbook' | 'record' | 'category' | 'playlist' | 'note' | 'feedback'

export const CONTEXT_MESSAGES: Record<ErrorContext, Partial<Record<ErrorCode, string>>> = {
  content: {
    ALREADY_EXISTS: '이미 추가된 콘텐츠다.',
    NOT_FOUND: '콘텐츠를 찾을 수 없다.',
  },
  follow: {
    NOT_FOUND: '사용자를 찾을 수 없다.',
    SELF_ACTION: '자기 자신을 팔로우할 수 없다.',
  },
  guestbook: {
    RLS_VIOLATION: '방명록을 작성할 수 없다.',
    LIMIT_EXCEEDED: '방명록은 500자까지 작성 가능하다.',
  },
  record: {
    NOT_FOUND: '기록을 찾을 수 없다.',
    NOT_IN_ARCHIVE: '기록관에 추가된 콘텐츠만 기록할 수 있다.',
  },
  category: {
    ALREADY_EXISTS: '같은 이름의 분류가 이미 존재한다.',
    NOT_FOUND: '분류를 찾을 수 없다.',
  },
  playlist: {
    VALIDATION_ERROR: '재생목록 이름을 입력해달라.',
    INVALID_INPUT: '최소 1개 이상의 콘텐츠를 선택해달라.',
    NOT_FOUND: '재생목록을 찾을 수 없다.',
  },
  note: {
    NOT_FOUND: '노트를 찾을 수 없다.',
  },
  feedback: {
    NOT_FOUND: '피드백을 찾을 수 없다.',
    FORBIDDEN: '권한이 없다.',
  },
}
// #endregion
