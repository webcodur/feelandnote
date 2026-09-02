'use server'

/**
 * 도감 테마 목록 — `celeb_tags` 전량 + 각 테마가 어느 영상 편에 쓰였는지.
 *
 * 테마는 영상보다 먼저 있었고, 영상 없이 글만으로 성립하는 테마가 대다수다(실측 40종 중 28종).
 * 그래서 목록의 기준은 영상 편이 아니라 테마 자체이며, 영상 연결은 있으면 덧붙이는 표시일 뿐이다.
 *
 * 연결의 근거는 `faction_groups.tag_id` 뿐이다 — 영상 안의 한 세력이 어느 테마를 가리키는지를
 * 그 컬럼이 쥐고 있어서, 테마 → 영상 방향은 역조회로만 알 수 있다.
 */

import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { createClient } from '@/lib/db/server'
import { factionAdminClient, requireFactionAdmin } from '@/lib/faction-db'
import {
  getTag, getTagCelebs, getTags, type CelebTag, type CelebTagAssignment,
} from '@/actions/admin/tags'

/** 테마를 쓰고 있는 영상 편 한 건 */
export interface ThemeEpisodeLink {
  folder: string
  title: string
}

export interface FactionThemeSummary extends CelebTag {
  /** 그룹샷 장수 */
  teamImageCount: number
  /** 개인샷을 가진 인물 수 */
  soloImageCount: number
  /** 이 테마를 세력으로 쓰는 영상 편 (없으면 글 전용 테마) */
  episodes: ThemeEpisodeLink[]
}

/**
 * 테마 → 영상 편 역조회 표.
 *
 * 세력 행이 1,000을 넘을 일은 아직 없지만 PostgREST 는 상한에서 조용히 자르므로
 * 나눠 받는다(정렬키는 고유키 id).
 */
export async function getThemeEpisodeLinks(): Promise<Record<string, ThemeEpisodeLink[]>> {
  await requireFactionAdmin()
  const db = factionAdminClient()

  const groups = await selectAllPages<{ id: string; tag_id: string | null; episode_id: string }>(
    (from, to) => db.from('faction_groups')
      .select('id,tag_id,episode_id').not('tag_id', 'is', null).order('id').range(from, to))

  if (groups.length === 0) return {}

  const episodes = await selectAllPages<{ id: string; folder: string; title: string | null }>(
    (from, to) => db.from('faction_episodes').select('id,folder,title').order('id').range(from, to))

  const episodeById = new Map(episodes.map(e => [e.id, e]))
  const links: Record<string, ThemeEpisodeLink[]> = {}

  for (const g of groups) {
    const tagId = g.tag_id
    if (!tagId) continue
    const ep = episodeById.get(g.episode_id)
    if (!ep) continue
    const list = (links[tagId] ??= [])
    // 한 편이 같은 테마를 여러 세력으로 쓰는 경우가 있어 편 단위로 한 번만 담는다
    if (!list.some(l => l.folder === ep.folder)) {
      list.push({ folder: ep.folder, title: (ep.title ?? ep.folder).split('\n')[0] })
    }
  }

  for (const list of Object.values(links)) list.sort((a, b) => a.folder.localeCompare(b.folder))
  return links
}

/** 단일 원천 뷰에서 함께 계산하는 테마별 인물·개인샷 통계. */
interface ThemeMemberStats {
  memberCount: number
  soloImageCount: number
}

/**
 * 테마별 인물·개인샷 수 — 단일 읽기 창구를 한 번만 훑어 두 통계를 함께 만든다.
 * 옛 `get_tag_celeb_counts` RPC는 수동 배정만 세어 제작 인물을 누락하므로 쓰지 않는다.
 */
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

/** 목록 화면용 — 테마 전량에 인물 수·사진 보유·영상 연결을 붙여 정렬 순서대로 준다 */
export async function listFactionThemes(): Promise<FactionThemeSummary[]> {
  const [{ tags }, links, memberStats] = await Promise.all([
    getTags(), getThemeEpisodeLinks(), getThemeMemberStats(),
  ])

  return tags.map(tag => {
    const stats = memberStats.get(tag.id)
    return {
      ...tag,
      celeb_count: stats?.memberCount ?? 0,
      teamImageCount: tag.team_images.length,
      soloImageCount: stats?.soloImageCount ?? 0,
      episodes: links[tag.id] ?? [],
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

/**
 * 테마 편집에 필요한 데이터 한 벌 — 편 편집기의 도감 구획(상세 설정)과 웹 전용 테마 화면이
 * 같은 묶음을 쓴다. 기존 조회를 조합만 하고 새 쿼리를 만들지 않는다.
 */
export interface ThemeEditorData {
  tag: CelebTag
  celebs: CelebTagAssignment[]
  /** 이 테마를 세력으로 쓰는 영상 편 — 비어 있으면 웹 전용 테마 */
  episodes: ThemeEpisodeLink[]
  parentOptions: ThemeParentOption[]
  ownChildCount: number
}

export async function getThemeEditorData(tagId: string): Promise<ThemeEditorData | null> {
  const [tag, celebs, links, parents] = await Promise.all([
    getTag(tagId), getTagCelebs(tagId), getThemeEpisodeLinks(), getThemeParentOptions(tagId),
  ])
  if (!tag) return null
  return {
    tag,
    celebs,
    episodes: links[tagId] ?? [],
    parentOptions: parents.options,
    ownChildCount: parents.ownChildCount,
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** `/factions/<토막>` 이 가리키는 편집 대상 — 편 폴더거나 테마(slug 또는 id)다 */
export type FactionEditTarget =
  | { kind: 'episode'; folder: string }
  | { kind: 'theme'; data: ThemeEditorData }

/**
 * 주소 한 토막을 편집 대상으로 해석한다. 편 폴더 → 테마 slug → 테마 id 순서로 찾는다.
 *
 * 제작 편에 연결된 테마는 편 편집기가 편집의 집이므로(26.08.03 단일화) 그 편으로 보내고,
 * 영상 없는 웹 전용 테마만 테마 화면 대상으로 돌려준다.
 */
export async function resolveFactionEditTarget(param: string): Promise<FactionEditTarget | null> {
  await requireFactionAdmin()
  const key = (param ?? '').trim()
  if (!key) return null

  const db = factionAdminClient()
  const { data: ep } = await db.from('faction_episodes').select('folder').eq('folder', key).maybeSingle()
  if (ep) return { kind: 'episode', folder: ep.folder as string }

  const sessionDb = await createClient()
  let tagId: string | null = null
  const { data: bySlug } = await sessionDb.from('celeb_tags').select('id').eq('slug', key).maybeSingle()
  if (bySlug) {
    tagId = bySlug.id
  } else if (UUID_RE.test(key)) {
    const { data: byId } = await sessionDb.from('celeb_tags').select('id').eq('id', key).maybeSingle()
    if (byId) tagId = byId.id
  }
  if (!tagId) return null

  const data = await getThemeEditorData(tagId)
  if (!data) return null
  if (data.episodes.length > 0) return { kind: 'episode', folder: data.episodes[0].folder }
  return { kind: 'theme', data }
}
