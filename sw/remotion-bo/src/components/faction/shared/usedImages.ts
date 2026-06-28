import type { FactionScript } from '@/lib/faction-types'

/**
 * FactionScript 데이터에서 영상에 연결된 이미지 경로를 모두 수집한다.
 * 수집 대상: group.titleArt·image·logo, cluster.image, person.image,
 *   시작 화면 이미지(heroes/heroesByPart 의 'logo:<경로>'), 종료 이미지(outroImage).
 * heroes 의 인물 slug 는 person.image 로 이미 잡히므로 'logo:' 항목만 별도로 더한다.
 * 외부 URL(http로 시작)은 풀(로컬 파일)과 무관하므로 제외한다.
 */
export function collectUsedImages(script: FactionScript | null): Set<string> {
  const used = new Set<string>()
  if (!script) return used

  const add = (img?: string) => {
    if (!img || img.startsWith('http')) return
    used.add(img)
  }

  const addPerson = (p: { image?: string; imageChanges?: { image: string }[] }) => {
    add(p.image)
    for (const ic of p.imageChanges ?? []) add(ic.image)
  }

  // 시작 화면 이미지 — heroes 항목 중 'logo:<경로>' 만 경로부를 더한다(인물 slug 는 제외).
  const addHeroImg = (h: string) => {
    if (h.startsWith('logo:')) add(h.slice(5))
  }
  for (const h of script.heroes ?? []) addHeroImg(h)
  for (const list of Object.values(script.heroesByPart ?? {})) {
    for (const h of list) addHeroImg(h)
  }
  // 시작·종료 이미지
  add(script.introImage)
  add(script.outroImage)

  for (const group of script.groups ?? []) {
    add(group.titleArt)
    add(group.image)
    add(group.logo)
    for (const cluster of group.clusters ?? []) {
      add(cluster.image)
      for (const person of cluster.people ?? []) addPerson(person)
    }
    for (const person of group.people ?? []) addPerson(person)
  }

  return used
}

/**
 * 스크립트 내 모든 로컬 이미지 경로를 map 으로 다시 매핑한 새 스크립트를 만든다.
 * 풀에서 파일을 다른 폴더로 옮기거나 폴더 이름을 바꾼 뒤, 인물·화보·로고 연결을 새 경로로 따라가게 한다.
 * 외부 URL(http)과 인물 slug 는 건드리지 않는다. heroes 의 'logo:<경로>' 형태만 경로부를 매핑한다.
 */
export function remapFactionImages(script: FactionScript, map: (path: string) => string): FactionScript {
  const m = (img?: string): string | undefined =>
    img && !img.startsWith('http') ? map(img) : img
  const mapPerson = <T extends { image?: string; imageChanges?: { chunk: number; image: string }[] }>(p: T): T => ({
    ...p,
    image: m(p.image),
    imageChanges: p.imageChanges?.map(ic =>
      ic.image && !ic.image.startsWith('http') ? { ...ic, image: map(ic.image) } : ic,
    ),
  })
  const mapHero = (h: string): string => {
    if (!h.startsWith('logo:')) return h // 일반 인물 slug — 경로 아님
    const p = h.slice(5)
    return p.startsWith('http') ? h : `logo:${map(p)}`
  }

  const groups = (script.groups ?? []).map(g => ({
    ...g,
    titleArt: m(g.titleArt),
    image: m(g.image),
    logo: m(g.logo),
    clusters: g.clusters?.map(c => ({ ...c, image: m(c.image), people: (c.people ?? []).map(mapPerson) })),
    people: (g.people ?? []).map(mapPerson),
  }))

  const next: FactionScript = { ...script, groups }
  if (script.introImage) next.introImage = m(script.introImage)
  if (script.outroImage) next.outroImage = m(script.outroImage)
  if (script.heroes) next.heroes = script.heroes.map(mapHero)
  if (script.heroesByPart) {
    next.heroesByPart = Object.fromEntries(
      Object.entries(script.heroesByPart).map(([k, v]) => [k, v.map(mapHero)]),
    )
  }
  return next
}
