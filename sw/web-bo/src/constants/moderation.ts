// 신고 운영 화면 공용 상수.
// 값 문자열의 정본은 사용자 웹 `sw/web/src/constants/moderation.ts` 와 public.reports 의 CHECK 제약이다.
// 이 파일은 그 값에 운영 화면용 한국어 라벨·표시 순서만 더한다. 새 값을 여기서 만들지 않는다.

export type ModerationBadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info'

// #region 처리 상태
export const ENUM_REPORT_STATUS = {
  PENDING: 'pending',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
} as const

export type ReportStatus = (typeof ENUM_REPORT_STATUS)[keyof typeof ENUM_REPORT_STATUS]

export const REPORT_STATUS_ORDER: readonly ReportStatus[] = [
  ENUM_REPORT_STATUS.PENDING,
  ENUM_REPORT_STATUS.RESOLVED,
  ENUM_REPORT_STATUS.REJECTED,
]

export const REPORT_STATUS_CONFIG: Record<
  ReportStatus,
  { label: string; badge: ModerationBadgeVariant }
> = {
  pending: { label: '대기중', badge: 'warning' },
  resolved: { label: '처리완료', badge: 'success' },
  rejected: { label: '반려', badge: 'default' },
}

export function isReportStatus(value: string): value is ReportStatus {
  return value in REPORT_STATUS_CONFIG
}

export function reportStatusLabel(value: string): string {
  return isReportStatus(value) ? REPORT_STATUS_CONFIG[value].label : value
}

export function reportStatusBadge(value: string): ModerationBadgeVariant {
  return isReportStatus(value) ? REPORT_STATUS_CONFIG[value].badge : 'default'
}
// #endregion

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

export const REPORT_TARGET_TYPE_ORDER: readonly ReportTargetType[] = [
  ENUM_REPORT_TARGET_TYPE.POST,
  ENUM_REPORT_TARGET_TYPE.COMMENT,
  ENUM_REPORT_TARGET_TYPE.GUESTBOOK,
  ENUM_REPORT_TARGET_TYPE.RECORD,
  ENUM_REPORT_TARGET_TYPE.FEEDBACK,
  ENUM_REPORT_TARGET_TYPE.CONTENT,
  ENUM_REPORT_TARGET_TYPE.USER,
]

export const REPORT_TARGET_TYPE_LABEL: Record<ReportTargetType, string> = {
  post: '게시글',
  comment: '댓글',
  guestbook: '방명록',
  record: '감상 기록',
  feedback: '의견',
  content: '콘텐츠',
  user: '사용자',
}

export function isReportTargetType(value: string): value is ReportTargetType {
  return value in REPORT_TARGET_TYPE_LABEL
}

export function reportTargetTypeLabel(value: string): string {
  return isReportTargetType(value) ? REPORT_TARGET_TYPE_LABEL[value] : value
}
// #endregion

// #region 신고 사유
// sw/web 의 ENUM_REPORT_REASON 과 값이 1:1로 같아야 한다(8종).
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

export const REPORT_REASON_ORDER: readonly ReportReason[] = [
  ENUM_REPORT_REASON.SPAM,
  ENUM_REPORT_REASON.HATE,
  ENUM_REPORT_REASON.VIOLENCE,
  ENUM_REPORT_REASON.SEXUAL,
  ENUM_REPORT_REASON.IMPERSONATION,
  ENUM_REPORT_REASON.PRIVACY,
  ENUM_REPORT_REASON.COPYRIGHT,
  ENUM_REPORT_REASON.OTHER,
]

export const REPORT_REASON_CONFIG: Record<
  ReportReason,
  { label: string; badge: ModerationBadgeVariant }
> = {
  spam: { label: '스팸·광고', badge: 'default' },
  hate: { label: '혐오 표현', badge: 'danger' },
  violence: { label: '폭력·위협', badge: 'danger' },
  sexual: { label: '선정적 내용', badge: 'danger' },
  impersonation: { label: '사칭', badge: 'warning' },
  privacy: { label: '개인정보 노출', badge: 'warning' },
  copyright: { label: '저작권 침해', badge: 'info' },
  other: { label: '기타', badge: 'default' },
}

export function isReportReason(value: string): value is ReportReason {
  return value in REPORT_REASON_CONFIG
}

// 옛 자유 입력 사유가 남아 있을 수 있으므로 목록에 없으면 원문을 그대로 보여준다.
export function reportReasonLabel(value: string): string {
  return isReportReason(value) ? REPORT_REASON_CONFIG[value].label : value
}

export function reportReasonBadge(value: string): ModerationBadgeVariant {
  return isReportReason(value) ? REPORT_REASON_CONFIG[value].badge : 'default'
}
// #endregion

// #region 목록·집계 규격
// 신고 큐 한 페이지 건수
export const REPORT_PAGE_SIZE = 20

// 악용 탐지 집계 1회 스캔 상한. PostgREST 가 1,000행에서 응답을 자르므로 그 밑에 둔다.
// 이 값에 닿으면 숫자를 정상값으로 위장하지 않고 화면에 "일부 생략"을 드러낸다.
export const REPORT_ABUSE_SCAN_LIMIT = 900

// 반복 신고로 볼 최소 누적 건수
export const REPORT_REPEAT_THRESHOLD = 3
// #endregion
