import type { FeedbackCategory, FeedbackStatus } from '@/types/database'

export const FEEDBACK_CATEGORY_LABELS: Record<FeedbackCategory, string> = {
  CELEB_REQUEST: '셀럽 요청',
  CONTENT_REPORT: '콘텐츠 제보',
  FEATURE_SUGGESTION: '기능 건의',
}

export const FEEDBACK_CATEGORY_COLORS: Record<FeedbackCategory, string> = {
  CELEB_REQUEST: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  CONTENT_REPORT: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  FEATURE_SUGGESTION: 'bg-green-500/20 text-green-400 border-green-500/30',
}

export const FEEDBACK_STATUS_LABELS: Record<FeedbackStatus, string> = {
  PENDING: '대기',
  IN_PROGRESS: '처리 중',
  COMPLETED: '완료',
  REJECTED: '반려',
}

export const FEEDBACK_STATUS_COLORS: Record<FeedbackStatus, string> = {
  PENDING: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  IN_PROGRESS: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  COMPLETED: 'bg-green-500/20 text-green-400 border-green-500/30',
  REJECTED: 'bg-red-500/20 text-red-400 border-red-500/30',
}

export const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  'CELEB_REQUEST',
  'CONTENT_REPORT',
  'FEATURE_SUGGESTION',
]
