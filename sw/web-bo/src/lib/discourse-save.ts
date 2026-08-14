/**
 * 가상 담화 대본 저장 코어 — 서버 전용, 인증 밖.
 *
 * 서버 액션(`actions/admin/discourses/script.ts`)은 사람 확인만 하고 이 함수를 부른다.
 * 액션 파일 안에 로직을 두면 Next 밖에서 부를 수 없어 검증이 안 되므로 여기로 뺐다.
 *
 * 하는 일은 셋이다.
 *   1. **보존해야 할 값을 DB 에서 읽는다** — 진행 상태·노출·순번·음성 길이.
 *      편집기는 이 값들을 모르거나(상태) 소유하지 않는다(음성 길이 — 설계 §7).
 *   2. 키 해소 — 인물 slug → 셀럽 id.
 *   3. 분해(`buildDiscourseRows`) 후 원자 저장 함수 한 번 호출.
 *
 * 분해 규칙 자체는 `@feelandnote/shared/lib/discourse-assemble` 소유다 — 여기에 복제하지 않는다.
 */

import { randomUUID } from 'crypto'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  buildDiscourseRows, IN_CHUNK,
  type TurnDurationLookup, type SpeakerDurationLookup,
} from '@feelandnote/shared/lib/discourse-assemble'

type Row = Record<string, unknown>

export interface ReplaceDiscourseEpisodeResult {
  episodeId: string
  /** 다음 저장에 쓸 새 잠금 기준 */
  updatedAt: string
  counts: { speakers: number; turns: number }
}

/**
 * 대본 전체를 한 트랜잭션에 갈아끼운다.
 *
 * @param expectedUpdatedAt 불러올 때 받은 값. 그 사이 다른 곳에서 저장했으면 DB 가 거부한다.
 *   새로 만드는 경우에만 null 을 준다.
 */
export async function replaceDiscourseEpisode(
  db: SupabaseClient,
  folder: string,
  script: Record<string, unknown>,
  expectedUpdatedAt: string | null,
): Promise<ReplaceDiscourseEpisodeResult> {
  if (!folder) throw new Error('에피소드 폴더명이 필요합니다')

  const { data: epRow, error: epErr } = await db
    .from('discourse_episodes')
    .select('id,status,registered,sort_order')
    .eq('folder', folder).maybeSingle()
  if (epErr) throw new Error(`에피소드 조회 실패(${folder}): ${epErr.message}`)
  if (!epRow) throw new Error(`에피소드가 없습니다: ${folder}`)

  const episodeId = epRow.id as string
  const { turnDurations, speakerDurations } = await loadExistingDurations(db, episodeId)

  const slugs = collectSlugs(script)
  const slugMap = await resolveSlugs(db, slugs)
  const missing = slugs.filter(s => !slugMap.has(s))
  if (missing.length) {
    throw new Error(`DB CELEB 미연결 담화 인물 ${missing.length}명 — 저장하지 않았다: ${missing.join(', ')}`)
  }

  const payload = buildDiscourseRows(script, {
    slugMap,
    newId: randomUUID,
    turnDurations,
    speakerDurations,
    status: (epRow.status as string) ?? 'todo',
    registered: (epRow.registered as boolean) ?? false,
    sortOrder: (epRow.sort_order as number) ?? 0,
  })

  const { data: res, error } = await db.rpc('discourse_replace_episode', {
    p_folder: folder,
    p_episode: payload.episode,
    p_speakers: payload.speakers,
    p_turns: payload.turns,
    p_expected_updated_at: expectedUpdatedAt,
  })
  if (error) throw new Error(error.message)

  const out = res as { episode_id: string; updated_at: string }
  return {
    episodeId: out.episode_id,
    updatedAt: out.updated_at,
    counts: { speakers: payload.speakers.length, turns: payload.turns.length },
  }
}

/* ────────────────────────── 내부 ────────────────────────── */

/** 대본에 실린 인물 slug 전량(중복 제거) */
function collectSlugs(script: Record<string, unknown>): string[] {
  const out = new Set<string>()
  for (const s of (script.cast ?? []) as Row[]) {
    if (typeof s.slug === 'string' && s.slug) out.add(s.slug)
  }
  return [...out]
}

async function resolveSlugs(db: SupabaseClient, slugs: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  for (let i = 0; i < slugs.length; i += IN_CHUNK) {
    const { data, error } = await db
      .from('celebs').select('id,slug')
      .in('publication_status', ['active', 'inactive'])
      .in('slug', slugs.slice(i, i + IN_CHUNK))
    if (error) throw new Error(`셀럽 조회 실패: ${error.message}`)
    for (const r of data ?? []) if (r.slug) map.set(r.slug as string, r.id as string)
  }
  return map
}

/** 인물의 신원 — 연결 키가 있으면 그것, 없으면 이름 */
const identityOf = (p: { slug?: unknown; name?: unknown }): string =>
  (typeof p.slug === 'string' && p.slug) ? `s:${p.slug}` : `n:${String(p.name ?? '')}`

const num = (v: unknown): number | null =>
  v === null || v === undefined ? null : typeof v === 'string' ? Number(v) : (v as number)

/**
 * 기존 음성 길이를 **사람 기준으로** 모은다.
 *
 * 음성 길이는 음성 파이프라인이 소유하고 사람이 입력하지 않는다(설계 §7). 그래서 저장할 때
 * 편집기가 보낸 값으로 덮지 않고 DB 값을 유지한다.
 *
 * ⚠ 단 **자리(발언 순번) 기준으로 유지하면 안 된다.** 발언을 중간에 끼워 넣으면 뒤 발언이 한 칸씩
 *   밀리는데, 음원 파일은 그 사람의 그 발언을 따라 옮겨 간다. 길이를 자리에 붙여 두면 그 자리에
 *   남아 옮겨온 음원과 어긋나고, 컷 길이가 통째로 틀어진다. 팩션이 실측으로 잡은 결함이고
 *   **담화는 한 인물이 여러 번 말하는 것이 기본이라 더 흔하게 터진다**(설계 §7-③).
 *
 *   그래서 기준을 「사람 + 그 사람의 n번째 발언」으로 잡는다. 같은 사람의 발언끼리 **나온 순서대로**
 *   짝지어 준다 — 그 이상 가릴 단서가 데이터에 없다.
 *
 * numeric 컬럼은 PostgREST 가 문자열로 돌려주므로 숫자로 되돌린다.
 */
async function loadExistingDurations(
  db: SupabaseClient, episodeId: string,
): Promise<{ turnDurations: TurnDurationLookup; speakerDurations: SpeakerDurationLookup }> {
  const { data: spRows, error: spErr } = await db
    .from('discourse_speakers')
    .select('id,position,slug,name,epithet_duration')
    .eq('episode_id', episodeId)
  if (spErr) throw new Error(`인물 조회 실패: ${spErr.message}`)
  const speakers = ((spRows ?? []) as Row[]).sort(
    (a, b) => (a.position as number) - (b.position as number),
  )

  // ── 인물 수식어 길이 — 사람(신원) 기준 ──
  const epithetByIdentity = new Map<string, (number | null)[]>()
  for (const s of speakers) {
    const k = identityOf(s)
    if (!epithetByIdentity.has(k)) epithetByIdentity.set(k, [])
    epithetByIdentity.get(k)!.push(num(s.epithet_duration))
  }
  const seenSpeaker = new Map<string, number>()
  const speakerDurations: SpeakerDurationLookup = (_castIndex, _slug, speaker) => {
    const k = identityOf(speaker as { slug?: unknown; name?: unknown })
    const list = epithetByIdentity.get(k)
    const n = seenSpeaker.get(k) ?? 0
    seenSpeaker.set(k, n + 1)
    const hit = list?.[n]
    return hit == null ? undefined : { epithetDuration: hit }
  }

  if (!speakers.length) {
    return { turnDurations: () => undefined, speakerDurations }
  }

  // ── 발언 길이 — 「사람 + 그 사람의 n번째 발언」 기준 ──
  const { data: tnRows, error: tnErr } = await db
    .from('discourse_turns')
    .select('position,speaker_id,duration')
    .eq('episode_id', episodeId)
  if (tnErr) throw new Error(`발언 조회 실패: ${tnErr.message}`)

  const identityBySpeakerId = new Map(speakers.map(s => [s.id as string, identityOf(s)]))
  const turnsSorted = ((tnRows ?? []) as Row[]).sort(
    (a, b) => (a.position as number) - (b.position as number),
  )
  const durationByIdentity = new Map<string, (number | null)[]>()
  for (const t of turnsSorted) {
    const k = identityBySpeakerId.get(t.speaker_id as string)
    if (!k) continue
    if (!durationByIdentity.has(k)) durationByIdentity.set(k, [])
    durationByIdentity.get(k)!.push(num(t.duration))
  }

  /**
   * 들어오는 대본에서도 같은 신원이 몇 번째로 말했는지 세어 순서대로 짝짓는다.
   *
   * 조립기가 넘겨주는 `nthOfSpeaker` 는 **cast 배열 위치 기준**이라 인물 순서를 바꾸면 흔들린다.
   * 여기서는 발언자 자체(slug·이름)로 다시 세므로 인물 순서를 바꿔도 길이가 사람을 따라간다.
   */
  const seenTurn = new Map<string, number>()
  const turnDurations: TurnDurationLookup = (_turnIndex, speaker) => {
    if (!speaker) return undefined
    const k = identityOf(speaker as { slug?: unknown; name?: unknown })
    const list = durationByIdentity.get(k)
    const n = seenTurn.get(k) ?? 0
    seenTurn.set(k, n + 1)
    const hit = list?.[n]
    return hit == null ? undefined : { duration: hit }
  }

  return { turnDurations, speakerDurations }
}
