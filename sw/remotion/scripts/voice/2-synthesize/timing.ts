/**
 * 2-synthesize/timing.ts — TTS 결과 duration → timing.json 자동 반영
 *
 * --update-json 플래그로 호출된다. 본체 timing.json + 쇼츠 외부 timing 파일 + 공용 파일 일괄 반영.
 * 본체 timing.json에는 timing.shorts를 저장하지 않는다 (옵션 2: 쇼츠는 별도 파일).
 */

import { mkdir, readFile, readdir, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import {
  VN_SERVICE_GREETING, VN_SERVICE_INTRO, VN_FEATURED_QUOTE,
  VN_CELEB_INTRO, VN_PHILOSOPHY,
  VN_LABEL_SUMMARY, VN_LABEL_CONTEXT,
  VN_OUTRO, VN_INTERLUDE, VN_RETURN_INTRO, VN_PREV_RECAP,
  COMMON_VOICE_FILES,
} from '../../../src/compositions/BookRecommend/voice-names'
import { ROOT, findEpisodeDir, isNewLayout, resolveTimingPath } from '../../lib/episode.js'
import { EPISODE_NAME, EP_PERSON, EP_LOCALE } from './cli.js'

export async function updateTimingJson(results: Record<string, number>): Promise<void> {
  const episodeDir = findEpisodeDir(EP_PERSON)
  const newLayout = isNewLayout(episodeDir, EP_LOCALE)
  const timingPath = resolveTimingPath(EPISODE_NAME)
  const timingRaw = existsSync(timingPath) ? await readFile(timingPath, 'utf-8') : '{}'
  const timing = JSON.parse(timingRaw)
  if (!timing.narrator) timing.narrator = {}
  if (!timing.host) timing.host = {}
  // 신구조: 책별 timing 은 books/{NN-*}/book.{locale}.timing.json 에 분리 저장 → meta 에는 books 키 자체를 두지 않는다
  // 레거시: 본체 timing.json 에 books 배열 직접 저장
  if (!newLayout) {
    if (!timing.books) timing.books = []
  } else if ('books' in timing) {
    delete timing.books
  }
  // 옵션 2: 본체 timing.json에 timing.shorts 저장하지 않는다 (shorts/{locale}-{N}.timing.json 별도)
  if ('shorts' in timing) delete timing.shorts

  // 신구조 책별 timing 캐시 — folderIndex → folderPath, 책별 누적 객체
  const bookFolders: string[] = newLayout
    ? (await readdir(path.join(episodeDir, 'books'), { withFileTypes: true }))
        .filter(e => e.isDirectory() && /^\d+-/.test(e.name))
        .map(e => e.name)
        .sort()
    : []
  const bookTimingCache = new Map<number, any>()
  async function loadBookTiming(idx0: number): Promise<any> {
    if (bookTimingCache.has(idx0)) return bookTimingCache.get(idx0)
    const folder = bookFolders[idx0]
    if (!folder) {
      const empty = {}
      bookTimingCache.set(idx0, empty)
      return empty
    }
    const fp = path.join(episodeDir, 'books', folder, `book.${EP_LOCALE}.timing.json`)
    let json: any = {}
    if (existsSync(fp)) {
      try { json = JSON.parse(await readFile(fp, 'utf-8')) } catch { /* 손상 시 초기화 */ }
    }
    bookTimingCache.set(idx0, json)
    return json
  }
  function setBookField(idx0: number, key: string, value: number) {
    if (newLayout) {
      const cached = bookTimingCache.get(idx0) ?? {}
      cached[key] = value
      bookTimingCache.set(idx0, cached)
    } else {
      if (!timing.books[idx0]) timing.books[idx0] = {}
      timing.books[idx0][key] = value
    }
  }
  function quotePairObj(idx0: number, pairIdx: number): any {
    if (newLayout) {
      const cached = bookTimingCache.get(idx0) ?? {}
      if (!cached.quotePairDurations) cached.quotePairDurations = []
      while (cached.quotePairDurations.length <= pairIdx) cached.quotePairDurations.push({})
      bookTimingCache.set(idx0, cached)
      return cached.quotePairDurations[pairIdx]
    }
    if (!timing.books[idx0]) timing.books[idx0] = {}
    if (!timing.books[idx0].quotePairDurations) timing.books[idx0].quotePairDurations = []
    while (timing.books[idx0].quotePairDurations.length <= pairIdx) timing.books[idx0].quotePairDurations.push({})
    return timing.books[idx0].quotePairDurations[pairIdx]
  }
  function setQuotePairField(idx0: number, pairIdx: number, key: 'quoteDuration' | 'afterDuration', value: number) {
    quotePairObj(idx0, pairIdx)[key] = value
  }
  /** 후속 맥락 토막별 길이 기록 — summary/context 토막 분할과 동일 패턴(afterPartDurations 배열) */
  function setAfterPartDuration(idx0: number, pairIdx: number, part: number, value: number) {
    const pd = quotePairObj(idx0, pairIdx)
    const arr: Array<number | undefined> = Array.isArray(pd.afterPartDurations) ? [...pd.afterPartDurations] : []
    arr[part] = value
    pd.afterPartDurations = arr
  }

  // 쇼츠 timing 외부 파일 캐시: shortsIdx(1-based) → 파일 JSON
  // 레거시: shorts/{locale}-{N}.timing.json
  // 신구조: books/{folder}/shorts.{locale}.timing.json — featuredBookIndex 매핑 필요 (shortsIdx1 ↔ 책 폴더 idx0)
  const shortsDir = path.join(episodeDir, 'shorts')
  const shortsTimingCache = new Map<number, any>()
  const shortsTimingPath = (idx1: number): string | null => {
    if (newLayout) {
      const idx0 = idx1 - 1
      const folder = bookFolders[idx0]
      if (!folder) return null
      return path.join(episodeDir, 'books', folder, `shorts.${EP_LOCALE}.timing.json`)
    }
    return path.join(shortsDir, `${EP_LOCALE}-${idx1}.timing.json`)
  }
  async function loadShortsTiming(idx1: number): Promise<any> {
    if (shortsTimingCache.has(idx1)) return shortsTimingCache.get(idx1)
    const fp = shortsTimingPath(idx1)
    let json: any = { segments: [] }
    if (fp && existsSync(fp)) {
      try { json = JSON.parse(await readFile(fp, 'utf-8')) } catch { /* 손상 시 초기화 */ }
    }
    if (!json.segments) json.segments = []
    shortsTimingCache.set(idx1, json)
    return json
  }

  /** 책별 timing 객체 직접 접근 — 토막 배열처럼 setBookField(number)로 못 다루는 필드용 */
  function bookTimingObj(idx0: number): any {
    if (newLayout) {
      const cached = bookTimingCache.get(idx0) ?? {}
      bookTimingCache.set(idx0, cached)
      return cached
    }
    if (!timing.books[idx0]) timing.books[idx0] = {}
    return timing.books[idx0]
  }

  // 토막 분할 필드 선별 — 이번 결과에 b2/c2 같은 토막 파일이 있으면 그 필드는 분할 상태
  const splitFields = new Set<string>()
  for (const file of Object.keys(results)) {
    const m = file.match(/^D(\d{2})([bc])\d+-/)
    if (m) splitFields.add(`${parseInt(m[1]) - 1}:${m[2]}`)
  }
  // 후속 맥락 토막 분할 선별 — D{NN}d{N}_{P}-after 파일(part>0)이 있으면 그 인용 쌍의 after는 분할 상태
  const splitAfter = new Set<string>()
  for (const file of Object.keys(results)) {
    const m = file.match(/^D(\d{2})d(\d+)_\d+-after\.wav$/)
    if (m) splitAfter.add(`${parseInt(m[1]) - 1}:${Math.floor((parseInt(m[2]) - 1) / 2)}`)
  }

  for (const [file, dur] of Object.entries(results)) {
    const rounded = Math.round(dur * 100) / 100

    if (file === VN_SERVICE_GREETING) { timing.narrator.serviceGreetingDuration = rounded; continue }
    if (file === VN_SERVICE_INTRO) { timing.narrator.serviceIntroDuration = rounded; continue }
    if (file === VN_CELEB_INTRO) { timing.narrator.celebIntroDuration = rounded; continue }
    if (file === VN_PHILOSOPHY) { timing.host.voiceDuration = rounded; continue }
    if (file === VN_OUTRO) { timing.narrator.outroDuration = rounded; continue }
    if (file === VN_FEATURED_QUOTE) { timing.host.featuredQuoteDuration = rounded; continue }
    if (file === VN_LABEL_SUMMARY) { timing.narrator.labelSummaryDuration = rounded; continue }
    if (file === VN_LABEL_CONTEXT) { timing.narrator.labelContextDuration = rounded; continue }
    if (file === VN_RETURN_INTRO) { timing.narrator.returnIntroDuration = rounded; continue }
    if (file === VN_PREV_RECAP) { timing.narrator.prevRecapDuration = rounded; continue }
    if (file === VN_INTERLUDE && timing.narrator.interludeDuration !== undefined) { timing.narrator.interludeDuration = rounded; continue }
    // 옵션 2: 쇼츠 세그먼트는 항상 'shorts-{N}/S{NN}-{id}.wav' 형식 (접두사 필수, 1-based)
    const shortMatch = file.match(/^shorts-(\d+)\/S(\d{2})-.+\.wav$/)
    if (shortMatch) {
      const shortsIdx1 = parseInt(shortMatch[1]) // 1-based
      const segPos = parseInt(shortMatch[2]) - 1 // NN (1-based) → array index
      const target = await loadShortsTiming(shortsIdx1)
      if (!target.segments) target.segments = []
      while (target.segments.length <= segPos) target.segments.push({})
      target.segments[segPos].duration = rounded
      continue
    }
    // D{NN}{letter}{part?}-{phase}.wav (title, summary, context) — part 없으면 첫 토막, b2=두 번째 토막
    const bookMatch = file.match(/^D(\d{2})([a-c])(\d*)-(title|summary|context)\.wav$/)
    if (bookMatch) {
      const idx = parseInt(bookMatch[1]) - 1 // 1-based -> 0-based
      if (newLayout) await loadBookTiming(idx)
      if (bookMatch[4] === 'title') { setBookField(idx, 'titleDuration', rounded); continue }
      const part = bookMatch[3] ? parseInt(bookMatch[3]) - 1 : 0
      const durKey = bookMatch[4] === 'summary' ? 'summaryPartDurations' : 'contextPartDurations'
      const totalKey = bookMatch[4] === 'summary' ? 'summaryDuration' : 'contextDuration'
      const obj = bookTimingObj(idx)
      const split = part > 0 || splitFields.has(`${idx}:${bookMatch[2]}`) || Array.isArray(obj[durKey])
      if (split) {
        // 토막별 기록만 — 전체 길이(토막 합 + 간격)는 align --update-json 이 확정한다
        const arr: Array<number | undefined> = Array.isArray(obj[durKey]) ? [...obj[durKey]] : []
        arr[part] = rounded
        obj[durKey] = arr
      } else {
        obj[totalKey] = rounded
        delete obj[durKey] // 토막 해제 잔존물 제거
      }
      continue
    }
    // D{NN}d{N}{_part?}-(quote|after).wav — quotePairs 동적 배열. _2부터 후속 맥락 토막(0번 토막은 접미사 없음)
    const dMatch = file.match(/^D(\d{2})d(\d+)(?:_(\d+))?-(quote|after)\.wav$/)
    if (dMatch) {
      const idx = parseInt(dMatch[1]) - 1 // 1-based -> 0-based
      const n = parseInt(dMatch[2])
      const isQuote = dMatch[4] === 'quote'
      const pairIdx = Math.floor((n - 1) / 2) // d1,d2→0  d3,d4→1  d5,d6→2
      if (newLayout) await loadBookTiming(idx)
      if (isQuote) {
        setQuotePairField(idx, pairIdx, 'quoteDuration', rounded)
      } else {
        const part = dMatch[3] ? parseInt(dMatch[3]) - 1 : 0
        const pd = quotePairObj(idx, pairIdx)
        const split = part > 0 || splitAfter.has(`${idx}:${pairIdx}`) || Array.isArray(pd.afterPartDurations)
        if (split) {
          // 토막별 기록만 — 전체 길이(토막 합 + 간격)는 align --update-json 이 확정한다
          setAfterPartDuration(idx, pairIdx, part, rounded)
        } else {
          pd.afterDuration = rounded
          delete pd.afterPartDurations // 토막 해제 잔존물 제거
        }
      }
    }
  }

  await writeFile(timingPath, JSON.stringify(timing, null, 2) + '\n', 'utf-8')
  console.log(`\n✓ ${EPISODE_NAME} timing.json duration 자동 반영 완료`)

  // 신구조: 책별 timing 파일 저장
  if (newLayout && bookTimingCache.size > 0) {
    for (const [idx0, data] of bookTimingCache) {
      const folder = bookFolders[idx0]
      if (!folder) continue
      if (Object.keys(data).length === 0) continue
      const fp = path.join(episodeDir, 'books', folder, `book.${EP_LOCALE}.timing.json`)
      await writeFile(fp, JSON.stringify(data, null, 2) + '\n', 'utf-8')
      console.log(`  ✓ books/${folder}/book.${EP_LOCALE}.timing.json`)
    }
  }

  // 쇼츠 timing 외부 파일 저장
  if (shortsTimingCache.size > 0) {
    if (!newLayout) await mkdir(shortsDir, { recursive: true })
    for (const [idx1, data] of shortsTimingCache) {
      const fp = shortsTimingPath(idx1)
      if (!fp) continue
      await writeFile(fp, JSON.stringify(data, null, 2) + '\n', 'utf-8')
      console.log(`  ✓ ${path.relative(episodeDir, fp).replace(/\\/g, '/')}`)
    }
  }

  // 공용 파일 duration → 전체 에피소드 timing.json 일괄 반영
  const commonResults = Object.entries(results).filter(([f]) => COMMON_VOICE_FILES.has(f))
  if (commonResults.length > 0) {
    const { readdirSync, statSync } = await import('fs')
    const EPISODES_BASE = path.join(ROOT, 'public', 'episodes')
    let count = 0
    // 재귀 스캔: _status.json 보유 인물 폴더 모두 + 옛 status 폴더 폴백
    const personDirs: string[] = []
    const INACTIVE = new Set(['excluded', 'pre-todo', 'todo-easy', 'todo-normal', 'todo-hard'])
    const STATUSES_LOCAL = new Set(['todo', 'live', 'done'])
    function walk(dir: string, depth: number) {
      let entries
      try { entries = readdirSync(dir).filter((d: string) => statSync(path.join(dir, d)).isDirectory()) } catch { return }
      for (const name of entries) {
        if (name.startsWith('_')) continue
        if (depth === 0 && INACTIVE.has(name)) continue
        const sub = path.join(dir, name)
        if (existsSync(path.join(sub, '_status.json'))) {
          personDirs.push(sub)
        } else if (depth === 0 && STATUSES_LOCAL.has(name)) {
          // 옛 status 폴더 폴백
          try {
            for (const p of readdirSync(sub).filter((d: string) => statSync(path.join(sub, d)).isDirectory())) {
              personDirs.push(path.join(sub, p))
            }
          } catch { /* empty */ }
        } else {
          walk(sub, depth + 1)
        }
      }
    }
    walk(EPISODES_BASE, 0)
    for (const dir of personDirs) {
      {
        for (const fname of readdirSync(dir).filter((f: string) => f.endsWith('.timing.json'))) {
          const fp = path.join(dir, fname)
          if (fp === timingPath) continue // 이미 처리됨
          const tRaw = await readFile(fp, 'utf-8')
          const tJson = JSON.parse(tRaw)
          if (!tJson.narrator) tJson.narrator = {}
          let changed = false
          for (const [file, dur] of commonResults) {
            const rounded = Math.round(dur * 100) / 100
            if (file === VN_SERVICE_GREETING) { tJson.narrator.serviceGreetingDuration = rounded; changed = true }
            if (file === VN_LABEL_SUMMARY) { tJson.narrator.labelSummaryDuration = rounded; changed = true }
            if (file === VN_LABEL_CONTEXT) { tJson.narrator.labelContextDuration = rounded; changed = true }
          }
          if (changed) {
            await writeFile(fp, JSON.stringify(tJson, null, 2) + '\n', 'utf-8')
            count++
          }
        }
      }
    }
    if (count > 0) console.log(`✓ 공용 파일 duration → ${count}개 timing.json 일괄 반영`)
  }
}
