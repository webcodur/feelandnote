'use server'

/**
 * 세력도감 테마 목록·편집 데이터 — `celeb_tags` 전량과 테마별 인물·개인화보 통계.
 */

import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { createClient } from '@/lib/db/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  getTag, getTagCelebs, getTags, type CelebTag, type CelebTagAssignment,
} from '@/actions/admin/tags'

export interface FactionThemeSummary extends CelebTag {
  /** 그룹샷 장수 */
  teamImageCount: number
  /** 개인샷을 가진 인물 수 */
  soloImageCount: number
}

/** 단일 원천 뷰에서 함께 계산하는 테마별 인물·개인샷 통계. */
interface ThemeMemberStats {
  memberCount: number
  soloImageCount: number
}

/** 테마별 인물·개인샷 수 — 단일 읽기 창구를 한 번만 훑어 두 통계를 함께 만든다. */
async function getThemeMemberStats(): Promise<Map<string, ThemeMemberStats>> {
  const db = await createClient()
  const rows = await selectAllPages<{
    tag_id: string
    celeb_id: string
    faction_image_url: string | null
  }>((from, to) =>
    db.from('faction_atlas_members')
      .select('tag_id,celeb_id,faction_image_url')
      .order('tag_id').order('celeb_id').range(from, to))

  const stats = new Map<string, ThemeMemberStats>()
  for (const row of rows) {
    const current = stats.get(row.tag_id) ?? { memberCount: 0, soloImageCount: 0 }
    current.memberCount += 1
    if (row.faction_image_url) current.soloImageCount += 1
    stats.set(row.tag_id, current)
  }
  return stats
}

/** 목록 화면용 — 테마 전량에 인물 수·사진 보유를 붙여 정렬 순서대로 준다 */
export async function listFactionThemes(): Promise<FactionThemeSummary[]> {
  const [{ tags }, memberStats] = await Promise.all([getTags(), getThemeMemberStats()])

  return tags.map(tag => {
    const stats = memberStats.get(tag.id)
    return {
      ...tag,
      celeb_count: stats?.memberCount ?? 0,
      teamImageCount: tag.team_images.length,
      soloImageCount: stats?.soloImageCount ?? 0,
    }
  })
}

/** 상위 묶음으로 고를 수 있는 테마 한 건 */
export interface ThemeParentOption {
  id: string
  name: string
  color: string
  /** 이미 거느리고 있는 테마 수. 0 이면 고르는 순간 새 묶음이 된다 */
  childCount: number
}

/**
 * 테마 편집 화면의 상위 묶음 선택지.
 *
 * 후보는 어디에도 속하지 않은 테마 전부다 — 이미 묶음인 테마는 물론, 아직 아무것도
 * 거느리지 않은 테마도 고를 수 있다. 그래야 묶음 만들기용 화면을 따로 두지 않고도
 * "테마를 하나 만들고 다른 테마들이 그를 상위로 지목하면 그게 묶음이 된다"가 성립한다.
 *
 * 위계는 두 단계까지다. 그래서 이미 아래에 테마를 거느린 테마는 스스로 어딘가에
 * 속할 수 없고(`ownChildCount > 0`), 그 사실을 화면이 알 수 있게 함께 돌려준다.
 */
export async function getThemeParentOptions(
  tagId: string,
): Promise<{ options: ThemeParentOption[]; ownChildCount: number }> {
  const { tags } = await getTags()

  const childCounts = new Map<string, number>()
  for (const t of tags) {
    if (t.parent_id) childCounts.set(t.parent_id, (childCounts.get(t.parent_id) ?? 0) + 1)
  }

  const options = tags
    .filter(t => t.id !== tagId && !t.parent_id)
    .map(t => ({ id: t.id, name: t.name, color: t.color, childCount: childCounts.get(t.id) ?? 0 }))

  return { options, ownChildCount: childCounts.get(tagId) ?? 0 }
}

/** 테마 편집에 필요한 데이터 한 벌 — 기존 조회를 조합만 하고 새 쿼리를 만들지 않는다. */
export interface ThemeEditorData {
  tag: CelebTag
  celebs: CelebTagAssignment[]
  parentOptions: ThemeParentOption[]
  ownChildCount: number
}

export async function getThemeEditorData(tagId: string): Promise<ThemeEditorData | null> {
  const [tag, celebs, parents] = await Promise.all([
    getTag(tagId), getTagCelebs(tagId), getThemeParentOptions(tagId),
  ])
  if (!tag) return null
  return {
    tag,
    celebs,
    parentOptions: parents.options,
    ownChildCount: parents.ownChildCount,
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** `/factions/<토막>` 을 테마로 해석한다 — slug 를 먼저 보고, 아니면 id 로 찾는다. */
export async function resolveThemeEditorData(param: string): Promise<ThemeEditorData | null> {
  await requireAdmin()
  const key = (param ?? '').trim()
  if (!key) return null

  const db = await createClient()
  let tagId: string | null = null
  const { data: bySlug } = await db.from('celeb_tags').select('id').eq('slug', key).maybeSingle()
  if (bySlug) {
    tagId = bySlug.id
  } else if (UUID_RE.test(key)) {
    const { data: byId } = await db.from('celeb_tags').select('id').eq('id', key).maybeSingle()
    if (byId) tagId = byId.id
  }
  return tagId ? getThemeEditorData(tagId) : null
}
