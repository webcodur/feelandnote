'use server'

/**
 * 신화 편집(/myths) — 서비스 「신화의 세계」(웹 /explore)에 나가는 전승만 다룬다.
 *
 * 세력도감 테마 편집기와 따로 두되 데이터는 같은 표를 쓴다 — 전승 `celeb_tags`(myth-and-fiction 아래),
 * 그룹 `celeb_tag_groups`, 인물 `celeb_tag_assignments`(뷰 `faction_atlas_members`로 읽는다).
 * 여기는 읽기만 맡고, 쓰기는 `tags.ts`의 테마·그룹 액션을 그대로 부른다.
 */

import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { MYTH_ROOT_TAG_SLUG } from '@feelandnote/shared/lib/faction-atlas'
import { createClient } from '@/lib/db/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  getTag, getTagCelebs, getTagGroups, type CelebTag, type CelebTagAssignment, type TagGroup,
} from '@/actions/admin/tags'

export interface MythSummary {
  id: string
  name: string
  /** 0이면 최상위 전승, 1이면 그 아래 전승 */
  depth: number
  published: boolean
  /** 화면에 보이는 인원 */
  visibleCount: number
  /** 숨김까지 센 인원 */
  totalCount: number
}

interface TagRow { id: string; name: string; parent_id: string | null; atlas_published: boolean | null }

/** 왼쪽 전승 목록 — 차례대로, 아래 전승은 제 상위 바로 뒤에 둔다 */
export async function listMythThemes(): Promise<MythSummary[]> {
  await requireAdmin()
  const db = await createClient()
  const { data: parent, error: parentError } = await db
    .from('celeb_tags').select('id').eq('slug', MYTH_ROOT_TAG_SLUG).maybeSingle()
  if (parentError) throw new Error(`신화 묶음 조회 실패: ${parentError.message}`)
  if (!parent) return []

  const columns = 'id,name,parent_id,atlas_published'
  const { data: rootData, error: rootError } = await db
    .from('celeb_tags').select(columns).eq('parent_id', parent.id).order('sort_order').order('name')
  if (rootError) throw new Error(`신화 목록 조회 실패: ${rootError.message}`)
  const roots = (rootData ?? []) as TagRow[]
  const { data: childData, error: childError } = roots.length > 0
    ? await db.from('celeb_tags').select(columns).in('parent_id', roots.map(r => r.id)).order('sort_order').order('name')
    : { data: [], error: null }
  if (childError) throw new Error(`아래 전승 조회 실패: ${childError.message}`)
  const children = (childData ?? []) as TagRow[]
  const ordered = roots.flatMap(root => [
    { tag: root, depth: 0 },
    ...children.filter(child => child.parent_id === root.id).map(tag => ({ tag, depth: 1 })),
  ])
  if (ordered.length === 0) return []

  const members = await selectAllPages<{ tag_id: string; celeb_id: string; hidden: boolean | null }>(
    (from, to) => db.from('faction_atlas_members')
      .select('tag_id,celeb_id,hidden')
      .in('tag_id', ordered.map(({ tag }) => tag.id))
      .order('tag_id').order('celeb_id').range(from, to))

  return ordered.map(({ tag, depth }) => {
    const rows = members.filter(row => row.tag_id === tag.id)
    return {
      id: tag.id,
      name: tag.name,
      depth,
      published: tag.atlas_published === true,
      visibleCount: rows.filter(row => !row.hidden).length,
      totalCount: rows.length,
    }
  })
}

export interface MythEditorData {
  tag: CelebTag
  members: CelebTagAssignment[]
  groups: TagGroup[]
}

/** 오른쪽 편집 화면 한 장 — 전승·인물·그룹 */
export async function getMythEditorData(tagId: string): Promise<MythEditorData | null> {
  await requireAdmin()
  const [tag, members, groups] = await Promise.all([
    getTag(tagId), getTagCelebs(tagId), getTagGroups(tagId),
  ])
  if (!tag) return null
  return { tag, members, groups }
}
