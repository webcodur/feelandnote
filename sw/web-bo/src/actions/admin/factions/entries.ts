'use server'

/**
 * 도감 편집 액션 — L1 분류(faction_lv1)·L2 세력(faction_lv2)·L3 그룹(faction_lv3)·인물 배정(faction_members).
 * /factions 의 세력도감 편집과 /myths 의 신화 편집이 함께 쓴다.
 */

import { createClient } from '@/lib/db/server'
import { revalidatePath } from 'next/cache'
import { revalidateWebCeleb, revalidateWebItems, revalidateWebLists } from '@/lib/revalidate-web'
import { CACHE_TAGS, type CacheItemTarget } from '@feelandnote/shared/constants/cache-tags'
import {
  toTeamImages, serializeTeamImages, type FactionTeamImage,
} from '@feelandnote/shared/lib/faction-team-image'

// #region Types
/**
 * 도감 행 하나 — L1 분류 또는 L2 세력 카드.
 * `level`이 층을 가린다. L2만 lv1_id(소속 분류)·published·team_images·lead_person_ids·기간을 쓴다.
 */
export interface FactionEntry {
  id: string
  name: string
  name_en: string | null
  description: string | null
  description_en: string | null
  color: string
  slug: string | null
  /** 1=분류(테마), 2=세력 카드 */
  level: 1 | 2
  /** L2의 소속 분류(faction_lv1.id). L1은 null */
  lv1_id: string | null
  /** 단체 사진 — 주소마다 「어느 묶음을 찍었고 누가 나오는지」를 함께 쥔다. L2만 */
  team_images: FactionTeamImage[]
  /** 타이틀 아트에 세우는 대표 인물 celebs.id 목록 — 배열 차례가 세우는 차례다. L2만 */
  lead_person_ids: string[]
  sort_order: number
  /** 세력도감·게임 노출 스위치 */
  is_featured: boolean
  /** 신화의 세계 가지 소속 — L1 지역과 L2 신화 카드가 true */
  is_myth: boolean
  /** 이야기 속 인물 세력인가 — 화면 소속과 다른 축이다 */
  is_fiction: boolean
  /** 신화의 세계에서 이 신화를 공개하는가. 세력도감 노출(is_featured)과 다른 축이다. L2만 */
  published: boolean
  start_date: string | null
  end_date: string | null
  created_at: string
  updated_at: string
  celeb_count?: number
}

export interface FactionMember {
  celeb_id: string
  lv2_id: string
  short_desc: string | null
  long_desc: string | null
  short_desc_en: string | null
  long_desc_en: string | null
  /** 세력별 인물 대표 화보 — 없으면 celebs.portrait_url을 쓴다 */
  image_url: string | null
  sort_order: number
  /** 도감에서 이 세력의 이 인물을 감출지. 셀럽 전역 상태와 무관한 웹 전용 스위치다 */
  hidden: boolean
  /** 배정 행(faction_members)의 id */
  member_id: string | null
  /** 그룹(faction_lv3) id */
  lv3_id?: string | null
  /** 도감에 보이는 그룹 이름(뷰의 group_name) */
  group_name?: string | null
  celeb?: {
    id: string
    nickname: string
    avatar_url: string | null
    title: string | null
  }
}

/**
 * 뷰 `faction_member_rows` 한 행 — 배정 + 그룹 이름의 단일 읽기 창구.
 * 뷰는 자동생성 타입에 없어 로컬로 정의한다.
 */
interface MemberRow {
  lv2_id: string
  lv3_id: string | null
  celeb_id: string
  short_desc: string | null
  short_desc_en: string | null
  long_desc: string | null
  long_desc_en: string | null
  image_url: string | null
  sort_order: number | null
  hidden: boolean | null
  member_id: string | null
  group_name?: string | null
}

interface CreateEntryInput {
  name: string
  name_en?: string | null
  description?: string
  description_en?: string | null
  color?: string
  slug?: string | null
  /** 1=분류(테마), 2=세력 카드. 기본 2 */
  level?: 1 | 2
  /** level 2는 소속 분류가 반드시 있어야 한다 */
  lv1_id?: string | null
  is_featured?: boolean
  start_date?: string | null
  end_date?: string | null
}

interface UpdateEntryInput {
  id: string
  name?: string
  name_en?: string | null
  description?: string
  description_en?: string | null
  color?: string
  slug?: string | null
  sort_order?: number
  is_featured?: boolean
  published?: boolean
  /** L2의 소속 분류를 바꾼다. L1에는 줄 수 없다(분류는 상위에 속하지 않는다) */
  lv1_id?: string | null
  start_date?: string | null
  end_date?: string | null
}

type Db = Awaited<ReturnType<typeof createClient>>

// DB 행 → FactionEntry 정규화 (team_images Json → 사진 목록. 옛 문자열 배열도 읽힌다)
function normalizeEntry(row: Record<string, unknown>, level: 1 | 2): FactionEntry {
  return {
    id: row.id as string,
    name: row.name as string,
    name_en: (row.name_en as string | null) ?? null,
    description: (row.description as string | null) ?? null,
    description_en: (row.description_en as string | null) ?? null,
    color: (row.color as string | null) ?? '#7c4dff',
    slug: (row.slug as string | null) ?? null,
    level,
    lv1_id: level === 2 ? ((row.lv1_id as string | null) ?? null) : null,
    team_images: level === 2 ? toTeamImages(row.team_images) : [],
    lead_person_ids: level === 2 ? ((row.lead_person_ids as string[] | null) ?? []) : [],
    sort_order: (row.sort_order as number | null) ?? 0,
    is_featured: row.is_featured === true,
    is_myth: row.is_myth === true,
    is_fiction: row.is_fiction === true,
    published: level === 2 && row.published === true,
    start_date: (row.start_date as string | null) ?? null,
    end_date: (row.end_date as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  }
}

export interface FactionEntriesResponse {
  entries: FactionEntry[]
  total: number
}
// #endregion

/** 세력도감 통합 목록과 세력·신화 편집 화면을 함께 갱신한다. */
function revalidateFactionScreens() {
  revalidatePath('/factions')
  revalidatePath('/factions/[entry]', 'page')
  revalidatePath('/myths')
}

// #region getFactionEntries
export async function getFactionEntries(): Promise<FactionEntriesResponse> {
  const db = await createClient()

  const [lv1, lv2] = await Promise.all([
    db.from('faction_lv1').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true }),
    db.from('faction_lv2').select('*').order('sort_order', { ascending: true }).order('name', { ascending: true }),
  ])

  if (lv1.error || lv2.error) {
    console.error('도감 목록 조회 에러:', lv1.error ?? lv2.error)
    return { entries: [], total: 0 }
  }

  const entries: FactionEntry[] = [
    ...(lv1.data ?? []).map(row => normalizeEntry(row, 1)),
    ...(lv2.data ?? []).map(row => normalizeEntry(row, 2)),
  ]

  return { entries, total: entries.length }
}
// #endregion

// #region getFactionEntry
export async function getFactionEntry(id: string): Promise<FactionEntry | null> {
  const db = await createClient()

  const { data: lv2, error: lv2Error } = await db
    .from('faction_lv2')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (lv2Error) throw new Error(`Failed to load faction entry: ${lv2Error.message}`)
  if (lv2) return normalizeEntry(lv2, 2)

  const { data: lv1, error: lv1Error } = await db
    .from('faction_lv1')
    .select('*')
    .eq('id', id)
    .maybeSingle()
  if (lv1Error) throw new Error(`Failed to load faction entry: ${lv1Error.message}`)
  if (!lv1) return null
  return normalizeEntry(lv1, 1)
}
// #endregion

// #region createFactionEntry
export async function createFactionEntry(input: CreateEntryInput): Promise<{ id: string } | { error: string }> {
  const db = await createClient()
  const level = input.level ?? 2

  const { data: maxData } = await db
    .from(level === 1 ? 'faction_lv1' : 'faction_lv2')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextSortOrder = (maxData?.sort_order ?? -1) + 1
  const base = {
    name: input.name.trim(),
    name_en: input.name_en?.trim() || null,
    description: input.description?.trim() || null,
    description_en: input.description_en?.trim() || null,
    color: input.color || '#7c4dff',
    slug: input.slug?.trim() || null,
    sort_order: nextSortOrder,
    is_featured: input.is_featured ?? false,
  }

  if (level === 1) {
    const { data, error } = await db.from('faction_lv1').insert(base).select('id').single()
    if (error) {
      if (error.code === '23505') {
        return { error: error.message.includes('slug') ? '이미 사용 중인 주소(slug)다.' : '이미 존재하는 분류 이름이다.' }
      }
      console.error('분류 생성 에러:', error)
      return { error: error.message }
    }
    revalidateFactionScreens()
    await revalidateWebLists([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
    return { id: data.id }
  }

  if (!input.lv1_id) return { error: '세력 카드는 소속 분류(L1)를 골라야 한다.' }
  const { data: parent, error: parentError } = await db
    .from('faction_lv1').select('id, is_myth').eq('id', input.lv1_id).maybeSingle()
  if (parentError) return { error: `분류 확인 실패: ${parentError.message}` }
  if (!parent) return { error: '고른 분류를 찾을 수 없다.' }

  const { data, error } = await db
    .from('faction_lv2')
    .insert({
      ...base,
      lv1_id: input.lv1_id,
      // 신화 분류 아래의 카드는 신화이자 이야기 속 세력이다
      is_myth: parent.is_myth === true,
      is_fiction: parent.is_myth === true,
      start_date: input.start_date || null,
      end_date: input.end_date || null,
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { error: error.message.includes('slug') ? '이미 사용 중인 주소(slug)다.' : '이미 존재하는 세력 이름이다.' }
    }
    console.error('세력 생성 에러:', error)
    return { error: error.message }
  }

  revalidateFactionScreens()
  // 새 세력 — 도감 편성과 세력명을 품은 셀럽 목록 캐시 모두 갱신
  await revalidateWebLists([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
  return { id: data.id }
}
// #endregion

// #region 층 판정·소속 분류 검증
/** id가 어느 층의 행인지 본다 — lv1과 lv2는 id가 겹치지 않는다(옛 id를 그대로 이어받았다). */
async function entryLevel(db: Db, id: string): Promise<1 | 2 | null> {
  const { data: lv2 } = await db.from('faction_lv2').select('id').eq('id', id).maybeSingle()
  if (lv2) return 2
  const { data: lv1 } = await db.from('faction_lv1').select('id').eq('id', id).maybeSingle()
  return lv1 ? 1 : null
}

/** L2의 소속 분류 지정이 성립하는지 본다. 어긋나면 사람이 읽을 이유를 돌려준다. */
async function checkLv1Assignment(
  db: Db,
  lv2Id: string,
  lv1Id: string,
): Promise<string | null> {
  if (lv1Id === lv2Id) return '세력을 자기 자신의 분류로 지정할 수 없습니다.'
  const { data, error } = await db.from('faction_lv1').select('id').eq('id', lv1Id).maybeSingle()
  if (error) return `분류 확인 실패: ${error.message}`
  if (!data) return '소속 분류로 지정한 행을 찾을 수 없습니다.'
  return null
}
// #endregion

async function getFactionCelebTargets(
  db: Db,
  lv2Id: string,
): Promise<CacheItemTarget[]> {
  const { data: members, error: membersError } = await db
    .from('faction_member_rows')
    .select('celeb_id')
    .eq('lv2_id', lv2Id)
  if (membersError) throw new Error(`도감 세력 인물 조회 실패: ${membersError.message}`)

  const celebIds = [...new Set((members ?? []).map((row) => row.celeb_id))]
  if (celebIds.length === 0) return []

  const { data: celebs, error: celebsError } = await db
    .from('celebs')
    .select('id, slug')
    .in('id', celebIds)
  if (celebsError) throw new Error(`도감 세력 인물 slug 조회 실패: ${celebsError.message}`)

  const targets: CacheItemTarget[] = []
  for (const celeb of celebs ?? []) {
    targets.push({ domain: CACHE_TAGS.CELEBS, id: celeb.id })
    if (celeb.slug) targets.push({ domain: CACHE_TAGS.CELEBS, id: celeb.slug })
  }
  return targets
}

async function revalidateFactionCelebs(
  targets: readonly CacheItemTarget[],
): Promise<void> {
  const listDomains = [CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS]
  if (targets.length === 0) {
    await revalidateWebLists(listDomains)
    return
  }
  await revalidateWebItems(targets, listDomains)
}

// #region updateFactionEntry
export async function updateFactionEntry(input: UpdateEntryInput): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()

  const level = await entryLevel(db, input.id)
  if (!level) return { success: false, error: '고칠 도감 행을 찾을 수 없다.' }
  if (level === 1 && input.lv1_id) {
    return { success: false, error: '분류는 상위에 속할 수 없습니다.' }
  }
  if (level === 2 && input.lv1_id) {
    const reason = await checkLv1Assignment(db, input.id, input.lv1_id)
    if (reason) return { success: false, error: reason }
  }

  const updateData: Record<string, unknown> = {
    updated_at: new Date().toISOString()
  }

  if (input.name !== undefined) updateData.name = input.name.trim()
  if (input.name_en !== undefined) updateData.name_en = input.name_en?.trim() || null
  if (input.description !== undefined) updateData.description = input.description?.trim() || null
  if (input.description_en !== undefined) updateData.description_en = input.description_en?.trim() || null
  if (input.color !== undefined) updateData.color = input.color
  if (input.slug !== undefined) updateData.slug = input.slug?.trim() || null
  if (input.sort_order !== undefined) updateData.sort_order = input.sort_order
  if (input.is_featured !== undefined) updateData.is_featured = input.is_featured
  if (level === 2) {
    if (input.published !== undefined) updateData.published = input.published
    if (input.lv1_id !== undefined && input.lv1_id) updateData.lv1_id = input.lv1_id
    if (input.start_date !== undefined) updateData.start_date = input.start_date || null
    if (input.end_date !== undefined) updateData.end_date = input.end_date || null
  }

  const { error } = await db
    .from(level === 1 ? 'faction_lv1' : 'faction_lv2')
    .update(updateData)
    .eq('id', input.id)

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: error.message.includes('slug') ? '이미 사용 중인 주소(slug)다.' : '이미 존재하는 이름이다.' }
    }
    console.error('도감 행 수정 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateFactionScreens()
  // 이름·색·slug가 셀럽 목록 캐시에 박혀 있어 함께 갱신. L1은 배정을 갖지 않아 목록만 갱신된다
  await revalidateFactionCelebs(await getFactionCelebTargets(db, input.id))
  return { success: true }
}
// #endregion

// #region deleteFactionEntry
export async function deleteFactionEntry(id: string): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()
  const level = await entryLevel(db, id)
  if (!level) return { success: false, error: '지울 도감 행을 찾을 수 없다.' }
  // 분류 삭제는 FK cascade로 아래 세력·배정을 통째로 지운다 — 비어 있을 때만 허용한다
  if (level === 1) {
    const { count } = await db
      .from('faction_lv2')
      .select('id', { count: 'exact', head: true })
      .eq('lv1_id', id)
    if ((count ?? 0) > 0) {
      return { success: false, error: `아래에 세력 ${count}개가 남아 있는 분류는 지울 수 없습니다.` }
    }
  }
  const cacheTargets = level === 2 ? await getFactionCelebTargets(db, id) : []

  const { error } = await db
    .from(level === 1 ? 'faction_lv1' : 'faction_lv2')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('도감 행 삭제 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateFactionScreens()
  // L2 삭제 — 배정(faction_members)까지 연쇄 제거되므로 셀럽 캐시도 갱신
  await revalidateFactionCelebs(cacheTargets)
  return { success: true }
}
// #endregion

// #region 한 명의 배정만 바꾼 뒤 그 인물 상세와 도감·인물 목록만 갱신한다
async function revalidateFactionCeleb(
  db: Db,
  celebId: string,
): Promise<void> {
  const { data, error } = await db
    .from('celebs')
    .select('slug')
    .eq('id', celebId)
    .single()
  if (error) throw new Error(`도감 인물 slug 조회 실패: ${error.message}`)
  await revalidateWebCeleb(celebId, data.slug, [CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
}
// #endregion

// #region getFactionMembers - 세력에 소속된 인물 목록 (설명 포함, 순서대로)
/**
 * 단일 원천 뷰(faction_member_rows)에서 읽는다.
 * 뷰에는 celebs 조인이 없으므로 셀럽 정보는 celeb_id 로 2단계 조회한다.
 */
export async function getFactionMembers(lv2Id: string): Promise<FactionMember[]> {
  const db = await createClient()

  const { data, error } = await db
    .from('faction_member_rows')
    .select('lv2_id, lv3_id, celeb_id, short_desc, short_desc_en, long_desc, long_desc_en, image_url, sort_order, hidden, member_id, group_name')
    .eq('lv2_id', lv2Id)
    .order('sort_order', { ascending: true })
    .overrideTypes<MemberRow[], { merge: false }>()

  if (error) {
    console.error('세력 인물 조회 에러:', error)
    return []
  }

  const rows = data ?? []
  const celebIds = [...new Set(rows.map(r => r.celeb_id))]
  const profileMap = new Map<string, NonNullable<FactionMember['celeb']>>()

  if (celebIds.length > 0) {
    const { data: celebs, error: celebsError } = await db
      .from('celebs')
      .select('id, nickname, avatar_url, title')
      .in('id', celebIds)

    if (celebsError) {
      console.error('세력 인물 조회 에러:', celebsError)
    }
    for (const p of celebs ?? []) {
      profileMap.set(p.id, {
        id: p.id,
        nickname: p.nickname ?? '',
        avatar_url: p.avatar_url ?? null,
        title: p.title ?? null,
      })
    }
  }

  return rows.map(item => ({
    celeb_id: item.celeb_id,
    lv2_id: item.lv2_id,
    short_desc: item.short_desc,
    long_desc: item.long_desc,
    short_desc_en: item.short_desc_en ?? null,
    long_desc_en: item.long_desc_en ?? null,
    image_url: item.image_url ?? null,
    hidden: item.hidden === true,
    sort_order: item.sort_order ?? 0,
    member_id: item.member_id ?? null,
    lv3_id: item.lv3_id ?? null,
    group_name: item.group_name ?? null,
    celeb: profileMap.get(item.celeb_id),
  }))
}
// #endregion

// #region updateFactionMemberDesc - 인물 소개 수정
export async function updateFactionMemberDesc(
  celebId: string,
  lv2Id: string,
  short_desc: string | null,
  long_desc: string | null,
  short_desc_en?: string | null,
  long_desc_en?: string | null
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()

  const updatePayload: Record<string, string | null> = { short_desc, long_desc }
  if (short_desc_en !== undefined) updatePayload.short_desc_en = short_desc_en
  if (long_desc_en !== undefined) updatePayload.long_desc_en = long_desc_en

  const { data, error } = await db
    .from('faction_members')
    .update(updatePayload)
    .eq('lv2_id', lv2Id)
    .eq('celeb_id', celebId)
    .select('id')

  if (error) {
    console.error('인물 소개 수정 에러:', error)
    return { success: false, error: error.message }
  }
  if (!data?.length) {
    return { success: false, error: '해당 배정을 찾을 수 없다.' }
  }

  revalidateFactionScreens()
  // 소개문 — 세력도감 소개글이 셀럽 캐시에도 실린다
  await revalidateFactionCeleb(db, celebId)
  return { success: true }
}
// #endregion

// #region searchCelebsForFaction - 세력에 추가할 인물 검색
export interface FactionCelebPick {
  id: string
  nickname: string
  avatar_url: string | null
  title: string | null
  profession: string | null
}

export async function searchCelebsForFaction(
  search: string,
  excludeLv2Id?: string
): Promise<FactionCelebPick[]> {
  const db = await createClient()

  let query = db
    .from('celebs')
    .select('id, nickname, avatar_url, title, profession')
    .eq('publication_status', 'active')
    .order('nickname', { ascending: true })
    .limit(20)

  if (search.trim()) {
    query = query.ilike('nickname', `%${search.trim()}%`)
  }

  const { data, error } = await query

  if (error) {
    console.error('셀럽 검색 에러:', error)
    return []
  }

  // 이미 해당 세력에 속한 셀럽 제외
  if (excludeLv2Id && data && data.length > 0) {
    const { data: assigned } = await db
      .from('faction_members')
      .select('celeb_id')
      .eq('lv2_id', excludeLv2Id)

    const assignedIds = new Set(assigned?.map(a => a.celeb_id) ?? [])
    return (data ?? [])
      .filter(c => !assignedIds.has(c.id))
      .map(c => ({
        id: c.id,
        nickname: c.nickname ?? '',
        avatar_url: c.avatar_url,
        title: c.title,
        profession: c.profession,
      }))
  }

  return (data ?? []).map(c => ({
    id: c.id,
    nickname: c.nickname ?? '',
    avatar_url: c.avatar_url,
    title: c.title,
    profession: c.profession,
  }))
}
// #endregion

// #region addCelebToFaction - 세력에 인물 추가 (가장 뒤 순서로)
export async function addCelebToFaction(
  celebId: string,
  lv2Id: string,
  short_desc?: string | null,
  long_desc?: string | null
): Promise<{ success: boolean; error?: string; sort_order?: number }> {
  const db = await createClient()

  // 현재 세력의 최대 sort_order 조회
  const { data: maxData } = await db
    .from('faction_members')
    .select('sort_order')
    .eq('lv2_id', lv2Id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextSortOrder = (maxData?.sort_order ?? -1) + 1

  const { error } = await db
    .from('faction_members')
    .insert({
      celeb_id: celebId,
      lv2_id: lv2Id,
      short_desc: short_desc || null,
      long_desc: long_desc || null,
      sort_order: nextSortOrder,
    })

  if (error) {
    if (error.code === '23505') {
      return { success: false, error: '이미 해당 세력에 등록된 셀럽이다.' }
    }
    console.error('세력에 인물 추가 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateFactionScreens()
  // faction_members 신규 — 셀럽 목록 카드에도 배정 세력이 실린다
  await revalidateFactionCeleb(db, celebId)
  return { success: true, sort_order: nextSortOrder }
}
// #endregion

// #region removeCelebFromFaction - 세력에서 인물 제거
export async function removeCelebFromFaction(
  celebId: string,
  lv2Id: string
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()

  const { data, error } = await db
    .from('faction_members')
    .delete()
    .eq('lv2_id', lv2Id)
    .eq('celeb_id', celebId)
    .select('id')

  if (error) {
    console.error('세력에서 인물 제거 에러:', error)
    return { success: false, error: error.message }
  }
  if (!data?.length) {
    return { success: false, error: '해당 배정을 찾을 수 없다.' }
  }

  revalidateFactionScreens()
  // faction_members 삭제 — 셀럽 목록 카드에서도 배정 세력이 빠져야 한다
  await revalidateFactionCeleb(db, celebId)
  return { success: true }
}
// #endregion

// #region updateFactionMemberOrder - 세력 내 인물 순서 업데이트
export async function updateFactionMemberOrder(
  lv2Id: string,
  celebIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()

  const results = await Promise.all(celebIds.map((celebId, index) =>
    db
      .from('faction_members')
      .update({ sort_order: index })
      .eq('lv2_id', lv2Id)
      .eq('celeb_id', celebId)
  ))
  const failed = results.find(r => r.error)
  if (failed) {
    console.error('세력 인물 순서 변경 에러:', failed.error)
    return { success: false, error: '인물 순서 변경에 실패했다.' }
  }

  revalidateFactionScreens()
  // faction_members.sort_order — 셀럽 목록 카드 노출 순서에도 반영된다
  await revalidateWebLists([CACHE_TAGS.TAGS, CACHE_TAGS.CELEBS])
  return { success: true }
}
// #endregion

// #region setFactionTeamImages - 단체 이미지 저장 (업로드/삭제/재정렬/설명 편집 결과)
export async function setFactionTeamImages(
  lv2Id: string,
  images: FactionTeamImage[]
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()

  const { error } = await db
    .from('faction_lv2')
    .update({ team_images: serializeTeamImages(images), updated_at: new Date().toISOString() })
    .eq('id', lv2Id)

  if (error) {
    console.error('단체 이미지 저장 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateFactionScreens()
  // faction_lv2.team_images — 도감 편성 화면 전용
  await revalidateWebLists(CACHE_TAGS.TAGS)
  return { success: true }
}
// #endregion

// #region setFactionLeadPersons - 타이틀 아트 대표 인물 (배열 차례가 세우는 차례)
export async function setFactionLeadPersons(
  lv2Id: string,
  personIds: string[]
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()

  const { error } = await db
    .from('faction_lv2')
    .update({ lead_person_ids: personIds, updated_at: new Date().toISOString() })
    .eq('id', lv2Id)

  if (error) {
    console.error('대표 인물 저장 에러:', error)
    return { success: false, error: error.message }
  }

  revalidateFactionScreens()
  await revalidateFactionCelebs(await getFactionCelebTargets(db, lv2Id))
  return { success: true }
}
// #endregion

// #region setFactionMemberHidden - 도감에서 이 세력의 이 인물을 감출지
/**
 * 도감 노출 스위치 — 세력마다 따로 잡는다.
 *
 * 셀럽 전역 상태(`celebs.publication_status`)와 무관하다. 도감이 보는 것은 이 스위치 하나다.
 */
export async function setFactionMemberHidden(
  lv2Id: string,
  celebId: string,
  hidden: boolean
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()

  const { data, error } = await db
    .from('faction_members')
    .update({ hidden })
    .eq('lv2_id', lv2Id)
    .eq('celeb_id', celebId)
    .select('id')

  if (error) {
    console.error('도감 노출 전환 에러:', error)
    return { success: false, error: error.message }
  }
  if (!data?.length) {
    return { success: false, error: '해당 배정을 찾을 수 없다.' }
  }

  revalidateFactionScreens()
  await revalidateFactionCeleb(db, celebId)
  return { success: true }
}
// #endregion

// #region setFactionMemberImage - 인물 전용 화보 URL 저장 (null이면 해제)
export async function setFactionMemberImage(
  lv2Id: string,
  celebId: string,
  url: string | null
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()

  const { data, error } = await db
    .from('faction_members')
    .update({ image_url: url })
    .eq('lv2_id', lv2Id)
    .eq('celeb_id', celebId)
    .select('id')

  if (error) {
    console.error('전용 화보 저장 에러:', error)
    return { success: false, error: error.message }
  }
  if (!data?.length) {
    return { success: false, error: '해당 배정을 찾을 수 없다.' }
  }

  revalidateFactionScreens()
  // image_url — 셀럽 카드 이미지에도 반영된다
  await revalidateFactionCeleb(db, celebId)
  return { success: true }
}
// #endregion

// #region 그룹 — 세력 안 인물 묶음(faction_lv3)
export interface FactionGroup {
  id: string
  name: string
  name_en: string | null
  sort_order: number
  /** 신화 탐색 그룹 개요의 본문 — 이 무리가 누구이고 작품에서 어떤 구실을 하는지 */
  description: string | null
  description_en: string | null
}

export async function getFactionGroups(lv2Id: string): Promise<FactionGroup[]> {
  const db = await createClient()
  const { data, error } = await db
    .from('faction_lv3')
    .select('id, name, name_en, sort_order, description, description_en')
    .eq('lv2_id', lv2Id)
    .order('sort_order', { ascending: true })
  if (error) {
    console.error('세력 그룹 조회 에러:', error)
    return []
  }
  return (data ?? []) as FactionGroup[]
}

/** 그룹을 맨 뒤 순서로 하나 더한다 */
export async function createFactionGroup(
  lv2Id: string,
  name: string,
  nameEn: string | null,
): Promise<{ group?: FactionGroup; error?: string }> {
  const trimmed = name.trim()
  if (!trimmed) return { error: '그룹 이름이 비었다.' }
  const db = await createClient()
  const { data: last } = await db
    .from('faction_lv3')
    .select('sort_order')
    .eq('lv2_id', lv2Id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const { data, error } = await db
    .from('faction_lv3')
    .insert({ lv2_id: lv2Id, name: trimmed, name_en: nameEn?.trim() || null, sort_order: ((last?.sort_order as number | undefined) ?? 0) + 1 })
    .select('id, name, name_en, sort_order, description, description_en')
    .single()
  if (error) {
    console.error('세력 그룹 추가 에러:', error)
    return { error: error.code === '23505' ? '같은 이름의 그룹이 이미 있다.' : error.message }
  }
  revalidateFactionScreens()
  return { group: data as FactionGroup }
}

/** 그룹 이름·설명(ko·en)을 고친다 — 설명은 신화 탐색 그룹 개요의 본문이 된다 */
export async function updateFactionGroup(
  groupId: string,
  patch: Partial<Pick<FactionGroup, 'name' | 'name_en' | 'description' | 'description_en'>>,
): Promise<{ success: boolean; error?: string }> {
  const name = patch.name?.trim()
  if (patch.name !== undefined && !name) return { success: false, error: '그룹 이름이 비었다.' }
  const db = await createClient()
  const { error } = await db
    .from('faction_lv3')
    .update({ ...patch, ...(name ? { name } : {}), updated_at: new Date().toISOString() })
    .eq('id', groupId)
  if (error) {
    console.error('세력 그룹 수정 에러:', error)
    return { success: false, error: error.code === '23505' ? '같은 이름의 그룹이 이미 있다.' : error.message }
  }
  revalidateFactionScreens()
  return { success: true }
}

/** 그룹 차례를 통째로 다시 적는다 — 신화 화면의 그룹 탭 순서가 된다 */
export async function reorderFactionGroups(
  lv2Id: string,
  groupIds: string[],
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()
  const now = new Date().toISOString()
  const results = await Promise.all(groupIds.map((id, index) => db
    .from('faction_lv3')
    .update({ sort_order: index + 1, updated_at: now })
    .eq('id', id)
    .eq('lv2_id', lv2Id)))
  const failed = results.find(r => r.error)?.error
  if (failed) {
    console.error('세력 그룹 순서 변경 에러:', failed)
    return { success: false, error: failed.message }
  }
  revalidateFactionScreens()
  return { success: true }
}

/** 그룹을 지운다. 구성원은 그룹이 풀려 맨 끝 「그 외」로 간다(배정의 lv3_id를 DB가 비운다) */
export async function deleteFactionGroup(groupId: string): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()
  const { error } = await db.from('faction_lv3').delete().eq('id', groupId)
  if (error) {
    console.error('세력 그룹 삭제 에러:', error)
    return { success: false, error: error.message }
  }
  revalidateFactionScreens()
  return { success: true }
}

/** 인물의 그룹을 바꾼다. null이면 그룹을 빼고 맨 끝 「그 외」로 보낸다. */
export async function setFactionMemberGroup(
  lv2Id: string,
  celebId: string,
  groupId: string | null,
): Promise<{ success: boolean; error?: string }> {
  const db = await createClient()

  const { data, error } = await db
    .from('faction_members')
    .update({ lv3_id: groupId })
    .eq('lv2_id', lv2Id)
    .eq('celeb_id', celebId)
    .select('id')

  if (error) {
    console.error('그룹 지정 에러:', error)
    return { success: false, error: error.message }
  }
  if (!data?.length) {
    return { success: false, error: '해당 배정을 찾을 수 없다.' }
  }

  revalidateFactionScreens()
  await revalidateFactionCeleb(db, celebId)
  return { success: true }
}
// #endregion
