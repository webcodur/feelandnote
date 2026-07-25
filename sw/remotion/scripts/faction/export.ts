/**
 * export.ts — DB → faction-data.json 재조립·기록 (Phase 2 발효)
 *
 * 사용:
 *   pnpm faction:export -- --episode AI-Supremacy [--force]
 *   pnpm faction:export -- --all [--force]
 *   pnpm faction:export -- --episode X --stdout   # 화면 출력만(파일 안 씀)
 *
 * DB 가 텍스트·구성의 단일 원천이고 faction-data.json 은 **렌더용 빌드 산출물**이다(문서 §6).
 * 그래서 이 스크립트가 파일을 만든다. 사람이 파일을 고치는 건 금지이고, 아래 장치로 강제한다.
 *
 * ## 손 편집 가드
 *
 * 파일 첫 키에 `_generated {from,at,episodeId,checksum}` 마커를 박는다. checksum 은 마커 자신을
 * 뺀 문서의 정규 직렬화 sha1 이다. 다시 export 할 때 파일을 읽어 체크섬을 재계산하고, 마커의
 * 값과 다르면 **사람이 고쳤다는 뜻**이므로 덮어쓰기를 중단하고 의미 차이를 JSON Pointer 로
 * 출력한 뒤 `--force` 를 요구한다.
 *
 * 마커가 없는 파일은 "아직 원천이던 시절"의 원본이다. 첫 export 시 백업만 남기고 덮어쓴다.
 *
 * ## 백업
 *
 * 덮어쓰기 전 항상 `<에피소드>/.export-backup/<timestamp>/faction-data.json` 으로 보관하고
 * 에피소드당 최근 10회만 남긴다. **git 추적 밖 자산이라 이 백업이 유일한 원본 보존 수단이다.**
 */

import {
  joinEpisode, joinGroup, joinCluster, joinPerson,
  checksumPayload, withGenerated, stripGenerated, diffPointers,
  GENERATED_KEY, type GeneratedMarker,
} from '@feelandnote/shared/lib/faction-schema'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync, copyFileSync, statSync } from 'fs'
import path from 'path'
import {
  adminClient, readFactionData, parseArgs, selectEpisodes, pad, FACTIONS_DIR, scanEpisodes,
  type EpisodeFolder,
} from './lib.js'

const USAGE = '사용: pnpm faction:export -- (--episode <폴더명> | --all) [--force] [--stdout]'

/** 에피소드당 남길 백업 회차 */
const BACKUP_KEEP = 10
const BACKUP_DIR = '.export-backup'

export const sha1 = (s: string) => createHash('sha1').update(s, 'utf8').digest('hex')

/** 마커를 뺀 문서의 체크섬 */
export const docChecksum = (doc: Record<string, unknown>) => sha1(checksumPayload(doc))

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

/* ────────────────────────── 파일 상태 판정 ────────────────────────── */

export type FileState =
  | { kind: 'absent' }
  /** 마커 없음 — export 발효 전 원본 */
  | { kind: 'pristine'; doc: Record<string, unknown> }
  /** 마커 있고 체크섬 일치 — 내보낸 그대로 */
  | { kind: 'generated'; doc: Record<string, unknown>; marker: GeneratedMarker }
  /** 마커 있고 체크섬 불일치 — 사람이 고쳤다 */
  | { kind: 'hand-edited'; doc: Record<string, unknown>; marker: GeneratedMarker; actual: string }

/** 현재 파일이 어떤 상태인지 판정한다(쓰기 없음) */
export function inspectFile(dataPath: string): FileState {
  if (!existsSync(dataPath)) return { kind: 'absent' }
  const doc = readFactionData(dataPath)
  const marker = doc[GENERATED_KEY] as GeneratedMarker | undefined
  if (!marker || typeof marker !== 'object' || !marker.checksum) return { kind: 'pristine', doc }
  const actual = docChecksum(doc)
  return actual === marker.checksum
    ? { kind: 'generated', doc, marker }
    : { kind: 'hand-edited', doc, marker, actual }
}

/* ────────────────────────── 백업 ────────────────────────── */

/**
 * 덮어쓰기 전 보관 — 최근 BACKUP_KEEP 회차만 남긴다.
 *
 * @param isPristine 발효 전 원본(마커 없음)인가. true 면 회차 보관과 별도로
 *   `_original/` 에 **한 번만** 복사하고 회차 정리에서 제외한다.
 *   회차는 10회를 넘기면 지워지므로, 그대로 두면 되돌릴 수 없는 진짜 원본이
 *   export 를 10번 더 돌리는 순간 사라진다. 이 저장소는 추적 밖 자산을
 *   영구 소실한 이력이 여러 번 있다.
 */
function backup(episodeDir: string, dataPath: string, isPristine: boolean): string | null {
  if (!existsSync(dataPath)) return null
  const root = path.join(episodeDir, BACKUP_DIR)

  if (isPristine) {
    const origDir = path.join(root, '_original')
    const origFile = path.join(origDir, 'faction-data.json')
    // 이미 있으면 덮지 않는다 — 최초 1회가 원본이다
    if (!existsSync(origFile)) {
      mkdirSync(origDir, { recursive: true })
      copyFileSync(dataPath, origFile)
    }
  }
  // 파일명에 콜론을 쓸 수 없어 ISO 를 안전 문자로 바꾼다
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = path.join(root, ts)
  mkdirSync(dir, { recursive: true })
  copyFileSync(dataPath, path.join(dir, 'faction-data.json'))

  // 회차 정리 — 이름이 ISO 기반이라 사전순 = 시간순. `_original` 은 회차가 아니라 성역이다.
  const rounds = readdirSync(root)
    .filter(n => n !== '_original' && statSync(path.join(root, n)).isDirectory())
    .sort()
  for (const old of rounds.slice(0, Math.max(0, rounds.length - BACKUP_KEEP))) {
    rmSync(path.join(root, old), { recursive: true, force: true })
  }
  return dir
}

/* ────────────────────────── 기록 ────────────────────────── */

export interface WriteResult {
  folder: string
  written: boolean
  reason: string
  backupDir?: string | null
  diffs?: string[]
}

/**
 * 한 에피소드를 DB 에서 뽑아 파일로 쓴다.
 *
 * @param force 손 편집이 감지돼도 덮어쓴다
 */
async function writeEpisode(
  db: SupabaseClient, ep: EpisodeFolder, force: boolean,
): Promise<WriteResult> {
  const state = inspectFile(ep.dataPath)
  // 음성 길이 병합(§7 ①)은 현재 파일 내용을 원본으로 삼는다
  const original = state.kind === 'absent' ? undefined : state.doc
  const fresh = await exportEpisode(db, ep.folder, original)

  if (state.kind === 'hand-edited' && !force) {
    // 사람이 고친 내용 ↔ DB 산출물의 의미 차이를 보여준다
    const diffs = diffPointers(stripGenerated(state.doc), stripGenerated(fresh))
    return {
      folder: ep.folder, written: false, diffs,
      reason: `손 편집 감지 — 파일 체크섬 ${state.actual.slice(0, 8)} ≠ 마커 ${state.marker.checksum.slice(0, 8)}`,
    }
  }

  /**
   * 발효 전 파일(마커 없음)은 체크섬으로 손 편집을 가릴 수 없다. 그래서 **내용을 DB 와 대조**해
   * 파일에만 있는 변경이 있으면 막는다. 문서 §11 R3(유저 WIP 충돌, 위험도 최상) 대비 —
   * 이관 후 사람이 파일을 더 고친 상태에서 첫 export 를 돌리면 그 작업이 조용히 되돌려진다.
   * 백업이 남더라도 되돌림 자체가 사고이므로 먼저 faction:import 로 DB 에 흡수시켜야 한다.
   */
  if (state.kind === 'pristine' && !force) {
    const diffs = diffPointers(stripGenerated(state.doc), stripGenerated(fresh))
    if (diffs.length) {
      return {
        folder: ep.folder, written: false, diffs,
        reason: `발효 전 파일이 DB 와 다르다 — 차이 ${diffs.length}곳. 파일 쪽이 최신이면 먼저 \`pnpm faction:import\``,
      }
    }
  }

  const { data: idRow, error } = await db
    .from('faction_episodes').select('id').eq('folder', ep.folder).single()
  if (error) throw new Error(`episodeId 조회 실패(${ep.folder}): ${error.message}`)

  const marker: GeneratedMarker = {
    from: 'db',
    at: new Date().toISOString(),
    episodeId: idRow.id as string,
    checksum: docChecksum(fresh),
  }
  const doc = withGenerated(fresh, marker)

  const backupDir = backup(ep.dir, ep.dataPath, state.kind === 'pristine')
  writeFileSync(ep.dataPath, JSON.stringify(doc, null, 2) + '\n', 'utf-8')

  const reason = state.kind === 'pristine' ? '첫 발효(원본 백업 후 덮어씀)'
    : state.kind === 'absent' ? '신규 생성'
    : state.kind === 'hand-edited' ? '손 편집 무시(--force)'
    : '갱신'
  return { folder: ep.folder, written: true, reason, backupDir }
}

/**
 * `_episodes.json` 재생성 — DB 의 registered=true 를 sort_order 순으로.
 * 렌더 로더가 static import 하는 등록 화이트리스트다. 형식(2칸 들여쓰기 + 끝 개행)을 유지한다.
 */
export async function regenerateEpisodeRegistry(db: SupabaseClient): Promise<{ changed: boolean; list: string[] }> {
  const { data, error } = await db
    .from('faction_episodes').select('folder,sort_order')
    .eq('registered', true).order('sort_order')
  if (error) throw new Error(`등록 에피소드 조회 실패: ${error.message}`)
  const list = (data ?? []).map(r => r.folder as string)
  const p = path.join(FACTIONS_DIR, '_episodes.json')
  const next = JSON.stringify(list, null, 2) + '\n'
  const prev = existsSync(p) ? readFileSync(p, 'utf-8') : ''
  if (prev === next) return { changed: false, list }
  writeFileSync(p, next, 'utf-8')
  return { changed: true, list }
}

/* ────────────────────────── main ────────────────────────── */

async function main() {
  const args = parseArgs(process.argv, USAGE)
  const eps: EpisodeFolder[] = selectEpisodes(args)
  const db = adminClient()

  // --stdout 은 진단용 — 파일을 쓰지 않는다
  if (args.stdout) {
    for (const ep of eps) {
      const out = await exportEpisode(db, ep.folder, readFactionData(ep.dataPath))
      console.log(JSON.stringify(out, null, 2))
    }
    return
  }

  console.log(`대상 ${eps.length}편${args.force ? ' (--force — 손 편집 덮어씀)' : ''}`)
  const results: WriteResult[] = []
  for (const ep of eps) {
    const r = await writeEpisode(db, ep, args.force)
    results.push(r)
    if (r.written) {
      console.log(`  ✓ ${pad(ep.folder, 24)} ${r.reason}`)
    } else {
      console.log(`  ✗ ${pad(ep.folder, 24)} ${r.reason}`)
      for (const d of (r.diffs ?? []).slice(0, 20)) console.log(`        · ${d}`)
      if ((r.diffs?.length ?? 0) > 20) console.log(`        … 외 ${r.diffs!.length - 20}건`)
    }
  }

  const blocked = results.filter(r => !r.written)
  console.log(`\n기록 ${results.length - blocked.length}편 · 중단 ${blocked.length}편`)

  // 등록 목록 재생성은 전량 export 일 때만(단일 에피소드 export 는 목록을 건드리지 않는다)
  if (args.all) {
    const reg = await regenerateEpisodeRegistry(db)
    console.log(`_episodes.json ${reg.changed ? '갱신' : '변화 없음(byte 동일)'} — 등록 ${reg.list.length}편`)
  }

  if (blocked.length) {
    console.log('\n손 편집된 파일은 DB 를 고친 뒤 다시 export 하거나, 파일 내용을 버릴 각오면 --force 를 준다.')
    process.exitCode = 1
  }
}

// 직접 실행일 때만 CLI 로 동작한다(verify 가 exportEpisode 를 import 해 쓴다).
if (process.argv[1] && /export\.ts$/.test(process.argv[1].replace(/\\/g, '/'))) {
  main().catch(e => {
    console.error(`✗ ${e instanceof Error ? e.message : String(e)}`)
    process.exit(1)
  })
}
