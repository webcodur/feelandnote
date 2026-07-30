/**
 * faction/lib.ts — 팩션 DB 이관 도구 공용 부품
 *
 * 에피소드 폴더 스캔 · 데이터 읽기 · 편별 댓글 수집.
 * env 로딩 · service role 클라이언트 · CLI 인자 파싱은 시리즈 무관이라
 * `../lib/series-cli.ts` 로 올렸다(담화가 같은 것을 복제하지 않게 하기 위한 승격, 26.07.26).
 * 바깥에서 보는 이름·시그니처는 승격 전과 같다.
 * import/export/verify 세 스크립트가 공유한다.
 *
 * ⚠ 이 폴더의 스크립트는 sw/remotion/tsconfig.json 의 include(["src","episodes"]) 밖이다.
 *   `npx tsc --noEmit` 으로는 검사되지 않으므로 컴파일러 옵션을 직접 줘서 따로 검사한다.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'
import { ROOT, pickEpisodes, type CliArgs } from '../lib/series-cli.js'

export { ROOT, loadEnv, adminClient, parseArgs, pad } from '../lib/series-cli.js'
export type { CliArgs } from '../lib/series-cli.js'

export const FACTIONS_DIR = path.join(ROOT, 'public', 'factions')

/**
 * 에피소드가 아닌 폴더 — 문서·캐스팅표·보류 자료.
 * faction-data.json 유무로도 걸러지지만, 의도를 코드에 남긴다.
 */
export const NON_EPISODE_DIRS = new Set([
  '_docs',
  '_voice-casting',
  'world-best-2026',
])

/* ────────────────────────── 에피소드 스캔 ────────────────────────── */

export interface EpisodeFolder {
  /** 폴더명 = faction_episodes.folder (고유키) */
  folder: string
  dir: string
  dataPath: string
  /** DB에 처음 들어가는 편의 안전 기본값. 운영 상태는 DB만이 원천이다. */
  status: 'ready' | 'blocked'
  /** _episodes.json 에 실린 편 = 서비스 등록분 */
  registered: boolean
  /** _episodes.json 순서(1-based). 미등록은 0 */
  sortOrder: number
}

/** _episodes.json — 서비스에 등록된 에피소드 목록(순서 = 편성 순서) */
function loadRegistered(): string[] {
  const p = path.join(FACTIONS_DIR, '_episodes.json')
  if (!existsSync(p)) return []
  return JSON.parse(readFileSync(p, 'utf-8')) as string[]
}

/** 같은 뿌리에서 faction-data.json 을 가진 한 단계 폴더 전부를 스캔한다. */
export function scanEpisodes(): EpisodeFolder[] {
  const registered = loadRegistered()
  const out: EpisodeFolder[] = []
  for (const name of readdirSync(FACTIONS_DIR)) {
    if (NON_EPISODE_DIRS.has(name)) continue
    const dir = path.join(FACTIONS_DIR, name)
    if (!statSync(dir).isDirectory()) continue
    const dataPath = path.join(dir, 'faction-data.json')
    if (!existsSync(dataPath)) continue

    const idx = registered.indexOf(name)
    out.push({
      folder: name,
      dir,
      dataPath,
      status: 'blocked',
      registered: idx >= 0,
      sortOrder: idx >= 0 ? idx + 1 : 0,
    })
  }
  return out.sort((a, b) => a.folder.localeCompare(b.folder))
}

/**
 * faction-data.json 을 읽는다(utf8). `_generated` 마커(export 산출 표식)는 내용이 아니므로
 * 여기서 벗긴다 — 안 벗기면 발효된 파일을 재흡수(import)할 때 마커가 DB data 에 데이터로
 * 저장돼 왕복 검증 ①이 깨진다(26.07.25 실측).
 */
export function readFactionData(dataPath: string): Record<string, unknown> {
  const doc = JSON.parse(readFileSync(dataPath, 'utf-8')) as Record<string, unknown>
  delete doc._generated
  return doc
}

/** comment.p<N>.txt — 편별 유튜브 고정 댓글 원고 */
export function readEpisodeParts(dir: string): { part: number; comment: string }[] {
  const out: { part: number; comment: string }[] = []
  for (const fn of readdirSync(dir)) {
    const m = fn.match(/^comment\.p(\d+)\.txt$/)
    if (!m) continue
    out.push({ part: Number(m[1]), comment: readFileSync(path.join(dir, fn), 'utf-8') })
  }
  return out.sort((a, b) => a.part - b.part)
}

/* ────────────────────────── CLI ────────────────────────── */

/** CLI 인자로 대상 에피소드를 고른다 */
export function selectEpisodes(args: CliArgs): EpisodeFolder[] {
  return pickEpisodes(scanEpisodes(), args)
}
