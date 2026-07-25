/**
 * faction-export.ts — 조립된 FactionScript 를 faction-data.json 으로 기록하는 코어 (서버 전용)
 *
 * DB 가 텍스트·구성의 단일 원천이고 faction-data.json 은 **렌더용 빌드 산출물**이다(문서 §6).
 * 렌더 저장소의 CLI(`pnpm faction:export`)와 web-bo 편집기의 자동 내보내기가 **이 한 곳**을 쓴다.
 * 파일 쓰기 규칙(마커·손 편집 가드·백업)이 두 벌이면 한쪽만 백업을 남기는 사고가 난다.
 *
 * ## 손 편집 가드
 *
 * 파일 첫 키에 `_generated {from,at,episodeId,checksum}` 마커를 박는다. checksum 은 마커 자신을
 * 뺀 문서의 정규 직렬화 sha1 이다. 다시 내보낼 때 파일을 읽어 체크섬을 재계산하고, 마커의 값과
 * 다르면 **사람이 고쳤다는 뜻**이므로 덮어쓰기를 중단하고 의미 차이를 JSON Pointer 로 돌려준 뒤
 * `force` 를 요구한다.
 *
 * 마커가 없는 파일은 "아직 원천이던 시절"의 원본이다. 내용을 DB 와 대조해 차이가 있으면 막는다
 * (문서 §11 R3 — 이관 후 파일을 더 고친 상태에서 내보내면 그 작업이 조용히 되돌려진다).
 *
 * ## 백업
 *
 * 덮어쓰기 전 항상 `<에피소드>/.export-backup/<시각>/faction-data.json` 으로 보관하고 최근 10회만
 * 남긴다. 발효 전 원본은 `.export-backup/_original/` 에 **한 번만** 따로 복사해 회차 정리에서
 * 제외한다. **git 추적 밖 자산이라 이 백업이 유일한 원본 보존 수단이다.**
 */

import { createHash } from 'crypto'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, copyFileSync } from 'fs'
import path from 'path'
import {
  checksumPayload, withGenerated, stripGenerated, diffPointers,
  GENERATED_KEY, type GeneratedMarker,
} from '../lib/faction-schema'

/** 에피소드당 남길 백업 회차 */
const BACKUP_KEEP = 10
const BACKUP_DIR = '.export-backup'
const DATA_FILE = 'faction-data.json'
const REGISTRY_FILE = '_episodes.json'

export const sha1 = (s: string) => createHash('sha1').update(s, 'utf8').digest('hex')

/** 마커를 뺀 문서의 체크섬 */
export const docChecksum = (doc: Record<string, unknown>) => sha1(checksumPayload(doc))

/** 에피소드 폴더·데이터 파일 경로 */
export function factionEpisodePaths(factionsDir: string, folder: string): { dir: string; dataPath: string } {
  const dir = path.join(factionsDir, path.basename(folder))
  return { dir, dataPath: path.join(dir, DATA_FILE) }
}

/** faction-data.json 을 원문 그대로 읽는다(가공 없음, utf8) */
export function readFactionDataFile(dataPath: string): Record<string, unknown> {
  return JSON.parse(readFileSync(dataPath, 'utf-8')) as Record<string, unknown>
}

/* ────────────────────────── 파일 상태 판정 ────────────────────────── */

export type FactionFileState =
  | { kind: 'absent' }
  /** 마커 없음 — 내보내기 발효 전 원본 */
  | { kind: 'pristine'; doc: Record<string, unknown> }
  /** 마커 있고 체크섬 일치 — 내보낸 그대로 */
  | { kind: 'generated'; doc: Record<string, unknown>; marker: GeneratedMarker }
  /** 마커 있고 체크섬 불일치 — 사람이 고쳤다 */
  | { kind: 'hand-edited'; doc: Record<string, unknown>; marker: GeneratedMarker; actual: string }

/** 현재 파일이 어떤 상태인지 판정한다(쓰기 없음) */
export function inspectFactionDataFile(dataPath: string): FactionFileState {
  if (!existsSync(dataPath)) return { kind: 'absent' }
  const doc = readFactionDataFile(dataPath)
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
 * @param isPristine 발효 전 원본(마커 없음)인가. true 면 회차 보관과 별도로 `_original/` 에
 *   **한 번만** 복사하고 회차 정리에서 제외한다. 회차는 10회를 넘기면 지워지므로 그대로 두면
 *   되돌릴 수 없는 진짜 원본이 내보내기를 10번 더 돌리는 순간 사라진다.
 */
export function backupFactionData(episodeDir: string, dataPath: string, isPristine: boolean): string | null {
  if (!existsSync(dataPath)) return null
  const root = path.join(episodeDir, BACKUP_DIR)

  if (isPristine) {
    const origDir = path.join(root, '_original')
    const origFile = path.join(origDir, DATA_FILE)
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
  copyFileSync(dataPath, path.join(dir, DATA_FILE))

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

export interface FactionExportResult {
  folder: string
  written: boolean
  reason: string
  backupDir?: string | null
  /** 막힌 경우 파일 ↔ DB 의 의미 차이 (JSON Pointer) */
  diffs?: string[]
}

export interface ExportToFileOptions {
  folder: string
  /** 에피소드 폴더 절대경로 */
  episodeDir: string
  /** faction-data.json 절대경로 */
  dataPath: string
  /**
   * DB 조립기. 현재 파일 내용을 `original` 로 받아 음성 길이 병합(§7 ①)에 쓴다.
   * `episodeId` 는 마커에 박는다.
   */
  assemble: (original?: Record<string, unknown>) => Promise<{
    script: Record<string, unknown>
    episodeId: string
  }>
  /** 손 편집·발효 전 차이가 감지돼도 덮어쓴다 */
  force?: boolean
}

/**
 * 한 에피소드를 DB 에서 뽑아 파일로 쓴다. 막히면 `written:false` + 사유·차이를 돌려준다(던지지 않는다).
 * 조립 자체가 실패하면(에피소드 없음 등) 그건 진짜 오류라 던진다.
 */
export async function exportFactionEpisodeToFile(opts: ExportToFileOptions): Promise<FactionExportResult> {
  const { folder, episodeDir, dataPath, force } = opts
  const state = inspectFactionDataFile(dataPath)
  // 음성 길이 병합(§7 ①)은 현재 파일 내용을 원본으로 삼는다
  const original = state.kind === 'absent' ? undefined : state.doc
  const { script: fresh, episodeId } = await opts.assemble(original)

  if (state.kind === 'hand-edited' && !force) {
    const diffs = diffPointers(stripGenerated(state.doc), stripGenerated(fresh))
    return {
      folder, written: false, diffs,
      reason: `손 편집 감지 — 파일 체크섬 ${state.actual.slice(0, 8)} ≠ 마커 ${state.marker.checksum.slice(0, 8)}`,
    }
  }

  /**
   * 발효 전 파일(마커 없음)은 체크섬으로 손 편집을 가릴 수 없다. 그래서 **내용을 DB 와 대조**해
   * 파일에만 있는 변경이 있으면 막는다. 문서 §11 R3(유저 WIP 충돌) 대비.
   */
  if (state.kind === 'pristine' && !force) {
    const diffs = diffPointers(stripGenerated(state.doc), stripGenerated(fresh))
    if (diffs.length) {
      return {
        folder, written: false, diffs,
        reason: `발효 전 파일이 DB 와 다르다 — 차이 ${diffs.length}곳. 파일 쪽이 최신이면 먼저 \`pnpm faction:import\``,
      }
    }
  }

  const marker: GeneratedMarker = {
    from: 'db',
    at: new Date().toISOString(),
    episodeId,
    checksum: docChecksum(fresh),
  }
  const doc = withGenerated(fresh, marker)

  const backupDir = backupFactionData(episodeDir, dataPath, state.kind === 'pristine')
  mkdirSync(episodeDir, { recursive: true })
  writeFileSync(dataPath, JSON.stringify(doc, null, 2) + '\n', 'utf-8')

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
export function writeFactionRegistry(factionsDir: string, folders: string[]): { changed: boolean } {
  const p = path.join(factionsDir, REGISTRY_FILE)
  const next = JSON.stringify(folders, null, 2) + '\n'
  const prev = existsSync(p) ? readFileSync(p, 'utf-8') : ''
  if (prev === next) return { changed: false }
  writeFileSync(p, next, 'utf-8')
  return { changed: true }
}
