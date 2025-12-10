// KOPIS API 래퍼 (공연)
// API 문서: https://kopis.or.kr/por/cs/openapi/openApiInfo.do
// 공공데이터포털: https://www.data.go.kr/data/15097805/openapi.do

import { XMLParser } from 'fast-xml-parser'

const KOPIS_API_KEY = process.env.KOPIS_API_KEY
const KOPIS_BASE_URL = 'http://www.kopis.or.kr/openApi/restful'

// XML 파서 설정
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})

// 장르 코드
export const PERFORMANCE_GENRES: Record<string, string> = {
  AAAA: '연극',
  BBBC: '무용(서양/한국무용)',
  BBBE: '대중무용',
  CCCA: '클래식(서양음악)',
  CCCC: '국악(한국음악)',
  CCCD: '대중음악',
  EEEA: '복합',
  EEEB: '서커스/마술',
  GGGA: '뮤지컬',
}

// 공연 상태 코드
export const PERFORMANCE_STATUS: Record<string, string> = {
  '01': '공연예정',
  '02': '공연중',
  '03': '공연완료',
}

interface KopisPerformance {
  mt20id: string // 공연 ID
  prfnm: string // 공연명
  prfpdfrom: string // 공연시작일 (YYYY.MM.DD)
  prfpdto: string // 공연종료일
  fcltynm: string // 공연시설명
  poster?: string // 포스터 이미지 URL
  genrenm: string // 장르명
  prfstate: string // 공연상태
  openrun?: string // 오픈런 여부
  area?: string // 지역
}

interface KopisSearchResponse {
  dbs: {
    db: KopisPerformance | KopisPerformance[]
  }
}

export interface PerformanceSearchResult {
  externalId: string
  externalSource: 'kopis'
  category: 'performance'
  title: string
  creator: string // 공연시설명 사용
  coverImageUrl: string | null
  metadata: {
    summary: string
    startDate: string
    endDate: string
    venue: string
    genre: string
    status: string
    area: string
  }
}

// 날짜 포맷 변환 (YYYY.MM.DD -> YYYYMMDD)
function formatDateForApi(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}${month}${day}`
}

// 날짜 포맷 변환 (YYYY.MM.DD -> YYYY-MM-DD)
function formatDateForDisplay(dateStr: string): string {
  if (!dateStr) return ''
  return dateStr.replace(/\./g, '-')
}

export async function searchPerformances(
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  items: PerformanceSearchResult[]
  total: number
  hasMore: boolean
}> {
  if (!KOPIS_API_KEY) {
    throw new Error('KOPIS API 키가 설정되지 않았습니다. .env 파일에 KOPIS_API_KEY를 설정해주세요.')
  }

  // 검색 기간: 오늘부터 1년 전 ~ 1년 후
  const today = new Date()
  const startDate = new Date(today)
  startDate.setFullYear(startDate.getFullYear() - 1)
  const endDate = new Date(today)
  endDate.setFullYear(endDate.getFullYear() + 1)

  const params = new URLSearchParams({
    service: KOPIS_API_KEY,
    stdate: formatDateForApi(startDate),
    eddate: formatDateForApi(endDate),
    cpage: String(page),
    rows: String(limit),
    shprfnm: query, // 공연명 검색
  })

  const response = await fetch(`${KOPIS_BASE_URL}/pblprfr?${params}`)

  if (!response.ok) {
    throw new Error(`KOPIS API 오류: ${response.status}`)
  }

  const xmlText = await response.text()

  // 에러 체크
  if (xmlText.includes('SERVICE KEY IS NOT REGISTERED ERROR')) {
    throw new Error('KOPIS API 키가 등록되지 않았습니다. KOPIS에서 서비스키를 발급받아주세요.')
  }

  const data = parser.parse(xmlText) as KopisSearchResponse

  // 결과가 없는 경우
  if (!data.dbs || !data.dbs.db) {
    return { items: [], total: 0, hasMore: false }
  }

  // 단일 결과인 경우 배열로 변환
  const performances = Array.isArray(data.dbs.db) ? data.dbs.db : [data.dbs.db]

  const items: PerformanceSearchResult[] = performances.map((perf) => ({
    externalId: `kopis-${perf.mt20id}`,
    externalSource: 'kopis' as const,
    category: 'performance' as const,
    title: perf.prfnm,
    creator: perf.fcltynm || '', // 공연장명
    coverImageUrl: perf.poster || null,
    metadata: {
      summary: '', // 목록 조회에서는 제공되지 않음
      startDate: formatDateForDisplay(perf.prfpdfrom),
      endDate: formatDateForDisplay(perf.prfpdto),
      venue: perf.fcltynm || '',
      genre: perf.genrenm || '',
      status: perf.prfstate || '',
      area: perf.area || '',
    },
  }))

  return {
    items,
    total: items.length < limit ? (page - 1) * limit + items.length : (page - 1) * limit + limit + 1,
    hasMore: items.length === limit,
  }
}

// 공연 상세 정보 조회
export async function getPerformanceDetails(performanceId: string): Promise<{
  description: string
  cast: string
  crew: string
  runtime: string
  ticketPrice: string
} | null> {
  if (!KOPIS_API_KEY) return null

  try {
    const params = new URLSearchParams({
      service: KOPIS_API_KEY,
    })

    const response = await fetch(`${KOPIS_BASE_URL}/pblprfr/${performanceId}?${params}`)

    if (!response.ok) return null

    const xmlText = await response.text()
    const data = parser.parse(xmlText)

    if (!data.dbs || !data.dbs.db) return null

    const detail = data.dbs.db

    return {
      description: detail.sty || '', // 줄거리
      cast: detail.prfcast || '', // 출연진
      crew: detail.prfcrew || '', // 제작진
      runtime: detail.prfruntime || '', // 공연 런타임
      ticketPrice: detail.pcseguidance || '', // 티켓 가격
    }
  } catch {
    return null
  }
}
