import {
  matchesGameTitle, normalizeGameTitle, selectSteamReference,
  type GameStoreReference, type SteamEditionKind, type SteamEditionReference, type SteamStoreReference,
} from './steamPurchase'

const namesOf = (game: GameStoreReference) => [game.name, ...(game.alternative_names ?? []).map(item => item.name)].filter(Boolean)
const editionOf = (game: GameStoreReference, kind: SteamEditionKind): SteamEditionReference => ({ kind, title: game.name, names: namesOf(game) })

// 포함 관계가 있어도 여러 작품의 묶음은 자동 추천하지 않는다. 같은 작품의 완전판·재출시 모음만 고른다.
function isCollectedEdition(parent: GameStoreReference, child: GameStoreReference) {
  if (parent.id && child.version_parent === parent.id) return true
  const suffix = child.name.match(/(?:\s*[-:]\s*|\s+)(Legacy Collection|Complete Collection|Complete Edition|Game of the Year Edition|Definitive Edition)$/i)
  return !!suffix && matchesGameTitle(child.name.slice(0, suffix.index), namesOf(parent))
}

export function getSteamReferences(game: GameStoreReference, storedNames: readonly string[]): SteamStoreReference[] {
  if (!storedNames.some(title => matchesGameTitle(title, namesOf(game)))) return []
  const editions = (game.bundles ?? []).filter(child => isCollectedEdition(game, child))
  // 같은 이름의 확장판이며 원작을 부모로 명시한 경우만 한 단계를 더 따라간다.
  // DLC·후속작·이름만 비슷한 작품은 경유하지 않는다.
  const expanded = (game.expanded_games ?? []).filter(child =>
    !!game.id && child.parent_game === game.id && matchesGameTitle(child.name, namesOf(game)))
  const direct = selectSteamReference(game, storedNames)
  const results: SteamStoreReference[] = direct ? [{
    ...direct,
    // 원래 app 페이지가 완전판 제목을 반환해도 관계가 확인된 판본만 대조한다.
    editions: editions.filter(child => child.version_parent === game.id && !!game.id).map(child => editionOf(child, 'edition')),
  }] : []
  const groups: [SteamEditionKind, GameStoreReference[]][] = [
    ['port', game.ports ?? []], ['remaster', game.remasters ?? []],
    ['remake', game.remakes ?? []], ['collection', editions],
    ['edition', expanded],
    ['port', expanded.flatMap(child => child.ports ?? [])],
    ['remaster', expanded.flatMap(child => child.remasters ?? [])],
    ['remake', expanded.flatMap(child => child.remakes ?? [])],
  ]
  for (const [kind, games] of groups) {
    const candidates = games.flatMap(child => {
      const reference = selectSteamReference(child, [child.name])
      return reference ? [{ ...reference, edition: editionOf(child, child.version_parent === game.id && !!game.id ? 'edition' : kind) }] : []
    })
    const appIds = [...new Set(candidates.map(candidate => candidate.appId))]
    // 같은 관계에 판매 후보가 여럿이면 목록 순서만으로 고르지 않는다.
    if (appIds.length !== 1 || results.some(result => result.appId === appIds[0])) continue
    const candidate = candidates[0]
    const uniqueEditions = candidates.filter((entry, index) => candidates.findIndex(other =>
      normalizeGameTitle(other.edition.title) === normalizeGameTitle(entry.edition.title)) === index)
    results.push({ appId: candidate.appId, names: [], editions: uniqueEditions.map(entry => entry.edition) })
  }
  return results
}
