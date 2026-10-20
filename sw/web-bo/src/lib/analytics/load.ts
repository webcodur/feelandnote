import 'server-only'
import { createGa4Reporter, Ga4Unavailable, type Ga4Report } from '../ga4-client'
import { audienceFilter, VISIT_METRICS, type AnalyticsOptions, type DimensionFilter } from './model'

export const REPORT_LABELS = {
  summary: '선택한 유입 요약', all: '전체 유입', suspect: '의심 패턴 유입', daily: '날짜별 추이',
  countries: '국가', devices: '기기·언어', sources: '유입 경로', landing: '첫 진입 페이지',
  pages: '조회한 페이지', returning: '신규·재방문', events: '행동 이벤트', sections: '인물 구획 노출', operations: '기능 결과',
} as const
export type ReportKey = keyof typeof REPORT_LABELS
export interface ReportSlot { data: Ga4Report | null; error: string | null }
export interface AnalyticsData {
  reports: Record<ReportKey, ReportSlot>
  fetchedAt: string
}

interface Spec { dimensions: string[]; metrics: string[]; limit?: number; filter?: DimensionFilter; sort?: string; ascending?: boolean }

export async function loadAnalytics(options: AnalyticsOptions): Promise<AnalyticsData> {
  const selected = audienceFilter(options.audience)
  const specs: Record<ReportKey, Spec> = {
    summary: { dimensions: [], metrics: VISIT_METRICS },
    all: { dimensions: [], metrics: VISIT_METRICS, filter: audienceFilter('all') },
    suspect: { dimensions: [], metrics: VISIT_METRICS, filter: audienceFilter('suspect') },
    daily: { dimensions: ['date'], metrics: VISIT_METRICS, sort: 'date', ascending: true, limit: options.days },
    countries: { dimensions: ['country'], metrics: VISIT_METRICS, sort: 'sessions' },
    devices: { dimensions: ['deviceCategory', 'language'], metrics: VISIT_METRICS, sort: 'sessions' },
    sources: { dimensions: ['sessionSourceMedium'], metrics: VISIT_METRICS, sort: 'sessions' },
    landing: { dimensions: ['landingPage'], metrics: ['sessions', 'engagedSessions', 'userEngagementDuration'], sort: 'sessions' },
    pages: { dimensions: ['pagePath'], metrics: ['screenPageViews', 'totalUsers', 'userEngagementDuration'], sort: 'screenPageViews' },
    returning: { dimensions: ['newVsReturning'], metrics: ['totalUsers', 'sessions', 'engagedSessions'], sort: 'sessions' },
    events: { dimensions: ['eventName'], metrics: ['eventCount', 'totalUsers'], limit: 100, sort: 'eventCount' },
    sections: { dimensions: ['customEvent:section'], metrics: ['eventCount', 'totalUsers'], sort: 'totalUsers',
      filter: { andGroup: { expressions: [selected, { filter: { fieldName: 'eventName', stringFilter: { value: 'celeb_section_view', matchType: 'EXACT' } } }] } } },
    operations: { dimensions: ['eventName', 'customEvent:kind'], metrics: ['eventCount', 'totalUsers'], limit: 100, sort: 'eventCount',
      filter: { andGroup: { expressions: [selected, { filter: { fieldName: 'eventName', inListFilter: { values: [
        'content_brief_attempt', 'content_brief_success', 'content_brief_empty', 'content_brief_failure',
        'dialogue_audio_attempt', 'dialogue_audio_started', 'dialogue_audio_success', 'dialogue_audio_failure', 'dialogue_audio_blocked', 'dialogue_audio_cancelled',
      ] } } }] } } },
  }
  const reports = {} as AnalyticsData['reports']
  let report: Awaited<ReturnType<typeof createGa4Reporter>>
  try { report = await createGa4Reporter() }
  catch (error) {
    const message = error instanceof Ga4Unavailable && error.reason === 'configuration'
      ? 'GA 연결 설정을 확인해 주세요. 백오피스의 GA_PROPERTY_ID·GA_CREDENTIALS_PATH와 인증 파일이 필요합니다.'
      : 'GA 인증에 실패했습니다. 계정 권한과 연결 상태를 확인해 주세요.'
    for (const key of Object.keys(specs) as ReportKey[]) reports[key] = { data: null, error: message }
    return { reports, fetchedAt: new Date().toISOString() }
  }

  // GA 속성의 동시 요청 한도를 넘기지 않도록 네 요청씩 실행한다. 결과 실패는 구획별로 격리한다.
  const jobs = Object.entries(specs) as [ReportKey, Spec][]
  let cursor = 0
  await Promise.all(Array.from({ length: 4 }, async () => {
    while (cursor < jobs.length) {
      const [key, spec] = jobs[cursor++]
      try {
        const data = await report({
          dateRanges: [{ startDate: options.startDate, endDate: options.endDate }],
          dimensions: spec.dimensions.map(name => ({ name })), metrics: spec.metrics.map(name => ({ name })),
          dimensionFilter: spec.filter ?? selected, limit: spec.limit ?? 10,
          ...(spec.sort && { orderBys: [{
            ...(spec.dimensions.includes(spec.sort) ? { dimension: { dimensionName: spec.sort } } : { metric: { metricName: spec.sort } }),
            desc: !spec.ascending,
          }] }),
        })
        reports[key] = { data, error: null }
      } catch {
        reports[key] = { data: null, error: `${REPORT_LABELS[key]} 조회 실패. 연결·GA 측정기준을 확인한 뒤 다시 조회해 주세요.` }
      }
    }
  }))
  return { reports, fetchedAt: new Date().toISOString() }
}
