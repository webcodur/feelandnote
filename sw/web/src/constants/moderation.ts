// 신고·차단(UGC 조정) 공용 상수
// DB 제약과 1:1로 맞춰야 한다 — public.reports 의 target_type / status CHECK 목록,
// public.blocks 의 unique(blocker_id, blocked_id) 가 기준이다.

// #region 신고 대상 종류
// reports.target_type CHECK 와 정확히 동일해야 한다(7종).
export const ENUM_REPORT_TARGET_TYPE = {
  USER: 'user',
  RECORD: 'record',
  CONTENT: 'content',
  COMMENT: 'comment',
  GUESTBOOK: 'guestbook',
  POST: 'post',
  FEEDBACK: 'feedback',
} as const

export type ReportTargetType =
  (typeof ENUM_REPORT_TARGET_TYPE)[keyof typeof ENUM_REPORT_TARGET_TYPE]

export const REPORT_TARGET_TYPES: readonly ReportTargetType[] =
  Object.values(ENUM_REPORT_TARGET_TYPE)

export function isReportTargetType(value: string): value is ReportTargetType {
  return (REPORT_TARGET_TYPES as readonly string[]).includes(value)
}
// #endregion

// #region 신고 사유
// Google Play UGC 정책이 요구하는 금지 행위를 덮는다.
export const ENUM_REPORT_REASON = {
  SPAM: 'spam',
  HATE: 'hate',
  VIOLENCE: 'violence',
  SEXUAL: 'sexual',
  IMPERSONATION: 'impersonation',
  PRIVACY: 'privacy',
  COPYRIGHT: 'copyright',
  OTHER: 'other',
} as const

export type ReportReason = (typeof ENUM_REPORT_REASON)[keyof typeof ENUM_REPORT_REASON]

export const REPORT_REASONS: readonly ReportReason[] = Object.values(ENUM_REPORT_REASON)

export function isReportReason(value: string): value is ReportReason {
  return (REPORT_REASONS as readonly string[]).includes(value)
}

// 신고 모달의 사유 선택 목록. messageKey 는 moderation.json 의 reason.* 키다.
export interface ReportReasonOption {
  value: ReportReason
  messageKey: ReportReason
}

export const REPORT_REASON_OPTIONS: readonly ReportReasonOption[] = REPORT_REASONS.map(
  (value) => ({ value, messageKey: value })
)
// #endregion

// #region 신고 처리 상태
// reports.status CHECK 와 정확히 동일해야 한다(3종).
export const ENUM_REPORT_STATUS = {
  PENDING: 'pending',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
} as const

export type ReportStatus = (typeof ENUM_REPORT_STATUS)[keyof typeof ENUM_REPORT_STATUS]
// #endregion

// #region 입력 제한
// 상세 설명 글자수 상한. 서버 액션과 입력 화면이 같은 값을 쓴다.
export const REPORT_DESCRIPTION_MAX_LENGTH = 1000

// 사유가 '기타'일 때는 상세 설명을 최소 이만큼 받는다.
export const REPORT_DESCRIPTION_MIN_LENGTH_FOR_OTHER = 5

// 목록 조회 기본 개수
export const MODERATION_LIST_DEFAULT_LIMIT = 50

// 목록 조회 1회 상한. PostgREST 가 응답을 1,000행에서 자르므로 이보다 크게 잡아도 의미가 없다.
export const MODERATION_LIST_MAX_LIMIT = 200
// #endregion
