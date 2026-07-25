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
import { createClient } from '@/lib/supabase/server'
import { factionAdminClient, requireFactionAdmin } from '@/lib/faction-db'
import { getTags, type CelebTag } from '@/actions/admin/tags'

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

/** 테마별 개인샷 보유 인물 수 */
async function getSoloImageCounts(): Promise<Map<string, number>> {
  const supabase = await createClient()
  const rows = await selectAllPages<{ tag_id: string; celeb_id: string }>((from, to) =>
    supabase.from('celeb_tag_assignments')
      .select('tag_id,celeb_id')
      .not('spotlight_image_url', 'is', null)
      .order('tag_id').order('celeb_id').range(from, to))

  const counts = new Map<string, number>()
  for (const r of rows) counts.set(r.tag_id, (counts.get(r.tag_id) ?? 0) + 1)
  return counts
}

/** 목록 화면용 — 테마 전량에 인물 수·사진 보유·영상 연결을 붙여 정렬 순서대로 준다 */
export async function listFactionThemes(): Promise<FactionThemeSummary[]> {
  const [{ tags }, links, soloCounts] = await Promise.all([
    getTags(), getThemeEpisodeLinks(), getSoloImageCounts(),
  ])

  return tags.map(tag => ({
    ...tag,
    teamImageCount: tag.team_images.length,
    soloImageCount: soloCounts.get(tag.id) ?? 0,
    episodes: links[tag.id] ?? [],
  }))
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
