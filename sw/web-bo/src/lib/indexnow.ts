import { SITE_URL } from '@feelandnote/shared/constants/site-brand'

const INDEXNOW_KEY = '4f3c45379c68dc5a57ad8927e92dda93'
const HOST = new URL(SITE_URL).hostname
const REQUEST_TIMEOUT_MS = 5000

/**
 * IndexNow API로 URL 색인 요청 (네이버, Bing 등 지원)
 * 셀럽 등록/수정 등 콘텐츠 변경 시 호출한다.
 */
export async function notifyIndexNow(paths: string[]) {
  if (!paths.length) return

  const urlList = paths.map((p) => `${SITE_URL}${p}`)

  try {
    const response = await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        host: HOST,
        key: INDEXNOW_KEY,
        keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    })
    if (!response.ok) {
      console.warn('[IndexNow] 변경 통지 거부:', response.status, 'URL 수:', urlList.length)
    }
  } catch {
    // 통지 실패로 이미 저장한 인물 정보를 실패 처리하지 않는다.
    console.warn('[IndexNow] 변경 통지 실패. URL 수:', urlList.length)
  }
}

/** 로컬 백오피스가 운영 DB의 공개 인물을 바꾸면 한영 정식 주소를 함께 통지한다. */
export async function notifyCelebIndexNow(slug: string) {
  await notifyIndexNow([`/celeb/${slug}`, `/en/celeb/${slug}`])
}
