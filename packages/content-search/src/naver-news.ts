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

/**
 * 최근 N시간 안에 **제목**으로 이 이름을 다룬 기사 수.
 *
 * 본문까지 훑는 전체 검색은 이름이 스치기만 해도 잡힌다(예: 인물과 무관한 운세·서평 기사).
 * 제목에 이름이 있어야 그 사람을 다룬 기사라고 보고, 화제도 지표로는 이 수만 쓴다.
 *
 * 네이버 뉴스 검색은 한 번에 최대 100건이라 이 값이 상한이다. 순위를 가리는 데는 충분하다.
 */
export async function countRecentTitleMentions(
  name: string,
  hours: number = 48
): Promise<number> {
  // 짧은 이름은 다른 낱말에 섞여 오탐이 난다. 지표로 쓰지 않는다
  if (name.trim().length < 3) return 0

  const { items } = await searchNews(`"${name}"`, 100)
  const cutoff = Date.now() - hours * 60 * 60 * 1000

  return items.filter((item) => {
    const published = new Date(item.pubDate).getTime()
    if (Number.isNaN(published) || published < cutoff) return false
    return item.title.includes(name)
  }).length
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
