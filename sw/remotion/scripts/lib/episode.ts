/**
 * 에피소드 경로 해석 유틸리티
 *
 * scripts/ 하위 모든 스크립트가 공유하는 에피소드 탐색·파싱 함수.
 */
import { existsSync } from 'fs'
import { readFile } from 'fs/promises'
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

/** episodeId → timing JSON 파일 절대 경로 */
export function resolveTimingPath(episodeId: string): string {
  const { person, locale } = parseEpName(episodeId)
  const parts = locale.split('-')
  const baseLang = parts[0]
  const partNum = parts[1] ? parseInt(parts[1]) : 1
  const filename = partNum > 1 ? `${baseLang}-${partNum}.timing.json` : `${baseLang}.timing.json`
  return join(findEpisodeDir(person), filename)
}

/** content + timing 머지하여 완전한 에피소드 데이터 반환 */
export async function loadEpisode(episodeId: string): Promise<any> {
  const content = JSON.parse(await readFile(resolveEpisodePath(episodeId), 'utf-8'))
  let timing: any = null
  try { timing = JSON.parse(await readFile(resolveTimingPath(episodeId), 'utf-8')) } catch { /* timing 없으면 content만 */ }
  if (!timing || Object.keys(timing).length === 0) return content
  return {
    ...content,
    voiceTimings: timing.voiceTimings ?? content.voiceTimings,
    narrator: { ...content.narrator, ...timing.narrator },
    host: { ...content.host, ...timing.host },
    books: content.books?.map((b: any, i: number) => ({ ...b, ...(timing.books?.[i] ?? {}) })),
    shorts: content.shorts
      ? { ...content.shorts, segments: content.shorts.segments?.map((s: any, i: number) => ({ ...s, ...(timing.shorts?.segments?.[i] ?? {}) })) }
      : content.shorts,
  }
}
