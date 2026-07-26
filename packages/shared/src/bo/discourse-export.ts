/**
 * discourse-export.ts — 조립된 DiscourseScript 를 **세 파일**로 기록하는 코어 (서버 전용)
 *
 * DB 가 텍스트·구성의 단일 원천이고 세 파일은 **렌더용 빌드 산출물**이다(설계 §5).
 * 렌더 저장소의 CLI(`pnpm discourse:export`)와 web-bo 편집기의 자동 내보내기가 **이 한 곳**을 쓴다.
 * 파일 쓰기 규칙(마커·손 편집 가드·백업)이 두 벌이면 한쪽만 백업을 남기는 사고가 난다.
 *
 * ## 세 파일 문제 — 마커 하나로 셋을 다 지킨다
 *
 * 담화 한 편은 discourse-data.json(메타) · cast.json(인물) · turns.json(발언)으로 나뉜다.
 * 뒤 둘은 **최상위가 배열**이라 마커를 박을 자리가 없다. 그래서
 *   - 마커 `_generated` 는 discourse-data.json 첫 키에 **하나만** 박고,
 *   - checksum 은 **세 파일을 병합한 DiscourseScript 전체**로 계산한다.
 * 이러면 cast.json·turns.json 을 손으로 고쳐도 병합 체크섬이 어긋나 잡힌다.
 *
 * ## 손 편집 가드
 *
 * 다시 내보낼 때 세 파일을 읽어 체크섬을 재계산하고, 마커의 값과 다르면 **사람이 고쳤다는 뜻**이므로
 * 덮어쓰기를 중단하고 의미 차이를 JSON Pointer 로 돌려준 뒤 `force` 를 요구한다.
 * 마커가 없는 파일은 "아직 원천이던 시절"의 원본이다. 내용을 DB 와 대조해 차이가 있으면 막는다
 * (설계 §10 D2 — 이관 후 파일을 더 고친 상태에서 내보내면 그 작업이 조용히 되돌려진다).
 *
 * ## 백업
 *
 * 덮어쓰기 전 항상 `<에피소드>/.export-backup/<시각>/` 에 **세 파일 세트**로 보관하고 최근 10회만
 * 남긴다. 발효 전 원본은 `.export-backup/_original/` 에 **한 번만** 따로 복사해 회차 정리에서
 * 제외한다. **git 추적 밖 자산이 섞여 있어 이 백업이 유일한 원본 보존 수단이다.**
 */

import { createHash } from 'crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, copyFileSync } from 'fs'
import path from 'path'
import {
  checksumPayload, withGenerated, stripGenerated, diffPointers,
  mergeDiscourseFiles, splitDiscourseFiles,
  GENERATED_KEY, type GeneratedMarker,
} from '../lib/discourse-schema'

/** 에피소드당 남길 백업 회차 */
const BACKUP_KEEP = 10
const BACKUP_DIR = '.export-backup'
const DATA_FILE = 'discourse-data.json'
const CAST_FILE = 'cast.json'
const TURNS_FILE = 'turns.json'
const REGISTRY_FILE = '_episodes.json'

/** 한 편을 이루는 세 파일 이름 — 백업·복원이 같은 목록을 쓴다 */
export const DISCOURSE_FILES = [DATA_FILE, CAST_FILE, TURNS_FILE] as const

export const sha1 = (s: string) => createHash('sha1').update(s, 'utf8').digest('hex')

/** 마커를 뺀 문서의 체크섬 */
export const docChecksum = (doc: Record<string, unknown>) => sha1(checksumPayload(doc))

export interface DiscoursePaths {
  dir: string
  dataPath: string
  castPath: string
  turnsPath: string
}

/** 에피소드 폴더·세 파일 경로 */
export function discourseEpisodePaths(discoursesDir: string, folder: string): DiscoursePaths {
  const dir = path.join(discoursesDir, path.basename(folder))
  return {
    dir,
    dataPath: path.join(dir, DATA_FILE),
    castPath: path.join(dir, CAST_FILE),
    turnsPath: path.join(dir, TURNS_FILE),
  }
}

const readJson = (p: string) => JSON.parse(readFileSync(p, 'utf-8')) as unknown

/* ────────────────────────── 파일 상태 판정 ────────────────────────── */

export type DiscourseFileState =
  /** 세 파일 중 하나라도 없음 */
  | { kind: 'absent'; missing: string[] }
  /** 마커 없음 — 내보내기 발효 전 원본 */
  | { kind: 'pristine'; doc: Record<string, unknown> }
  /** 마커 있고 체크섬 일치 — 내보낸 그대로 */
  | { kind: 'generated'; doc: Record<string, unknown>; marker: GeneratedMarker }
  /** 마커 있고 체크섬 불일치 — 사람이 세 파일 중 하나라도 고쳤다 */
  | { kind: 'hand-edited'; doc: Record<string, unknown>; marker: GeneratedMarker; actual: string }

/**
 * 현재 세 파일이 어떤 상태인지 판정한다(쓰기 없음).
 * `doc` 은 항상 **마커를 뺀 병합본**이다(비교·체크섬의 기준).
 */
export function inspectDiscourseFiles(paths: DiscoursePaths): DiscourseFileState {
  const missing = ([[DATA_FILE, paths.dataPath], [CAST_FILE, paths.castPath], [TURNS_FILE, paths.turnsPath]] as const)
    .filter(([, p]) => !existsSync(p)).map(([n]) => n)
  if (missing.length) return { kind: 'absent', missing }

  const meta = readJson(paths.dataPath) as Record<string, unknown>
  const cast = readJson(paths.castPath) as unknown[]
  const turns = readJson(paths.turnsPath) as unknown[]
  const marker = meta[GENERATED_KEY] as GeneratedMarker | undefined
  const doc = mergeDiscourseFiles(stripGenerated(meta), cast, turns)

  if (!marker || typeof marker !== 'object' || !marker.checksum) return { kind: 'pristine', doc }
  const actual = docChecksum(doc)
  return actual === marker.checksum
    ? { kind: 'generated', doc, marker }
    : { kind: 'hand-edited', doc, marker, actual }
}

/* ────────────────────────── 백업 ────────────────────────── */

/**
 * 덮어쓰기 전 보관 — 세 파일 세트를 통째로. 최근 BACKUP_KEEP 회차만 남긴다.
 *
 * @param isPristine 발효 전 원본(마커 없음)인가. true 면 회차 보관과 별도로 `_original/` 에
 *   **한 번만** 복사하고 회차 정리에서 제외한다. 회차는 10회를 넘기면 지워지므로 그대로 두면
 *   되돌릴 수 없는 진짜 원본이 내보내기를 10번 더 돌리는 순간 사라진다.
 */
export function backupDiscourseFiles(paths: DiscoursePaths, isPristine: boolean): string | null {
  const present = DISCOURSE_FILES
    .map(n => path.join(paths.dir, n))
    .filter(p => existsSync(p))
  if (present.length === 0) return null
  const root = path.join(paths.dir, BACKUP_DIR)

  // ⚠ 백업 파일명은 반드시 `.bak` 접미사 — 원본과 같은 이름이면 렌더 로더의 자동 스캔이
  // 백업까지 번들에 물어가 Studio 가 무거워진다(26.07.26 팩션·담화 사본 130개 실측).
  if (isPristine) {
    const origDir = path.join(root, '_original')
    mkdirSync(origDir, { recursive: true })
    for (const p of present) {
      const dest = path.join(origDir, `${path.basename(p)}.bak`)
      // 이미 있으면 덮지 않는다 — 최초 1회가 원본이다
      if (!existsSync(dest)) copyFileSync(p, dest)
    }
  }
  // 파일명에 콜론을 쓸 수 없어 ISO 를 안전 문자로 바꾼다
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const dir = path.join(root, ts)
  mkdirSync(dir, { recursive: true })
  for (const p of present) copyFileSync(p, path.join(dir, `${path.basename(p)}.bak`))

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

export interface DiscourseExportResult {
  folder: string
  written: boolean
  reason: string
  backupDir?: string | null
  /** 막힌 경우 파일 ↔ DB 의 의미 차이 (JSON Pointer) */
  diffs?: string[]
}

export interface ExportToFilesOptions {
  folder: string
  paths: DiscoursePaths
  /**
   * DB 조립기. 현재 파일 내용(병합본)을 `original` 로 받아 음성 길이 병합(설계 §5)에 쓴다.
   * `episodeId` 는 마커에 박는다.
   */
  assemble: (original?: Record<string, unknown>) => Promise<{
    script: Record<string, unknown>
    episodeId: string
  }>
  /** 손 편집·발효 전 차이가 감지돼도 덮어쓴다 */
  force?: boolean
}

function writeJsonFile(fp: string, value: unknown): void {
  writeFileSync(fp, JSON.stringify(value, null, 2) + '\n', 'utf-8')
}

/**
 * 한 에피소드를 DB 에서 뽑아 세 파일로 쓴다. 막히면 `written:false` + 사유·차이를 돌려준다(던지지 않는다).
 * 조립 자체가 실패하면(에피소드 없음 등) 그건 진짜 오류라 던진다.
 */
export async function exportDiscourseEpisodeToFiles(opts: ExportToFilesOptions): Promise<DiscourseExportResult> {
  const { folder, paths, force } = opts
  const state = inspectDiscourseFiles(paths)
  // 음성 길이 병합은 현재 파일 내용을 원본으로 삼는다
  const original = state.kind === 'absent' ? undefined : state.doc
  const { script: fresh, episodeId } = await opts.assemble(original)

  if (state.kind === 'hand-edited' && !force) {
    const diffs = diffPointers(state.doc, stripGenerated(fresh))
    return {
      folder, written: false, diffs,
      reason: `손 편집 감지 — 파일 체크섬 ${state.actual.slice(0, 8)} ≠ 마커 ${state.marker.checksum.slice(0, 8)}`,
    }
  }

  /**
   * 발효 전 파일(마커 없음)은 체크섬으로 손 편집을 가릴 수 없다. 그래서 **내용을 DB 와 대조**해
   * 파일에만 있는 변경이 있으면 막는다. 설계 §10 D2(유저 WIP 충돌) 대비.
   */
  if (state.kind === 'pristine' && !force) {
    const diffs = diffPointers(state.doc, stripGenerated(fresh))
    if (diffs.length) {
      return {
        folder, written: false, diffs,
        reason: `발효 전 파일이 DB 와 다르다 — 차이 ${diffs.length}곳. 파일 쪽이 최신이면 먼저 \`pnpm discourse:import\``,
      }
    }
  }

  const marker: GeneratedMarker = {
    from: 'db',
    at: new Date().toISOString(),
    episodeId,
    checksum: docChecksum(fresh),
  }
  const { meta, cast, turns } = splitDiscourseFiles(stripGenerated(fresh))

  const backupDir = backupDiscourseFiles(paths, state.kind === 'pristine')
  mkdirSync(paths.dir, { recursive: true })
  writeJsonFile(paths.dataPath, withGenerated(meta, marker))
  writeJsonFile(paths.castPath, cast)
  writeJsonFile(paths.turnsPath, turns)

  const reason = state.kind === 'pristine' ? '첫 발효(원본 백업 후 덮어씀)'
    : state.kind === 'absent' ? '신규 생성'
    : state.kind === 'hand-edited' ? '손 편집 무시(force)'
    : '갱신'
  return { folder, written: true, reason, backupDir }
}

/**
 * `_episodes.json` 재생성 — 렌더 로더가 static import 하는 등록 화이트리스트다.
 * 형식(2칸 들여쓰기 + 끝 개행)을 유지하고, 내용이 같으면 파일을 건드리지 않는다.
 */
export function writeDiscourseRegistry(discoursesDir: string, folders: string[]): { changed: boolean } {
  const p = path.join(discoursesDir, REGISTRY_FILE)
  const next = JSON.stringify(folders, null, 2) + '\n'
  const prev = existsSync(p) ? readFileSync(p, 'utf-8') : ''
  if (prev === next) return { changed: false }
  writeFileSync(p, next, 'utf-8')
  return { changed: true }
}
