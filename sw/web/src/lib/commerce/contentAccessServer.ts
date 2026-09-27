import { unstable_cache } from 'next/cache'
import { createStaticClient } from '@/lib/db/static'
import { rawFetch } from '@/lib/rawFetch'
import { getCachedGameReference, getCachedSteamGameId, getConsoleAccess } from '@/lib/games/gameAccess'
import { appleMusicLink, fetchWatchAccess } from '@/lib/commerce/mediaAccess'
import { ACCESS_CACHE_SECONDS, ACCESS_TIMEOUT_MS, ACCESS_SOURCES, isAccessType, steamAccessAppId, type ContentAccess, type AccessSource, type AccessStreamEvent } from './contentAccess'
import { getSteamAccess } from '@/lib/games/steamAccess'
import { selectSteamReference } from '@/lib/games/steamPurchase'

const getWatch = unstable_cache((id: string) => fetchWatchAccess(rawFetch, id), ['watch-providers-kr-v2'], { revalidate: ACCESS_CACHE_SECONDS })
const lookupMusic = unstable_cache(async (externalId: string): Promise<string | null> => {
  const id = externalId.match(/^itunes[-_]([1-9]\d*)$/)?.[1]
  if (!id) return null
  for (const country of ['KR', 'US']) {
    const response = await rawFetch(`https://itunes.apple.com/lookup?id=${id}&country=${country}`, { signal: AbortSignal.timeout(ACCESS_TIMEOUT_MS) })
    if (!response.ok) throw new Error(`Music lookup unavailable: ${response.status}`)
    const data = await response.json()
    for (const item of data.results ?? []) {
      const url = appleMusicLink(item.trackViewUrl ?? item.collectionViewUrl, externalId)
      if (url) return url
    }
  }
  return null
}, ['music-access-id-v1'], { revalidate: ACCESS_CACHE_SECONDS })

export async function streamContentAccess(contentId: string, sources: AccessSource[], emit: (event: AccessStreamEvent) => void, signal: AbortSignal) {
  const pending = new Set(sources)
  const done = (source: AccessSource, data: ContentAccess) => {
    pending.delete(source)
    emit({ kind: 'result', source, data })
  }
  sources.forEach(source => emit({ kind: 'progress', source, phase: 'identity' }))
  try {
    const steamId = steamAccessAppId(contentId)
    const gameId = steamId ? await getCachedSteamGameId(steamId) : null
    const { data, error } = steamId
      ? { data: gameId ? { type: 'GAME', external_id: `igdb-${gameId}`, metadata: null, content_locales: [] } : null, error: null }
      : await createStaticClient().from('contents')
        .select('id,type,external_id,metadata,content_locales(title)').eq('id', contentId).maybeSingle()
    if (error) throw new Error('Content access lookup failed')
    if (!data?.external_id || !isAccessType(data.type)) {
      sources.forEach(source => done(source, { links: [] }))
      return
    }
    const allowed = ACCESS_SOURCES[data.type]
    for (const source of sources) if (!allowed.includes(source)) done(source, { links: [] })
    if (!pending.size || signal.aborted) return
    if (data.type === 'VIDEO') {
      emit({ kind: 'progress', source: 'watchProviders', phase: 'providers' })
      done('watchProviders', await getWatch(data.external_id))
      return
    }
    if (data.type === 'MUSIC') {
      const metadata = data.metadata as { itunesUrl?: unknown } | null
      let url = appleMusicLink(metadata?.itunesUrl, data.external_id)
      if (!url) {
        emit({ kind: 'progress', source: 'appleMusic', phase: 'catalog' })
        url = await lookupMusic(data.external_id)
      }
      done('appleMusic', { links: url ? [{ service: 'appleMusic', url, title: '', platforms: [] }] : [] })
      return
    }
    const id = data.external_id.match(/^igdb[-_]([1-9]\d*)$/)?.[1]
    if (!id) { [...pending].forEach(source => done(source, { links: [] })); return }
    pending.forEach(source => emit({ kind: 'progress', source, phase: 'reference' }))
    const game = await getCachedGameReference(Number(id))
    // 외부 ID 역조회 결과도 작품에 등록된 Steam 주소로 한 번 더 대조한다.
    if (!game || (steamId && selectSteamReference(game, [game.name])?.appId !== String(steamId))) {
      [...pending].forEach(source => done(source, { links: [] })); return
    }
    const names = steamId ? [game.name] : data.content_locales.map(row => row.title).filter((title): title is string => !!title)
    if (signal.aborted) return
    await Promise.all([...pending].map(async source => {
      try {
        if (source === 'steam') {
          const offer = await getSteamAccess(game, names, reference => emit({ kind: 'progress', source,
            phase: reference.names.length ? 'store' : 'edition', detail: reference.editions[0]?.title }))
          done(source, { links: offer ? [{ service: 'steam', url: offer.url, title: offer.edition?.title ?? '', platforms: ['PC'],
            edition: offer.edition?.kind, price: offer.price, discountPercent: offer.discountPercent, free: offer.status === 'free' }] : [], region: 'KR' })
        } else if (source === 'playstation' || source === 'xbox' || source === 'nintendo') {
          done(source, await getConsoleAccess(game, names, source, reference => emit({ kind: 'progress', source,
            phase: reference.edition ? 'edition' : source === 'nintendo' ? 'catalog' : 'store', detail: reference.edition ? reference.game.name : undefined }), signal))
        }
      } catch { pending.delete(source); emit({ kind: 'error', source }) }
    }))
  } catch { pending.forEach(source => emit({ kind: 'error', source })) }
}
