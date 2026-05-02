/**
 * 2-synthesize/timing.ts — TTS 결과 duration → timing.json 자동 반영
 *
 * --update-json 플래그로 호출된다. 본체 timing.json + 쇼츠 외부 timing 파일 + 공용 파일 일괄 반영.
 * 본체 timing.json에는 timing.shorts를 저장하지 않는다 (옵션 2: 쇼츠는 별도 파일).
 */

import { mkdir, readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import {
  VN_SERVICE_GREETING, VN_SERVICE_INTRO, VN_FEATURED_QUOTE,
  VN_CELEB_INTRO, VN_PHILOSOPHY,
  VN_LABEL_SUMMARY, VN_LABEL_CONTEXT,
  VN_OUTRO, VN_INTERLUDE, VN_RETURN_INTRO, VN_PREV_RECAP,
  COMMON_VOICE_FILES,
} from '../../../src/compositions/BookRecommend/voice-names'
import { ROOT, findEpisodeDir, resolveTimingPath } from '../../lib/episode.js'
import { EPISODE_NAME, EP_PERSON, EP_LOCALE } from './cli.js'

export async function updateTimingJson(results: Record<string, number>): Promise<void> {
  const timingPath = resolveTimingPath(EPISODE_NAME)
  const timingRaw = existsSync(timingPath) ? await readFile(timingPath, 'utf-8') : '{}'
  const timing = JSON.parse(timingRaw)
  if (!timing.narrator) timing.narrator = {}
  if (!timing.host) timing.host = {}
  if (!timing.books) timing.books = []
  // 옵션 2: 본체 timing.json에 timing.shorts 저장하지 않는다 (shorts/{locale}-{N}.timing.json 별도)
  if ('shorts' in timing) delete timing.shorts

  // 쇼츠 timing 외부 파일 캐시: shortsIdx(1-based) → 파일 JSON
  const episodeDir = findEpisodeDir(EP_PERSON)
  const shortsDir = path.join(episodeDir, 'shorts')
  const shortsTimingCache = new Map<number, any>()
  const shortsTimingPath = (idx1: number) => path.join(shortsDir, `${EP_LOCALE}-${idx1}.timing.json`)
  async function loadShortsTiming(idx1: number): Promise<any> {
    if (shortsTimingCache.has(idx1)) return shortsTimingCache.get(idx1)
    const fp = shortsTimingPath(idx1)
    let json: any = { segments: [] }
    if (existsSync(fp)) {
      try { json = JSON.parse(await readFile(fp, 'utf-8')) } catch { /* 손상 시 초기화 */ }
    }
    if (!json.segments) json.segments = []
    shortsTimingCache.set(idx1, json)
    return json
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
    // D{NN}{letter}-{phase}.wav (title, summary, context)
    const bookMatch = file.match(/^D(\d{2})[a-g]-(title|summary|context)\.wav$/)
    if (bookMatch) {
      const idx = parseInt(bookMatch[1]) - 1 // 1-based -> 0-based
      if (!timing.books[idx]) timing.books[idx] = {}
      switch (bookMatch[2]) {
        case 'title': timing.books[idx].titleDuration = rounded; break
        case 'summary': timing.books[idx].summaryDuration = rounded; break
        case 'context': timing.books[idx].contextDuration = rounded; break
      }
      continue
    }
    // D{NN}d{N}-(quote|after).wav — quotePairs 동적 배열
    const dMatch = file.match(/^D(\d{2})d(\d+)-(quote|after)\.wav$/)
    if (dMatch) {
      const idx = parseInt(dMatch[1]) - 1 // 1-based -> 0-based
      const n = parseInt(dMatch[2])
      const isQuote = dMatch[3] === 'quote'
      const pairIdx = Math.floor((n - 1) / 2) // d1,d2→0  d3,d4→1  d5,d6→2
      if (!timing.books[idx]) timing.books[idx] = {}
      if (!timing.books[idx].quotePairDurations) timing.books[idx].quotePairDurations = []
      while (timing.books[idx].quotePairDurations.length <= pairIdx) {
        timing.books[idx].quotePairDurations.push({})
      }
      if (isQuote) timing.books[idx].quotePairDurations[pairIdx].quoteDuration = rounded
      else timing.books[idx].quotePairDurations[pairIdx].afterDuration = rounded
    }
  }

  await writeFile(timingPath, JSON.stringify(timing, null, 2) + '\n', 'utf-8')
  console.log(`\n✓ ${EPISODE_NAME} timing.json duration 자동 반영 완료`)

  // 쇼츠 timing 외부 파일 저장
  if (shortsTimingCache.size > 0) {
    await mkdir(shortsDir, { recursive: true })
    for (const [idx1, data] of shortsTimingCache) {
      const fp = shortsTimingPath(idx1)
      await writeFile(fp, JSON.stringify(data, null, 2) + '\n', 'utf-8')
      console.log(`  ✓ shorts/${EP_LOCALE}-${idx1}.timing.json`)
    }
  }

  // 공용 파일 duration → 전체 에피소드 timing.json 일괄 반영
  const commonResults = Object.entries(results).filter(([f]) => COMMON_VOICE_FILES.has(f))
  if (commonResults.length > 0) {
    const { readdirSync, statSync } = await import('fs')
    const EPISODES_BASE = path.join(ROOT, 'public', 'episodes')
    let count = 0
    for (const status of ['todo', 'live', 'done']) {
      const statusDir = path.join(EPISODES_BASE, status)
      if (!existsSync(statusDir)) continue
      const allDirs = readdirSync(statusDir).filter((d: string) => statSync(path.join(statusDir, d)).isDirectory())
      for (const d of allDirs) {
        const dir = path.join(statusDir, d)
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
