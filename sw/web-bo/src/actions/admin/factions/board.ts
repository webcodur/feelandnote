'use server'

/**
 * 세력도감 목록·편집 데이터 — 도감 행(faction_lv1 분류 + faction_lv2 세력) 전량과
 * 세력별 인물·개인화보 통계.
 */

import { selectAllPages } from '@feelandnote/shared/lib/paginate'
import { createClient } from '@/lib/db/server'
import { requireAdmin } from '@/lib/admin-auth'
import {
  getFactionEntry, getFactionMembers, getFactionEntries, type FactionEntry, type FactionMember,
} from '@/actions/admin/factions/entries'

export interface FactionEntrySummary extends FactionEntry {
  /** 그룹샷 장수 */
  teamImageCount: number
  /** 개인샷을 가진 인물 수 */
  soloImageCount: number
}

/** 단일 원천 뷰에서 함께 계산하는 세력별 인물·개인샷 통계. */
interface EntryMemberStats {
  memberCount: number
  soloImageCount: number
}

/** 세력별 인물·개인샷 수 — 단일 읽기 창구를 한 번만 훑어 두 통계를 함께 만든다. */
async function getEntryMemberStats(): Promise<Map<string, EntryMemberStats>> {
  const db = await createClient()
  const rows = await selectAllPages<{
    lv2_id: string
    celeb_id: string
    image_url: string | null
  }>((from, to) =>
    db.from('faction_member_rows')
      .select('lv2_id,celeb_id,image_url')
      .order('lv2_id').order('celeb_id').range(from, to))

  const stats = new Map<string, EntryMemberStats>()
  for (const row of rows) {
    const current = stats.get(row.lv2_id) ?? { memberCount: 0, soloImageCount: 0 }
    current.memberCount += 1
    if (row.image_url) current.soloImageCount += 1
    stats.set(row.lv2_id, current)
  }
  return stats
}

/** 목록 화면용 — 도감 행 전량에 인물 수·사진 보유를 붙여 정렬 순서대로 준다 */
export async function listFactionEntries(): Promise<FactionEntrySummary[]> {
  const [{ entries }, memberStats] = await Promise.all([getFactionEntries(), getEntryMemberStats()])

  return entries.map(entry => {
    const stats = memberStats.get(entry.id)
    return {
      ...entry,
      celeb_count: stats?.memberCount ?? 0,
      teamImageCount: entry.team_images.length,
      soloImageCount: stats?.soloImageCount ?? 0,
    }
  })
}

/** 소속 분류로 고를 수 있는 L1 한 건 */
export interface Lv1Option {
  id: string
  name: string
  color: string
  /** 이미 거느리고 있는 세력 수 */
  childCount: number
  /** 신화 지역인가 — 아래에 만드는 세력의 is_myth·is_fiction이 된다 */
  is_myth: boolean
}

/**
 * 세력 편집 화면의 소속 분류 선택지 — 분류(L1) 전량을 돌려준다.
 * 세력은 반드시 분류 하나에 속한다(옛 「분류 없음」 자리는 없다).
 */
export async function getLv1Options(
  entryId: string,
): Promise<{ options: Lv1Option[]; ownChildCount: number }> {
  const { entries } = await getFactionEntries()

  const childCounts = new Map<string, number>()
  for (const e of entries) {
    if (e.lv1_id) childCounts.set(e.lv1_id, (childCounts.get(e.lv1_id) ?? 0) + 1)
  }

  const options = entries
    .filter(e => e.level === 1)
    .map(e => ({ id: e.id, name: e.name, color: e.color, childCount: childCounts.get(e.id) ?? 0, is_myth: e.is_myth }))

  return { options, ownChildCount: childCounts.get(entryId) ?? 0 }
}

/** 세력 편집에 필요한 데이터 한 벌 — 기존 조회를 조합만 하고 새 쿼리를 만들지 않는다. */
export interface FactionEditorData {
  entry: FactionEntry
  members: FactionMember[]
  lv1Options: Lv1Option[]
  /** L1이 거느린 세력 수 — L1 편집 화면이 비울 수 없는 분류임을 알리는 데 쓴다 */
  ownChildCount: number
}

export async function getFactionEditorData(id: string): Promise<FactionEditorData | null> {
  const [entry, members, parents] = await Promise.all([
    getFactionEntry(id), getFactionMembers(id), getLv1Options(id),
  ])
  if (!entry) return null
  return {
    entry,
    members,
    lv1Options: parents.options,
    ownChildCount: parents.ownChildCount,
  }
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** `/factions/<토막>` 을 도감 행으로 해석한다 — L2를 먼저 보고, 없으면 L1을 slug→id 순으로 찾는다. */
export async function resolveFactionEditorData(param: string): Promise<FactionEditorData | null> {
  await requireAdmin()
  const key = (param ?? '').trim()
  if (!key) return null

  const db = await createClient()
  let entryId: string | null = null
  const { data: lv2BySlug } = await db.from('faction_lv2').select('id').eq('slug', key).maybeSingle()
  if (lv2BySlug) {
    entryId = lv2BySlug.id
  } else {
    const { data: lv1BySlug } = await db.from('faction_lv1').select('id').eq('slug', key).maybeSingle()
    if (lv1BySlug) entryId = lv1BySlug.id
  }
  if (!entryId && UUID_RE.test(key)) {
    const { data: lv2ById } = await db.from('faction_lv2').select('id').eq('id', key).maybeSingle()
    if (lv2ById) entryId = lv2ById.id
    else {
      const { data: lv1ById } = await db.from('faction_lv1').select('id').eq('id', key).maybeSingle()
      if (lv1ById) entryId = lv1ById.id
    }
  }
  return entryId ? getFactionEditorData(entryId) : null
}
