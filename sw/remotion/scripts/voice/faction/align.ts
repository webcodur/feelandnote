/**
 * faction/align.ts — 세력도(Faction) 발화 시각 산출
 *
 * 받아쓰기(3-transcribe.py --faction)가 만든 단어 타이밍(voice/2-word-timings.json)을 읽어,
 * 인물 대사의 의미 덩어리(chunks)별 발화 시각을 계산하고
 * public/factions/<에피소드>/data.timing.<locale>.json 으로 쓴다.
 *
 * 렌더(Faction.tsx)는 이 파일을 stem(vnTimingKey) 으로 조회해 자막 페이지 전환·글자 점등을
 * 실제 발화 시각에 맞춘다. 이 파일이 없으면 렌더는 글자수 비례 폴백으로 동작한다.
 *
 * 정렬 코어는 scripts/voice/lib/align-core.ts(북리커맨드 4-align 과 공유)를 그대로 쓴다.
 * 단어 타이밍이 없는 인물은 조용히 폴백하지 않고 건너뛰며 경고한다(렌더 폴백에 맡긴다).
 */

import { readFile, writeFile } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { EPISODE_NAME, DATA_PATH, VOICE_DIR, LANG, PART, ONLY_TARGETS } from './cli.js'
import { loadFactionData, buildVoiceJobs } from './data.js'
import { vnTimingKey } from '../../../src/compositions/Faction/voice-names.js'
import {
  analyzeWithWhisperWords, trimWordLeadingSilence, fixNumericWordTimings,
  computeSubTimings, parseWav,
} from '../lib/align-core.js'
import type { VoiceTimingSegment, VoiceTimings } from '../../../src/lib/voice-timing/index.js'

type WordTimingsFile = { targets?: Record<string, { word: string; start: number; end: number }[]> }

const WORD_TIMINGS_PATH = path.join(VOICE_DIR, '2-word-timings.json')
const OUT_PATH = path.join(path.dirname(DATA_PATH), PART != null ? `data.timing.p${PART}.${LANG}.json` : `data.timing.${LANG}.json`)

const r3 = (x: number) => Math.round(x * 1000) / 1000

/**
 * 덩어리 경계를 글자수 비례로 안분한다 — 렌더 폴백(sentence-split.ts expandSubTimings)과 같은 계산이라
 * 이 값을 기록해도 영상은 달라지지 않는다. 편집기가 잡을 손잡이를 만들어 주는 것이 목적이다.
 */
function proportionalSubTimings(chunks: string[], start: number, end: number): number[] | undefined {
  if (chunks.length <= 1) return undefined
  const totalChars = chunks.reduce((sum, c) => sum + c.length, 0)
  if (!totalChars) return undefined
  const out: number[] = []
  let cursor = start
  for (const chunk of chunks.slice(0, -1)) {
    cursor += (end - start) * (chunk.length / totalChars)
    out.push(r3(cursor))
  }
  return out
}

/** wav 길이(초) — 16bit PCM 기준 샘플 수/샘플레이트 */
function wavDurationSec(wavPath: string): number {
  const { sampleRate, samples } = parseWav(wavPath)
  return samples.length / sampleRate
}

export async function main(): Promise<void> {
  if (!existsSync(DATA_PATH)) {
    console.error(`✗ faction-data.json 없음: ${DATA_PATH}`)
    process.exit(1)
  }
  if (!existsSync(WORD_TIMINGS_PATH)) {
    console.error(`✗ 단어 타이밍 없음: ${WORD_TIMINGS_PATH}`)
    console.error(`  먼저 받아쓰기를 실행하라: python scripts/voice/3-transcribe.py --episode ${EPISODE_NAME} --faction --lang ${LANG}`)
    process.exit(1)
  }

  if (PART == null) {
    console.error('✗ --part <N> 가 필수다(편별 산출 — data.timing.p<N>.<lang>.json). 예: --part 1')
    process.exit(1)
  }
  const script = await loadFactionData()
  let jobs = buildVoiceJobs(script, PART)
  if (ONLY_TARGETS.length > 0) {
    jobs = jobs.filter(j => ONLY_TARGETS.some(t => j.file.includes(t)))
  }

  const wordData = JSON.parse(await readFile(WORD_TIMINGS_PATH, 'utf-8')) as WordTimingsFile
  const targets = wordData.targets ?? {}

  console.log(`발화 시각 산출: ${EPISODE_NAME} ${PART}편 (${LANG}) · 대사 인물 ${jobs.length}명`)

  const voiceTimings: VoiceTimings = {}
  let done = 0, skipped = 0, estimated = 0
  for (const job of jobs) {
    const stem = vnTimingKey(job.file)
    const wavPath = path.join(VOICE_DIR, job.file)
    const words = targets[stem]
    if (!existsSync(wavPath)) {
      console.warn(`[${stem}] wav 없음 — 건너뜀`)
      skipped++; continue
    }

    const duration = wavDurationSec(wavPath)
    // 전사가 없어도 음원이 있으면 글자수 비례 기본값을 남긴다. 값은 렌더 폴백과 같아 영상은 그대로지만,
    // 항목이 있어야 web-bo 발화 시각 편집기가 열려(FactionSyncContent 는 빈 타이밍에 편집 UI 를 띄우지 않는다)
    // 파형을 보며 경계를 손으로 옮길 수 있다. 전사가 VAD 미검출로 실패한 음원의 유일한 구제책이다.
    if (!words || words.length === 0) {
      const chunks = job.chunks.map(s => s.trim()).filter(Boolean)
      const seg: VoiceTimingSegment = { start: 0, end: r3(duration), text: chunks.join(' '), sub: chunks }
      const subT = proportionalSubTimings(chunks, 0, duration)
      if (subT) seg.subTimings = subT
      voiceTimings[stem] = [seg]
      estimated++
      console.warn(`[${stem}] 단어 타이밍 없음 — 글자수 비례 기본값 기록(${chunks.length}덩어리 · ${duration.toFixed(2)}s · 편집기에서 조정)`)
      continue
    }

    // 단어 → 세그먼트(단어 단위) → 선행 무음 트리밍 → 숫자 단어 보정
    const segs = analyzeWithWhisperWords(words, duration)
    trimWordLeadingSilence(segs, wavPath)
    fixNumericWordTimings(segs, undefined)

    const chunks = job.chunks.map(s => s.trim()).filter(Boolean)
    const wordList = segs.map(s => ({ text: s.text ?? '', start: r3(s.start), end: r3(s.end) }))

    const seg: VoiceTimingSegment = {
      start: 0,
      end: r3(duration),
      text: chunks.join(' '),
      sub: chunks,
      words: wordList,
    }
    // 덩어리별 경계 시각(subTimings) — 단어 수 매칭이 어긋나면 생략(렌더가 구간 내 글자수 비례로 점등)
    const subT = computeSubTimings({ start: seg.start, end: seg.end, sub: chunks }, wordList)
    if (subT) seg.subTimings = subT

    voiceTimings[stem] = [seg]
    done++
    console.log(`[${stem}] ${chunks.length}덩어리 · ${wordList.length}단어 · ${seg.end.toFixed(2)}s`
      + (subT ? ` · subTimings ${subT.length}` : ' · subTimings 생략(글자수 비례)'))
  }

  // --only 일부 처리에서는 기존 산출(같은 편의 다른 인물)을 보존한다.
  // 편 전체 처리에서는 현재 편 결과로 교체해, 인물이 다른 편으로 이동한 뒤 옛 키가
  // data.timing.p<N>.*.json 에 계속 남아 로더에서 중복 병합되는 일을 막는다.
  let existing: VoiceTimings = {}
  if (ONLY_TARGETS.length > 0 && existsSync(OUT_PATH)) {
    try { existing = JSON.parse(await readFile(OUT_PATH, 'utf-8')) as VoiceTimings } catch { existing = {} }
  }
  const merged: VoiceTimings = { ...existing, ...voiceTimings }
  await writeFile(OUT_PATH, JSON.stringify(merged, null, 2) + '\n', 'utf-8')
  console.log(`\n✓ ${done}개 기록(병합 후 총 ${Object.keys(merged).length}개)`
    + (estimated ? ` · ${estimated}개 기본값(전사 없음 — 편집기에서 조정)` : '')
    + ` · ${skipped}개 건너뜀 → ${path.relative(process.cwd(), OUT_PATH)}`)
}
