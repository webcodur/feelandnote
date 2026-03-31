/**
 * 에피소드 경로 해석 유틸리티
 *
 * scripts/ 하위 모든 스크립트가 공유하는 에피소드 탐색·파싱 함수.
 */
import { existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

/** scripts/ 의 부모 = remotion 루트 */
export const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..')

/** todo/live/done 3단 구조에서 에피소드 디렉토리 탐색 */
export function findEpisodeDir(person: string): string {
  for (const status of ['todo', 'live', 'done']) {
    const dir = join(ROOT, 'public', 'episodes', status, person)
    if (existsSync(dir)) return dir
  }
  throw new Error(`Episode not found: ${person}`)
}

/** ep-name → { person, locale } 파싱 */
export function parseEpName(epName: string): { person: string; locale: string } {
  let rest = epName, lang = 'ko'
  if (rest.endsWith('-en')) { lang = 'en'; rest = rest.slice(0, -3) }
  const m = rest.match(/-(\d+)$/)
  if (m) { rest = rest.slice(0, -m[0].length); lang = lang + '-' + m[1] }
  return { person: rest, locale: lang }
}

/** episodeId → JSON 파일 절대 경로 */
export function resolveEpisodePath(episodeId: string): string {
  const { person, locale } = parseEpName(episodeId)
  const parts = locale.split('-')
  const baseLang = parts[0]
  const partNum = parts[1] ? parseInt(parts[1]) : 1
  const filename = partNum > 1 ? `${baseLang}-${partNum}.json` : `${baseLang}.json`
  return join(findEpisodeDir(person), filename)
}
