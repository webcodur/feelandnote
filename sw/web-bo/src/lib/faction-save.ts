/**
 * 세력도감 대본 저장 코어 — 서버 전용, 인증 밖.
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
  const webLookup = await loadExistingWebOverrides(db, episodeId)
  const parts = await loadExistingParts(db, episodeId)

  const slugs = collectSlugs(script)
  const { slugMap, unpublishedSlugs } = await resolveSlugs(db, slugs)
  const tagMap = await resolveTags(db)

  const payload = buildFactionRows(script, {
    slugMap,
    tagMap,
    newId: randomUUID,
    durations,
    status: (epRow.status as string) ?? 'blocked',
    registered: (epRow.registered as boolean) ?? false,
    sortOrder: (epRow.sort_order as number) ?? 0,
    parts,
  })

  // 도감 손질(web_*)은 도감 편집이 소유한다 — 대본 저장이 인물 행을 전량 갈아끼우므로
  // 여기서 기존 값을 사람 신원 기준으로 되실어 보존한다(음성 길이와 같은 원리).
  // web_hidden 은 NOT NULL 이라 값이 없으면 저장 자체가 거부된다(실측 26.08.03).
  //
  // 처음 실리는 인물은 그 사람이 서비스에 떠 있는지로 도감 노출을 정한다 — 아직 안 뜨는 인물은
  // 도감에 이름만 뜨고 눌러도 화면이 안 열리므로 감춘 채로 넣는다. 사람이 도감 구획에서 직접
  // 보이기로 바꾸면 그 값이 기존 값으로 보존돼 다음 저장에 되살아나지 않는다.
  for (const p of payload.people) {
    const kept = webLookup(p)
    p.web_hidden = kept?.web_hidden
      ?? (typeof p.slug === 'string' && unpublishedSlugs.has(p.slug))
    p.web_short_desc = kept?.web_short_desc ?? null
    p.web_long_desc = kept?.web_long_desc ?? null
    p.web_short_desc_en = kept?.web_short_desc_en ?? null
    p.web_long_desc_en = kept?.web_long_desc_en ?? null
    p.web_image_url = kept?.web_image_url ?? null
  }

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

/**
 * 인물 연결 키를 셀럽 계정에 맺는다.
 *
 * 서비스에 아직 안 뜨는 인물(status ≠ active)도 함께 돌려준다 — 처음 실리는 그런 인물은
 * 도감에서 감춘 채로 저장한다(위 web_hidden 결정).
 */
async function resolveSlugs(
  db: SupabaseClient, slugs: string[],
): Promise<{ slugMap: Map<string, string>; unpublishedSlugs: Set<string> }> {
  const slugMap = new Map<string, string>()
  const unpublishedSlugs = new Set<string>()
  for (let i = 0; i < slugs.length; i += IN_CHUNK) {
    const { data, error } = await db
      .from('profiles').select('id,slug,status').in('slug', slugs.slice(i, i + IN_CHUNK))
    if (error) throw new Error(`셀럽 조회 실패: ${error.message}`)
    for (const r of data ?? []) {
      if (!r.slug) continue
      slugMap.set(r.slug as string, r.id as string)
      if (r.status !== 'active') unpublishedSlugs.add(r.slug as string)
    }
  }
  return { slugMap, unpublishedSlugs }
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
 * 기존 음성 길이를 **사람 기준으로** 모은다.
 *
 * 음성 길이는 음성 파이프라인이 소유하고 사람이 입력하지 않는다(문서 §7). 그래서 저장할 때
 * 편집기가 보낸 값으로 덮지 않고 DB 값을 유지한다.
 *
 * ⚠ 단 **자리(순번) 기준으로 유지하면 안 된다.** 인물 순서를 바꾸면 음원 파일은 인물을 따라
 *   옮겨 가는데(음원 재배치 창구가 그렇게 한다) 길이를 자리에 붙여 두면 그 자리에 남는다.
 *   그러면 옮겨온 음원과 길이가 어긋나 컷 길이가 틀어진다 — 실측으로 잡은 결함이다.
 *   그래서 연결 키(slug), 없으면 이름을 사람의 신원으로 삼아 길이가 사람을 따라가게 한다.
 *
 * 같은 사람이 한 편에 두 번 나오는 경우가 실제로 있다(오디세우스). 그때는 같은 신원끼리
 * **나온 순서대로** 짝지어 준다 — 그 이상 가릴 단서가 데이터에 없다.
 *
 * numeric 컬럼은 PostgREST 가 문자열로 돌려주므로 숫자로 되돌린다.
 */
type Durations = { quoteDuration: number | null; epithetDuration: number | null }

/** 인물의 신원 — 연결 키가 있으면 그것, 없으면 이름 */
const identityOf = (p: { slug?: unknown; name?: unknown }): string =>
  (typeof p.slug === 'string' && p.slug) ? `s:${p.slug}` : `n:${String(p.name ?? '')}`

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
        clusterRows.map(c => c.id as string),
        'cluster_id,position,slug,name,quote_duration,epithet_duration')
    : []

  const num = (v: unknown): number | null =>
    v === null || v === undefined ? null : typeof v === 'string' ? Number(v) : (v as number)

  // 신원별로 자리 순서대로 줄을 세운다(같은 신원이 여러 번 나오면 나온 순서가 짝짓기 기준)
  const gPos = new Map(groupRows.map(g => [g.id as string, g.position as number]))
  const cOrder = new Map<string, number>() // cluster_id → 정렬용 값
  for (const c of clusterRows) {
    const gi = gPos.get(c.group_id as string) ?? 0
    cOrder.set(c.id as string, gi * 1000 + (c.position as number))
  }
  const sorted = [...personRows].sort((a, b) =>
    (cOrder.get(a.cluster_id as string) ?? 0) - (cOrder.get(b.cluster_id as string) ?? 0)
    || (a.position as number) - (b.position as number))

  const byIdentity = new Map<string, Durations[]>()
  for (const p of sorted) {
    const k = identityOf(p)
    if (!byIdentity.has(k)) byIdentity.set(k, [])
    byIdentity.get(k)!.push({
      quoteDuration: num(p.quote_duration),
      epithetDuration: num(p.epithet_duration),
    })
  }

  // 들어오는 대본에서도 같은 신원이 몇 번째로 나왔는지 세어 순서대로 짝짓는다
  const seen = new Map<string, number>()
  return (_gi, _ci, _pi, person) => {
    const k = identityOf(person as { slug?: unknown; name?: unknown })
    const list = byIdentity.get(k)
    const n = seen.get(k) ?? 0
    seen.set(k, n + 1)
    const hit = list?.[n]
    if (!hit) return undefined
    return {
      quoteDuration: hit.quoteDuration ?? undefined,
      epithetDuration: hit.epithetDuration ?? undefined,
    }
  }
}

/**
 * 도감 손질(web_*) 칸 — 대본 저장이 인물 행을 전량 갈아끼우므로, 기존 값을 **사람 신원 기준으로**
 * 모아 새 행에 되싣는다. 신원·순서 짝짓기 규칙은 음성 길이(loadExistingDurations)와 동일하다.
 * 반환 함수는 새 인물 행(slug·name 컬럼 보유)을 받아 짝지어진 기존 손질을 돌려준다.
 */
type WebOverride = {
  web_short_desc: string | null
  web_long_desc: string | null
  web_short_desc_en: string | null
  web_long_desc_en: string | null
  web_image_url: string | null
  web_hidden: boolean
}

async function loadExistingWebOverrides(
  db: SupabaseClient, episodeId: string,
): Promise<(personRow: Row) => WebOverride | undefined> {
  const { data: groups, error: gErr } = await db
    .from('faction_groups').select('id,position').eq('episode_id', episodeId)
  if (gErr) throw new Error(`세력 조회 실패: ${gErr.message}`)
  const groupRows = (groups ?? []) as Row[]
  if (!groupRows.length) return () => undefined

  const clusterRows = await inChunks(db, 'faction_clusters', 'group_id',
    groupRows.map(g => g.id as string), 'id,group_id,position')
  const personRows = clusterRows.length
    ? await inChunks(db, 'faction_people', 'cluster_id',
        clusterRows.map(c => c.id as string),
        'cluster_id,position,slug,name,web_short_desc,web_long_desc,web_short_desc_en,web_long_desc_en,web_image_url,web_hidden')
    : []

  // 신원별로 자리 순서대로 줄을 세운다 — durations 와 같은 짝짓기 규칙
  const gPos = new Map(groupRows.map(g => [g.id as string, g.position as number]))
  const cOrder = new Map<string, number>()
  for (const c of clusterRows) {
    const gi = gPos.get(c.group_id as string) ?? 0
    cOrder.set(c.id as string, gi * 1000 + (c.position as number))
  }
  const sorted = [...personRows].sort((a, b) =>
    (cOrder.get(a.cluster_id as string) ?? 0) - (cOrder.get(b.cluster_id as string) ?? 0)
    || (a.position as number) - (b.position as number))

  const byIdentity = new Map<string, WebOverride[]>()
  for (const p of sorted) {
    const k = identityOf(p)
    if (!byIdentity.has(k)) byIdentity.set(k, [])
    byIdentity.get(k)!.push({
      web_short_desc: (p.web_short_desc as string | null) ?? null,
      web_long_desc: (p.web_long_desc as string | null) ?? null,
      web_short_desc_en: (p.web_short_desc_en as string | null) ?? null,
      web_long_desc_en: (p.web_long_desc_en as string | null) ?? null,
      web_image_url: (p.web_image_url as string | null) ?? null,
      web_hidden: p.web_hidden === true,
    })
  }

  const seen = new Map<string, number>()
  return (personRow: Row) => {
    const k = identityOf(personRow as { slug?: unknown; name?: unknown })
    const list = byIdentity.get(k)
    const n = seen.get(k) ?? 0
    seen.set(k, n + 1)
    return list?.[n]
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
