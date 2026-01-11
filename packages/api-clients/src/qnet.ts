// Q-Net API 래퍼 (국가자격증)
// API 문서: https://openapi.hrdkorea.or.kr/main
// 공공데이터포털: https://www.data.go.kr/data/15003024/openapi.do

import { XMLParser } from 'fast-xml-parser'

const QNET_API_KEY = process.env.QNET_API_KEY
const QNET_BASE_URL = 'http://openapi.q-net.or.kr/api/service/rest'

// XML 파서 설정
const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
})

// 자격 구분
export const QUALIFICATION_TYPES: Record<string, string> = {
  T: '기술자격',
  S: '전문자격',
}

// 자격 등급
export const QUALIFICATION_GRADES: Record<string, string> = {
  '01': '기술사',
  '02': '기능장',
  '03': '기사',
  '04': '산업기사',
  '05': '기능사',
  '10': '1급',
  '11': '2급',
  '12': '3급',
}

interface QnetQualification {
  jmcd: string       // 종목코드
  jmfldnm: string    // 종목명
  qualgbcd: string   // 자격구분 (T: 기술, S: 전문)
  qualgbnm: string   // 자격구분명
  seriescd: string   // 계열코드
  seriesnm: string   // 계열명
  obligfldcd: string // 대직무분야코드
  obligfldnm: string // 대직무분야명
  mdobligfldcd: string // 중직무분야코드
  mdobligfldnm: string // 중직무분야명
}

interface QnetSearchResponse {
  response: {
    header: {
      resultCode: string
      resultMsg: string
    }
    body: {
      items: {
        item: QnetQualification | QnetQualification[]
      }
      numOfRows: number
      pageNo: number
      totalCount: number
    }
  }
}

export interface CertificateSearchResult {
  externalId: string
  externalSource: 'qnet'
  category: 'certificate'
  title: string
  creator: string // 직무분야명 사용
  coverImageUrl: null // 자격증은 이미지 없음
  metadata: {
    qualificationType: string    // 기술자격/전문자격
    series: string               // 계열명
    majorField: string           // 대직무분야
    middleField: string          // 중직무분야
    jmCode: string               // 종목코드
  }
}

export async function searchCertificates(
  query: string,
  page: number = 1,
  limit: number = 20
): Promise<{
  items: CertificateSearchResult[]
  total: number
  hasMore: boolean
}> {
  if (!QNET_API_KEY) {
    console.warn('QNET API 키가 설정되지 않았습니다. 로컬 데이터를 사용합니다.')
    return searchFromLocalData(query, page, limit)
  }

  try {
    const params = new URLSearchParams({
      serviceKey: QNET_API_KEY,
      numOfRows: String(limit),
      pageNo: String(page),
    })

    const response = await fetch(
      `${QNET_BASE_URL}/InquiryListNationalQualifcationSVC/getList?${params}`,
      { next: { revalidate: 86400 } } as RequestInit // 24시간 캐시
    )

    if (!response.ok) {
      throw new Error(`Q-Net API 오류: ${response.status}`)
    }

    const xmlText = await response.text()

    // 에러 체크
    if (xmlText.includes('SERVICE_KEY_IS_NOT_REGISTERED_ERROR')) {
      throw new Error('Q-Net API 키가 등록되지 않았습니다.')
    }

    const data = parser.parse(xmlText) as QnetSearchResponse

    if (!data.response?.body?.items?.item) {
      return { items: [], total: 0, hasMore: false }
    }

    // 단일 결과인 경우 배열로 변환
    const qualifications = Array.isArray(data.response.body.items.item)
      ? data.response.body.items.item
      : [data.response.body.items.item]

    // 검색어로 필터링 (API가 검색 파라미터를 지원하지 않음)
    const queryLower = query.toLowerCase()
    const filtered = qualifications.filter(
      (q) =>
        q.jmfldnm?.toLowerCase().includes(queryLower) ||
        q.obligfldnm?.toLowerCase().includes(queryLower) ||
        q.mdobligfldnm?.toLowerCase().includes(queryLower) ||
        q.seriesnm?.toLowerCase().includes(queryLower)
    )

    const items: CertificateSearchResult[] = filtered.slice(0, limit).map((qual) => ({
      externalId: `qnet-${qual.jmcd}`,
      externalSource: 'qnet' as const,
      category: 'certificate' as const,
      title: qual.jmfldnm,
      creator: qual.mdobligfldnm || qual.obligfldnm || '',
      coverImageUrl: null,
      metadata: {
        qualificationType: qual.qualgbnm || QUALIFICATION_TYPES[qual.qualgbcd] || '',
        series: qual.seriesnm || '',
        majorField: qual.obligfldnm || '',
        middleField: qual.mdobligfldnm || '',
        jmCode: qual.jmcd,
      },
    }))

    return {
      items,
      total: data.response.body.totalCount || filtered.length,
      hasMore: filtered.length > limit,
    }
  } catch (error) {
    console.error('Q-Net API 오류, 로컬 데이터 사용:', error)
    return searchFromLocalData(query, page, limit)
  }
}

// 인기 자격증 로컬 데이터 (API 키 없을 때 fallback)
const POPULAR_CERTIFICATES = [
  { jmcd: '1320', jmfldnm: '정보처리기사', field: '정보기술', series: '정보통신' },
  { jmcd: '2290', jmfldnm: '정보처리산업기사', field: '정보기술', series: '정보통신' },
  { jmcd: '6921', jmfldnm: '정보보안기사', field: '정보보호', series: '정보통신' },
  { jmcd: '1321', jmfldnm: '전자계산기조직응용기사', field: '정보기술', series: '정보통신' },
  { jmcd: '7910', jmfldnm: '빅데이터분석기사', field: '데이터', series: '정보통신' },
  { jmcd: '2330', jmfldnm: '네트워크관리사', field: '네트워크', series: '정보통신' },
  { jmcd: '1350', jmfldnm: '전기기사', field: '전기', series: '전기전자' },
  { jmcd: '1351', jmfldnm: '전기공사기사', field: '전기', series: '전기전자' },
  { jmcd: '1352', jmfldnm: '전기산업기사', field: '전기', series: '전기전자' },
  { jmcd: '2170', jmfldnm: '건축기사', field: '건축', series: '건설' },
  { jmcd: '2171', jmfldnm: '건축산업기사', field: '건축', series: '건설' },
  { jmcd: '1110', jmfldnm: '토목기사', field: '토목', series: '건설' },
  { jmcd: '1200', jmfldnm: '화학분석기사', field: '화학', series: '화학' },
  { jmcd: '7790', jmfldnm: '사회조사분석사1급', field: '사회조사', series: '경영회계사무' },
  { jmcd: '7791', jmfldnm: '사회조사분석사2급', field: '사회조사', series: '경영회계사무' },
  { jmcd: '1560', jmfldnm: '컴퓨터활용능력1급', field: '사무자동화', series: '경영회계사무' },
  { jmcd: '1561', jmfldnm: '컴퓨터활용능력2급', field: '사무자동화', series: '경영회계사무' },
  { jmcd: '6910', jmfldnm: '한국사능력검정시험', field: '역사', series: '문화예술' },
  { jmcd: '7800', jmfldnm: 'SQLD', field: '데이터베이스', series: '정보통신' },
  { jmcd: '7801', jmfldnm: 'SQLP', field: '데이터베이스', series: '정보통신' },
  { jmcd: '1130', jmfldnm: '조경기사', field: '조경', series: '건설' },
  { jmcd: '7700', jmfldnm: '위험물산업기사', field: '위험물', series: '화학' },
  { jmcd: '2050', jmfldnm: '용접기사', field: '용접', series: '기계' },
  { jmcd: '1040', jmfldnm: '기계설계기사', field: '기계설계', series: '기계' },
  { jmcd: '2000', jmfldnm: '품질경영기사', field: '품질관리', series: '경영회계사무' },
]

function searchFromLocalData(
  query: string,
  page: number,
  limit: number
): { items: CertificateSearchResult[]; total: number; hasMore: boolean } {
  const queryLower = query.toLowerCase()

  const filtered = POPULAR_CERTIFICATES.filter(
    (cert) =>
      cert.jmfldnm.toLowerCase().includes(queryLower) ||
      cert.field.toLowerCase().includes(queryLower) ||
      cert.series.toLowerCase().includes(queryLower)
  )

  const startIndex = (page - 1) * limit
  const paged = filtered.slice(startIndex, startIndex + limit)

  const items: CertificateSearchResult[] = paged.map((cert) => ({
    externalId: `qnet-${cert.jmcd}`,
    externalSource: 'qnet' as const,
    category: 'certificate' as const,
    title: cert.jmfldnm,
    creator: cert.field,
    coverImageUrl: null,
    metadata: {
      qualificationType: '국가자격',
      series: cert.series,
      majorField: cert.field,
      middleField: '',
      jmCode: cert.jmcd,
    },
  }))

  return {
    items,
    total: filtered.length,
    hasMore: startIndex + limit < filtered.length,
  }
}
