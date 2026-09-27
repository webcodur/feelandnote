import { unstable_cache } from 'next/cache'
import { getGameIdFromSteam, getGameStoreReferences, type IGDBStoreGame } from '@feelandnote/content-search/igdb'
import { rawFetch } from '../rawFetch'
import { ACCESS_CACHE_SECONDS, type ContentAccess } from '../commerce/contentAccess'
import { getConsoleReferences, type ConsoleReference, type ConsoleStore } from './consoleReferences'
import { fetchConsoleLinks } from './consoleStores'
import { STEAM_REFERENCE_CACHE_SECONDS } from './steamPurchase'

export const getCachedGameReference = unstable_cache(getGameStoreReferences, ['game-store-reference-v4'], { revalidate: STEAM_REFERENCE_CACHE_SECONDS })
export const getCachedSteamGameId = unstable_cache(getGameIdFromSteam, ['steam-game-identity-v1'], { revalidate: STEAM_REFERENCE_CACHE_SECONDS })
const readStore = unstable_cache((reference: ConsoleReference) => fetchConsoleLinks(rawFetch, reference), ['console-store-kr-v2'], { revalidate: ACCESS_CACHE_SECONDS })

export async function getConsoleAccess(game: IGDBStoreGame, names: readonly string[], store: ConsoleStore,
  onCandidate: (reference: ConsoleReference) => void, signal?: AbortSignal): Promise<ContentAccess> {
  const references = getConsoleReferences(game, names)
  // 원작 → 이식·리마스터·리메이크 → 포함 합본. 기종과 실제 상품명은 각 링크에 함께 표시한다.
  for (const reference of references.filter(value => value.store === store).slice(0, 8)) {
    if (signal?.aborted) return { links: [] }
    onCandidate(reference)
    const links = await readStore(reference)
    if (links.length) return { links, region: 'KR' }
  }
  return { links: [], region: 'KR' }
}
