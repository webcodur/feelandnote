/**
 * db-durations.ts — 음성 길이(quote_duration·epithet_duration)의 DB 배관
 *
 * 음성 길이는 **파이프라인 소유 값**이다(문서 §7). 사람이 편집기로 넣는 값이 아니다.
 * 흐름: wav 실측 → DB UPDATE(durations-pull) → export 시 파일로 반영.
 *
 * 이 모듈은 두 곳이 쓴다.
 *  - `faction:durations-pull` — 실측값을 DB 에 적어 넣는다.
 *  - `voice:faction --verify` — DB↔JSON 불일치 열을 띄운다(얇은 훅만 걸린다).
 *
 * 위치 기반 신원: 음성 파일명이 `F{group:02d}C{cluster:02d}P{person:02d}` 라서
 * (group.position, cluster.position, person.position) 삼중키가 곧 wav 의 주소다.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { adminClient } from './lib.js'

/** 위치 삼중키 → DB 인물 행 */
export interface PersonSlot {
  id: string
  groupPos: number
  clusterPos: number
  personPos: number
  name: string
  /** DB 에 적힌 대사 음성 길이(초). 없으면 null */
  quoteDuration: number | null
  epithetDuration: number | null
}

/** 삼중키 문자열 — 0-based 인덱스로도 만들 수 있게 헬퍼를 함께 둔다 */
export const slotKey = (groupPos: number, clusterPos: number, personPos: number) =>
  `${groupPos}:${clusterPos}:${personPos}`

/** buildVoiceJobs 의 0-based 인덱스 → 삼중키(position 은 1-based) */
export const slotKeyFromIndices = (groupIndex: number, clusterIndex: number, personIndex: number) =>
  slotKey(groupIndex + 1, clusterIndex + 1, personIndex + 1)

/** numeric 컬럼은 PostgREST 가 문자열로 돌려준다 → 숫자로 되돌린다 */
const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v))

/**
 * 한 에피소드의 인물 자리를 전부 읽어 삼중키 맵으로 돌려준다.
 * 조회 실패는 던진다(조용한 폴백 금지).
 */
export async function loadPersonSlots(
  db: SupabaseClient, folder: string,
): Promise<Map<string, PersonSlot>> {
  const { data: ep, error: epErr } = await db
    .from('faction_episodes').select('id').eq('folder', folder).single()
  if (epErr) throw new Error(`에피소드 조회 실패(${folder}): ${epErr.message}`)

  const { data: groups, error: gErr } = await db
    .from('faction_groups').select('id,position').eq('episode_id', ep.id).order('position')
  if (gErr) throw new Error(`세력 조회 실패(${folder}): ${gErr.message}`)
  const groupPos = new Map<string, number>()
  for (const g of groups ?? []) groupPos.set(g.id as string, g.position as number)
  if (groupPos.size === 0) return new Map()

  const { data: clusters, error: cErr } = await db
    .from('faction_clusters').select('id,group_id,position').in('group_id', [...groupPos.keys()])
  if (cErr) throw new Error(`묶음 조회 실패(${folder}): ${cErr.message}`)
  const clusterInfo = new Map<string, { gPos: number; cPos: number }>()
  for (const c of clusters ?? []) {
    const gPos = groupPos.get(c.group_id as string)
    if (gPos == null) continue
    clusterInfo.set(c.id as string, { gPos, cPos: c.position as number })
  }
  if (clusterInfo.size === 0) return new Map()

  const out = new Map<string, PersonSlot>()
  const ids = [...clusterInfo.keys()]
  // .in() 은 200개씩 끊는다(URL 한도 실측 이력)
  for (let i = 0; i < ids.length; i += 200) {
    const { data: people, error: pErr } = await db
      .from('faction_people')
      .select('id,cluster_id,position,name,quote_duration,epithet_duration')
      .in('cluster_id', ids.slice(i, i + 200))
      .eq('is_person', true)
    if (pErr) throw new Error(`인물 조회 실패(${folder}): ${pErr.message}`)
    for (const p of people ?? []) {
      const info = clusterInfo.get(p.cluster_id as string)
      if (!info) continue
      const slot: PersonSlot = {
        id: p.id as string,
        groupPos: info.gPos,
        clusterPos: info.cPos,
        personPos: p.position as number,
        name: p.name as string,
        quoteDuration: num(p.quote_duration),
        epithetDuration: num(p.epithet_duration),
      }
      out.set(slotKey(slot.groupPos, slot.clusterPos, slot.personPos), slot)
    }
  }
  return out
}

/** 소수 2자리 — 파이프라인 기록 관례와 동일 */
export const round2 = (n: number) => Math.round(n * 100) / 100

/** 통합 구조의 장면 행. 모든 화면·해설·인물 대사는 cluster.data.beats에 산다. */
export interface SceneClusterRow {
  id: string
  name: string
  data: Record<string, unknown>
}

/** 한 에피소드의 장면 data를 전부 읽는다. */
export async function loadSceneClusters(
  db: SupabaseClient, folder: string,
): Promise<SceneClusterRow[]> {
  const { data: ep, error: epErr } = await db
    .from('faction_episodes').select('id').eq('folder', folder).single()
  if (epErr) throw new Error(`에피소드 조회 실패(${folder}): ${epErr.message}`)

  const { data: groups, error: gErr } = await db
    .from('faction_groups').select('id').eq('episode_id', ep.id)
  if (gErr) throw new Error(`세력 조회 실패(${folder}): ${gErr.message}`)
  const groupIds = (groups ?? []).map(group => group.id as string)
  if (!groupIds.length) return []

  const out: SceneClusterRow[] = []
  for (let index = 0; index < groupIds.length; index += 200) {
    const { data, error } = await db
      .from('faction_clusters').select('id,label,data').in('group_id', groupIds.slice(index, index + 200))
    if (error) throw new Error(`장면 조회 실패(${folder}): ${error.message}`)
    out.push(...(data ?? []).map(cluster => ({
      id: cluster.id as string,
      name: (cluster.label as string | null) ?? '',
      data: (cluster.data as Record<string, unknown>) ?? {},
    })))
  }
  return out
}

/** 통합 장면 data jsonb에 실측 voiceDuration을 기록한다. */
export async function updateSceneClusterData(
  db: SupabaseClient, id: string, data: Record<string, unknown>,
): Promise<void> {
  const { error } = await db.from('faction_clusters').update({ data }).eq('id', id)
  if (error) throw new Error(`장면 음성 길이 갱신 실패(${id}): ${error.message}`)
}

/** 사람 카드가 아닌 서사 타임라인 항목. 해설 음성 설정은 이 행의 data jsonb에 산다. */
export interface NarrativeEntryRow {
  id: string
  name: string
  data: Record<string, unknown>
}

/** 한 에피소드의 is_person=false 행을 data jsonb 째로 읽는다. */
export async function loadNarrativeEntries(
  db: SupabaseClient, folder: string,
): Promise<NarrativeEntryRow[]> {
  const { data: ep, error: epErr } = await db
    .from('faction_episodes').select('id').eq('folder', folder).single()
  if (epErr) throw new Error(`에피소드 조회 실패(${folder}): ${epErr.message}`)

  const { data: groups, error: gErr } = await db
    .from('faction_groups').select('id').eq('episode_id', ep.id)
  if (gErr) throw new Error(`세력 조회 실패(${folder}): ${gErr.message}`)
  const groupIds = (groups ?? []).map(group => group.id as string)
  if (!groupIds.length) return []
  const { data: clusters, error: cErr } = await db
    .from('faction_clusters').select('id').in('group_id', groupIds)
  if (cErr) throw new Error(`묶음 조회 실패(${folder}): ${cErr.message}`)
  const clusterIds = (clusters ?? []).map(cluster => cluster.id as string)
  if (!clusterIds.length) return []

  const entries: NarrativeEntryRow[] = []
  for (let i = 0; i < clusterIds.length; i += 200) {
    const { data, error } = await db
      .from('faction_people')
      .select('id,name,data')
      .in('cluster_id', clusterIds.slice(i, i + 200))
      .eq('is_person', false)
    if (error) throw new Error(`서사 항목 조회 실패(${folder}): ${error.message}`)
    entries.push(...(data ?? []).map(entry => ({
      id: entry.id as string,
      name: entry.name as string,
      data: (entry.data as Record<string, unknown>) ?? {},
    })))
  }
  return entries
}

/** 서사 항목 data jsonb 갱신 — 해설·대사 덩어리의 voiceDuration을 적는다. */
export async function updateNarrativeEntryData(
  db: SupabaseClient, id: string, data: Record<string, unknown>,
): Promise<void> {
  const { error } = await db.from('faction_people').update({ data }).eq('id', id).eq('is_person', false)
  if (error) throw new Error(`서사 항목 낭독 길이 갱신 실패(${id}): ${error.message}`)
}

/** quote_duration·epithet_duration 갱신 */
export async function updateDurations(
  db: SupabaseClient,
  updates: { id: string; quoteDuration?: number; epithetDuration?: number }[],
): Promise<void> {
  for (const u of updates) {
    const patch: Record<string, number> = {}
    if (u.quoteDuration !== undefined) patch.quote_duration = u.quoteDuration
    if (u.epithetDuration !== undefined) patch.epithet_duration = u.epithetDuration
    if (Object.keys(patch).length === 0) continue
    const { error } = await db.from('faction_people').update(patch).eq('id', u.id)
    if (error) throw new Error(`음성 길이 갱신 실패(${u.id}): ${error.message}`)
  }
}

/**
 * `voice:faction --verify` 용 얇은 훅 — 파일명(stem) → DB 음성 길이 맵.
 *
 * 검증 리포트에 열 하나를 더하려고 파이프라인이 죽으면 안 되므로, DB 접근 실패는
 * 던지지 않고 사유를 적어 null 로 돌려준다(값이 없다는 사실은 화면에 드러난다).
 *
 * @param stemOf (groupIndex, clusterIndex, personIndex) → wav 파일명. 호출 측이 vnPersonQuote 를 넘긴다.
 */
export async function tryLoadDbQuoteDurations(
  folder: string,
  stemOf: (groupIndex: number, personIndex: number, clusterIndex: number) => string,
): Promise<{ map: Map<string, number | null> | null; note: string }> {
  try {
    const db = adminClient()
    const slots = await loadPersonSlots(db, folder)
    const map = new Map<string, number | null>()
    for (const s of slots.values()) {
      map.set(stemOf(s.groupPos - 1, s.personPos - 1, s.clusterPos - 1), s.quoteDuration)
    }
    return { map, note: `DB 인물 ${slots.size}자리` }
  } catch (e) {
    return { map: null, note: `DB 조회 실패 — ${e instanceof Error ? e.message : String(e)}` }
  }
}
