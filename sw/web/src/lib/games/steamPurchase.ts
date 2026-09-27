// Steam 주소·작품 일치·판매 정보의 공통 규격. 가격은 원화 상점 기준이다.
export const STEAM_STORE_CACHE_SECONDS = 900
export const STEAM_REFERENCE_CACHE_SECONDS = 86400

export type SteamEditionKind = 'edition' | 'port' | 'remaster' | 'remake' | 'collection'
export interface SteamEdition { kind: SteamEditionKind; title: string }
export interface SteamEditionReference extends SteamEdition { names: string[] }
export interface SteamStoreReference { appId: string; names: string[]; editions: SteamEditionReference[] }

export interface SteamPurchase {
  appId: string
  url: string
  status: 'paid' | 'free' | 'upcoming' | 'store'
  price: number | null
  originalPrice: number | null
  discountPercent: number | null
  edition: SteamEdition | null
}

export interface GameStoreReference {
  id?: number
  name: string
  alternative_names?: { name: string }[]
  websites?: { url: string }[]
  external_games?: { uid: string; url?: string; external_game_source?: { name: string } }[]
  version_parent?: number
  version_title?: string
  parent_game?: number
  ports?: GameStoreReference[]
  remasters?: GameStoreReference[]
  remakes?: GameStoreReference[]
  bundles?: GameStoreReference[]
  expanded_games?: GameStoreReference[]
}

export function normalizeGameTitle(title: string): string {
  return title.replace(/[™®©]/g, '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
}

export function matchesGameTitle(title: string, names: readonly string[]): boolean {
  const normalized = normalizeGameTitle(title)
  return normalized.length > 0 && names.some(name => normalizeGameTitle(name) === normalized)
}

export function steamAppId(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.hostname === 'store.steampowered.com'
      ? parsed.pathname.match(/^\/app\/([1-9]\d*)(?:\/|$)/)?.[1] ?? null
      : null
  } catch { return null }
}

export function selectSteamReference(game: GameStoreReference, storedNames: readonly string[]) {
  const names = [game.name, ...(game.alternative_names ?? []).map(item => item.name)].filter(Boolean)
  if (!storedNames.some(title => matchesGameTitle(title, names))) return null
  const websiteIds = [...new Set((game.websites ?? []).map(site => steamAppId(site.url)).filter((id): id is string => !!id))]
  const externalIds = [...new Set((game.external_games ?? [])
    .filter(item => item.external_game_source?.name === 'Steam' && item.url && steamAppId(item.url) === item.uid)
    .map(item => item.uid))]
  // 작품의 공식 판매처 주소를 우선한다. 모호한 복수 후보는 첫 번째로 임의 선택하지 않는다.
  const ids = websiteIds.length ? websiteIds : externalIds
  return ids.length === 1 ? { appId: ids[0], names } : null
}

export function parseWon(value: string): number | null {
  const match = value.trim().match(/^₩\s*([\d,]+)$/)
  if (!match) return null
  const amount = Number(match[1].replaceAll(',', ''))
  return Number.isSafeInteger(amount) && amount >= 0 ? amount : null
}
