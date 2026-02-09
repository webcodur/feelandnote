// 네이버 블로그 검색 API 래퍼

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET
const NAVER_BLOG_API_URL = 'https://openapi.naver.com/v1/search/blog.json'

// #region 타입
interface NaverBlogItem {
  title: string
  link: string
  description: string
  bloggername: string
  bloggerlink: string
  postdate: string
}

interface NaverBlogResponse {
  lastBuildDate: string
  total: number
  start: number
  display: number
  items: NaverBlogItem[]
}

export interface BlogSearchResult {
  title: string
  description: string
  link: string
  bloggerName: string
  bloggerLink: string
  postDate: string
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

export async function searchBlog(
  query: string,
  display: number = 10
): Promise<{ items: BlogSearchResult[]; total: number }> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    throw new Error('네이버 API 키 미설정')
  }

  const params = new URLSearchParams({
    query,
    display: String(display),
    sort: 'sim', // 정확도순 (sim) 또는 날짜순 (date)
  })

  const response = await fetch(`${NAVER_BLOG_API_URL}?${params}`, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
    },
    next: { revalidate: 300 },
  })

  if (!response.ok) {
    throw new Error(`네이버 블로그 API 오류: ${response.status}`)
  }

  const data: NaverBlogResponse = await response.json()

  return {
    items: (data.items || []).map((item) => ({
      title: cleanHtml(item.title),
      description: cleanHtml(item.description),
      link: item.link,
      bloggerName: item.bloggername,
      bloggerLink: item.bloggerlink,
      postDate: item.postdate,
    })),
    total: data.total,
  }
}
