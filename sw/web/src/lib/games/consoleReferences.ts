import type { IGDBStoreGame } from '@feelandnote/content-search/igdb'
import { matchesGameTitle, type SteamEditionKind } from './steamPurchase'

export type ConsoleStore = 'playstation' | 'xbox' | 'nintendo'
export interface ConsoleReference {
  store: ConsoleStore
  url?: string
  game: IGDBStoreGame
  edition?: SteamEditionKind
}

export const gameNames = (game: IGDBStoreGame): string[] => [...new Set([
  game.name, ...(game.alternative_names ?? []).map(entry => entry.name),
  ...(game.game_localizations ?? []).map(entry => entry.name),
].filter(Boolean))]

export function consoleUrl(value: string): { store: ConsoleStore; url: string } | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') return null
    if (url.hostname === 'store.playstation.com') {
      const id = url.pathname.match(/^\/[a-z]{2}-[a-z]{2}\/concept\/(\d+)\/?$/i)?.[1]
      return id ? { store: 'playstation', url: `https://store.playstation.com/ko-kr/concept/${id}` } : null
    }
    if (['www.xbox.com', 'www.microsoft.com', 'apps.microsoft.com'].includes(url.hostname)) {
      const id = url.pathname.match(/\/([a-z0-9]{12})\/?$/i)?.[1]
      return id ? { store: 'xbox', url: `https://www.xbox.com/ko-kr/games/store/-/${id.toUpperCase()}` } : null
    }
  } catch { /* 외부 주소가 잘못되면 연결 후보에서 제외한다. */ }
  return null
}

export function getConsoleReferences(root: IGDBStoreGame, storedNames: readonly string[]): ConsoleReference[] {
  if (!storedNames.some(name => matchesGameTitle(name, gameNames(root)))) return []
  const expanded = (root.expanded_games ?? []).filter(game => game.parent_game === root.id && matchesGameTitle(game.name, gameNames(root)))
  const related: { game: IGDBStoreGame; edition?: SteamEditionKind }[] = [
    { game: root },
    ...(root.bundles ?? []).filter(game => game.version_parent === root.id).map(game => ({ game, edition: 'edition' as const })),
    ...(root.ports ?? []).map(game => ({ game, edition: 'port' as const })),
    ...(root.remasters ?? []).map(game => ({ game, edition: 'remaster' as const })),
    ...(root.remakes ?? []).map(game => ({ game, edition: 'remake' as const })),
    ...expanded.map(game => ({ game, edition: 'edition' as const })),
    ...expanded.flatMap(parent => [
      ...(parent.ports ?? []).map(game => ({ game, edition: 'port' as const })),
      ...(parent.remasters ?? []).map(game => ({ game, edition: 'remaster' as const })),
      ...(parent.remakes ?? []).map(game => ({ game, edition: 'remake' as const })),
    ]),
  ]
  // 여러 작품의 합본도 포함 관계가 명시된 경우만 허용하고 반드시 합본으로 표시한다.
  const collections = related.flatMap(({ game }) => (game.bundles ?? []).map(bundle => ({
    game: bundle, edition: bundle.version_parent === root.id ? 'edition' as const : 'collection' as const,
  })))
  const seen = new Set<string>()
  return [...related, ...collections].flatMap(({ game, edition }) => {
    // 별도 VR 작품을 일반판의 대체 판매처로 소개하지 않는다.
    if (/\bVR\b/i.test(game.name) && !/\bVR\b/i.test(root.name)) return []
    const urls = [...(game.websites ?? []).map(site => site.url), ...(game.external_games ?? []).map(site => site.url ?? '')]
    const links: ConsoleReference[] = urls.flatMap(url => {
      const target = consoleUrl(url)
      return target ? [{ ...target, game, edition }] : []
    })
    if (game.platforms?.some(platform => /^Nintendo Switch(?: 2)?$/.test(platform.name))) links.push({ store: 'nintendo', game, edition })
    return links.filter(link => {
      const key = `${link.store}:${link.url ?? game.id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  })
}
