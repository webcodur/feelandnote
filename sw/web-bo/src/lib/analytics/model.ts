export const DAY_OPTIONS = [7, 28] as const
export const AUDIENCES = {
  filtered: '의심 패턴 제외',
  all: '전체 유입',
  korea: '한국 접속',
  suspect: '의심 패턴만',
} as const
export type Audience = keyof typeof AUDIENCES
export interface AnalyticsOptions {
  days: (typeof DAY_OPTIONS)[number]
  audience: Audience
  includeToday: boolean
  startDate: string
  endDate: string
}

export type DimensionFilter =
  | { filter: { fieldName: string; stringFilter: { value: string; matchType: 'EXACT' | 'BEGINS_WITH' }; } }
  | { filter: { fieldName: string; inListFilter: { values: string[] } } }
  | { andGroup: { expressions: DimensionFilter[] } }
  | { notExpression: DimensionFilter }

const exact = (fieldName: string, value: string): DimensionFilter => ({ filter: { fieldName, stringFilter: { value, matchType: 'EXACT' } } })

// 2026-10-20 조사에서 관찰한 조합. 일반적인 봇 판별식이나 차단 규칙이 아니다.
export const SUSPECT_PATTERN = {
  browserVersions: ['144.0.7559.132', '151.0.7922.173'],
  deviceCategory: 'desktop', browser: 'Chrome', language: 'English',
  sessionSourceMedium: '(direct) / (none)',
} as const

export function suspectFilter(): DimensionFilter {
  const { browserVersions, ...matches } = SUSPECT_PATTERN
  return { andGroup: { expressions: [
    { filter: { fieldName: 'browserVersion', inListFilter: { values: [...browserVersions] } } },
    ...Object.entries(matches).map(([field, value]) => exact(field, value)),
  ] } }
}

export function audienceFilter(audience: Audience): DimensionFilter {
  const expressions = [exact('hostName', 'feelandnote.com')]
  if (audience === 'filtered') expressions.push({ notExpression: suspectFilter() })
  if (audience === 'suspect') expressions.push(suspectFilter())
  if (audience === 'korea') expressions.push(exact('country', 'South Korea'))
  return { andGroup: { expressions } }
}

function dayAtOffset(today: string, offset: number) {
  return new Date(Date.parse(`${today}T00:00:00Z`) + offset * 86_400_000).toISOString().slice(0, 10)
}

export function parseAnalyticsOptions(params: Record<string, string | string[] | undefined>, now = new Date()): AnalyticsOptions {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  const days = DAY_OPTIONS.find(value => String(value) === params.days) ?? DAY_OPTIONS[0]
  const audience = typeof params.audience === 'string' && Object.hasOwn(AUDIENCES, params.audience) ? params.audience as Audience : 'filtered'
  const includeToday = params.today === '1'
  const endDate = dayAtOffset(today, includeToday ? 0 : -1)
  return { days, audience, includeToday, endDate, startDate: dayAtOffset(endDate, 1 - days) }
}

export const VISIT_METRICS = ['totalUsers', 'sessions', 'engagedSessions', 'screenPageViews', 'userEngagementDuration']
export function visitMetrics(values: number[] = []) {
  const [users = 0, sessions = 0, engaged = 0, views = 0, seconds = 0] = values
  return { users, sessions, engaged, views, seconds, engagementRate: sessions ? engaged / sessions : null, averageSeconds: sessions ? seconds / sessions : null }
}

export const ACTIONS = [
  { event: 'celeb_guide_click', label: '인물 구획 안내 클릭', note: '구획으로 이동하려고 누른 행동' },
  { event: 'celeb_person_open', label: '다른 인물 미리보기 열기', note: '인물 미리보기를 연 행동' },
  { event: 'celeb_person_go', label: '미리보기에서 인물 페이지로 이동', note: '미리보기를 거쳐 상세 페이지로 이동' },
  { event: 'celeb_voice_play', label: '인물 음성 재생 시작', note: '재생 요청이 아닌 실제 재생 시작' },
  { event: 'commerce_open', label: '구매·감상처 선택창 열기', note: '외부 사이트 이동 전 선택창을 연 행동' },
  { event: 'commerce_click', label: '외부 구매·감상처 링크 클릭', note: '구매 완료나 매출을 뜻하지 않음' },
] as const

export const SECTION_LABELS: Record<string, string> = {
  introduction: '인물 소개', 'person-guide': '인물 안내', 'virtual-monologue': '가상독백',
  'affiliate-books': '관련 도서', library: '감상 작품', archive: '기록관', analysis: '인물 분석',
  connections: '인물 관계', 'related-figures': '관련 인물', guestbook: '방명록',
  'related-factions': '관련 세력', filmography: '참여 작품',
}

export function formatCount(value: number) { return value.toLocaleString('ko-KR') }
export function formatPercent(value: number | null) { return value === null ? '—' : `${(value * 100).toFixed(1)}%` }
export function formatSeconds(value: number | null) {
  if (value === null) return '—'
  const rounded = Math.round(value)
  return value >= 60 ? `${Math.floor(rounded / 60)}분 ${rounded % 60}초` : `${value.toFixed(1)}초`
}

/** 사용자 URL은 경로만 보여 준다. GA 문자열을 외부 링크 주소로 사용하지 않는다. */
export function displayPath(value: string) {
  if (!value || value === '(not set)') return '진입 페이지 미확인'
  return value.split(/[?#]/, 1)[0]
}
