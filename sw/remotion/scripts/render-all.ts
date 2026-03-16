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
  TITLE_SUMMARY_GAP, SUMMARY_CONTEXT_GAP, CONTEXT_QUOTE_GAP, QUOTE_CONTEXTAFTER_GAP,
  BOOK_GAP, RECAP_FRAMES, INTERLUDE_FRAMES, SENTENCE_BREATH,
  CELEB_INTRO_FALLBACK, BRIDGE_FALLBACK, RETURN_INTRO_FALLBACK, PREV_RECAP_FALLBACK,
  SHORT_GAP, SHORT_FALLBACK, SHORT_BRAND_FRAMES, SHORT_LOGO_FRAMES,
  summaryPhaseEnd, contextPhaseEnd, bookTotalFrames,
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

function splitSentences(start: number, end: number, speaker: string, text: string): Sub[] {
  const sentences = text.split(/(?<=[.?!])\s+/).filter(Boolean)
  if (sentences.length <= 1) return [{ start, end, speaker, text }]
  const totalFrames = end - start
  const breathTotal = (sentences.length - 1) * SENTENCE_BREATH
  const distributable = Math.max(totalFrames - breathTotal, totalFrames * 0.7)
  const totalChars = sentences.reduce((sum, s) => sum + s.length, 0)
  const subs: Sub[] = []
  let cursor = start
  for (let i = 0; i < sentences.length; i++) {
    if (i > 0) cursor += SENTENCE_BREATH
    const frames = Math.round((sentences[i].length / totalChars) * distributable)
    subs.push({ start: cursor, end: cursor + frames, speaker, text: sentences[i] })
    cursor += frames
  }
  return subs
}

// --- 롱폼 SRT ---
function buildLongformSubs(script: BookRecommendScript): Sub[] {
  const { narrator, host, books } = script
  const cont = isContinuation(script)
  const subs: Sub[] = []

  const celebIntroFrames = cont ? 0 : (CELEB_VISUAL_DELAY + ((narrator.celebIntroDuration ?? 0) > 0 ? toFrames(narrator.celebIntroDuration!) : CELEB_INTRO_FALLBACK))
  const philosophyFrames = cont ? 0 : toFrames(host.voiceDuration ?? 0)
  const hostIntroFrames = cont ? 0 : (celebIntroFrames + philosophyFrames)
  const bridgeFrames = narrator.bridgeDuration > 0 ? toFrames(narrator.bridgeDuration) : BRIDGE_FALLBACK

  const svcIntroFrames = cont ? 0 : ((narrator.serviceIntroDuration ?? 0) > 0 ? toFrames(narrator.serviceIntroDuration!) : 0)
  const fQuoteFrames = host.featuredQuoteDuration && host.featuredQuoteDuration > 0 ? toFrames(host.featuredQuoteDuration) : 0
  const returnIntroFrames = cont ? ((narrator.returnIntroDuration ?? 0) > 0 ? toFrames(narrator.returnIntroDuration!) : RETURN_INTRO_FALLBACK) : 0
  const prevRecapFrames = cont ? ((narrator.prevRecapDuration ?? 0) > 0 ? toFrames(narrator.prevRecapDuration!) : PREV_RECAP_FALLBACK) : 0

  let cursor = BRAND_FRAMES + returnIntroFrames + svcIntroFrames + fQuoteFrames + prevRecapFrames
  const hostIntroStart = cursor
  cursor += hostIntroFrames
  cursor += bridgeFrames

  // continuation: returnIntro
  if (cont && returnIntroFrames > 0 && narrator.returnIntro) {
    const s = BRAND_FRAMES
    subs.push(...splitSentences(s, s + toAudioFrames(narrator.returnIntroDuration ?? 0), '나레이터', narrator.returnIntro))
  }

  if (!cont && svcIntroFrames > 0 && narrator.serviceIntro) {
    const s = BRAND_FRAMES
    subs.push(...splitSentences(s, s + toAudioFrames(narrator.serviceIntroDuration!), '나레이터', narrator.serviceIntro))
  }
  if (fQuoteFrames > 0 && host.featuredQuote) {
    const s = BRAND_FRAMES + returnIntroFrames + svcIntroFrames
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
    subs.push(...splitSentences(celebVoiceStart, celebVoiceStart + toAudioFrames(narrator.celebIntroDuration ?? 0), '나레이터', narrator.celebIntro))
  }

  if (!cont && host.philosophy) {
    const philoStart = hostIntroStart + celebIntroFrames
    subs.push(...splitSentences(philoStart, philoStart + toAudioFrames(host.voiceDuration ?? 0), host.nickname, host.philosophy))
  }

  const hasInterlude = books.length > 10
  const interludeIndex = hasInterlude ? Math.ceil(books.length / 2) : -1
  const interludeFrames = hasInterlude
    ? (narrator.interludeDuration && narrator.interludeDuration > 0 ? toFrames(narrator.interludeDuration) : INTERLUDE_FRAMES)
    : 0

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
    const titleFrames = toFrames(b.titleDuration)
    const sEnd = summaryPhaseEnd(b)
    const cEnd = contextPhaseEnd(b)

    subs.push({ start: bs, end: bs + toAudioFrames(b.titleDuration), speaker: '나레이터', text: `${b.title}, ${b.creator}` })

    const summaryStart = bs + titleFrames + TITLE_SUMMARY_GAP
    subs.push(...splitSentences(summaryStart, summaryStart + toAudioFrames(b.summaryDuration), '요약', b.summary))

    const contextStart = bs + sEnd + SUMMARY_CONTEXT_GAP
    subs.push(...splitSentences(contextStart, contextStart + toAudioFrames(b.contextDuration), '나레이터', b.context))

    if (b.directQuote && b.quoteDuration) {
      const quoteStart = bs + cEnd + CONTEXT_QUOTE_GAP
      subs.push({ start: quoteStart, end: quoteStart + toAudioFrames(b.quoteDuration), speaker: host.nickname, text: `"${b.directQuote}"` })
      if (b.contextAfter && b.contextAfterDuration) {
        const qFrames = toFrames(b.quoteDuration)
        const qEnd = cEnd + CONTEXT_QUOTE_GAP + qFrames
        const caStart = bs + qEnd + QUOTE_CONTEXTAFTER_GAP
        subs.push(...splitSentences(caStart, caStart + toAudioFrames(b.contextAfterDuration), '나레이터', b.contextAfter))
      }
    }
    cursor += bookTotalFrames(b)
  }
  cursor += RECAP_FRAMES
  if (narrator.outroDuration > 0) {
    subs.push(...splitSentences(cursor, cursor + toAudioFrames(narrator.outroDuration), '나레이터', narrator.outro))
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
