/**
 * render-all.ts — 롱폼 + 쇼츠 MP4/SRT 일괄 렌더
 *
 * Usage:
 *   pnpm render:all                              # 전체 에피소드
 *   pnpm render:all -- --episode alexander-the-great  # 특정 에피소드
 *   pnpm render:all -- --only longform            # 롱폼만
 *   pnpm render:all -- --only shorts              # 쇼츠만
 */
import { execSync } from 'child_process'
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// --- 에피소드 로드 ---
import { episodes, isContinuation } from '../src/compositions/BookRecommend/script'
import { calcTotalFrames } from '../src/compositions/BookRecommend/BookRecommend'
import { calcShortTotalFrames } from '../src/compositions/BookRecommend/BookRecommendShort'
import {
  toFrames, toAudioFrames, FPS,
  BRAND_FRAMES, CELEB_VISUAL_DELAY,
  CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP,
  BOOK_GAP, RECAP_FRAMES, INTERLUDE_FRAMES, SENTENCE_BREATH,
  CELEB_INTRO_FALLBACK, BRIDGE_FALLBACK, RETURN_INTRO_FALLBACK, PREV_RECAP_FALLBACK,
  SHORT_GAP, SHORT_FALLBACK, SHORT_BRAND_FRAMES, SHORT_LOGO_FRAMES,
  titleSummaryGap, summaryContextGap, labelSummaryFrames, labelContextFrames,
  bookTotalFrames, f,
} from '../src/compositions/BookRecommend/timing'
import type { BookRecommendScript, ShortSegment } from '../src/compositions/BookRecommend/types'

// --- Args ---
const args = process.argv.slice(2)
const epFlag = args.indexOf('--episode')
const epFilter = epFlag >= 0 ? args[epFlag + 1] : null
const onlyFlag = args.indexOf('--only')
const only = onlyFlag >= 0 ? args[onlyFlag + 1] : null // 'longform' | 'shorts'

const OUT_DIR = join(__dirname, '..', 'out')
mkdirSync(OUT_DIR, { recursive: true })

// --- SRT 포맷 ---
type Sub = { start: number; end: number; speaker: string; text: string }

function frameToSrt(f: number): string {
  const totalMs = Math.round((f / FPS) * 1000)
  const h = Math.floor(totalMs / 3600000)
  const m = Math.floor((totalMs % 3600000) / 60000)
  const s = Math.floor((totalMs % 60000) / 1000)
  const ms = totalMs % 1000
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

function subsToSrt(subs: Sub[]): string {
  return subs.map((s, i) =>
    `${i + 1}\n${frameToSrt(s.start)} --> ${frameToSrt(s.end)}\n${s.text}\n`
  ).join('\n')
}

type VTiming = { start: number; end: number }

const MIN_SUB_SEC = 1.5   // 이보다 짧으면 병합
const MAX_SUB_SEC = 8     // 이보다 길면 분할
const MIN_SUB_F = Math.round(MIN_SUB_SEC * FPS)
const MAX_SUB_F = Math.round(MAX_SUB_SEC * FPS)

function splitSentences(start: number, end: number, speaker: string, text: string, timings?: VTiming[]): Sub[] {
  const sentences = text.split(/(?<=[.?!,。])\s+/).filter(Boolean)
  if (sentences.length <= 1) return [{ start, end, speaker, text }]

  // 1) 파형 타이밍 또는 글자 수 비례로 raw segments 생성
  let raw: Sub[]
  if (timings && timings.length === sentences.length) {
    raw = timings.map((t, i) => ({
      start: start + Math.round(t.start * FPS),
      end: start + Math.round(t.end * FPS),
      speaker,
      text: sentences[i],
    }))
  } else {
    const totalFrames = end - start
    const breathTotal = (sentences.length - 1) * SENTENCE_BREATH
    const distributable = Math.max(totalFrames - breathTotal, totalFrames * 0.7)
    const totalChars = sentences.reduce((sum, s) => sum + s.length, 0)
    raw = []
    let cursor = start
    for (let i = 0; i < sentences.length; i++) {
      if (i > 0) cursor += SENTENCE_BREATH
      const frames = Math.round((sentences[i].length / totalChars) * distributable)
      raw.push({ start: cursor, end: cursor + frames, speaker, text: sentences[i] })
      cursor += frames
    }
  }

  // 2) 짧은 자막 병합 (MIN_SUB_F 미만)
  const merged: Sub[] = []
  for (const sub of raw) {
    const dur = sub.end - sub.start
    if (merged.length > 0 && dur < MIN_SUB_F) {
      const prev = merged[merged.length - 1]
      prev.text += ' ' + sub.text
      prev.end = sub.end
    } else {
      merged.push({ ...sub })
    }
  }

  // 3) 긴 자막 분할 (MAX_SUB_F 초과) — 쉼표/공백 기준
  const result: Sub[] = []
  for (const sub of merged) {
    const dur = sub.end - sub.start
    if (dur <= MAX_SUB_F) {
      result.push(sub)
      continue
    }
    // 중간 지점에서 쉼표/공백으로 분할
    const mid = Math.floor(sub.text.length / 2)
    let splitAt = -1
    // 중간 근처에서 쉼표 찾기
    for (let d = 0; d < mid; d++) {
      if (mid + d < sub.text.length && /[,，、]/.test(sub.text[mid + d])) { splitAt = mid + d + 1; break }
      if (mid - d >= 0 && /[,，、]/.test(sub.text[mid - d])) { splitAt = mid - d + 1; break }
    }
    // 쉼표 없으면 공백
    if (splitAt < 0) {
      for (let d = 0; d < mid; d++) {
        if (mid + d < sub.text.length && sub.text[mid + d] === ' ') { splitAt = mid + d + 1; break }
        if (mid - d >= 0 && sub.text[mid - d] === ' ') { splitAt = mid - d + 1; break }
      }
    }
    if (splitAt > 0 && splitAt < sub.text.length) {
      const ratio = splitAt / sub.text.length
      const splitFrame = sub.start + Math.round(dur * ratio)
      result.push({ start: sub.start, end: splitFrame, speaker, text: sub.text.slice(0, splitAt).trim() })
      result.push({ start: splitFrame, end: sub.end, speaker, text: sub.text.slice(splitAt).trim() })
    } else {
      result.push(sub)
    }
  }

  return result
}

// --- voiceTimings 헬퍼 ---
function vt(script: BookRecommendScript, key: string): VTiming[] | undefined {
  return (script as any).voiceTimings?.[key]
}

// --- 롱폼 SRT ---
function buildLongformSubs(script: BookRecommendScript): Sub[] {
  const { narrator, host, books } = script
  const cont = isContinuation(script)
  const subs: Sub[] = []

  const celebIntroFrames = cont ? 0 : (CELEB_VISUAL_DELAY + ((narrator.celebIntroDuration ?? 0) > 0 ? toFrames(narrator.celebIntroDuration!) : CELEB_INTRO_FALLBACK))
  const philosophyFrames = cont ? 0 : toFrames(host.voiceDuration ?? 0)
  const hostIntroFrames = cont ? 0 : (celebIntroFrames + f(1) + philosophyFrames)
  const bridgeFrames = narrator.bridgeDuration > 0 ? toFrames(narrator.bridgeDuration) : BRIDGE_FALLBACK

  const sgd = narrator.serviceGreetingDuration ?? 0
  const svcGreetingFrames = cont ? 0 : (sgd > 0 ? toFrames(sgd) : 0)
  const svcIntroFrames = cont ? 0 : ((narrator.serviceIntroDuration ?? 0) > 0 ? toFrames(narrator.serviceIntroDuration!) : 0)
  const fQuoteFramesRaw = host.featuredQuoteDuration && host.featuredQuoteDuration > 0 ? toFrames(host.featuredQuoteDuration) : 0
  const fQuoteFrames = fQuoteFramesRaw > 0 ? fQuoteFramesRaw + f(1.5) : 0
  const returnIntroFrames = cont ? ((narrator.returnIntroDuration ?? 0) > 0 ? toFrames(narrator.returnIntroDuration!) : RETURN_INTRO_FALLBACK) : 0
  const prevRecapFrames = cont ? ((narrator.prevRecapDuration ?? 0) > 0 ? toFrames(narrator.prevRecapDuration!) : PREV_RECAP_FALLBACK) : 0

  let cursor = BRAND_FRAMES + returnIntroFrames + svcGreetingFrames + svcIntroFrames + fQuoteFrames + prevRecapFrames
  const hostIntroStart = cursor
  cursor += hostIntroFrames
  cursor += bridgeFrames

  // continuation: returnIntro
  if (cont && returnIntroFrames > 0 && narrator.returnIntro) {
    const s = BRAND_FRAMES
    subs.push(...splitSentences(s, s + toAudioFrames(narrator.returnIntroDuration ?? 0), '나레이터', narrator.returnIntro))
  }

  // 서비스 인사
  if (!cont && svcGreetingFrames > 0 && narrator.serviceGreeting) {
    const s = BRAND_FRAMES
    subs.push(...splitSentences(s, s + toAudioFrames(narrator.serviceGreetingDuration ?? 0), '나레이터', narrator.serviceGreeting, vt(script, 'service-greeting')))
  }
  if (!cont && svcIntroFrames > 0 && narrator.serviceIntro) {
    const s = BRAND_FRAMES + svcGreetingFrames
    subs.push(...splitSentences(s, s + toAudioFrames(narrator.serviceIntroDuration!), '나레이터', narrator.serviceIntro, vt(script, 'service-intro')))
  }
  if (fQuoteFrames > 0 && host.featuredQuote) {
    const s = BRAND_FRAMES + returnIntroFrames + svcIntroFrames + f(1)
    subs.push(...splitSentences(s, s + toAudioFrames(host.featuredQuoteDuration!), host.nickname, host.featuredQuote))
  }

  // continuation: prevRecap
  if (cont && prevRecapFrames > 0 && narrator.prevRecap) {
    const s = BRAND_FRAMES + returnIntroFrames + fQuoteFrames
    subs.push(...splitSentences(s, s + toAudioFrames(narrator.prevRecapDuration ?? 0), '나레이터', narrator.prevRecap))
  }

  // Part 1: 셀럽 소개 + 감상철학
  if (!cont && narrator.celebIntro) {
    const celebVoiceStart = hostIntroStart + CELEB_VISUAL_DELAY
    subs.push(...splitSentences(celebVoiceStart, celebVoiceStart + toAudioFrames(narrator.celebIntroDuration ?? 0), '나레이터', narrator.celebIntro, vt(script, 'narrator-celeb-intro')))
  }

  if (!cont && host.philosophy) {
    const philoStart = hostIntroStart + celebIntroFrames + f(1)
    subs.push(...splitSentences(philoStart, philoStart + toAudioFrames(host.voiceDuration ?? 0), host.nickname, host.philosophy, vt(script, 'philosophy')))
  }

  const hasInterlude = books.length > 10
  const interludeIndex = hasInterlude ? Math.ceil(books.length / 2) : -1
  const interludeFrames = hasInterlude
    ? (narrator.interludeDuration && narrator.interludeDuration > 0 ? toFrames(narrator.interludeDuration) : INTERLUDE_FRAMES)
    : 0

  // 라벨 프레임 (Series 레이아웃과 동일하게)
  const ld = { labelSummaryDuration: narrator.labelSummaryDuration, labelContextDuration: narrator.labelContextDuration }
  const TSG = titleSummaryGap(ld.labelSummaryDuration)
  const SCG = summaryContextGap(ld.labelContextDuration)
  const LSF = labelSummaryFrames(ld.labelSummaryDuration)
  const LCF = labelContextFrames(ld.labelContextDuration)

  for (let i = 0; i < books.length; i++) {
    if (i > 0) cursor += BOOK_GAP
    if (i === interludeIndex) {
      cursor += RECAP_FRAMES
      if (narrator.interlude && narrator.interludeDuration && narrator.interludeDuration > 0) {
        const intStart = cursor + 20
        subs.push(...splitSentences(intStart, intStart + toAudioFrames(narrator.interludeDuration), '나레이터', narrator.interlude))
      }
      cursor += interludeFrames
    }
    const bs = cursor
    const b = books[i]

    // Series 커서 워킹 — BookRecommend.tsx의 Series 레이아웃과 동일
    let c = bs

    // title
    const titleText = [b.title, b.creator, b.stats?.publishYear].filter(Boolean).join(', ')
    subs.push({ start: c, end: c + toAudioFrames(b.titleDuration), speaker: '나레이터', text: titleText })
    c += toFrames(b.titleDuration)

    // offset → label-summary → summary
    c += TSG
    c += LSF
    subs.push(...splitSentences(c, c + toAudioFrames(b.summaryDuration), '요약', b.summary, vt(script, `book-${i}-summary`)))
    c += toFrames(b.summaryDuration)

    // offset → label-context → context
    c += SCG
    c += LCF
    subs.push(...splitSentences(c, c + toAudioFrames(b.contextDuration), '나레이터', b.context, vt(script, `book-${i}-context`)))
    c += toFrames(b.contextDuration)

    // quote
    if (b.directQuote && b.quoteDuration) {
      c += CONTEXT_QUOTE_GAP
      subs.push(...splitSentences(c, c + toAudioFrames(b.quoteDuration), host.nickname, `"${b.directQuote}"`, vt(script, `book-${i}-quote`)))
      c += toFrames(b.quoteDuration)

      // contextAfter
      if (b.contextAfter && b.contextAfterDuration) {
        c += QUOTE_CONTEXTAFTER_GAP
        subs.push(...splitSentences(c, c + toAudioFrames(b.contextAfterDuration), '나레이터', b.contextAfter, vt(script, `book-${i}-context-after`)))
      }
    }

    cursor += bookTotalFrames(b, ld) + LSF + LCF
  }
  cursor += RECAP_FRAMES
  if (narrator.outroDuration > 0) {
    subs.push(...splitSentences(cursor, cursor + toAudioFrames(narrator.outroDuration), '나레이터', narrator.outro, vt(script, 'narrator-outro')))
  }
  return subs
}

// --- 쇼츠 SRT ---
function buildShortsSubs(script: BookRecommendScript): Sub[] {
  const segments = script.shorts?.segments ?? []
  const subs: Sub[] = []

  let cursor = 0
  for (let i = 0; i < segments.length; i++) {
    const dur = segments[i].duration ? toFrames(segments[i].duration!) : SHORT_FALLBACK
    const audioDur = segments[i].duration ? toAudioFrames(segments[i].duration!) : SHORT_FALLBACK
    const speaker = segments[i].role === 'celeb' ? script.host.nickname : '나레이터'
    subs.push(...splitSentences(cursor, cursor + audioDur, speaker, segments[i].text))
    cursor += dur + SHORT_GAP
    if (i === 0) cursor += SHORT_BRAND_FRAMES + SHORT_GAP
  }
  return subs
}

// --- 렌더 실행 ---
function toPascal(name: string) {
  return name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('')
}

const targetEpisodes = epFilter
  ? { [epFilter]: (episodes as Record<string, BookRecommendScript>)[epFilter] }
  : episodes as Record<string, BookRecommendScript>

for (const [name, script] of Object.entries(targetEpisodes)) {
  if (!script) { console.error(`에피소드 '${name}' 없음`); continue }
  const label = toPascal(name)

  // 롱폼
  if (!only || only === 'longform') {
    console.log(`\n▶ 롱폼 렌더: ${label}`)
    const mp4 = join(OUT_DIR, `${name}.mov`)
    execSync(`pnpm.cmd render ${label} "${mp4}" --codec prores --prores-profile 4444 --image-format=png --gl=angle --concurrency=75%`, { stdio: 'inherit', cwd: join(__dirname, '..') })

    const srt = subsToSrt(buildLongformSubs(script))
    const srtPath = join(OUT_DIR, `${name}.srt`)
    writeFileSync(srtPath, srt, 'utf-8')
    console.log(`  ✓ SRT: ${srtPath}`)
  }

  // 쇼츠
  if ((!only || only === 'shorts') && script.shorts) {
    console.log(`\n▶ 쇼츠 렌더: ${label}Short`)
    const mp4 = join(OUT_DIR, `${name}-short.mov`)
    execSync(`pnpm.cmd render ${label}Short "${mp4}" --codec prores --prores-profile 4444 --image-format=png --gl=angle --concurrency=75%`, { stdio: 'inherit', cwd: join(__dirname, '..') })

    const srt = subsToSrt(buildShortsSubs(script))
    const srtPath = join(OUT_DIR, `${name}-short.srt`)
    writeFileSync(srtPath, srt, 'utf-8')
    console.log(`  ✓ SRT: ${srtPath}`)
  }
}

console.log(`\n✅ 완료. 출력: ${OUT_DIR}`)
