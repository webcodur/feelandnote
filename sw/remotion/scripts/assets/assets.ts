/**
 * assets.ts — 에피소드 자산 보관소(D:)와 작업 폴더(public/) 사이를 오가는 터미널 창구.
 * 규칙·동작은 전부 `@feelandnote/shared/bo/asset-archive` 소유다(백오피스 「자산 보관소」와 같은 함수).
 *
 *   pnpm assets list [시리즈]                 상태표 — ● staged · ○ archived · ◆ public-only · ✗ conflict/broken-link
 *   pnpm assets archive <시리즈> <이름>        public 실체를 보관소로 옮기고 정션으로 되건다
 *   pnpm assets stage <시리즈> <이름>          보관소 편을 public 에 정션으로 건다
 *   pnpm assets unstage <시리즈> <이름>        정션만 지운다(실체는 보관소에 남는다)
 *   pnpm assets migrate [--dry-run] [--stage-episodes=all|active|none]
 *                                            public 실체 전부를 보관소로 옮긴 뒤 정책대로 정션을 건다
 *                                            factions=등록 목록(_episodes.json) · discourses=전부 · episodes=옵션(기본 active)
 */

import { existsSync, readdirSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import {
  ASSET_ARCHIVE_ROOT, ASSET_SERIES, archiveAssetUnit, scanAssetUnits, stageAssetUnit, unstageAssetUnit,
  type AssetSeries, type AssetUnit,
} from '@feelandnote/shared/bo/asset-archive'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const PUBLIC_DIR = path.join(__dirname, '..', '..', 'public')
const seriesDirOf = (series: AssetSeries) => path.join(PUBLIC_DIR, series)
const mb = (bytes: number) => `${(bytes / 1048576).toFixed(0)} MB`

/* ────────────────────────── migrate 정책 ────────────────────────── */

function registeredFactions(): Set<string> {
  const p = path.join(PUBLIC_DIR, 'factions', '_episodes.json')
  return new Set(existsSync(p) ? JSON.parse(readFileSync(p, 'utf-8')) as string[] : [])
}

/** 북리커맨드 편이 작업 중인가 — 안에 있는 어떤 _status.json 도 live·done 이 아니면 작업 중으로 본다. */
function episodeIsActive(dir: string): boolean {
  let finished = 0, other = 0
  const walk = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name)
      if (e.isDirectory()) walk(p)
      else if (e.name === '_status.json') {
        try {
          const s = (JSON.parse(readFileSync(p, 'utf-8')) as { status?: string }).status
          if (s === 'live' || s === 'done') finished++
          else other++
        } catch { other++ }
      }
    }
  }
  walk(dir)
  return other > 0 || finished === 0
}

type EpisodePolicy = 'all' | 'active' | 'none'

function shouldStage(u: AssetUnit, episodePolicy: EpisodePolicy, registered: Set<string>): boolean {
  if (u.series === 'factions') return registered.has(u.name)
  if (u.series === 'discourses') return true
  if (episodePolicy === 'all') return true
  if (episodePolicy === 'none') return false
  // 옮기기 전(dry-run 포함)엔 public 에, 옮긴 뒤엔 보관소에 실체가 있다 — 있는 쪽을 본다.
  const pub = path.join(PUBLIC_DIR, u.series, u.name)
  return episodeIsActive(u.state === 'public-only' ? pub : path.join(ASSET_ARCHIVE_ROOT, u.series, u.name))
}

/* ────────────────────────── CLI ────────────────────────── */

const MARK: Record<AssetUnit['state'], string> = { staged: '●', archived: '○', 'public-only': '◆', conflict: '✗', 'broken-link': '✗' }

function printTable(units: AssetUnit[]) {
  const counts: Record<string, number> = {}
  for (const u of units) counts[u.state] = (counts[u.state] ?? 0) + 1
  for (const u of units) console.log(`${MARK[u.state]} ${u.state.padEnd(11)} ${u.series}/${u.name}  ${mb(u.bytes)}`)
  console.log(`\n${units.length}단위 — ${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · ')}`)
}

function main() {
  if (process.platform !== 'win32') throw new Error('정션은 Windows 에서만 만든다')
  const [cmd, ...rest] = process.argv.slice(2)
  const flags = new Set(rest.filter(a => a.startsWith('--')))
  const args = rest.filter(a => !a.startsWith('--'))
  const dryRun = flags.has('--dry-run')
  const seriesArg = (s?: string): AssetSeries => {
    if (!s || !(ASSET_SERIES as readonly string[]).includes(s)) throw new Error(`시리즈는 ${ASSET_SERIES.join('·')} 중 하나다`)
    return s as AssetSeries
  }
  const tag = dryRun ? '(dry-run) ' : ''

  if (cmd === 'list') {
    const list = args[0] ? [seriesArg(args[0])] : [...ASSET_SERIES]
    printTable(list.flatMap(s => scanAssetUnits(seriesDirOf(s))))
    return
  }
  if (cmd === 'archive') {
    const r = archiveAssetUnit(seriesDirOf(seriesArg(args[0])), args[1], { dryRun })
    console.log(`${tag}보관소로 옮김 ${args[0]}/${args[1]} — ${r.files}파일 · ${mb(r.bytes)}`)
    return
  }
  if (cmd === 'stage') { stageAssetUnit(seriesDirOf(seriesArg(args[0])), args[1], { dryRun }); console.log(`${tag}정션 걸음 ${args[0]}/${args[1]}`); return }
  if (cmd === 'unstage') { unstageAssetUnit(seriesDirOf(seriesArg(args[0])), args[1], { dryRun }); console.log(`${tag}정션 풂 ${args[0]}/${args[1]}`); return }

  if (cmd === 'migrate') {
    const policyFlag = rest.find(a => a.startsWith('--stage-episodes='))?.split('=')[1] as EpisodePolicy | undefined
    const episodePolicy: EpisodePolicy = policyFlag ?? 'active'
    const registered = registeredFactions()
    let moved = 0, movedBytes = 0, staged = 0, left = 0
    for (const series of ASSET_SERIES) {
      const dir = seriesDirOf(series)
      for (const u of scanAssetUnits(dir, { withSize: false })) {
        const keep = shouldStage(u, episodePolicy, registered)
        if (u.state === 'public-only') {
          const r = archiveAssetUnit(dir, u.name, { dryRun })
          moved++; movedBytes += r.bytes
          if (!keep) { if (!dryRun) unstageAssetUnit(dir, u.name); left++ } else staged++
          console.log(`${tag}${keep ? '● staged  ' : '○ archived'} ${series}/${u.name} — ${r.files}파일 · ${mb(r.bytes)}`)
        } else if (u.state === 'archived' && keep) {
          stageAssetUnit(dir, u.name, { dryRun }); staged++
          console.log(`${tag}● staged   ${series}/${u.name} (보관소에서 되걸음)`)
        } else if (u.state === 'conflict' || u.state === 'broken-link') {
          console.log(`✗ ${u.state} ${series}/${u.name} — 손으로 정리해야 한다`)
        }
      }
    }
    console.log(`\n${tag}옮김 ${moved}단위 · ${mb(movedBytes)} — 작업 중 ${staged} · 보관소만 ${left} (episodes 정책: ${episodePolicy})`)
    return
  }
  console.log('사용법: pnpm assets list|archive|stage|unstage|migrate … (파일 머리 주석 참고)')
}

main()
