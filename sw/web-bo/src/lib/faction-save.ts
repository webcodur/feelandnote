/**
 * 세력도 대본 저장 코어 — 서버 전용, 인증 밖.
 *
 * 서버 액션(`actions/admin/factions/script.ts`)은 사람 확인만 하고 이 함수를 부른다.
 * 액션 파일 안에 로직을 두면 Next 밖에서 부를 수 없어 검증이 안 되므로 여기로 뺐다.
 *
 * 하는 일은 셋이다.
 *   1. **보존해야 할 값을 DB 에서 읽는다** — 진행 상태·편성·순번·편별 댓글·음성 길이.
 *      편집기는 이 값들을 모르거나(댓글) 소유하지 않는다(음성 길이 — 문서 §7).
 *   2. 키 해소 — 인물 slug → 셀럽 id, 세력 태그 이름 → 태그 id.
 *   3. 분해(`buildFactionRows`) 후 원자 저장 함수 한 번 호출.
 *
 * 분해 규칙 자체는 `@feelandnote/shared/lib/faction-assemble` 소유다 — 여기에 복제하지 않는다.
 */

import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildFactionRows, IN_CHUNK, type DurationLookup,
} from '@feelandnote/shared/lib/faction-assemble'

type Row = Record<string, unknown>

export interface ReplaceEpisodeResult {
  episodeId: string
  /** 다음 저장에 쓸 새 잠금 기준 */
  updatedAt: string
  counts: { groups: number; clusters: number; people: number; parts: number }
  /** 셀럽 프로필을 못 찾은 slug — celeb_id 는 null 로 두고 slug 문자열은 보존된다 */
  unresolvedSlugs: string[]
}

/**
 * 대본 전체를 한 트랜잭션에 갈아끼운다.
 *
 * @param expectedUpdatedAt 불러올 때 받은 값. 그 사이 다른 곳에서 저장했으면 DB 가 거부한다.
 *   새로 만드는 경우에만 null 을 준다.
 */
export async function replaceFactionEpisode(
  db: SupabaseClient,
  folder: string,
  script: Record<string, unknown>,
  expectedUpdatedAt: string | null,
): Promise<ReplaceEpisodeResult> {
  if (!folder) throw new Error('에피소드 폴더명이 필요합니다')

  const { data: epRow, error: epErr } = await db
    .from('faction_episodes')
    .select('id,status,registered,sort_order')
    .eq('folder', folder).maybeSingle()
  if (epErr) throw new Error(`에피소드 조회 실패(${folder}): ${epErr.message}`)
  if (!epRow) throw new Error(`에피소드가 없습니다: ${folder}`)

  const episodeId = epRow.id as string
  const durations = await loadExistingDurations(db, episodeId)
  const parts = await loadExistingParts(db, episodeId)

  const slugs = collectSlugs(script)
  const slugMap = await resolveSlugs(db, slugs)
  const tagMap = await resolveTags(db)

  const payload = buildFactionRows(script, {
    slugMap,
    tagMap,
    newId: randomUUID,
    durations,
    status: (epRow.status as string) ?? 'todo',
    registered: (epRow.registered as boolean) ?? false,
    sortOrder: (epRow.sort_order as number) ?? 0,
    parts,
  })

  const { data: res, error } = await db.rpc('faction_replace_episode', {
    p_folder: folder,
    p_episode: payload.episode,
    p_groups: payload.groups,
    p_clusters: payload.clusters,
    p_people: payload.people,
    p_parts: payload.parts,
    p_expected_updated_at: expectedUpdatedAt,
  })
  if (error) throw new Error(error.message)

  const out = res as { episode_id: string; updated_at: string }
  return {
    episodeId: out.episode_id,
    updatedAt: out.updated_at,
    counts: {
      groups: payload.groups.length,
      clusters: payload.clusters.length,
      people: payload.people.length,
      parts: payload.parts.length,
    },
    unresolvedSlugs: slugs.filter(s => !slugMap.has(s)),
  }
}

/* ────────────────────────── 내부 ────────────────────────── */

/** 대본에 실린 인물 slug 전량(중복 제거) */
function collectSlugs(script: Record<string, unknown>): string[] {
  const out = new Set<string>()
  for (const g of (script.groups ?? []) as Row[]) {
    for (const c of (g.clusters ?? []) as Row[]) {
      for (const p of (c.people ?? []) as Row[]) {
        if (typeof p.slug === 'string' && p.slug) out.add(p.slug)
      }
    }
  }
  return [...out]
}

async function resolveSlugs(db: SupabaseClient, slugs: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  for (let i = 0; i < slugs.length; i += IN_CHUNK) {
    const { data, error } = await db
      .from('profiles').select('id,slug').in('slug', slugs.slice(i, i + IN_CHUNK))
    if (error) throw new Error(`셀럽 조회 실패: ${error.message}`)
    for (const r of data ?? []) if (r.slug) map.set(r.slug as string, r.id as string)
  }
  return map
}

/** 태그는 수십 종뿐이라 전량 조회한다 */
async function resolveTags(db: SupabaseClient): Promise<Map<string, string>> {
  const { data, error } = await db.from('celeb_tags').select('id,slug')
  if (error) throw new Error(`태그 조회 실패: ${error.message}`)
  const map = new Map<string, string>()
  for (const r of data ?? []) if (r.slug) map.set(r.slug as string, r.id as string)
  return map
}

/**
 * 기존 음성 길이를 자리(세력·묶음·인물 순번)로 찾을 수 있게 모은다.
 *
 * 음성 길이는 **음성 파이프라인이 소유**하고 사람이 입력하지 않는다(문서 §7).
 * 편집기가 옛 값을 들고 있다가 저장으로 되돌려 놓는 사고를 막기 위해 DB 값을 그대로 유지한다.
 * numeric 컬럼은 PostgREST 가 문자열로 돌려주므로 숫자로 되돌린다.
 */
async function loadExistingDurations(db: SupabaseClient, episodeId: string): Promise<DurationLookup> {
  const { data: groups, error: gErr } = await db
    .from('faction_groups').select('id,position').eq('episode_id', episodeId)
  if (gErr) throw new Error(`세력 조회 실패: ${gErr.message}`)
  const groupRows = (groups ?? []) as Row[]
  if (!groupRows.length) return () => undefined

  const clusterRows = await inChunks(db, 'faction_clusters', 'group_id',
    groupRows.map(g => g.id as string), 'id,group_id,position')
  const personRows = clusterRows.length
    ? await inChunks(db, 'faction_people', 'cluster_id',
        clusterRows.map(c => c.id as string), 'cluster_id,position,quote_duration,epithet_duration')
    : []

  const gPos = new Map(groupRows.map(g => [g.id as string, g.position as number]))
  const cKey = new Map<string, string>() // cluster_id → "세력순번:묶음순번"
  for (const c of clusterRows) {
    const gi = gPos.get(c.group_id as string)
    if (gi === undefined) continue
    cKey.set(c.id as string, `${gi}:${c.position as number}`)
  }

  const num = (v: unknown): number | null =>
    v === null || v === undefined ? null : typeof v === 'string' ? Number(v) : (v as number)

  const byPath = new Map<string, { quoteDuration: number | null; epithetDuration: number | null }>()
  for (const p of personRows) {
    const k = cKey.get(p.cluster_id as string)
    if (!k) continue
    byPath.set(`${k}:${p.position as number}`, {
      quoteDuration: num(p.quote_duration),
      epithetDuration: num(p.epithet_duration),
    })
  }

  // 저장 키는 1-based 순번, 분해기 콜백은 0-based 인덱스로 부른다
  return (gi, ci, pi) => {
    const hit = byPath.get(`${gi + 1}:${ci + 1}:${pi + 1}`)
    if (!hit) return undefined
    return {
      quoteDuration: hit.quoteDuration ?? undefined,
      epithetDuration: hit.epithetDuration ?? undefined,
    }
  }
}

/** 편별 고정 댓글 — 편집기가 보내지 않으므로 저장 때 그대로 실어 보내 보존한다 */
async function loadExistingParts(
  db: SupabaseClient, episodeId: string,
): Promise<{ part: number; comment: string }[]> {
  const { data, error } = await db
    .from('faction_episode_parts').select('part,comment').eq('episode_id', episodeId)
  if (error) throw new Error(`편별 댓글 조회 실패: ${error.message}`)
  return (data ?? [])
    .map(r => ({ part: r.part as number, comment: (r.comment as string) ?? '' }))
    .sort((a, b) => a.part - b.part)
}

async function inChunks(
  db: SupabaseClient, table: string, col: string, values: string[], select: string,
): Promise<Row[]> {
  const out: Row[] = []
  for (let i = 0; i < values.length; i += IN_CHUNK) {
    const { data, error } = await db
      .from(table).select(select).in(col, values.slice(i, i + IN_CHUNK))
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    out.push(...((data ?? []) as unknown as Row[]))
  }
  return out
}
