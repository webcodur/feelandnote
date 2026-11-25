/**
 * Google 인물 사이트맵(`celebs.xml`)의 우선 명단 — 26.11.16
 *
 * Google은 인물 18,022개 주소 가운데 극히 일부만 가져가고 대부분을 「알려지지 않은 URL」로 두었다
 * (점수 순위 구간별 표본 18건 중 색인 1건). 크롤링 요청량은 사이트가 내미는 주소 목록에 가장 크게
 * 좌우되므로(Google 「크롤링 예산 관리」의 perceived inventory), 점수 상위 인물만 내밀고 날짜에 따라
 * 명단을 저절로 넓힌다. 사람이 고칠 값은 없다.
 * - 크기: 시작일부터 한 달마다 일정 비율로 커진다. 재배포 없이 사이트맵 재생성 때 다시 계산한다.
 * - 구성: 최근 방문(네이버 포함) 상위가 30%, 공개 기록 상위가 나머지다. 재생성 때마다 DB에서 다시 매긴다.
 * 명단 밖 인물도 페이지는 열려 있고 내부 링크로 닿는다. 전체 명단은 `naver.xml`(네이버 등록용, 한국어만)이다.
 */

export const CELEB_PRIORITY_START_DATE = '2026-11-16'
export const CELEB_PRIORITY_START_SIZE = 400
export const CELEB_PRIORITY_MONTHLY_GROWTH = 0.05
export const CELEB_PRIORITY_VIEW_DAYS = 90

const MONTH_MS = 30.4375 * 24 * 60 * 60 * 1000

export interface CelebPrioritySignal { records: number; recentViews: number }

/** 오늘 명단에 실을 인물 수. 시작일 전에는 시작 크기다. */
export function celebPriorityQuota(now: Date): number {
  const months = Math.max(0, (now.getTime() - Date.parse(`${CELEB_PRIORITY_START_DATE}T00:00:00Z`)) / MONTH_MS)
  return Math.floor(CELEB_PRIORITY_START_SIZE * (1 + CELEB_PRIORITY_MONTHLY_GROWTH) ** months)
}

/**
 * 명단 중 최근 방문 순으로 채우는 몫. 나머지는 기록 순이다.
 * 두 점수를 더하면 둘 다 갖춰야 들어가 방문만 몰린 인물(네이버 유입)이 끝내 못 들어온다 —
 * 실데이터에서 90일 방문 128회·기록 2건 인물이 1,000위 밖이었다(26.11.16).
 */
export const CELEB_PRIORITY_DEMAND_SHARE = 0.3

const byRecords = (a: CelebPrioritySignal, b: CelebPrioritySignal) => b.records - a.records || b.recentViews - a.recentViews
const byDemand = (a: CelebPrioritySignal, b: CelebPrioritySignal) => b.recentViews - a.recentViews || b.records - a.records

/**
 * 오늘의 크기만큼 고른다. 방문 순 몫을 먼저 채우고 나머지를 기록 순으로 채운다(겹치면 다음 순위).
 * 같은 값은 slug 순이라 입력 순서가 결과에 영향이 없다.
 */
export function selectPriorityCelebs<T extends { slug: string }>(
  celebs: readonly T[],
  signals: ReadonlyMap<string, CelebPrioritySignal>,
  now: Date,
): T[] {
  const empty = { records: 0, recentViews: 0 }
  const items = celebs.map((celeb) => ({ celeb, signal: signals.get(celeb.slug) ?? empty }))
  const ordered = (compare: typeof byRecords) => [...items]
    .sort((a, b) => compare(a.signal, b.signal) || a.celeb.slug.localeCompare(b.celeb.slug))
  const quota = Math.min(celebPriorityQuota(now), items.length)
  const picked = new Set<(typeof items)[number]>()
  const fill = (list: typeof items, until: number) => {
    for (const item of list) {
      if (picked.size >= until) return
      picked.add(item)
    }
  }
  fill(ordered(byDemand).filter((item) => item.signal.recentViews > 0), Math.round(quota * CELEB_PRIORITY_DEMAND_SHARE))
  fill(ordered(byRecords), quota)
  return [...picked].map((item) => item.celeb)
}
