import { factionSequenceOf, type FactionScript } from '@/lib/faction-types'
import { makePathRemapper } from '@feelandnote/shared/bo/editor'

/**
 * FactionScript 데이터에서 영상에 연결된 이미지 경로를 모두 수집한다.
 * 수집 대상: group.logoVid·logoImg·image, cluster.image, person.image,
 *   시작 화면 이미지(heroes/heroesByPart/heroesByLvPart 의 'logo:<경로>'), 종료 이미지, 챕터·개별 장면 미디어.
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
  for (const list of Object.values(script.heroesByLvPart ?? {})) {
    for (const h of list) addHeroImg(h)
  }
  // 시작·종료 이미지
  add(script.introImage)
  add(script.introImageLong)
  add(script.outroImage)
  add(script.outroImageLong)
  add(script.lvThumbnailImage)
  for (const item of script.longformLayout ?? []) {
    if ('chapter' in item) add(item.chapter.media)
  }

  for (const group of script.groups ?? []) {
    add(group.logoVid)
    add(group.logoImg)
    for (const item of factionSequenceOf(group)) {
      if (item.kind === 'scene') add(item.scene.media)
    }
    for (const cluster of group.clusters ?? []) {
      add(cluster.image)
      for (const person of cluster.people ?? []) addPerson(person)
    }
  }

  return used
}

/**
 * 파일을 옮겼거나(from=파일 경로) 폴더 이름을 바꾼 뒤(from=폴더 경로), 인물·화보·로고 연결을
 * 새 경로로 따라가게 한 스크립트를 만든다. 바뀐 곳이 없으면 받은 스크립트를 그대로 돌려준다.
 *
 * 갈아끼우기 규칙 자체는 담화와 같아 공용(makePathRemapper)을 쓰고, 순회만 여기서 맡는다.
 * 외부 URL(http)과 인물 slug 는 건드리지 않는다. heroes 의 'logo:<경로>' 형태만 경로부를 매핑한다.
 */
export function remapFactionImages(script: FactionScript, from: string, to: string): FactionScript {
  if (!from || from === to) return script
  const swap = makePathRemapper(from, to)
  let changed = 0
  const m = (img?: string): string | undefined => {
    const next = swap(img)
    if (next !== img) changed++
    return next
  }
  const mapPerson = <T extends { image?: string; imageChanges?: { chunk: number; image: string }[] }>(p: T): T => ({
    ...p,
    image: m(p.image),
    imageChanges: p.imageChanges?.map(ic => {
      const next = m(ic.image)
      return next === ic.image ? ic : { ...ic, image: next ?? ic.image }
    }),
  })
  const mapHero = (h: string): string => {
    if (!h.startsWith('logo:')) return h // 일반 인물 slug — 경로 아님
    const next = m(h.slice(5))
    return next === undefined ? h : `logo:${next}`
  }

  const groups = (script.groups ?? []).map(g => ({
    ...g,
    logoVid: m(g.logoVid),
    logoImg: m(g.logoImg),
    openingScenes: undefined,
    sequence: factionSequenceOf(g).map(item => item.kind === 'scene'
      ? { ...item, scene: { ...item.scene, media: m(item.scene.media) } }
      : item),
    clusters: (g.clusters ?? []).map(c => ({
      ...c,
      image: m(c.image),
      scenesAfter: undefined,
      people: (c.people ?? []).map(mapPerson),
    })),
  }))

  const next: FactionScript = { ...script, groups }
  if (script.introImage) next.introImage = m(script.introImage)
  if (script.introImageLong) next.introImageLong = m(script.introImageLong)
  if (script.outroImage) next.outroImage = m(script.outroImage)
  if (script.outroImageLong) next.outroImageLong = m(script.outroImageLong)
  if (script.lvThumbnailImage) next.lvThumbnailImage = m(script.lvThumbnailImage)
  if (script.longformLayout) {
    next.longformLayout = script.longformLayout.map(item => {
      if ('chapter' in item && item.chapter.media) {
        return { chapter: { ...item.chapter, media: m(item.chapter.media) } }
      }
      return item
    })
  }
  if (script.heroes) next.heroes = script.heroes.map(mapHero)
  if (script.heroesByPart) {
    next.heroesByPart = Object.fromEntries(
      Object.entries(script.heroesByPart).map(([k, v]) => [k, v.map(mapHero)]),
    )
  }
  if (script.heroesByLvPart) {
    next.heroesByLvPart = Object.fromEntries(
      Object.entries(script.heroesByLvPart).map(([k, v]) => [k, v.map(mapHero)]),
    )
  }
  return changed ? next : script
}
