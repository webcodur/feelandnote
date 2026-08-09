/**
 * discourse-assemble.ts — DB ↔ DiscourseScript 조립·분해 오케스트레이션 단일원천(SSoT)
 *
 * `discourse-schema.ts` 가 **한 계층**의 split/join 규칙을 쥔다면, 이 파일은 **에피소드 한 편 전체**를
 * 오르내리는 절차를 쥔다:
 *   - `assembleDiscourseEpisode` : DB 3테이블 행 → 합쳐진 한 벌(세 파일 병합형) — 내보내기·편집기 불러오기
 *   - `buildDiscourseRows`       : DiscourseScript → 원자 저장 RPC 가 받을 행 묶음 — 편집기 저장
 *
 * 렌더 저장소의 CLI(`pnpm discourse:export`)와 web-bo 편집기가 **같은 조립기**를 쓴다.
 * 둘이 각자 조립하면 파일과 화면이 갈라지고, 그 갈라짐은 영상이 렌더된 뒤에야 드러난다.
 *
 * ## 팩션과 다른 점 — 발언자 환원
 *
 * 담화는 인물(cast)과 발언(turns)이 형제다. 발언이 인물을 **배열 위치 정수**로 가리키고,
 * DB 에서는 그것이 FK(`speaker_id`)다. 이 파일이 그 두 표현 사이를 오간다.
 * FK 라서 없는 인물을 가리키면 DB 가 저장을 통째로 되돌린다(팩션 longformLayout 안전망과 같은 원리).
 *
 * ## supabase 클라이언트에 의존하지 않는다
 *
 * 이 패키지는 브라우저 번들에도 실리므로 `@supabase/supabase-js` 를 물지 않는다.
 * 대신 「행을 가져오는 함수」 하나만 주입받는다(`DiscourseRowSource`).
 */

import {
  joinEpisode, joinSpeaker, joinTurn,
  splitEpisode, splitSpeaker, splitTurn,
} from './discourse-schema'

export type Row = Record<string, unknown>

/** 담화 테이블 3종 */
export const DISCOURSE_TABLES = {
  episodes: 'discourse_episodes',
  speakers: 'discourse_speakers',
  turns: 'discourse_turns',
} as const

/**
 * `.in()` 한 번에 실을 값 개수. 이 저장소는 462개 id 를 단일 in() 에 실어 URL 한도를 넘겨
 * 실패한 실측 이력이 있다(AGENTS.md). 200 으로 끊는다.
 */
export const IN_CHUNK = 200

/** PostgREST 기본 상한. 정확히 이 수가 오면 절단을 의심한다 — 조용한 절단 금지. */
const PGREST_MAX_ROWS = 1000

/**
 * 행 공급자 — `<table>` 에서 `<col>` 이 `values` 중 하나인 행 전량.
 *
 * 정렬은 요구하지 않는다(조립기가 position 으로 다시 세운다). 실패는 **던져야** 한다 —
 * 빈 배열로 돌려주면 발언이 사라진 것을 성공으로 오인한다.
 */
export type DiscourseRowSource = (table: string, col: string, values: string[]) => Promise<Row[]>

/** 청크로 끊어 전량 조회. 청크 결과가 상한과 같으면 절단 의심으로 던진다. */
async function fetchRows(src: DiscourseRowSource, table: string, col: string, values: string[]): Promise<Row[]> {
  if (values.length === 0) return []
  const out: Row[] = []
  for (let i = 0; i < values.length; i += IN_CHUNK) {
    const rows = await src(table, col, values.slice(i, i + IN_CHUNK))
    if (rows.length === PGREST_MAX_ROWS) {
      throw new Error(`${table} 조회가 ${PGREST_MAX_ROWS}행에서 절단됐을 수 있다 — 청크를 줄여 재실행하라`)
    }
    out.push(...rows)
  }
  return out
}

const byPosition = (a: Row, b: Row) => (a.position as number) - (b.position as number)

export interface AssembledDiscourseEpisode {
  /** 세 파일을 합친 것과 같은 구조 (마커 `_generated` 는 붙이지 않는다) */
  script: Record<string, unknown>
  /** discourse_episodes 행 원문 — id·updated_at·status·registered·sort_order 를 호출 측이 쓴다 */
  row: Row
}

/**
 * DB 에서 한 에피소드를 DiscourseScript 구조로 재조립한다.
 *
 * @param original 원본 JSON(선택) — 음성 길이 병합에 쓴다(설계 §5 · 팩션 §7 ①).
 *   `duration`·`epithetDuration` 이 DB 에 없으면(null) 원본 값을 살려 넣는다.
 *   파이프라인이 파일에만 기록한 길이를 DB 왕복에서 잃지 않기 위한 안전망이다.
 *   **담화는 아직 음원이 0개라 지금은 무효 코드지만**, 음성 착수 시점에 곧바로 유효해진다.
 */
export async function assembleDiscourseEpisode(
  src: DiscourseRowSource,
  folder: string,
  original?: Record<string, unknown>,
): Promise<AssembledDiscourseEpisode> {
  const epRows = await src(DISCOURSE_TABLES.episodes, 'folder', [folder])
  const epRow = epRows[0]
  if (!epRow) throw new Error(`discourse_episodes 에 folder=${folder} 가 없다`)
  const episodeId = epRow.id as string

  const speakerRows = (await fetchRows(src, DISCOURSE_TABLES.speakers, 'episode_id', [episodeId])).sort(byPosition)
  const turnRows = (await fetchRows(src, DISCOURSE_TABLES.turns, 'episode_id', [episodeId])).sort(byPosition)

  // speaker_id → cast 배열 위치
  const indexBySpeakerId = new Map<string, number>()
  speakerRows.forEach((s, i) => indexBySpeakerId.set(s.id as string, i))

  const origCast = (original?.cast ?? []) as Row[]
  const origTurns = (original?.turns ?? []) as Row[]

  const cast = speakerRows.map((s, i) => {
    const speaker = joinSpeaker(s)
    const orig = origCast[i]
    if (orig && speaker.epithetDuration === undefined && orig.epithetDuration !== undefined) {
      speaker.epithetDuration = orig.epithetDuration
    }
    return speaker
  })

  const turns = turnRows.map((t, i) => {
    const castIndex = indexBySpeakerId.get(t.speaker_id as string)
    if (castIndex === undefined) {
      throw new Error(`발언 ${i + 1}번의 발언자를 인물에서 못 찾았다(${folder}): ${String(t.speaker_id)}`)
    }
    const toId = t.to_speaker_id as string | null
    let toIndex: number | undefined
    if (toId) {
      const idx = indexBySpeakerId.get(toId)
      if (idx === undefined) {
        throw new Error(`발언 ${i + 1}번의 대상 인물을 못 찾았다(${folder}): ${String(toId)}`)
      }
      toIndex = idx
    }
    const turn = joinTurn(t, castIndex, toIndex)
    const orig = origTurns[i]
    if (orig && turn.duration === undefined && orig.duration !== undefined) {
      turn.duration = orig.duration
    }
    return turn
  })

  return { script: joinEpisode(epRow, cast, turns), row: epRow }
}

/* ────────────────────────── 저장(분해) ────────────────────────── */

/** 원자 저장 RPC(`discourse_replace_episode`) 인자 묶음 */
export interface DiscourseRowPayload {
  /** discourse_episodes 컬럼 — folder·id 는 RPC 가 정한다 */
  episode: Row
  /** discourse_speakers 행 — id 를 미리 쥔다. episode_id 는 RPC 가 채운다 */
  speakers: Row[]
  /** discourse_turns 행 — speaker_id 는 위 id 로 미리 맺는다 */
  turns: Row[]
}

/**
 * 기존 DB 음성 길이 조회.
 *
 * ⚠ **자리(순번)만으로 찾으면 안 된다.** 발언 순서를 바꾸면 음원 파일은 그 사람의 그 발언을 따라
 *   옮겨 가는데 길이를 자리에 붙여 두면 그 자리에 남아, 옮겨온 음원과 길이가 어긋난다(컷 길이가 틀어진다).
 *   담화는 한 인물이 여러 번 말하는 것이 기본이라 팩션보다 더 흔하게 터진다(설계 §7-③).
 *   그래서 이 콜백은 **발언 자체와 발언자 slug, 그 사람의 몇 번째 발언인지**를 함께 받는다.
 */
export type TurnDurationLookup = (
  turnIndex: number, speaker: Row | undefined, nthOfSpeaker: number, turn: Row,
) => { duration?: number | null } | undefined

/** 인물 수식어 음성 길이 조회 — 사람(slug) 기준 */
export type SpeakerDurationLookup = (
  castIndex: number, slug: string | undefined, speaker: Row,
) => { epithetDuration?: number | null } | undefined

export interface BuildRowsOptions {
  /** slug → celebs.id. 모든 발언자는 저장 전에 DB 인물로 해소되어야 한다. */
  slugMap: Map<string, string>
  /** uuid 생성기 — 호출 측이 주입(shared 는 node:crypto 에 의존하지 않는다) */
  newId: () => string
  /**
   * 음성 길이 소유권(설계 §7) — 파이프라인이 쓰는 값이고 **사람이 입력하지 않는다.**
   * DB 에 값이 있으면 그 값을 쓰고(스크립트가 보낸 값으로 덮지 않는다),
   * DB 에 없고 스크립트에 있으면 채운다.
   */
  turnDurations?: TurnDurationLookup
  speakerDurations?: SpeakerDurationLookup
  /** DB 전용 메타 — 스크립트에 없으므로 현재 값을 그대로 실어 보낸다 */
  status: string
  registered: boolean
  sortOrder: number
}

/**
 * DiscourseScript 를 원자 저장 RPC 가 받을 행 묶음으로 분해한다.
 *
 * position = 배열 인덱스 + 1. 배열 순서가 곧 화면 순서이고, 음성 파일명(`T01-<slug>.wav`)·
 * 발화 시각 키가 전부 이 위치를 쓴다(설계 §3 판단 ①). 순서를 잃으면 영상과 음원이 어긋난다.
 *
 * 인물 uuid 를 먼저 만들어 발언의 `speaker_id` 를 미리 맺는다 — RPC 는 받은 행을 꽂기만 한다.
 */
export function buildDiscourseRows(
  script: Record<string, unknown>,
  opts: BuildRowsOptions,
): DiscourseRowPayload {
  const { newId, slugMap, turnDurations, speakerDurations } = opts
  const scriptCast = (script.cast ?? []) as Row[]
  const scriptTurns = (script.turns ?? []) as Row[]

  const { cols: epCols, data: epData } = splitEpisode(script)
  if (!epCols.title) throw new Error('에피소드 제목(title)이 비었다 — 저장할 수 없다')

  const speakerIds: string[] = []
  const speakers: Row[] = scriptCast.map((s, i) => {
    const { cols, data } = splitSpeaker(s)
    if (!cols.name) throw new Error(`인물 ${i + 1}번의 이름이 비었다 — 저장할 수 없다`)
    const id = newId()
    speakerIds.push(id)
    const slug = typeof s.slug === 'string' ? s.slug.trim() : ''
    if (!slug) throw new Error(`인물 ${i + 1}번(${String(cols.name)})의 DB 연결 slug가 비었다 — 저장할 수 없다`)
    const celebId = slugMap.get(slug)
    if (!celebId) {
      throw new Error(`인물 ${i + 1}번(${String(cols.name)})을 DB CELEB에서 찾지 못했다: ${slug}`)
    }
    const kept = speakerDurations?.(i, slug, s)
    return {
      id,
      position: i + 1,
      ...cols,
      epithet_duration: kept?.epithetDuration ?? (cols.epithet_duration as number | null) ?? null,
      celeb_id: celebId,
      data,
    }
  })

  // 사람별 발언 횟수 — 음성 길이 조회의 기준(§7-③)
  const seenBySpeaker = new Map<number, number>()

  const turns: Row[] = scriptTurns.map((t, i) => {
    const { cols, data } = splitTurn(t)
    const castIdx = t.cast as number
    if (!Number.isInteger(castIdx) || castIdx < 0 || castIdx >= speakerIds.length) {
      throw new Error(`발언 ${i + 1}번이 없는 인물(cast=${String(castIdx)})을 가리킨다 — 저장할 수 없다`)
    }
    let toSpeakerId: string | null = null
    if (t.to !== undefined && t.to !== null) {
      const toIdx = t.to as number
      if (!Number.isInteger(toIdx) || toIdx < 0 || toIdx >= speakerIds.length) {
        throw new Error(`발언 ${i + 1}번의 대상(to=${String(toIdx)})이 인물 범위 밖이다 — 저장할 수 없다`)
      }
      toSpeakerId = speakerIds[toIdx]
    }
    if (!cols.kind) throw new Error(`발언 ${i + 1}번의 종류(kind)가 비었다 — 저장할 수 없다`)
    if (cols.text === null || cols.text === undefined) {
      throw new Error(`발언 ${i + 1}번의 대사(text)가 비었다 — 저장할 수 없다`)
    }

    const nth = (seenBySpeaker.get(castIdx) ?? 0) + 1
    seenBySpeaker.set(castIdx, nth)
    const kept = turnDurations?.(i, scriptCast[castIdx], nth, t)

    return {
      id: newId(),
      position: i + 1,
      speaker_id: speakerIds[castIdx],
      to_speaker_id: toSpeakerId,
      ...cols,
      duration: kept?.duration ?? (cols.duration as number | null) ?? null,
      data,
    }
  })

  return {
    episode: {
      ...epCols,
      status: opts.status,
      registered: opts.registered,
      sort_order: opts.sortOrder,
      data: epData,
    },
    speakers,
    turns,
  }
}
