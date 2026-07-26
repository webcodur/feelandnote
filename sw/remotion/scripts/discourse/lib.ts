/**
 * discourse/lib.ts — 담화 DB 이관 도구 공용 부품
 *
 * 에피소드 폴더 스캔 · 세 파일 병합 읽기.
 * env 로딩 · service role 클라이언트 · CLI 인자 파싱은 `../lib/series-cli.ts`(팩션과 공용).
 * import/export/verify 세 스크립트가 공유한다.
 *
 * ⚠ 이 폴더의 스크립트는 sw/remotion/tsconfig.json 의 include(["src","episodes"]) 밖이다.
 *   `npx tsc --noEmit` 으로는 검사되지 않으므로 컴파일러 옵션을 직접 줘서 따로 검사한다.
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import path from 'path'
import { mergeDiscourseFiles, stripGenerated } from '@feelandnote/shared/lib/discourse-schema'
import { discourseEpisodePaths, type DiscoursePaths } from '@feelandnote/shared/bo/discourse-export'
import { ROOT, pickEpisodes, type CliArgs } from '../lib/series-cli.js'

export { ROOT, loadEnv, adminClient, parseArgs, pad } from '../lib/series-cli.js'
export type { CliArgs } from '../lib/series-cli.js'

export const DISCOURSES_DIR = path.join(ROOT, 'public', 'discourses')

/**
 * 에피소드가 아닌 폴더. discourse-data.json 유무로도 걸러지지만 의도를 코드에 남긴다.
 * (담화는 팩션과 달리 아이디어 보관함·캐스팅표가 없다)
 */
export const NON_EPISODE_DIRS = new Set(['_docs'])

/* ────────────────────────── 에피소드 스캔 ────────────────────────── */

export interface EpisodeFolder {
  /** 폴더명 = discourse_episodes.folder (고유키) */
  folder: string
  dir: string
  /** 세 파일 경로 묶음 */
  paths: DiscoursePaths
  /** 편의용 별칭 — discourse-data.json */
  dataPath: string
  /** _status.json 의 status (없으면 'todo') */
  status: string
  /** _episodes.json 에 실린 편 = 렌더 컴포지션으로 노출되는 편 */
  registered: boolean
  /** _episodes.json 순서(1-based). 미등록은 0 */
  sortOrder: number
}

/** _episodes.json — 렌더 로더가 static import 하는 등록 목록(순서 = 편성 순서) */
function loadRegistered(): string[] {
  const p = path.join(DISCOURSES_DIR, '_episodes.json')
  if (!existsSync(p)) return []
  return JSON.parse(readFileSync(p, 'utf-8')) as string[]
}

/** discourse-data.json 을 가진 폴더 전부를 스캔한다 */
export function scanEpisodes(): EpisodeFolder[] {
  const registered = loadRegistered()
  const out: EpisodeFolder[] = []
  for (const name of readdirSync(DISCOURSES_DIR)) {
    if (NON_EPISODE_DIRS.has(name)) continue
    const dir = path.join(DISCOURSES_DIR, name)
    if (!statSync(dir).isDirectory()) continue
    const paths = discourseEpisodePaths(DISCOURSES_DIR, name)
    if (!existsSync(paths.dataPath)) continue

    let status = 'todo'
    const statusPath = path.join(dir, '_status.json')
    if (existsSync(statusPath)) {
      try {
        const s = JSON.parse(readFileSync(statusPath, 'utf-8')) as { status?: string }
        if (s.status) status = s.status
      } catch {
        throw new Error(`_status.json 파싱 실패: ${statusPath}`)
      }
    }
    const idx = registered.indexOf(name)
    out.push({
      folder: name,
      dir,
      paths,
      dataPath: paths.dataPath,
      status,
      registered: idx >= 0,
      sortOrder: idx >= 0 ? idx + 1 : 0,
    })
  }
  return out.sort((a, b) => a.folder.localeCompare(b.folder))
}

/**
 * 세 파일(discourse-data.json · cast.json · turns.json)을 합쳐 한 벌로 읽는다(utf8).
 * 로더(`Discourse/script.ts:120`)·BO(`discourse-utils.ts:84`)와 같은 병합 규칙을 쓴다.
 *
 * `_generated` 마커(export 산출 표식)는 내용이 아니므로 여기서 벗긴다 — 안 벗기면 발효된 편을
 * 재흡수(import)할 때 마커가 DB data 에 데이터로 저장돼 왕복 검증 ①이 깨진다(팩션 26.07.25 실측).
 *
 * cast·turns 가 없으면 **던진다.** 빈 배열로 폴백하면 인물도 대사도 없는 편이 조용히 이관된다.
 */
export function readDiscourseData(ep: { folder: string; paths: DiscoursePaths }): Record<string, unknown> {
  const { paths } = ep
  for (const [what, p] of [['인물(cast.json)', paths.castPath], ['발언(turns.json)', paths.turnsPath]] as const) {
    if (!existsSync(p)) throw new Error(`${ep.folder}: ${what} 없음 — ${p}`)
  }
  const meta = JSON.parse(readFileSync(paths.dataPath, 'utf-8')) as Record<string, unknown>
  const cast = JSON.parse(readFileSync(paths.castPath, 'utf-8')) as unknown[]
  const turns = JSON.parse(readFileSync(paths.turnsPath, 'utf-8')) as unknown[]
  if (!Array.isArray(cast)) throw new Error(`${ep.folder}: cast.json 이 배열이 아니다`)
  if (!Array.isArray(turns)) throw new Error(`${ep.folder}: turns.json 이 배열이 아니다`)
  return mergeDiscourseFiles(stripGenerated(meta), cast, turns)
}

/* ────────────────────────── CLI ────────────────────────── */

/** CLI 인자로 대상 에피소드를 고른다 */
export function selectEpisodes(args: CliArgs): EpisodeFolder[] {
  return pickEpisodes(scanEpisodes(), args)
}
