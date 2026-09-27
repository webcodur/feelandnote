import { getSteamReferences } from './steamReferences'
import type { GameStoreReference, SteamPurchase, SteamStoreReference } from './steamPurchase'

export async function resolveSteamPurchase(
  game: GameStoreReference,
  storedNames: readonly string[],
  readStore: (reference: SteamStoreReference) => Promise<SteamPurchase | null>,
): Promise<SteamPurchase | null> {
  for (const reference of getSteamReferences(game, storedNames)) {
    try {
      const offer = await readStore(reference)
      if (offer) return offer
    } catch {
      // 일시적 가격 조회 실패는 IGDB가 지정한 작품 주소까지 없애지 않는다.
      // 지역 제한·작품 불일치 등 명시적 거절(null)은 이 경로로 되살리지 않는다.
      if (!reference.names.length && reference.editions.length !== 1) return null
      const edition = reference.names.length ? null : reference.editions[0]
      return {
        appId: reference.appId, url: `https://store.steampowered.com/app/${reference.appId}/?cc=kr`,
        status: 'store', price: null, originalPrice: null, discountPercent: null,
        edition: edition ? { kind: edition.kind, title: edition.title } : null,
      }
    }
  }
  return null
}
