export const CELEB_CONTENT_RESEARCH_STATUSES = [
  'open',
  'queued',
  'researching',
  'deferred',
  'confirmed_empty',
] as const

export type CelebContentResearchStatus =
  (typeof CELEB_CONTENT_RESEARCH_STATUSES)[number]

export const DEFAULT_CELEB_CONTENT_RESEARCH_STATUS: CelebContentResearchStatus = 'open'

/**
 * 셀럽 콘텐츠 수의 표시 규약.
 *
 * - 양수: 실제 user_contents 개수
 * - 0: 아직 "없음"으로 닫지 않은 열린 상태
 * - -1: 조사를 마쳤고 콘텐츠가 없음을 확인한 상태
 *
 * 실제 콘텐츠가 하나라도 있으면 조사 상태보다 실측 개수를 항상 우선한다.
 */
export function resolveCelebContentCount(
  actualCount: number | null | undefined,
  researchStatus: string | null | undefined
): number {
  const normalizedCount = Number.isFinite(actualCount)
    ? Math.max(0, Math.trunc(actualCount as number))
    : 0

  if (normalizedCount > 0) return normalizedCount
  return researchStatus === 'confirmed_empty' ? -1 : 0
}
