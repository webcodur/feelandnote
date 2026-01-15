// URL Fetcher - URL에서 HTML을 가져와 텍스트로 변환

// #region Types
export interface FetchUrlResult {
  success: boolean
  text?: string
  title?: string
  error?: string
}
// #endregion

// #region HTML Utilities
const HTML_ENTITIES: Record<string, string> = {
  '&nbsp;': ' ',
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&copy;': '(c)',
  '&reg;': '(R)',
  '&trade;': '(TM)',
  '&mdash;': '-',
  '&ndash;': '-',
  '&hellip;': '...',
  '&laquo;': '"',
  '&raquo;': '"',
  '&ldquo;': '"',
  '&rdquo;': '"',
  '&lsquo;': "'",
  '&rsquo;': "'",
}

function decodeHtmlEntities(text: string): string {
  let decoded = text
  for (const [entity, char] of Object.entries(HTML_ENTITIES)) {
    decoded = decoded.replaceAll(entity, char)
  }
  // 숫자 엔티티 처리 (&#123; 형식)
  decoded = decoded.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))
  decoded = decoded.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)))
  return decoded
}

function extractTitle(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return match ? decodeHtmlEntities(match[1].trim()) : undefined
}

function stripHtml(html: string): string {
  let text = html

  // 1. script, style, noscript, header, footer, nav 태그 및 내용 제거
  text = text.replace(/<(script|style|noscript|header|footer|nav|aside)[^>]*>[\s\S]*?<\/\1>/gi, ' ')

  // 2. 주석 제거
  text = text.replace(/<!--[\s\S]*?-->/g, ' ')

  // 3. 블록 태그를 줄바꿈으로 변환
  text = text.replace(/<\/(p|div|br|h[1-6]|li|tr|blockquote|article|section)>/gi, '\n')
  text = text.replace(/<(br|hr)\s*\/?>/gi, '\n')

  // 4. 링크 태그 보존: <a href="URL">텍스트</a> → 텍스트 [URL]
  text = text.replace(/<a\s+[^>]*href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/gi, (_, url, linkText) => {
    // 외부 링크만 보존 (http로 시작하는 것)
    if (url.startsWith('http')) {
      return `${linkText.trim()} [${url}]`
    }
    return linkText.trim()
  })

  // 5. 나머지 HTML 태그 제거
  text = text.replace(/<[^>]+>/g, ' ')

  // 6. HTML 엔티티 디코딩
  text = decodeHtmlEntities(text)

  // 7. 연속 공백을 단일 공백으로
  text = text.replace(/[ \t]+/g, ' ')

  // 8. 연속 줄바꿈을 2개까지로 제한
  text = text.replace(/\n\s*\n\s*\n/g, '\n\n')

  // 9. 각 줄 앞뒤 공백 제거
  text = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join('\n')

  return text.trim()
}
// #endregion

// #region Main Function
const MAX_TEXT_LENGTH = 100000
const FETCH_TIMEOUT = 20000
const MAX_RETRIES = 2
const RETRY_DELAY = 2000

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(url: string, retries: number = 0): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT)

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Ch-Ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'none',
        'Sec-Fetch-User': '?1',
        'Upgrade-Insecure-Requests': '1',
      },
    })

    clearTimeout(timeoutId)

    // 429 또는 5xx 에러 시 재시도
    if ((response.status === 429 || response.status >= 500) && retries < MAX_RETRIES) {
      await delay(RETRY_DELAY * (retries + 1))
      return fetchWithRetry(url, retries + 1)
    }

    return response
  } catch (err) {
    clearTimeout(timeoutId)
    throw err
  }
}

export async function fetchUrlContent(url: string): Promise<FetchUrlResult> {
  // URL 유효성 검사
  try {
    new URL(url)
  } catch {
    return { success: false, error: '유효하지 않은 URL입니다.' }
  }

  try {
    const response = await fetchWithRetry(url)

    if (!response.ok) {
      const errorMessages: Record<number, string> = {
        403: '접근이 차단되었습니다. 해당 사이트에서 크롤링을 허용하지 않습니다.',
        404: '페이지를 찾을 수 없습니다.',
        429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
        500: '서버 오류가 발생했습니다.',
        503: '서비스를 일시적으로 사용할 수 없습니다.',
      }
      const message = errorMessages[response.status] || `페이지를 가져올 수 없습니다. (${response.status})`
      return { success: false, error: message }
    }

    const contentType = response.headers.get('content-type') || ''
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return { success: false, error: 'HTML 페이지가 아닙니다.' }
    }

    const html = await response.text()
    const title = extractTitle(html)
    let text = stripHtml(html)

    // 텍스트 길이 제한
    if (text.length > MAX_TEXT_LENGTH) {
      text = text.slice(0, MAX_TEXT_LENGTH) + '\n\n[... 이하 생략 ...]'
    }

    if (text.length < 100) {
      return { success: false, error: '페이지에서 충분한 텍스트를 추출하지 못했습니다.' }
    }

    return { success: true, text, title }
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return { success: false, error: '요청 시간이 초과되었습니다.' }
    }
    return {
      success: false,
      error: err instanceof Error ? err.message : '페이지를 가져오는 중 오류가 발생했습니다.',
    }
  }
}
// #endregion
