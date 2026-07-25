/**
 * export.ts — DB → faction-data.json 재조립
 *
 * 사용:
 *   pnpm faction:export -- --episode AI-Supremacy [--stdout]
 *   pnpm faction:export -- --all
 *
 * ⚠ Phase 1 은 **파일을 덮어쓰지 않는다.** 검증용으로 메모리·stdout 산출만 한다.
 *   파일 쓰기는 왕복 검증이 전 편 통과한 뒤 Phase 2 에서 발효한다.
 *   (faction-data.json 은 git 추적 밖 원본이라 섣불리 쓰면 복구가 불가능하다.)
 */

import {
  joinEpisode, joinGroup, joinCluster, joinPerson,
} from '@feelandnote/shared/lib/faction-schema'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  adminClient, readFactionData, parseArgs, selectEpisodes, pad,
  type EpisodeFolder,
} from './lib.js'

const USAGE = '사용: pnpm faction:export -- (--episode <폴더명> | --all) [--stdout]'

const IN_CHUNK = 200
/** PostgREST 기본 상한. 정확히 이 수가 오면 절단을 의심한다(조용한 절단 금지). */
const PGREST_MAX_ROWS = 1000

type Row = Record<string, unknown>

/** 자식 조회 — 부모 id 목록을 청크로 끊어 position 순으로 받는다 */
async function fetchChildren(
  db: SupabaseClient, table: string, fkCol: string, parentIds: string[],
): Promise<Row[]> {
  const out: Row[] = []
  for (let i = 0; i < parentIds.length; i += IN_CHUNK) {
    const chunk = parentIds.slice(i, i + IN_CHUNK)
    const { data, error } = await db.from(table).select('*').in(fkCol, chunk).order('position')
    if (error) throw new Error(`${table} 조회 실패: ${error.message}`)
    const rows = (data ?? []) as Row[]
    if (rows.length === PGREST_MAX_ROWS) {
      throw new Error(`${table} 조회가 ${PGREST_MAX_ROWS}행에서 절단됐을 수 있다 — 청크를 줄여 재실행하라`)
    }
    out.push(...rows)
  }
  return out
}

/**
 * DB 에서 한 에피소드를 faction-data.json 구조로 재조립한다.
 *
 * @param original 원본 JSON(선택) — 음성 길이 병합(§7 ①)에 쓴다.
 *   quoteDuration·epithetDuration 이 DB 에 없으면(null) 원본 값을 살려 넣는다.
 *   파이프라인이 JSON 에만 기록한 길이를 DB 왕복에서 잃지 않기 위한 장치다.
 */
export async function exportEpisode(
  db: SupabaseClient,
  folder: string,
  original?: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const { data: epRow, error: epErr } = await db
    .from('faction_episodes').select('*').eq('folder', folder).single()
  if (epErr) throw new Error(`faction_episodes 조회 실패(${folder}): ${epErr.message}`)

  const episodeId = epRow.id as string
  const { data: groupData, error: gErr } = await db
    .from('faction_groups').select('*').eq('episode_id', episodeId).order('position')
  if (gErr) throw new Error(`faction_groups 조회 실패(${folder}): ${gErr.message}`)
  const groupRows = (groupData ?? []) as Row[]

  const clusterRows = groupRows.length
    ? await fetchChildren(db, 'faction_clusters', 'group_id', groupRows.map(g => g.id as string))
    : []
  const personRows = clusterRows.length
    ? await fetchChildren(db, 'faction_people', 'cluster_id', clusterRows.map(c => c.id as string))
    : []

  // 부모별로 자식을 position 순으로 묶는다
  const clustersByGroup = new Map<string, Row[]>()
  for (const c of clusterRows) {
    const k = c.group_id as string
    if (!clustersByGroup.has(k)) clustersByGroup.set(k, [])
    clustersByGroup.get(k)!.push(c)
  }
  const peopleByCluster = new Map<string, Row[]>()
  for (const p of personRows) {
    const k = p.cluster_id as string
    if (!peopleByCluster.has(k)) peopleByCluster.set(k, [])
    peopleByCluster.get(k)!.push(p)
  }
  for (const arr of clustersByGroup.values()) arr.sort((a, b) => (a.position as number) - (b.position as number))
  for (const arr of peopleByCluster.values()) arr.sort((a, b) => (a.position as number) - (b.position as number))

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

  return joinEpisode(epRow as Row, groups, layout)
}

/* ────────────────────────── main ────────────────────────── */

async function main() {
  const args = parseArgs(process.argv, USAGE)
  const eps: EpisodeFolder[] = selectEpisodes(args)
  const db = adminClient()

  for (const ep of eps) {
    const original = readFactionData(ep.dataPath)
    const out = await exportEpisode(db, ep.folder, original)
    const groups = (out.groups ?? []) as Row[]
    const clusters = groups.reduce((a, g) => a + ((g.clusters ?? []) as Row[]).length, 0)
    const people = groups.reduce(
      (a, g) => a + ((g.clusters ?? []) as Row[]).reduce((b, c) => b + ((c.people ?? []) as Row[]).length, 0), 0,
    )
    if (args.stdout) {
      console.log(JSON.stringify(out, null, 2))
    } else {
      console.log(`  ✓ ${pad(ep.folder, 24)} 세력 ${pad(String(groups.length), 3)} 묶음 ${pad(String(clusters), 3)} 인물 ${people}`)
    }
  }
  if (!args.stdout) {
    console.log(`\n${eps.length}편 재조립 완료 (Phase 1 — 파일 쓰기 없음).`)
  }
}

// 직접 실행일 때만 CLI 로 동작한다(verify 가 exportEpisode 를 import 해 쓴다).
if (process.argv[1] && /export\.ts$/.test(process.argv[1].replace(/\\/g, '/'))) {
  main().catch(e => {
    console.error(`✗ ${e instanceof Error ? e.message : String(e)}`)
    process.exit(1)
  })
}
