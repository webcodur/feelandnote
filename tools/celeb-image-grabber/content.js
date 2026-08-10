// Alt+클릭을 가로채 그 자리의 사진을 백오피스로 보낸다.
// 브라우저 기본 동작(Alt+클릭 = 내려받기)과 사이트 자체 클릭 처리를 함께 눌러야
// 확대창이 뜨거나 파일이 저장되지 않는다.

const TOAST_ID = '__celeb-image-grabber-toast'

document.addEventListener('mousedown', suppress, true)
document.addEventListener('click', onClick, true)

function suppress(event) {
  if (!isGrabEvent(event)) return
  if (!findImageSource(event)) return
  event.preventDefault()
  event.stopPropagation()
}

function onClick(event) {
  if (!isGrabEvent(event)) return

  const src = findImageSource(event)
  if (!src) return

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()

  showToast('보내는 중…', 'pending')
  chrome.runtime.sendMessage({ type: 'grab', src, pageUrl: location.href }, (result) => {
    if (chrome.runtime.lastError) {
      showToast(chrome.runtime.lastError.message, 'error')
      return
    }
    if (result?.ok) showToast('보냈습니다', 'ok')
    else showToast(result?.error || '보내지 못했습니다', 'error')
  })
}

function isGrabEvent(event) {
  return event.altKey && event.button === 0 && !event.ctrlKey && !event.metaKey
}

/** 클릭한 자리에서 사진 주소를 찾는다. 사진 위에 덮인 층이 있어도 뚫고 내려간다. */
function findImageSource(event) {
  const path = typeof event.composedPath === 'function' ? event.composedPath() : []
  const stacked = document.elementsFromPoint(event.clientX, event.clientY) || []

  for (const element of [...path, ...stacked]) {
    if (!element || element.nodeType !== 1) continue
    const src = sourceOf(element)
    if (src) return src
  }
  return null
}

function sourceOf(element) {
  if (element.tagName === 'IMG') {
    return largestFromSrcset(element) || absolute(element.currentSrc || element.src)
  }

  if (element.tagName === 'IMAGE' && element.ownerSVGElement) {
    const href = element.getAttribute('href') || element.getAttribute('xlink:href')
    return absolute(href)
  }

  const background = getComputedStyle(element).backgroundImage
  const matched = background && background.match(/url\(["']?([^"')]+)["']?\)/)
  return matched ? absolute(matched[1]) : null
}

/** 같은 사진의 여러 크기가 걸려 있으면 가장 큰 것을 고른다. */
function largestFromSrcset(image) {
  const raw = image.getAttribute('srcset')
  if (!raw) return null

  let best = null
  let bestWeight = 0
  for (const candidate of raw.split(',')) {
    const [url, descriptor] = candidate.trim().split(/\s+/)
    if (!url) continue
    const weight = descriptor?.endsWith('w')
      ? parseFloat(descriptor)
      : descriptor?.endsWith('x')
        ? parseFloat(descriptor) * 1000
        : 1
    if (weight >= bestWeight) {
      bestWeight = weight
      best = url
    }
  }
  return absolute(best)
}

function absolute(url) {
  if (!url) return null
  if (url.startsWith('data:') || url.startsWith('blob:')) return url
  try {
    return new URL(url, location.href).href
  } catch {
    return null
  }
}

function showToast(text, kind) {
  const colors = {
    pending: '#334155',
    ok: '#15803d',
    error: '#b91c1c',
  }

  let toast = document.getElementById(TOAST_ID)
  if (!toast) {
    toast = document.createElement('div')
    toast.id = TOAST_ID
    document.documentElement.appendChild(toast)
  }

  toast.textContent = text
  toast.setAttribute(
    'style',
    [
      'position:fixed',
      'top:16px',
      'right:16px',
      'z-index:2147483647',
      `background:${colors[kind] || colors.pending}`,
      'color:#fff',
      'font:600 13px/1.4 system-ui,sans-serif',
      'padding:8px 14px',
      'border-radius:8px',
      'box-shadow:0 4px 14px rgba(0,0,0,.35)',
      'pointer-events:none',
    ].join(';'),
  )

  clearTimeout(showToast.timer)
  if (kind !== 'pending') {
    showToast.timer = setTimeout(() => toast.remove(), 1800)
  }
}
