import type { ContentAccess, WatchKind, WatchProvider } from './contentAccess'
import { ACCESS_TIMEOUT_MS } from './contentAccess'

/** 저장한 곡/앨범 식별자와 일치하는 공식 페이지에만 '듣기'라는 이름을 붙인다. */
export function appleMusicLink(value: unknown, externalId: string): string | null {
  const id = externalId.match(/^itunes[-_]([1-9]\d*)$/)?.[1]
  if (!id || typeof value !== 'string') return null
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || !['music.apple.com', 'itunes.apple.com'].includes(url.hostname)) return null
    if (!/^\/[a-z]{2}\/(?:album|song)\//.test(url.pathname)) return null
    const itemId = url.searchParams.get('i') || url.pathname.match(/\/(?:id)?(\d+)\/?$/)?.[1]
    if (itemId !== id) return null
    url.hostname = 'music.apple.com'
    // 현재 음악 연결은 비제휴다. 저장 주소의 외부 추적 태그를 이어받지 않는다.
    const trackId = url.searchParams.get('i')
    url.search = ''
    url.hash = ''
    if (trackId) url.searchParams.set('i', trackId)
    url.searchParams.set('app', 'music')
    return url.toString()
  } catch { return null }
}

interface Provider { provider_id: number; provider_name: string }
interface WatchRegion { link?: string; flatrate?: Provider[]; rent?: Provider[]; buy?: Provider[]; free?: Provider[]; ads?: Provider[] }

export function parseWatchProviders(data: { results?: Record<string, WatchRegion> }, externalId: string): ContentAccess {
  const region = data.results?.KR
  const match = externalId.match(/^tmdb-(movie|tv)-(\d+)$/)
  const none: ContentAccess = { links: [], providers: [], region: 'KR' }
  if (!region?.link || !match) return none
  let url: URL
  try { url = new URL(region.link) } catch { return none }
  const target = url.pathname.match(/^\/(movie|tv)\/(\d+)(?:-[^/]+)?\/watch$/)
  if (url.protocol !== 'https:' || url.hostname !== 'www.themoviedb.org'
    || target?.[1] !== match[1] || target?.[2] !== match[2] || url.searchParams.get('locale') !== 'KR') return none
  const providers = new Map<number, WatchProvider>()
  for (const kind of ['flatrate', 'rent', 'buy', 'free', 'ads'] as WatchKind[]) {
    for (const item of region[kind] ?? []) {
      // 이전에 철회한 Watcha 연결은 재도입하지 않는다.
      if (/watcha|왓챠/i.test(item.provider_name) || !Number.isInteger(item.provider_id)) continue
      const provider = providers.get(item.provider_id) ?? { id: item.provider_id, name: item.provider_name, kinds: [] }
      if (!provider.kinds.includes(kind)) provider.kinds.push(kind)
      providers.set(item.provider_id, provider)
    }
  }
  return { ...none, providers: [...providers.values()], ...(providers.size > 0 && { watchUrl: url.toString() }) }
}

export async function fetchWatchAccess(fetcher: typeof fetch, externalId: string): Promise<ContentAccess> {
  const match = externalId.match(/^tmdb-(movie|tv)-(\d+)$/)
  if (!match) return { links: [] }
  const key = process.env.TMDB_API_KEY
  if (!key) throw new Error('Watch provider configuration unavailable')
  const response = await fetcher(`https://api.themoviedb.org/3/${match[1]}/${match[2]}/watch/providers?api_key=${encodeURIComponent(key)}`, { signal: AbortSignal.timeout(ACCESS_TIMEOUT_MS) })
  if (response.status === 404) return { links: [], region: 'KR' }
  if (!response.ok) throw new Error(`Watch providers unavailable: ${response.status}`)
  return parseWatchProviders(await response.json(), externalId)
}
