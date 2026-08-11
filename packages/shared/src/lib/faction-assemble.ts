/**
 * faction-assemble.ts — DB ↔ FactionScript 조립·분해 오케스트레이션 단일원천(SSoT)
 *
 * `faction-schema.ts` 가 **한 계층**의 split/join 규칙을 쥔다면, 이 파일은 **에피소드 한 편 전체**를
 * 오르내리는 절차를 쥔다:
 *   - `assembleFactionEpisode` : DB 4계층 행 → faction-data.json 구조 (내보내기·편집기 불러오기)
 *   - `buildFactionRows`       : FactionScript → 원자 저장 RPC 가 받을 행 묶음 (편집기 저장)
 *
 * 렌더 저장소의 CLI(`pnpm faction:export`)와 web-bo 편집기가 **같은 조립기**를 쓴다.
 * 둘이 각자 조립하면 파일과 화면이 갈라지고, 그 갈라짐은 영상이 렌더된 뒤에야 드러난다.
 *
 * ## supabase 클라이언트에 의존하지 않는다
 *
 * 이 패키지는 브라우저 번들에도 실리므로 `@supabase/supabase-js` 를 물지 않는다.
 * 대신 「행을 가져오는 함수」 하나만 주입받는다(`FactionRowSource`). 청크 끊기와 절단 감시는
 * 여기서 하므로 호출 측 어댑터는 10줄이면 된다.
 */

import {
  joinEpisode, joinGroup, joinCluster, joinPerson,
  splitEpisode, splitGroup, splitCluster, splitPerson,
} from './faction-schema'
import { assertIndividualFactionSubject } from './faction-person-subject'

export type Row = Record<string, unknown>

/** 팩션 테이블 4종 */
export const FACTION_TABLES = {
  episodes: 'faction_episodes',
  groups: 'faction_groups',
  clusters: 'faction_clusters',
  people: 'faction_people',
  parts: 'faction_episode_parts',
} as const

/**
 * `.in()` 한 번에 실을 값 개수. 이 저장소는 462개 id 를 단일 in() 에 실어 URL 한도를 넘겨
 * 실패한 실측 이력이 있다(docs/project/remotion/faction-unification.md §5). 200 으로 끊는다.
 */
export const IN_CHUNK = 200

/** PostgREST 기본 상한. 정확히 이 수가 오면 절단을 의심한다 — 조용한 절단 금지. */
const PGREST_MAX_ROWS = 1000

/**
 * 행 공급자 — `<table>` 에서 `<col>` 이 `values` 중 하나인 행 전량.
 *
 * 정렬은 요구하지 않는다(조립기가 position 으로 다시 세운다). 실패는 **던져야** 한다 —
 * 빈 배열로 돌려주면 인물이 사라진 것을 성공으로 오인한다.
 */
export type FactionRowSource = (table: string, col: string, values: string[]) => Promise<Row[]>

/** 청크로 끊어 전량 조회. 청크 결과가 상한과 같으면 절단 의심으로 던진다. */
async function fetchRows(src: FactionRowSource, table: string, col: string, values: string[]): Promise<Row[]> {
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

/** 부모 id 로 자식을 묶고 position 순으로 세운다 */
function groupByFk(rows: Row[], fkCol: string): Map<string, Row[]> {
  const m = new Map<string, Row[]>()
  for (const r of rows) {
    const k = r[fkCol] as string
    if (!m.has(k)) m.set(k, [])
    m.get(k)!.push(r)
  }
  for (const arr of m.values()) arr.sort(byPosition)
  return m
}

export interface AssembledEpisode {
  /** faction-data.json 과 같은 구조 (마커 `_generated` 는 붙이지 않는다) */
  script: Record<string, unknown>
  /** faction_episodes 행 원문 — id·updated_at·status·registered·sort_order 를 호출 측이 쓴다 */
  row: Row
}

/**
 * DB 에서 한 에피소드를 faction-data.json 구조로 재조립한다.
 *
 * @param original 원본 JSON(선택) — 음성 길이 병합(문서 §7 ①)에 쓴다.
 *   quoteDuration·epithetDuration 이 DB 에 없으면(null) 원본 값을 살려 넣는다.
 *   파이프라인이 JSON 에만 기록한 길이를 DB 왕복에서 잃지 않기 위한 안전망이다.
 */
export async function assembleFactionEpisode(
  src: FactionRowSource,
  folder: string,
  original?: Record<string, unknown>,
): Promise<AssembledEpisode> {
  const epRows = await src(FACTION_TABLES.episodes, 'folder', [folder])
  const epRow = epRows[0]
  if (!epRow) throw new Error(`faction_episodes 에 folder=${folder} 가 없다`)
  const episodeId = epRow.id as string

  const groupRows = (await fetchRows(src, FACTION_TABLES.groups, 'episode_id', [episodeId])).sort(byPosition)
  const clusterRows = await fetchRows(src, FACTION_TABLES.clusters, 'group_id', groupRows.map(g => g.id as string))
  const personRows = await fetchRows(src, FACTION_TABLES.people, 'cluster_id', clusterRows.map(c => c.id as string))

  const clustersByGroup = groupByFk(clusterRows, 'group_id')
  const peopleByCluster = groupByFk(personRows, 'cluster_id')

  // 원본에서 같은 자리의 인물을 찾아 음성 길이를 병합한다(자리 = 세력·묶음·인물 순번)
  const origGroups = (original?.groups ?? []) as Row[]
  const origPersonAt = (gi: number, ci: number, pi: number): Row | undefined => {
    const g = origGroups[gi]
    if (!g) return undefined
    const c = ((g.clusters ?? []) as Row[])[ci]
    if (!c) return undefined
    return ((c.people ?? []) as Row[])[pi]
  }

  const groups = groupRows.map((g, gi) => {
    const clusters = (clustersByGroup.get(g.id as string) ?? []).map((c, ci) => {
      const people = (peopleByCluster.get(c.id as string) ?? []).map((p, pi) => {
        assertIndividualFactionSubject(p.name, p.name_en, `${folder} 세력 ${gi + 1}·묶음 ${ci + 1}·인물 ${pi + 1}`)
        const person = joinPerson(p)
        // §7 ① — DB 에 음성 길이가 없으면 원본 JSON 값을 살린다
        const orig = origPersonAt(gi, ci, pi)
        if (orig) {
          if (person.quoteDuration === undefined && orig.quoteDuration !== undefined) {
            person.quoteDuration = orig.quoteDuration
          }
          if (person.epithetDuration === undefined && orig.epithetDuration !== undefined) {
            person.epithetDuration = orig.epithetDuration
          }
        }
        return person
      })
      return joinCluster(c, people)
    })
    return joinGroup(g, clusters)
  })

  // longform_layout — {groupId:uuid} → {group:index}
  const storedLayout = epRow.longform_layout as Row[] | null
  let layout: unknown[] | undefined
  if (storedLayout) {
    const indexByGroupId = new Map<string, number>()
    groupRows.forEach((g, i) => indexByGroupId.set(g.id as string, i))
    layout = storedLayout.map(item => {
      if (item && typeof item === 'object' && 'groupId' in item) {
        const gi = indexByGroupId.get(item.groupId as string)
        if (gi === undefined) {
          throw new Error(`longform_layout 의 groupId 를 세력에서 못 찾았다(${folder}): ${String(item.groupId)}`)
        }
        return { group: gi }
      }
      return item
    })
  }

  return { script: joinEpisode(epRow, groups, layout), row: epRow }
}

/* ────────────────────────── 저장(분해) ────────────────────────── */

/** 원자 저장 RPC(`faction_replace_episode`) 인자 묶음 */
export interface FactionRowPayload {
  /** faction_episodes 컬럼 — folder·id 는 RPC 가 정한다 */
  episode: Row
  /** faction_groups 행 — id 를 미리 쥔다. episode_id 는 RPC 가 채운다 */
  groups: Row[]
  clusters: Row[]
  people: Row[]
  parts: { part: number; comment: string }[]
}

/**
 * 기존 DB 음성 길이 조회.
 *
 * ⚠ **자리(순번)만으로 찾으면 안 된다.** 인물 순서를 바꾸면 음원 파일은 인물을 따라 옮겨 가는데
 *   길이를 자리에 붙여 두면 그 자리에 남아, 옮겨온 음원과 길이가 어긋난다(컷 길이가 틀어진다).
 *   그래서 이 콜백은 인물 자체도 함께 받아 **사람을 기준으로** 찾을 수 있게 한다.
 *   자리는 같은 사람이 한 편에 두 번 나오는 경우의 보조 단서로만 쓴다.
 */
export type DurationLookup = (
  gi: number, ci: number, pi: number, person: Row,
) => { quoteDuration?: number | null; epithetDuration?: number | null } | undefined

export interface BuildRowsOptions {
  /** 레거시 파일을 처음 가져올 때만 쓰는 slug → celebs.id 해소표 */
  slugMap?: Map<string, string>
  /** tagSlug → celeb_tags.id. tagSlug 원문은 data 에 남는다 */
  tagMap?: Map<string, string>
  /** uuid 생성기 — 호출 측이 주입(shared 는 node:crypto 에 의존하지 않는다) */
  newId: () => string
  /**
   * 음성 길이 소유권(문서 §7) — 파이프라인이 쓰는 값이고 **사람이 입력하지 않는다.**
   * DB 에 값이 있으면 그 값을 쓰고(스크립트가 보낸 값으로 덮지 않는다),
   * DB 에 없고 스크립트에 있으면 채운다.
   */
  durations?: DurationLookup
  /** DB 전용 메타 — 스크립트에 없으므로 현재 값을 그대로 실어 보낸다 */
  status: string
  registered: boolean
  sortOrder: number
  /** 편별 고정 댓글(comment.p<N>.txt 대체) */
  parts?: { part: number; comment: string }[]
}

/**
 * FactionScript 를 원자 저장 RPC 가 받을 행 묶음으로 분해한다.
 *
 * position = 배열 인덱스 + 1. 배열 순서가 곧 화면 순서이고, 음성 파일명·타이밍 키·받아쓰기 키가
 * 전부 이 위치를 쓴다(문서 §3). 순서를 잃으면 영상과 음원이 어긋난다.
 *
 * 하위 행의 FK 는 여기서 만든 uuid 로 미리 맺는다 — RPC 는 받은 행을 꽂기만 한다.
 */
export function buildFactionRows(
  script: Record<string, unknown>,
  opts: BuildRowsOptions,
): FactionRowPayload {
  const { newId, slugMap, tagMap, durations } = opts
  const scriptGroups = (script.groups ?? []) as Row[]

  const { cols: epCols, data: epData } = splitEpisode(script)
  if (!epCols.title) throw new Error('에피소드 제목(title)이 비었다 — 저장할 수 없다')

  const groups: Row[] = []
  const clusters: Row[] = []
  const people: Row[] = []
  const groupIds: string[] = []

  scriptGroups.forEach((g, gi) => {
    const { cols, data } = splitGroup(g)
    if (!cols.name) throw new Error(`세력 ${gi + 1}번의 이름이 비었다 — 저장할 수 없다`)
    const groupId = newId()
    groupIds.push(groupId)
    const tagSlug = g.tagSlug as string | undefined
    groups.push({
      id: groupId,
      position: gi + 1,
      ...cols,
      tag_id: (tagSlug && tagMap?.get(tagSlug)) ?? null,
      data,
    })

    ;((g.clusters ?? []) as Row[]).forEach((c, ci) => {
      const { cols: cCols, data: cData } = splitCluster(c)
      const clusterId = newId()
      clusters.push({ id: clusterId, group_id: groupId, position: ci + 1, ...cCols, data: cData })

      ;((c.people ?? []) as Row[]).forEach((p, pi) => {
        const { cols: pCols, data: pData, mined } = splitPerson(p)
        if (!pCols.name) throw new Error(`세력 ${gi + 1}·묶음 ${ci + 1}·인물 ${pi + 1}의 이름이 비었다 — 저장할 수 없다`)
        assertIndividualFactionSubject(
          pCols.name,
          pCols.name_en,
          `세력 ${gi + 1}·묶음 ${ci + 1}·인물 ${pi + 1}`,
        )
        const slug = p.slug as string | undefined
        const explicitCelebId = typeof pCols.celeb_id === 'string' && pCols.celeb_id
          ? pCols.celeb_id
          : undefined
        const resolvedCelebId = slug ? slugMap?.get(slug) : undefined
        if (explicitCelebId && resolvedCelebId && explicitCelebId !== resolvedCelebId) {
          throw new Error(`세력 ${gi + 1}·묶음 ${ci + 1}·인물 ${pi + 1}의 celebId와 slug가 서로 다른 DB 인물을 가리킨다`)
        }
        const celebId = explicitCelebId ?? resolvedCelebId
        if (!celebId) {
          throw new Error(`세력 ${gi + 1}·묶음 ${ci + 1}·인물 ${pi + 1}(${String(pCols.name)})이 DB CELEB에 연결되지 않았다`)
        }
        // §7 — 음성 길이는 파이프라인 소유. DB 값이 있으면 그것을 신뢰한다.
        const kept = durations?.(gi, ci, pi, p)
        const quoteDuration = kept?.quoteDuration ?? (pCols.quote_duration as number | null) ?? null
        const epithetDuration = kept?.epithetDuration ?? (pCols.epithet_duration as number | null) ?? null
        people.push({
          id: newId(),
          cluster_id: clusterId,
          position: pi + 1,
          ...pCols,
          quote_duration: quoteDuration,
          epithet_duration: epithetDuration,
          celeb_id: celebId,
          mined,
          data: pData,
        })
      })
    })
  })

  // longformLayout — {group:index} → {groupId:uuid}. 범위 밖 인덱스는 저장 전에 막는다.
  const layout = script.longformLayout as Row[] | undefined
  let longformLayout: unknown[] | null = null
  if (layout) {
    longformLayout = layout.map((item, i) => {
      if (item && typeof item === 'object' && 'group' in item) {
        const gi = item.group as number
        if (!Number.isInteger(gi) || gi < 0 || gi >= groupIds.length) {
          throw new Error(`롱폼 배치 ${i + 1}번이 없는 세력(${gi})을 가리킨다 — 저장할 수 없다`)
        }
        return { groupId: groupIds[gi] }
      }
      return item
    })
  }

  return {
    episode: {
      ...epCols,
      status: opts.status,
      registered: opts.registered,
      sort_order: opts.sortOrder,
      longform_layout: longformLayout,
      data: epData,
    },
    groups,
    clusters,
    people,
    parts: opts.parts ?? [],
  }
}
