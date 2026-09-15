/**
 * 세력도감 화면 구성 — 명단 캐시(getFeaturedTags)를 칩 줄의 섹션·테마와 테마 안 진영으로 푼다.
 * 순수 함수만 둔다. 조회는 부르는 쪽이 한다.
 */
import type { FeaturedCeleb, FeaturedTag } from '@/actions/home'
import type { Locale } from '@/types/locale'

export interface FactionSection {
  /** 묶음 태그 — 묶음 없이 최상위에 선 테마면 그 테마 자신 */
  tag: FeaturedTag
  themes: FeaturedTag[]
}

export interface FactionCluster {
  /** 그룹 표의 원래 이름 — 진영 설명을 맞추는 열쇠. 진영이 없는 인물 묶음이면 null */
  name: string | null
  /** 화면에 쓸 진영 이름(영문 화면은 영문 이름) — 진영이 없는 인물 묶음이면 null */
  label: string | null
  subtitle: string | null
  color: string | null
  celebIds: string[]
}

export function localizedTagName(tag: Pick<FeaturedTag, 'name' | 'name_en'>, locale: Locale) {
  return locale === 'en' ? tag.name_en?.trim() || tag.name : tag.name
}

export function localizedTagDescription(tag: Pick<FeaturedTag, 'description' | 'description_en'>, locale: Locale) {
  return (locale === 'en' ? tag.description_en : tag.description)?.trim() || null
}

/** 섹션을 주소(`?section=`)로 가리키는 값 — 묶음 slug, 없으면 id */
export function factionSectionKey(section: FactionSection) {
  return section.tag.slug ?? section.tag.id
}

/**
 * 섹션 칩 줄. 테마는 노출이 켜지고 인물과 주소(slug)가 있는 것만 싣는다.
 * 묶음은 자기 노출 칸과 무관하게 공개 테마를 품었으면 연다 — 섹션을 감추려면 그 안 테마의 노출을 끈다.
 * 이야기 속 인물 묶음(is_fiction)은 뒤로 보낸다. 신화 갈래는 명단 캐시가 이미 뺐다.
 */
export function buildFactionSections(tags: FeaturedTag[]): FactionSection[] {
  const isTheme = (tag: FeaturedTag) => tag.is_featured && !tag.isGroup && Boolean(tag.slug) && tag.celebs.length > 0
  const sections = tags
    .filter((tag) => !tag.parentSlug && (tag.isGroup || isTheme(tag)))
    .map((tag) => ({
      tag,
      themes: tag.isGroup ? tags.filter((child) => child.parentSlug === tag.slug && isTheme(child)) : [tag],
    }))
    .filter((section) => section.themes.length > 0)

  return [...sections.filter((s) => !s.tag.is_fiction), ...sections.filter((s) => s.tag.is_fiction)]
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
        subtitle: null,
        color: null,
        celebIds: [],
      },
      position: Number.MAX_SAFE_INTEGER,
      first: index,
    }
    entry.cluster.subtitle ??= (locale === 'en' ? celeb.group_subtitle_en : celeb.group_subtitle)?.trim() || null
    entry.cluster.color ??= celeb.group_color
    entry.position = Math.min(entry.position, celeb.group_position ?? Number.MAX_SAFE_INTEGER)
    entry.cluster.celebIds.push(celeb.id)
    byLabel.set(key, entry)
  })

  const clusters = [...byLabel.values()]
    .sort((a, b) => a.position - b.position || a.first - b.first)
    .map((entry) => entry.cluster)
  if (unlabeled.length > 0) clusters.push({ name: null, label: null, subtitle: null, color: null, celebIds: unlabeled })
  return clusters
}
