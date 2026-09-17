/**
 * 세력도감 화면 구성 — 명단 캐시(getFeaturedFactions)를 칩 줄의 섹션·테마와 테마 안 진영으로 푼다.
 * 순수 함수만 둔다. 조회는 부르는 쪽이 한다.
 */
import type { FeaturedCeleb, FeaturedFaction } from '@/actions/home'
import type { Locale } from '@/types/locale'

export interface FactionSection {
  /** 묶음 태그 — 묶음 없이 최상위에 선 테마면 그 테마 자신 */
  faction: FeaturedFaction
  entries: FeaturedFaction[]
}

export interface FactionCluster {
  /** 그룹 표의 원래 이름 — 진영 설명을 맞추는 열쇠. 진영이 없는 인물 묶음이면 null */
  name: string | null
  /** 화면에 쓸 진영 이름(영문 화면은 영문 이름) — 진영이 없는 인물 묶음이면 null */
  label: string | null
  celebIds: string[]
}

export function localizedFactionName(faction: Pick<FeaturedFaction, 'name' | 'name_en'>, locale: Locale) {
  return locale === 'en' ? faction.name_en?.trim() || faction.name : faction.name
}

export function localizedFactionDescription(faction: Pick<FeaturedFaction, 'description' | 'description_en'>, locale: Locale) {
  return (locale === 'en' ? faction.description_en : faction.description)?.trim() || null
}

/** 섹션을 주소(`?section=`)로 가리키는 값 — 묶음 slug, 없으면 id */
export function factionSectionKey(section: FactionSection) {
  return section.faction.slug ?? section.faction.id
}

/**
 * 섹션 칩 줄. 테마는 노출이 켜지고 인물과 주소(slug)가 있는 것만 싣는다.
 * 묶음은 자기 노출 칸과 무관하게 공개 테마를 품었으면 연다 — 섹션을 감추려면 그 안 테마의 노출을 끈다.
 * 이야기 속 인물 묶음(is_fiction)은 뒤로 보낸다. 신화 갈래는 명단 캐시가 이미 뺐다.
 */
export function buildFactionSections(factions: FeaturedFaction[]): FactionSection[] {
  const isEntry = (faction: FeaturedFaction) => faction.is_featured && !faction.isGroup && Boolean(faction.slug) && faction.celebs.length > 0
  const sections = factions
    .filter((faction) => !faction.parentSlug && (faction.isGroup || isEntry(faction)))
    .map((faction) => ({
      faction,
      entries: faction.isGroup ? factions.filter((child) => child.parentSlug === faction.slug && isEntry(child)) : [faction],
    }))
    .filter((section) => section.entries.length > 0)

  return [...sections.filter((s) => !s.faction.is_fiction), ...sections.filter((s) => s.faction.is_fiction)]
}

/**
 * 테마 안 진영. 진영 순번 → 첫 등장 순으로 세우고, 진영 이름이 없는 인물은 맨 뒤에 모은다.
 * 진영 안에서는 명단 순서(배정 차례)를 그대로 지킨다.
 */
export function buildFactionClusters(celebs: FeaturedCeleb[], locale: Locale): FactionCluster[] {
  const byLabel = new Map<string, { cluster: FactionCluster; position: number; first: number }>()
  const unlabeled: string[] = []

  celebs.forEach((celeb, index) => {
    const key = celeb.group_label
    if (!key) {
      unlabeled.push(celeb.id)
      return
    }
    const entry = byLabel.get(key) ?? {
      cluster: {
        name: key,
        label: locale === 'en' ? celeb.group_label_en?.trim() || key : key,
        celebIds: [],
      },
      position: Number.MAX_SAFE_INTEGER,
      first: index,
    }
    entry.position = Math.min(entry.position, celeb.group_position ?? Number.MAX_SAFE_INTEGER)
    entry.cluster.celebIds.push(celeb.id)
    byLabel.set(key, entry)
  })

  const clusters = [...byLabel.values()]
    .sort((a, b) => a.position - b.position || a.first - b.first)
    .map((entry) => entry.cluster)
  if (unlabeled.length > 0) clusters.push({ name: null, label: null, celebIds: unlabeled })
  return clusters
}
