/*
  파일명: /public/sw.js
  기능: Feel&Note 서비스 워커
  책임: 오프라인 대체 화면을 보장하고, 정적 자산·이미지만 제한적으로 캐시한다.

  캐시 정책 (docs/project/android-app-feasibility-review-2026-07-29.md §3.2)
    페이지 이동            network-first, 실패 시 오프라인 화면
    /_next/static/*        cache-first (내용 해시가 붙은 불변 자산)
    로고·앱 셸 아이콘      cache-first
    인물·책 이미지         항목 수 상한을 둔 cache-first
    인증 응답·사용자 기록  캐시 금지
    Server Action·API      캐시 금지

  절대 캐시하지 않는 것
    GET 이외 요청, Range 요청, /auth/*, /api/*,
    Server Action 요청(Next-Action 헤더), RSC 페이로드(RSC 헤더 또는 _rsc 쿼리)

  skipWaiting + clients.claim 을 쓴 근거
    안드로이드 TWA·설치형 실행은 앱 프로세스를 오래 살려두므로, 대기 상태로
    두면 배포한 수정이 며칠씩 사용자에게 닿지 않는다. 그래서 즉시 교체한다.
    갱신 중 화면이 깨질 위험은 캐시 대상을 좁혀 막았다 — HTML 문서와 RSC
    페이로드는 캐시하지 않으므로 화면과 데이터가 어긋날 수 없고, /_next/static
    자산은 파일명에 내용 해시가 박혀 옛 버전과 새 버전이 서로 다른 주소를
    쓴다. 따라서 워커가 중간에 바뀌어도 실행 중인 화면이 자기 자산을 잃지 않는다.

  캐시 이름은 아래 VERSION 으로 고정한다. 이 파일은 정적 파일이라 내용이
  바뀔 때만 워커가 갱신되므로, 일반 배포에서는 캐시가 그대로 살아 있고
  이 파일을 고쳐 VERSION 을 올릴 때만 옛 캐시를 지운다.
*/

const VERSION = 'v1'
const SHELL_CACHE = `fn-shell-${VERSION}`
const STATIC_CACHE = `fn-static-${VERSION}`
const IMAGE_CACHE = `fn-image-${VERSION}`
const KEEP_CACHES = [SHELL_CACHE, STATIC_CACHE, IMAGE_CACHE]

const OFFLINE_URL = '/offline.html'

// 앱 셸 — 오프라인 화면과 로고·아이콘. 설치 시 미리 담는다.
const SHELL_ASSETS = [
  OFFLINE_URL,
  '/icon.png',
  '/apple-icon.png',
  '/icons/android-192.png',
  '/icons/android-512.png',
  '/icons/android-maskable-512.png',
]
const SHELL_EXACT_PATHS = new Set([...SHELL_ASSETS, '/favicon.ico'])
const SHELL_PATH_PREFIX = '/icons/'

// 항목 수 상한 — 초과분은 오래된 것부터 버린다
const MAX_IMAGE_ENTRIES = 120
const MAX_STATIC_ENTRIES = 300

// 캐시 금지 경로 (인증·API)
const NEVER_CACHE_PREFIXES = ['/auth/', '/api/']

// #region 설치·활성화
self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE)
      // 자산 하나가 없어도 설치가 통째로 실패하지 않도록 개별 처리한다
      await Promise.allSettled(
        SHELL_ASSETS.map((url) => cache.add(new Request(url, { cache: 'reload' })))
      )
      await self.skipWaiting()
    })()
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(
        names
          .filter((name) => name.startsWith('fn-') && !KEEP_CACHES.includes(name))
          .map((name) => caches.delete(name))
      )
      await self.clients.claim()
    })()
  )
})
// #endregion

// #region 캐시 도구
// Cache API 의 keys() 는 넣은 순서를 지키므로 앞쪽이 가장 오래된 항목이다
async function trimCache(cacheName, max) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= max) return
  await Promise.all(keys.slice(0, keys.length - max).map((key) => cache.delete(key)))
}

// max 가 null 이면 상한 없음 (앱 셸 — 오프라인 화면이 밀려나면 안 된다)
async function cacheFirst(request, cacheName, max) {
  const cache = await caches.open(cacheName)
  const hit = await cache.match(request)
  if (hit) return hit

  const response = await fetch(request)
  const storable = response && (response.ok || response.type === 'opaque')
  if (!storable) return response

  await cache.put(request, response.clone())
  if (max !== null) trimCache(cacheName, max)
  return response
}

async function networkFirstDocument(request) {
  try {
    return await fetch(request)
  } catch {
    const cache = await caches.open(SHELL_CACHE)
    const offline = await cache.match(OFFLINE_URL)
    return offline || Response.error()
  }
}
// #endregion

// #region 요청 분기
function isShellPath(pathname) {
  return SHELL_EXACT_PATHS.has(pathname) || pathname.startsWith(SHELL_PATH_PREFIX)
}

function isBypassed(request, url, sameOrigin) {
  if (request.method !== 'GET') return true
  if (request.headers.has('range')) return true
  if (request.headers.has('Next-Action')) return true
  if (request.headers.has('RSC')) return true
  if (!sameOrigin) return false
  if (url.searchParams.has('_rsc')) return true
  return NEVER_CACHE_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  const sameOrigin = url.origin === self.location.origin

  if (isBypassed(request, url, sameOrigin)) return

  if (request.mode === 'navigate') {
    event.respondWith(networkFirstDocument(request))
    return
  }

  if (sameOrigin && url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE, MAX_STATIC_ENTRIES))
    return
  }

  if (sameOrigin && isShellPath(url.pathname)) {
    event.respondWith(cacheFirst(request, SHELL_CACHE, null))
    return
  }

  if (request.destination === 'image') {
    event.respondWith(cacheFirst(request, IMAGE_CACHE, MAX_IMAGE_ENTRIES))
    return
  }

  // 나머지(서버 액션·API·데이터 요청)는 네트워크에 그대로 맡긴다
})
// #endregion
