const INDEXNOW_KEY = '4f3c45379c68dc5a57ad8927e92dda93'
const HOST = 'https://feelandnote.com'

/**
 * IndexNow API로 URL 색인 요청 (네이버, Bing 등 지원)
 * 셀럽 등록/수정 등 콘텐츠 변경 시 호출한다.
 */
export async function notifyIndexNow(paths: string[]) {
  if (process.env.NODE_ENV !== 'production') return

  const urlList = paths.map((p) => `${HOST}${p}`)

  try {
    await fetch('https://api.indexnow.org/indexnow', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        host: 'feelandnote.com',
        key: INDEXNOW_KEY,
        keyLocation: `${HOST}/${INDEXNOW_KEY}.txt`,
        urlList,
      }),
    })
  } catch {
    // 색인 요청 실패는 무시 (크리티컬하지 않음)
  }
}
