import { unstable_cache } from 'next/cache'
import { rawFetch } from '../rawFetch'
import { fetchSteamStore } from './steamStore'
import { resolveSteamPurchase } from './steamResolver'
import { STEAM_STORE_CACHE_SECONDS, type GameStoreReference, type SteamStoreReference } from './steamPurchase'

const getStore = unstable_cache(async (reference: SteamStoreReference) => ({
  offer: await fetchSteamStore(rawFetch, reference.appId, reference.names, reference.editions),
  expiresAt: Date.now() + STEAM_STORE_CACHE_SECONDS * 1000,
}), ['steam-kr-store-v3'], { revalidate: STEAM_STORE_CACHE_SECONDS })

export function getSteamAccess(game: GameStoreReference, names: readonly string[], onCandidate?: (reference: SteamStoreReference) => void) {
  return resolveSteamPurchase(game, names, async reference => {
    onCandidate?.(reference)
    const store = await getStore(reference)
    if (!store.offer || store.expiresAt > Date.now()) return store.offer
    // 재검증 중에는 검증했던 작품 링크만 유지하고 오래된 가격은 숨긴다.
    return { ...store.offer, status: 'store', price: null, originalPrice: null, discountPercent: null }
  })
}
