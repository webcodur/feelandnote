// 네이버 뉴스 검색 API 래퍼

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET
const NAVER_NEWS_API_URL = 'https://openapi.naver.com/v1/search/news.json'

// #region 타입
interface NaverNewsItem {
  title: string
  originallink: string
  link: string
  description: string
  pubDate: string
}

interface NaverNewsResponse {
  lastBuildDate: string
  total: number
  start: number
  display: number
  items: NaverNewsItem[]
}

export interface NewsSearchResult {
  title: string
  description: string
  originalLink: string
  naverLink: string
  pubDate: string
  source: string
}
// #endregion

// HTML 태그 제거 (네이버 API는 <b> 태그로 검색어를 감쌈)
function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
}

// URL에서 언론사 도메인 추출
function extractSource(url: string): string {
  try {
    const hostname = new URL(url).hostname
    return hostname.replace(/^www\./, '').split('.')[0]
  } catch {
    return ''
  }
}

export async function searchNews(
  query: string,
  display: number = 10
): Promise<{ items: NewsSearchResult[]; total: number }> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    throw new Error('네이버 API 키 미설정')
  }

  const params = new URLSearchParams({
    query,
    display: String(display),
    sort: 'date',
  })

  const response = await fetch(`${NAVER_NEWS_API_URL}?${params}`, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
    },
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    throw new Error(`네이버 뉴스 API 오류: ${response.status}`)
  }

  const data: NaverNewsResponse = await response.json()

  return {
    items: (data.items || []).map((item) => ({
      title: cleanHtml(item.title),
      description: cleanHtml(item.description),
      originalLink: item.originallink || item.link,
      naverLink: item.link,
      pubDate: item.pubDate,
      source: extractSource(item.originallink || item.link),
    })),
    total: data.total,
  }
}
