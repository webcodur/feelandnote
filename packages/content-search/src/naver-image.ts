// 네이버 이미지 검색 API 래퍼

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET
const NAVER_IMAGE_API_URL = 'https://openapi.naver.com/v1/search/image'

interface NaverImageItem {
  title: string
  link: string
  thumbnail: string
  sizeheight: string
  sizewidth: string
}

interface NaverImageResponse {
  total: number
  start: number
  display: number
  items: NaverImageItem[]
}

export interface ImageSearchResult {
  title: string
  imageUrl: string
  thumbnailUrl: string
  width: number
  height: number
}

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&apos;/g, "'")
}

export async function searchImages(
  query: string,
  display: number = 12
): Promise<{ items: ImageSearchResult[]; total: number }> {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    throw new Error('네이버 API 키 미설정')
  }

  const params = new URLSearchParams({
    query,
    display: String(display),
    sort: 'sim',
  })

  const response = await fetch(`${NAVER_IMAGE_API_URL}?${params}`, {
    headers: {
      'X-Naver-Client-Id': NAVER_CLIENT_ID,
      'X-Naver-Client-Secret': NAVER_CLIENT_SECRET,
    },
    next: { revalidate: 3600 },
  })

  if (!response.ok) {
    throw new Error(`네이버 이미지 API 오류: ${response.status}`)
  }

  const data: NaverImageResponse = await response.json()

  return {
    items: (data.items || []).map((item) => ({
      title: cleanHtml(item.title),
      imageUrl: item.link,
      thumbnailUrl: item.thumbnail,
      width: parseInt(item.sizewidth) || 0,
      height: parseInt(item.sizeheight) || 0,
    })),
    total: data.total,
  }
}
