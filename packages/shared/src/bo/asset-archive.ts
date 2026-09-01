/**
 * 에피소드 자산 보관소 — `public/<시리즈>/<편>` 의 실체가 사는 곳(기본 `D:\remotion-assets`).
 *
 * `public` 이 7.5 GB·11,000 파일이면 Remotion Studio 가 페이지마다 그 전부를 훑고(실측 5초), 렌더 창고·감시·
 * 백업이 전부 그 무게를 진다. 그런데 한 번에 손대는 편은 몇 개뿐이다. 그래서 **실체는 보관소에 두고, 작업 중인
 * 편만 public 에 정션(junction)으로 걸어 둔다.** 정션은 폴더 바로가기라 Node·Studio·백오피스·파이프라인이
 * 전부 예전 경로 그대로 읽고 쓴다(실측 확인). Windows 에서 관리자 권한 없이 만들 수 있다.
 *
 * 단위는 `public/<시리즈>/<이름>` 한 폴더다. 공유 자산(music·covers·common)과 `_`로 시작하는 폴더·파일은
 * public 에 그대로 둔다. 걸고 푸는 손은 백오피스 「자산 보관소」와 `pnpm assets`(렌더 저장소) 둘이고,
 * 둘 다 여기 함수를 쓴다. 보관소가 없는 컴퓨터(다른 PC·CI)에서는 아무것도 하지 않는다 — 옛 구조가 그대로 돈다.
 */

import {
  cpSync, existsSync, lstatSync, mkdirSync, readdirSync, readlinkSync, renameSync, rmSync, statSync, symlinkSync,
} from 'fs'
import path from 'path'
import { safeDirSegs } from './episode-store'

/** 보관소 뿌리. 환경변수 REMOTION_ASSET_ARCHIVE 로 바꾼다. */
export const ASSET_ARCHIVE_ROOT = process.env.REMOTION_ASSET_ARCHIVE
  ? path.resolve(process.env.REMOTION_ASSET_ARCHIVE)
  : 'D:\\remotion-assets'

/** 보관소 체계를 쓰는 시리즈 — public 아래 폴더명과 같다. */
export const ASSET_SERIES = ['factions', 'episodes', 'discourses'] as const
export type AssetSeries = typeof ASSET_SERIES[number]

export type AssetUnitState =
  /** public 에 정션으로 걸려 있고 보관소 실체를 가리킨다 — 작업 중 */
  | 'staged'
  /** 보관소에만 있다 */
  | 'archived'
  /** 실체가 public 에 있다(백오피스가 새로 만든 편 등) */
  | 'public-only'
  /** public 실체와 보관소 실체가 둘 다 있다 — 손으로 정리해야 한다 */
  | 'conflict'
  /** 정션이 엉뚱한 곳을 가리키거나 대상이 없다 */
  | 'broken-link'

export interface AssetUnit {
  series: string
  name: string
  state: AssetUnitState
  /** 정션이 가리키는 곳(정션일 때만) */
  target?: string
  files: number
  bytes: number
}

/** 이 컴퓨터에 보관소가 있는가 — 없으면 화면·명령이 옛 구조로 안내한다. */
export function isAssetArchiveAvailable(archiveRoot = ASSET_ARCHIVE_ROOT): boolean {
  return process.platform === 'win32' && existsSync(archiveRoot)
}

/** `public/<시리즈>` 뿌리를 받아 보관소의 같은 편 자리를 돌려준다. 시리즈 이름은 뿌리 폴더명 그대로다. */
export function archiveDirOf(seriesDir: string, name: string, archiveRoot = ASSET_ARCHIVE_ROOT): string {
  return path.join(archiveRoot, path.basename(seriesDir), ...safeDirSegs(name))
}

/* ────────────────────────── 조회 ────────────────────────── */

const isUnitName = (name: string) => !name.startsWith('_') && !name.startsWith('.')

function unitNamesIn(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter(e => isUnitName(e.name) && (e.isDirectory() || e.isSymbolicLink()))
    .map(e => e.name)
}

function junctionTarget(p: string): string | undefined {
  try {
    if (!lstatSync(p).isSymbolicLink()) return undefined
    return readlinkSync(p)
  } catch {
    return undefined
  }
}

function walkStats(dir: string): { files: number; bytes: number } {
  let files = 0, bytes = 0
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.isFile()) { files++; bytes += statSync(p).size }
    }
  }
  if (existsSync(dir)) walk(dir)
  return { files, bytes }
}

const samePath = (a: string, b: string) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase()

/** 한 시리즈의 단위 상태표. public 과 보관소를 합쳐 이름순으로 돌려준다. */
export function scanAssetUnits(
  seriesDir: string,
  options: { archiveRoot?: string; withSize?: boolean } = {},
): AssetUnit[] {
  const archiveRoot = options.archiveRoot ?? ASSET_ARCHIVE_ROOT
  const withSize = options.withSize ?? true
  const series = path.basename(seriesDir)
  const arcDir = path.join(archiveRoot, series)
  const names = [...new Set([...unitNamesIn(seriesDir), ...unitNamesIn(arcDir)])].sort((a, b) => a.localeCompare(b))
  const out: AssetUnit[] = []
  for (const name of names) {
    const pub = path.join(seriesDir, name)
    const arc = path.join(arcDir, name)
    const inArc = existsSync(arc)
    const target = junctionTarget(pub)
    let state: AssetUnitState
    if (target !== undefined) state = inArc && samePath(target, arc) ? 'staged' : 'broken-link'
    else if (existsSync(pub)) state = inArc ? 'conflict' : 'public-only'
    else if (inArc) state = 'archived'
    else continue
    const real = state === 'public-only' ? pub : inArc ? arc : target
    const size = withSize && real ? walkStats(real) : { files: 0, bytes: 0 }
    out.push({ series, name, state, ...(target !== undefined ? { target } : {}), ...size })
  }
  return out
}

/* ────────────────────────── 조작 ────────────────────────── */

type OpOptions = { archiveRoot?: string; dryRun?: boolean }

/**
 * public 실체를 보관소로 옮기고 정션으로 되건다(작업 상태 유지).
 * 같은 볼륨이면 즉시 옮기고, 다른 볼륨이면 복사 → 파일 수·바이트 대조 → 원본 삭제 순서다. 대조가 어긋나면 원본을 남긴다.
 */
export function archiveAssetUnit(seriesDir: string, name: string, options: OpOptions = {}): { files: number; bytes: number } {
  const archiveRoot = options.archiveRoot ?? ASSET_ARCHIVE_ROOT
  const src = path.join(seriesDir, ...safeDirSegs(name))
  const dst = archiveDirOf(seriesDir, name, archiveRoot)
  const label = `${path.basename(seriesDir)}/${name}`
  if (!existsSync(src)) throw new Error(`public 에 없다: ${label}`)
  if (junctionTarget(src) !== undefined) throw new Error(`이미 정션이다: ${label}`)
  if (existsSync(dst)) throw new Error(`보관소에 같은 이름이 이미 있다 — 먼저 정리해라: ${dst}`)
  const before = walkStats(src)
  if (options.dryRun) return before

  mkdirSync(path.dirname(dst), { recursive: true })
  try {
    renameSync(src, dst)
  } catch {
    cpSync(src, dst, { recursive: true, errorOnExist: true, force: false, preserveTimestamps: true })
    const after = walkStats(dst)
    if (after.files !== before.files || after.bytes !== before.bytes) {
      throw new Error(`복사 대조 실패 ${label}: 원본 ${before.files}개·${before.bytes}B ≠ 사본 ${after.files}개·${after.bytes}B — 원본을 남겨 뒀다`)
    }
    rmSync(src, { recursive: true, force: true })
  }
  symlinkSync(dst, src, 'junction')
  return before
}

/** 보관소 편을 public 에 정션으로 건다. 이미 걸려 있으면 그대로 둔다. */
export function stageAssetUnit(seriesDir: string, name: string, options: OpOptions = {}): void {
  const archiveRoot = options.archiveRoot ?? ASSET_ARCHIVE_ROOT
  const link = path.join(seriesDir, ...safeDirSegs(name))
  const dst = archiveDirOf(seriesDir, name, archiveRoot)
  const label = `${path.basename(seriesDir)}/${name}`
  if (!existsSync(dst)) throw new Error(`보관소에 없다: ${dst}`)
  if (junctionTarget(link) !== undefined) return
  if (existsSync(link)) throw new Error(`public 에 실체가 있다 — 먼저 보관소로 옮겨라: ${label}`)
  if (options.dryRun) return
  mkdirSync(path.dirname(link), { recursive: true })
  symlinkSync(dst, link, 'junction')
}

/** 정션만 지운다. 실체는 보관소에 남는다. 실체 폴더는 절대 지우지 않는다. */
export function unstageAssetUnit(seriesDir: string, name: string, options: OpOptions = {}): void {
  const link = path.join(seriesDir, ...safeDirSegs(name))
  if (junctionTarget(link) === undefined) {
    if (existsSync(link)) throw new Error(`정션이 아니라 실체다 — 지우지 않는다: ${path.basename(seriesDir)}/${name}`)
    return
  }
  if (options.dryRun) return
  rmSync(link, { recursive: false, force: false })
}

export type EnsureStagedResult =
  /** 방금 정션을 걸었다 */
  | 'staged'
  /** 이미 public 에 있다(정션이든 실체든) */
  | 'present'
  /** 보관소에도 없다 — 새 편이거나 다른 컴퓨터. 아무것도 안 한다 */
  | 'absent'

/**
 * 파일을 만지려는 순간 그 편이 public 에 걸려 있게 한다 — 백오피스가 편집기를 열거나 저장·내보내기를 할 때 부른다.
 * 안 걸린 편에 내보내기가 실체 폴더를 새로 만들어 버리면 보관소와 이름이 겹쳐 걸 수도 옮길 수도 없게 되기 때문이다.
 * 이미 있으면 손대지 않는다 — 실체가 public 에 있는 편은 그대로 실체로 쓴다.
 */
export function ensureEpisodeStaged(seriesDir: string, name: string, archiveRoot = ASSET_ARCHIVE_ROOT): EnsureStagedResult {
  const link = path.join(seriesDir, ...safeDirSegs(name))
  if (existsSync(link) || junctionTarget(link) !== undefined) return 'present'
  const target = archiveDirOf(seriesDir, name, archiveRoot)
  if (process.platform !== 'win32' || !existsSync(target)) return 'absent'
  mkdirSync(path.dirname(link), { recursive: true })
  symlinkSync(target, link, 'junction')
  return 'staged'
}
