'use server'

/**
 * 신화 편집(/myths) — 서비스 「신화의 세계」(웹 /explore)에 나가는 신화만 다룬다.
 *
 * 세력 편집기와 따로 두되 데이터는 같은 표를 쓴다 — 신화는 `is_myth=true`인
 * faction_lv1(지역)·faction_lv2(카드)이고, 그룹은 faction_lv3, 인물은 faction_members
 * (뷰 `faction_member_rows`로 읽는다).
 * 여기는 읽기만 맡고, 쓰기는 `factions/entries.ts`의 세력·그룹 액션을 그대로 부른다.
 */

import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { createClient } from '@/lib/db/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  getFactionEntry, getFactionMembers, getFactionGroups,
  type FactionEntry, type FactionMember, type FactionGroup,
} from '@/actions/admin/factions/entries'

export interface MythSummary {
  id: string
  name: string
  /** 0이면 지역(L1), 1이면 그 아래 신화 카드(L2) */
  depth: number
  /** 신화 카드의 공개 여부. 지역(depth 0)에는 없는 축이라 null */
  published: boolean | null
  /** 화면에 보이는 인원 */
  visibleCount: number
  /** 숨김까지 센 인원 */
  totalCount: number
}

/** 왼쪽 신화 목록 — 지역 머리 아래에 그 지역의 신화를 차례대로 둔다 */
export async function listMythEntries(): Promise<MythSummary[]> {
  await requireAdmin()
  const db = await createClient()

  const [regions, myths] = await Promise.all([
    db.from('faction_lv1').select('id,name').eq('is_myth', true).order('sort_order').order('name'),
    db.from('faction_lv2').select('id,name,lv1_id,published').eq('is_myth', true).order('sort_order').order('name'),
  ])
  if (regions.error) throw new Error(`신화 지역 조회 실패: ${regions.error.message}`)
  if (myths.error) throw new Error(`신화 목록 조회 실패: ${myths.error.message}`)

  const mythRows = myths.data ?? []
  const ordered = (regions.data ?? []).flatMap(region => [
    { id: region.id, name: region.name, depth: 0, published: null as boolean | null },
    ...mythRows.filter(m => m.lv1_id === region.id)
      .map(m => ({ id: m.id, name: m.name, depth: 1, published: m.published === true as boolean | null })),
  ])
  if (ordered.length === 0) return []

  const mythIds = mythRows.map(m => m.id)
  const members = await selectAllPages<{ lv2_id: string; celeb_id: string; hidden: boolean | null }>(
    (from, to) => db.from('faction_member_rows')
      .select('lv2_id,celeb_id,hidden')
      .in('lv2_id', mythIds)
      .order('lv2_id').order('celeb_id').range(from, to))

  return ordered.map(row => {
    const rows = members.filter(m => m.lv2_id === row.id)
    return {
      ...row,
      visibleCount: rows.filter(m => !m.hidden).length,
      totalCount: rows.length,
    }
  })
}

export interface MythEditorData {
  entry: FactionEntry
  members: FactionMember[]
  groups: FactionGroup[]
}

/** 오른쪽 편집 화면 한 장 — 신화·인물·그룹 */
export async function getMythEditorData(entryId: string): Promise<MythEditorData | null> {
  await requireAdmin()
  const [entry, members, groups] = await Promise.all([
    getFactionEntry(entryId), getFactionMembers(entryId), getFactionGroups(entryId),
  ])
  if (!entry) return null
  return { entry, members, groups }
}
