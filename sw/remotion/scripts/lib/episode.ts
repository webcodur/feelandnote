/**
 * 에피소드 경로 해석 유틸리티
 *
 * scripts/ 하위 모든 스크립트가 공유하는 에피소드 탐색·파싱 함수.
 */
import { existsSync } from 'fs'
import { readFile, readdir } from 'fs/promises'
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

/** ep-name → { person, locale } 파싱 — 단순 -en 접미사만 처리 */
export function parseEpName(epName: string): { person: string; locale: string } {
  if (epName.endsWith('-en')) return { person: epName.slice(0, -3), locale: 'en' }
  return { person: epName, locale: 'ko' }
}

/** episodeId → JSON 파일 절대 경로 */
export function resolveEpisodePath(episodeId: string): string {
  const { person, locale } = parseEpName(episodeId)
  return join(findEpisodeDir(person), `${locale}.json`)
}

/** episodeId → timing JSON 파일 절대 경로 */
export function resolveTimingPath(episodeId: string): string {
  const { person, locale } = parseEpName(episodeId)
  return join(findEpisodeDir(person), `${locale}.timing.json`)
}

/**
 * shorts/{locale}-{N}.json · {locale}-{N}.timing.json 파일들을 스캔하여 배열로 로드
 *
 * 옵션 2 이후: 쇼츠 대본/타이밍은 본체 ko.json 밖의 `shorts/` 디렉토리에 분리 저장된다.
 * N은 1-based. 배열 index는 N-1.
 */
async function loadExternalShorts(episodeDir: string, locale: string): Promise<any[]> {
  const shortsDir = join(episodeDir, 'shorts')
  if (!existsSync(shortsDir)) return []

  const files = await readdir(shortsDir)
  const contentRe = new RegExp(`^${locale}-(\\d+)\\.json$`)
  const timingRe = new RegExp(`^${locale}-(\\d+)\\.timing\\.json$`)

  const contents = new Map<number, any>()
  const timings = new Map<number, any>()

  for (const f of files) {
    if (f.endsWith('.timing.json')) {
      const m = f.match(timingRe)
      if (m) timings.set(parseInt(m[1]), JSON.parse(await readFile(join(shortsDir, f), 'utf-8')))
    } else if (f.endsWith('.json')) {
      const m = f.match(contentRe)
      if (m) contents.set(parseInt(m[1]), JSON.parse(await readFile(join(shortsDir, f), 'utf-8')))
    }
  }

  const sorted = [...contents.keys()].sort((a, b) => a - b)
  return sorted.map(idx => {
    const c = contents.get(idx)
    const t = timings.get(idx)
    if (!t?.segments) return c
    return {
      ...c,
      segments: c.segments.map((seg: any, i: number) => ({
        ...seg,
        ...(t.segments[i] ?? {}),
      })),
    }
  })
}

/** content + timing 머지하여 완전한 에피소드 데이터 반환. shorts는 외부 파일에서 로드 */
export async function loadEpisode(episodeId: string): Promise<any> {
  const content = JSON.parse(await readFile(resolveEpisodePath(episodeId), 'utf-8'))

  // shorts 외부 파일 로드 → content.shorts 주입
  const { person, locale } = parseEpName(episodeId)
  const episodeDir = findEpisodeDir(person)
  const shortsArr = await loadExternalShorts(episodeDir, locale)
  if (shortsArr.length > 0) content.shorts = shortsArr

  let timing: any = null
  try { timing = JSON.parse(await readFile(resolveTimingPath(episodeId), 'utf-8')) } catch { /* timing 없으면 content만 */ }
  if (!timing || Object.keys(timing).length === 0) return content

  return {
    ...content,
    voiceTimings: timing.voiceTimings ?? content.voiceTimings,
    narrator: { ...content.narrator, ...timing.narrator },
    host: { ...content.host, ...timing.host },
    books: content.books?.map((b: any, i: number) => ({ ...b, ...(timing.books?.[i] ?? {}) })),
    shorts: content.shorts,
  }
}
