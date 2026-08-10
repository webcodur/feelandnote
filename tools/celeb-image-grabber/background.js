// 사진을 내려받아 백오피스로 보낸다.
// 페이지 안(content.js)에서 직접 보내면 사이트마다 다른 교차출처 제한에 걸리므로,
// 확장 권한으로 움직이는 이곳에서 받아 보낸다.

const ENDPOINT = 'http://localhost:3001/api/celebs/quick-image'
const MAX_BYTES = 25 * 1024 * 1024

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type !== 'grab') return undefined

  grab(message)
    .then(sendResponse)
    .catch((error) => sendResponse({ ok: false, error: toMessage(error) }))

  // 비동기로 답하겠다는 신호. 빼면 응답이 사라진다.
  return true
})

async function grab({ src, pageUrl }) {
  const image = await fetchImage(src)

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': image.type,
      'X-Source-Url': encodeURIComponent(src),
      'X-Page-Url': encodeURIComponent(pageUrl || ''),
    },
    body: image,
  }).catch(() => {
    throw new Error('백오피스에 연결하지 못했습니다. 3001 서버가 떠 있는지 확인하세요.')
  })

  if (!response.ok) {
    const detail = await response.json().catch(() => null)
    throw new Error(detail?.error || `백오피스가 거절했습니다 (${response.status})`)
  }

  return { ok: true, bytes: image.size }
}

async function fetchImage(src) {
  const response = await fetch(src, { credentials: 'include' }).catch(() => {
    throw new Error('사진을 내려받지 못했습니다.')
  })
  if (!response.ok) throw new Error(`사진을 내려받지 못했습니다 (${response.status})`)

  const blob = await response.blob()
  if (!blob.type.startsWith('image/')) throw new Error('사진이 아닙니다.')
  if (blob.size === 0) throw new Error('빈 사진입니다.')
  if (blob.size > MAX_BYTES) {
    throw new Error(`사진이 너무 큽니다 (${Math.round(blob.size / 1024 / 1024)}MB).`)
  }
  return blob
}

function toMessage(error) {
  if (error instanceof Error) return error.message
  return String(error)
}
