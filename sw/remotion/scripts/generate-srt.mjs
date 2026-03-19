#!/usr/bin/env node
/**
 * generate-srt.mjs — 에피소드 JSON에서 SRT 자막 파일 4종 추출
 *
 * Usage: node scripts/generate-srt.mjs <episode-name>
 * Example: node scripts/generate-srt.mjs alexander-the-great
 *
 * Output:
 *   srt/<episode-name>-longform.srt
 *   srt/<episode-name>-shorts.srt
 *   (영어 에피소드가 있으면 -en 버전도 생성)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const episodesDir = join(__dirname, '..', 'episodes', 'book-recommend')
const srtDir = join(__dirname, '..', 'srt')

// ── timing constants (from timing.ts) ──
const FPS = 60
const f = (sec) => Math.round(sec * FPS)
const toFrames = (sec) => Math.ceil(sec * FPS) + Math.round(1.5 * FPS)
const toAudioFrames = (sec) => Math.ceil(sec * FPS)

const BRAND_FRAMES = f(4)
const CELEB_VISUAL_DELAY = f(2.5)
const PRE_LABEL_GAP = f(0.4)
const LABEL_FRAMES = f(1.33)
const LABEL_CONTEXT_FRAMES = f(1.83)
const POST_LABEL_GAP = f(0.4)
const CONTEXT_QUOTE_GAP = f(3)
const QUOTE_CONTEXTAFTER_GAP = f(0.67)
const BOOK_GAP = f(3)
const RECAP_FRAMES = f(5)
const LOGO_FRAMES = f(3)
const CELEB_INTRO_FALLBACK = f(5)
const BRIDGE_FALLBACK = f(3.5)
const OUTRO_FALLBACK = f(4)
const SENTENCE_BREATH = f(0.27)

const SHORT_GAP = f(0.4)
const SHORT_FALLBACK = f(2.5)
const SHORT_BRAND_FRAMES = f(2.5)
const SHORT_LOGO_FRAMES = f(3)

const labelSummaryFrames = (dur) => dur ? toAudioFrames(dur) + f(0.33) : LABEL_FRAMES
const labelContextFrames = (dur) => dur ? toAudioFrames(dur) + f(0.33) : LABEL_CONTEXT_FRAMES
const titleSummaryGap = (labelDur) => PRE_LABEL_GAP + labelSummaryFrames(labelDur) + POST_LABEL_GAP
const summaryContextGap = (labelDur) => PRE_LABEL_GAP + labelContextFrames(labelDur) + POST_LABEL_GAP

// ── timeline builder (from useTimeline.ts) ──
function buildTimeline(script) {
  const { narrator, host, books } = script
  const cont = (script.series?.part ?? 1) > 1
  const ld = { labelSummaryDuration: narrator.labelSummaryDuration, labelContextDuration: narrator.labelContextDuration }

  const sgdR = narrator.serviceGreetingDuration ?? 0
  const svcGreetingFrames = cont ? 0 : (sgdR > 0 ? toFrames(sgdR) : 0)
  const svcIntroFrames = cont ? 0 : ((narrator.serviceIntroDuration ?? 0) > 0 ? toFrames(narrator.serviceIntroDuration) : 0)
  const celebIntroFrames = cont ? 0 : (CELEB_VISUAL_DELAY + ((narrator.celebIntroDuration ?? 0) > 0 ? toFrames(narrator.celebIntroDuration) : CELEB_INTRO_FALLBACK))
  const philosophyFrames = cont ? 0 : toFrames(host.voiceDuration ?? 0)
  const hostIntroFrames = cont ? 0 : (celebIntroFrames + f(1) + philosophyFrames)
  const bridgeFrames = narrator.bridgeDuration > 0 ? toFrames(narrator.bridgeDuration) : BRIDGE_FALLBACK
  const fQuoteFramesRaw = host.featuredQuoteDuration && host.featuredQuoteDuration > 0 ? toFrames(host.featuredQuoteDuration) : 0
  const fQuoteFrames = fQuoteFramesRaw > 0 ? fQuoteFramesRaw + f(1.5) : 0
  const outroFrames = narrator.outroDuration > 0 ? toFrames(narrator.outroDuration) : OUTRO_FALLBACK

  const TITLE_SUMMARY_GAP_F = titleSummaryGap(ld.labelSummaryDuration)
  const SUMMARY_CONTEXT_GAP_F = summaryContextGap(ld.labelContextDuration)
  const LABEL_SUMMARY_F = labelSummaryFrames(ld.labelSummaryDuration)
  const LABEL_CONTEXT_F = labelContextFrames(ld.labelContextDuration)

  let cursor = 0
  const brandStart = cursor; cursor += BRAND_FRAMES
  cursor += 0 // returnIntroFrames = 0 for non-continuation
  const svcGreetingStart = cursor; cursor += svcGreetingFrames
  const svcIntroStart = cursor; cursor += svcIntroFrames
  const fQuoteStart = cursor; cursor += fQuoteFrames
  cursor += 0 // prevRecapFrames = 0
  const hostIntroStart = cursor; cursor += hostIntroFrames
  const bridgeStart = cursor; cursor += bridgeFrames

  // book timings
  const summaryPhaseEnd = (b) => toFrames(b.titleDuration) + titleSummaryGap(ld.labelSummaryDuration) + toFrames(b.summaryDuration)
  const contextPhaseEnd = (b) => summaryPhaseEnd(b) + summaryContextGap(ld.labelContextDuration) + toFrames(b.contextDuration)
  const quotePhaseEnd = (b) => b.quoteDuration ? contextPhaseEnd(b) + CONTEXT_QUOTE_GAP + toFrames(b.quoteDuration) : contextPhaseEnd(b)
  const bookTotalFrames = (b) => {
    if (!b.quoteDuration) return contextPhaseEnd(b)
    const qEnd = quotePhaseEnd(b)
    if (!b.contextAfterDuration) return qEnd
    return qEnd + QUOTE_CONTEXTAFTER_GAP + toFrames(b.contextAfterDuration)
  }

  const bookTimings = books.map((b) => ({
    titleFrames: toFrames(b.titleDuration),
    summaryFrames: toFrames(b.summaryDuration),
    contextFrames: toFrames(b.contextDuration),
    quoteFrames: b.quoteDuration ? toFrames(b.quoteDuration) : 0,
    contextAfterFrames: b.contextAfterDuration ? toFrames(b.contextAfterDuration) : 0,
    summaryEnd: summaryPhaseEnd(b),
    contextEnd: contextPhaseEnd(b),
    total: bookTotalFrames(b) + LABEL_SUMMARY_F + LABEL_CONTEXT_F,
    hasQuote: !!b.quoteDuration,
    hasContextAfter: !!b.contextAfterDuration,
  }))

  const bookStarts = []
  for (let bi = 0; bi < bookTimings.length; bi++) {
    if (bi > 0) cursor += BOOK_GAP
    bookStarts.push(cursor)
    cursor += bookTimings[bi].total
  }

  const recapStart = cursor; cursor += RECAP_FRAMES
  const outroStart = cursor

  return {
    cont,
    svcGreetingStart, svcIntroStart, fQuoteStart, hostIntroStart, bridgeStart,
    bookStarts, recapStart, outroStart,
    celebIntroFrames, philosophyFrames, hostIntroFrames,
    svcGreetingFrames, svcIntroFrames, fQuoteFrames, outroFrames, bridgeFrames,
    bookTimings,
    LABEL_SUMMARY_F, LABEL_CONTEXT_F, TITLE_SUMMARY_GAP_F, SUMMARY_CONTEXT_GAP_F,
  }
}

// ── subtitle helpers ──

function splitSub(start, end, speaker, text, timings) {
  // voiceTiming에 text가 있으면 직접 사용
  if (timings && timings.length > 0 && timings.every(t => t.text)) {
    return timings.map(t => ({
      start: start + Math.round(t.start * FPS),
      end: start + Math.round(t.end * FPS),
      speaker,
      text: t.text,
    }))
  }

  const sentences = text.split(/(?<=[.?!,。])\s+/).filter(Boolean)
  if (sentences.length <= 1) return [{ start, end, speaker, text }]

  const MIN_F = Math.round(1.5 * FPS), MAX_F = Math.round(8 * FPS)
  let raw

  if (timings && timings.length === sentences.length) {
    raw = timings.map((t, i) => ({
      start: start + Math.round(t.start * FPS),
      end: start + Math.round(t.end * FPS),
      speaker,
      text: sentences[i],
    }))
  } else {
    const total = end - start
    const breath = (sentences.length - 1) * SENTENCE_BREATH
    const dist = Math.max(total - breath, total * 0.7)
    const chars = sentences.reduce((s, x) => s + x.length, 0)
    raw = []
    let c = start
    for (let i = 0; i < sentences.length; i++) {
      if (i > 0) c += SENTENCE_BREATH
      const fr = Math.round((sentences[i].length / chars) * dist)
      raw.push({ start: c, end: c + fr, speaker, text: sentences[i] })
      c += fr
    }
  }

  // 병합 (짧은 항목)
  const merged = []
  for (const s of raw) {
    if (merged.length > 0 && (s.end - s.start) < MIN_F) {
      merged[merged.length - 1].text += ' ' + s.text
      merged[merged.length - 1].end = s.end
    } else {
      merged.push({ ...s })
    }
  }

  // 분할 (긴 항목)
  const result = []
  for (const s of merged) {
    if ((s.end - s.start) <= MAX_F) { result.push(s); continue }
    const mid = Math.floor(s.text.length / 2)
    let sp = -1
    for (let d = 0; d < mid; d++) {
      if (/[,，、]/.test(s.text[mid + d] || '')) { sp = mid + d + 1; break }
      if (/[,，、]/.test(s.text[mid - d] || '')) { sp = mid - d + 1; break }
    }
    if (sp < 0) {
      for (let d = 0; d < mid; d++) {
        if (s.text[mid + d] === ' ') { sp = mid + d + 1; break }
        if (s.text[mid - d] === ' ') { sp = mid - d + 1; break }
      }
    }
    if (sp > 0 && sp < s.text.length) {
      const r = sp / s.text.length
      const sf2 = start + Math.round((s.end - start) * r)
      result.push({ start: s.start, end: sf2, speaker, text: s.text.slice(0, sp).trim() })
      result.push({ start: sf2, end: s.end, speaker, text: s.text.slice(sp).trim() })
    } else {
      result.push(s)
    }
  }
  return result
}

function framesToTimestamp(frame) {
  const totalMs = Math.round((frame / FPS) * 1000)
  const h = Math.floor(totalMs / 3600000)
  const m = Math.floor((totalMs % 3600000) / 60000)
  const s = Math.floor((totalMs % 60000) / 1000)
  const ms = totalMs % 1000
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

function subsToSrt(subs) {
  return subs.map((s, i) =>
    `${i + 1}\n${framesToTimestamp(s.start)} --> ${framesToTimestamp(s.end)}\n${s.text}\n`
  ).join('\n')
}

// ── longform SRT ──
function generateLongformSrt(script) {
  const { narrator, host, books } = script
  const tl = buildTimeline(script)
  const isEn = script.locale === 'en'
  const narratorLabel = isEn ? 'Narrator' : '나레이터'
  const summaryLabel = isEn ? 'Summary' : '요약'

  const vtk = (key) => script.voiceTimings?.[key]
  const subs = []

  // 서비스 인사
  if (!tl.cont && tl.svcGreetingFrames > 0 && narrator.serviceGreeting) {
    subs.push(...splitSub(
      tl.svcGreetingStart,
      tl.svcGreetingStart + toAudioFrames(narrator.serviceGreetingDuration ?? 0),
      narratorLabel, narrator.serviceGreeting,
      vtk('A1-service-greeting'),
    ))
  }
  // 서비스 인트로
  if (!tl.cont && tl.svcIntroFrames > 0 && narrator.serviceIntro) {
    subs.push(...splitSub(
      tl.svcIntroStart,
      tl.svcIntroStart + toAudioFrames(narrator.serviceIntroDuration),
      narratorLabel, narrator.serviceIntro,
      vtk('A2-service-intro'),
    ))
  }
  // 명언
  if (tl.fQuoteFrames > 0 && host.featuredQuote) {
    subs.push(...splitSub(
      tl.fQuoteStart + f(1),
      tl.fQuoteStart + f(1) + toAudioFrames(host.featuredQuoteDuration),
      host.nickname, host.featuredQuote,
    ))
  }
  // 셀럽 소개
  if (!tl.cont && narrator.celebIntro) {
    const cs = tl.hostIntroStart + CELEB_VISUAL_DELAY
    subs.push(...splitSub(
      cs, cs + toAudioFrames(narrator.celebIntroDuration ?? 0),
      narratorLabel, narrator.celebIntro,
      vtk('B1-celeb-intro'),
    ))
  }
  // 감상철학
  if (!tl.cont && host.philosophy) {
    const ps = tl.hostIntroStart + tl.celebIntroFrames + f(1)
    subs.push(...splitSub(
      ps, ps + toAudioFrames(host.voiceDuration ?? 0),
      host.nickname, host.philosophy,
      vtk('B2-philosophy'),
    ))
  }
  // 책
  for (let i = 0; i < books.length; i++) {
    const bs = tl.bookStarts[i]
    const b = books[i]
    const bt = tl.bookTimings[i]
    let c = bs

    const titleText = [b.title, b.creator, b.stats?.publishYear].filter(Boolean).join(', ')
    subs.push({ start: c, end: c + toAudioFrames(b.titleDuration), speaker: narratorLabel, text: titleText })
    c += bt.titleFrames

    c += tl.TITLE_SUMMARY_GAP_F
    c += tl.LABEL_SUMMARY_F

    const smStart = c
    subs.push(...splitSub(
      smStart, smStart + toAudioFrames(b.summaryDuration),
      summaryLabel, b.summary,
      vtk(`D${String(i + 1).padStart(2, '0')}b-summary`),
    ))
    c += bt.summaryFrames

    c += tl.SUMMARY_CONTEXT_GAP_F
    c += tl.LABEL_CONTEXT_F

    const ctStart = c
    subs.push(...splitSub(
      ctStart, ctStart + toAudioFrames(b.contextDuration),
      narratorLabel, b.context,
      vtk(`D${String(i + 1).padStart(2, '0')}c-context`),
    ))
    c += bt.contextFrames

    if (bt.hasQuote && b.directQuote && b.quoteDuration) {
      c += CONTEXT_QUOTE_GAP
      subs.push(...splitSub(
        c, c + toAudioFrames(b.quoteDuration),
        host.nickname, `"${b.directQuote}"`,
        vtk(`D${String(i + 1).padStart(2, '0')}d-quote`),
      ))
      c += bt.quoteFrames

      if (bt.hasContextAfter && b.contextAfter && b.contextAfterDuration) {
        c += QUOTE_CONTEXTAFTER_GAP
        subs.push(...splitSub(
          c, c + toAudioFrames(b.contextAfterDuration),
          narratorLabel, b.contextAfter,
          vtk(`D${String(i + 1).padStart(2, '0')}e-context-after`),
        ))
      }
    }
  }
  // 아웃트로
  if (narrator.outroDuration > 0) {
    subs.push(...splitSub(
      tl.outroStart, tl.outroStart + toAudioFrames(narrator.outroDuration),
      narratorLabel, narrator.outro,
      vtk('E1-outro'),
    ))
  }

  return subsToSrt(subs)
}

// ── shorts SRT ──
function generateShortsSrt(script) {
  if (!script.shorts?.segments) return ''
  const segments = script.shorts.segments
  const isEn = script.locale === 'en'
  const { host } = script

  const segTimings = segments.map(seg => seg.duration ? toFrames(seg.duration) : SHORT_FALLBACK)
  const segStarts = []
  let cursor = 0
  for (let i = 0; i < segTimings.length; i++) {
    segStarts.push(cursor)
    cursor += segTimings[i] + SHORT_GAP
    if (i === 0) cursor += SHORT_BRAND_FRAMES + SHORT_GAP
  }

  const vtk = (key) => script.voiceTimings?.[key]
  const subs = []

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    const speaker = seg.role === 'celeb' ? host.nickname : (isEn ? 'Narrator' : '나레이터')
    const timingKey = `S${String(i + 1).padStart(2, '0')}-${seg.id}`
    const audioFrames = seg.duration ? toAudioFrames(seg.duration) : SHORT_FALLBACK

    subs.push(...splitSub(
      segStarts[i],
      segStarts[i] + audioFrames,
      speaker, seg.text,
      vtk(timingKey),
    ))
  }

  return subsToSrt(subs)
}

// ── main ──
const epName = process.argv[2]
if (!epName) {
  console.error('Usage: node scripts/generate-srt.mjs <episode-name>')
  console.error('Example: node scripts/generate-srt.mjs alexander-the-great')
  process.exit(1)
}

mkdirSync(srtDir, { recursive: true })

const targets = [epName]
const enPath = join(episodesDir, `${epName}-en.json`)
if (existsSync(enPath)) targets.push(`${epName}-en`)

for (const name of targets) {
  const jsonPath = join(episodesDir, `${name}.json`)
  if (!existsSync(jsonPath)) {
    console.error(`에피소드 없음: ${jsonPath}`)
    continue
  }
  const script = JSON.parse(readFileSync(jsonPath, 'utf-8'))

  // longform
  const longSrt = generateLongformSrt(script)
  const longPath = join(srtDir, `${name}-longform.srt`)
  writeFileSync(longPath, longSrt, 'utf-8')
  console.log(`✓ ${longPath}`)

  // shorts
  if (script.shorts?.segments) {
    const shortSrt = generateShortsSrt(script)
    const shortPath = join(srtDir, `${name}-shorts.srt`)
    writeFileSync(shortPath, shortSrt, 'utf-8')
    console.log(`✓ ${shortPath}`)
  } else {
    console.log(`  (${name}: shorts 없음)`)
  }
}
