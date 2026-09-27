import type { SteamEditionKind } from '../games/steamPurchase'

export type AccessType = 'GAME' | 'MUSIC' | 'VIDEO'
export type AccessService = 'steam' | 'playstation' | 'xbox' | 'nintendo' | 'appleMusic' | 'appleTv'
export const ACCESS_CACHE_SECONDS = 3600
export const ACCESS_CLIENT_CACHE_MS = 60000
export const ACCESS_TIMEOUT_MS = 8000
export const ACCESS_STREAM_TIMEOUT_MS = 60000
export type AccessSource = AccessService | 'watchProviders'
export const ACCESS_SOURCES: Record<AccessType, readonly AccessSource[]> = {
  GAME: ['steam', 'playstation', 'xbox', 'nintendo'], MUSIC: ['appleMusic'], VIDEO: ['watchProviders'],
}
export type AccessPhase = 'identity' | 'reference' | 'store' | 'edition' | 'catalog' | 'providers'
export type AccessStreamEvent =
  | { kind: 'progress'; source: AccessSource; phase: AccessPhase; detail?: string }
  | { kind: 'result'; source: AccessSource; data: ContentAccess }
  | { kind: 'error'; source: AccessSource }
export interface AccessSourceState { status: 'loading' | 'ready' | 'error'; phase: AccessPhase; detail?: string; data?: ContentAccess }

export interface AccessLink {
  service: AccessService
  url: string
  title: string
  platforms: string[]
  edition?: SteamEditionKind
  price?: number | null
  discountPercent?: number | null
  free?: boolean
}
export type WatchKind = 'flatrate' | 'rent' | 'buy' | 'free' | 'ads'
export interface WatchProvider { id: number; name: string; kinds: WatchKind[] }
export interface ContentAccess {
  links: AccessLink[]
  providers?: WatchProvider[]
  watchUrl?: string
  region?: string
}

export function isAccessType(type: string): type is AccessType {
  return type === 'GAME' || type === 'MUSIC' || type === 'VIDEO'
}

export function steamAccessAppId(id: string): number | null {
  const match = id.match(/^steam-([1-9]\d*)$/)
  const value = match ? Number(match[1]) : 0
  return Number.isSafeInteger(value) && value > 0 ? value : null
}

// 차트의 검증된 링크도 같은 모달에 넣는다. 영화의 Apple ID를 TMDB ID로 간주하지 않는다.
export function accessSources(type: AccessType, initialAccess?: ContentAccess): readonly AccessSource[] {
  return initialAccess && type !== 'GAME'
    ? [...new Set(initialAccess.links.map(link => link.service))]
    : ACCESS_SOURCES[type]
}

export function withAccessFallback(data: ContentAccess, source: AccessSource, initialAccess?: ContentAccess): ContentAccess {
  const links = initialAccess?.links.filter(link => link.service === source) ?? []
  return data.links.length || !links.length ? data : { ...data, links }
}
