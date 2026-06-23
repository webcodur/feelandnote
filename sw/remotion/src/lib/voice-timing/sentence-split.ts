/** 문장 분할 유틸리티 — 시리즈 무관 단일원천(SSoT). 컴포넌트·스크립트 모두 이 모듈에서 import한다. */
import type { VoiceTimingSegment, Sub } from './types'

/** 초 → 프레임 변환 기준 FPS. 모든 시리즈 영상이 60fps 고정. */
export const FPS = 60

export const SENTENCE_SPLIT = /(?<=[.?!。][''"」』]?)\s+/

/**
 * sub 필드가 있는 타이밍을 펼쳐서 세분화된 타이밍 배열로 변환.
 * sub 없는 세그먼트는 그대로 통과. sub가 있으면 글자수 비례 타이밍 분배.
 */
export function expandSubTimings(timings: VoiceTimingSegment[]): VoiceTimingSegment[] {
  const result: VoiceTimingSegment[] = []
  for (const t of timings) {
    if (!t.sub || t.sub.length <= 1) {
      result.push(t)
      continue
    }
    // subTimings가 있으면 실제 단어 경계 사용
    if (t.subTimings && t.subTimings.length === t.sub.length - 1) {
      let cursor = t.start ?? 0
      for (let i = 0; i < t.sub.length; i++) {
        const end = i < t.subTimings.length ? t.subTimings[i] : (t.end ?? 0)
        result.push({ start: cursor, end, text: t.sub[i] })
        cursor = end
      }
      continue
    }
    // 폴백: 글자수 비례 분배
    const totalChars = t.sub.reduce((s, c) => s + c.length, 0)
    const duration = (t.end ?? 0) - (t.start ?? 0)
    let cursor = t.start ?? 0
    for (const subText of t.sub) {
      const ratio = subText.length / totalChars
      const subDur = duration * ratio
      result.push({ start: cursor, end: cursor + subDur, text: subText })
      cursor += subDur
    }
  }
  return result
}

/** voiceTimings의 텍스트가 실제 텍스트와 일치하는지 확인. 불일치 시 타이밍을 무시해야 한다.
 *
 *  관용 정규화:
 *  - 공백·구두점·따옴표·괄호 제거 (TTS가 읽지 않는 기호)
 *  - 한자(U+4E00-9FFF) 제거 (tts.replace로 보통 빠짐)
 *  - 길이가 비슷(±30%)하고 문자 겹침이 70% 이상이면 fresh로 간주
 *
 *  순수 정확 일치를 요구하면 whisper 오인식 1-2자 또는 tts.replace 1건만으로도
 *  전체 타이밍이 폐기되어 하이라이트가 균등 분배로 떨어진다. 부분 어긋남은
 *  부분 어긋남으로 감수하고 나머지 정렬 정보는 살린다.
 */
export function isTimingsStale(text: string, timings?: VoiceTimingSegment[]): boolean {
  if (!timings || timings.length === 0) return false
  const joined = timings.map(t => t.text ?? '').join('')
  const norm = (s: string) => s
    .replace(/\s+/g, '')
    .replace(/[一-鿿]/g, '')
    .replace(/[()\[\]{}「」『』'"''""《》·]/g, '')
    .replace(/[.,!?;:。，！？；：、]/g, '')
  const a = norm(text)
  const b = norm(joined)
  if (a === b) return false
  // 길이 차이가 크면 stale
  const lenRatio = Math.min(a.length, b.length) / Math.max(a.length, b.length, 1)
  if (lenRatio < 0.7) return true
  // 문자 빈도 교집합 비율 (순서 무관)
  const freq = (s: string) => {
    const m = new Map<string, number>()
    for (const ch of s) m.set(ch, (m.get(ch) ?? 0) + 1)
    return m
  }
  const fa = freq(a)
  const fb = freq(b)
  let common = 0
  for (const [ch, ca] of fa) {
    const cb = fb.get(ch) ?? 0
    common += Math.min(ca, cb)
  }
  const overlap = common / Math.max(a.length, b.length, 1)
  return overlap < 0.7
}

/** 문장 분할 — **항상 원고 text 기반**.
 *  과거 버전은 voiceTimings가 있으면 `timings.map(t => t.text)`를 반환했으나,
 *  이 경로로 Whisper STT 오인식("식영", "가보년", "잃투면서도")이 Studio 렌더에
 *  그대로 노출되는 사고가 있었다. 원고가 단일 원천. timings 파라미터는 하위
 *  호환을 위해 받되 무시한다. */
export function splitSentences(text: string, _timings?: VoiceTimingSegment[]): string[] {
  return text.split(SENTENCE_SPLIT).filter(Boolean)
}

/**
 * 문장 분할 + 문단 경계 복원.
 * 원본 text의 `\n\n` 위치를 찾아 sentence 인덱스 단위로 변환한다.
 * voiceTimings가 있어도 원본 text와 누적 글자수를 매칭해 문단 경계를 복원.
 *
 * @returns sentences와 paraBreakAfter(해당 인덱스 문장 뒤에 문단 경계가 있음)
 */
export function splitSentencesWithBreaks(
  text: string, timings?: VoiceTimingSegment[],
): { sentences: string[]; paraBreakAfter: Set<number> } {
  const sentences = splitSentences(text, timings)
  const paraBreakAfter = new Set<number>()
  if (sentences.length <= 1) return { sentences, paraBreakAfter }

  // 원본 text를 `\n\n+` 기준으로 분할. 각 문단의 정규화 글자수 누적.
  const paraSplits = text.split(/\n\s*\n+/).map(s => s.trim()).filter(Boolean)
  if (paraSplits.length <= 1) return { sentences, paraBreakAfter }

  const norm = (s: string) => s.replace(/\s+/g, '')
  const paraCumLens: number[] = []
  let cum = 0
  for (const p of paraSplits) {
    cum += norm(p).length
    paraCumLens.push(cum)
  }

  let paraIdx = 0
  let sentCum = 0
  for (let i = 0; i < sentences.length; i++) {
    sentCum += norm(sentences[i]).length
    // 현재 문단의 끝 누적치를 넘어서면 이 문장 뒤가 문단 경계
    while (paraIdx < paraCumLens.length - 1 && sentCum >= paraCumLens[paraIdx]) {
      paraBreakAfter.add(i)
      paraIdx++
    }
  }
  return { sentences, paraBreakAfter }
}


/**
 * 하이라이트용 세그먼트 빌드 — expanded sub 단위로 원고 slice + timing range 매핑.
 * Typewriter, ShortCaption(PageHighlight) 공통 진입점.
 *
 * **원칙**: 화면 표시 text는 **언제나 원고 기반**, timing은 voiceTimings의 sub 단위.
 *
 * 매핑 전략:
 * 1. voiceTimings(expanded sub)가 있으면 그 수만큼 원고를 `sliceOriginalByTimings`로 분할
 *    → 각 slice는 원고 raw 문자(한자·따옴표 포함) + 같은 sub granularity의 range 획득
 * 2. timings 없으면 원고 SENTENCE_SPLIT으로 분할 + spreadFrames 균등 분배
 *
 * `\n\n` 문단 경계는 slice raw boundaries와 대조하여 paraBreakAfter로 전달.
 */
export function buildHighlightSegments(
  text: string,
  timings: VoiceTimingSegment[] | undefined,
  spreadFrames: number,
): { texts: string[]; ranges: { start: number; end: number }[]; paraBreakAfter: Set<number> } {
  const fresh = !isTimingsStale(text, timings) ? timings : undefined
  const expanded = fresh ? expandSubTimings(fresh) : undefined
  const hasTimings = expanded && expanded.length > 0
    && expanded.every(t => t.start != null && t.end != null)

  if (hasTimings) {
    // expanded sub granularity 유지: 원고를 sub 수만큼 raw slice
    const { slices: texts, boundaries } = sliceOriginalByTimingsFull(text, expanded!)
    const ranges = expanded!.map(t => ({
      start: Math.round(t.start! * FPS),
      end: Math.round(t.end! * FPS),
    }))
    const paraBreakAfter = computeParaBreakFromBoundaries(text, boundaries)
    return { texts, ranges, paraBreakAfter }
  }

  // 폴백: 원고 SENTENCE_SPLIT으로 분할 + 균등 분배
  const { sentences: texts, paraBreakAfter } = splitSentencesWithBreaks(text, undefined)
  const ranges = texts.map((_, i) => {
    const dur = spreadFrames / Math.max(1, texts.length)
    return { start: Math.round(i * dur), end: Math.round((i + 1) * dur) }
  })
  return { texts, ranges, paraBreakAfter }
}

/** slice의 raw 경계 목록을 기반으로 paraBreakAfter 계산.
 *  text 내 `\n\s*\n+` 위치가 slice i의 raw 범위(boundaries[i]..boundaries[i+1]) 안에
 *  있으면 paraBreakAfter에 i 추가. */
function computeParaBreakFromBoundaries(text: string, boundaries: number[]): Set<number> {
  const paraBreakAfter = new Set<number>()
  if (boundaries.length <= 1) return paraBreakAfter
  const paraRe = /\n\s*\n+/g
  let m: RegExpExecArray | null
  while ((m = paraRe.exec(text)) !== null) {
    const pos = m.index
    // pos가 속한 slice index 찾기
    for (let i = 0; i < boundaries.length - 1; i++) {
      if (pos >= boundaries[i] && pos < boundaries[i + 1]) {
        if (i < boundaries.length - 2) paraBreakAfter.add(i)
        break
      }
    }
  }
  return paraBreakAfter
}

/** 원고 텍스트를 expanded timing sub 수에 맞춰 정규화 글자수 비율로 raw slice 반환.
 *  ShortCaption의 sub 페이지 출력에 사용. 결과 slice는 원고 raw 문자(한자·따옴표
 *  포함)를 그대로 유지하며, Whisper STT 오인식이 화면에 노출되지 않게 한다. */
export function sliceOriginalByTimings(text: string, expanded: VoiceTimingSegment[]): string[] {
  return sliceOriginalByTimingsFull(text, expanded).slices
}

/** sliceOriginalByTimings 내부 버전 — slices와 함께 raw 경계 배열(boundaries)도 반환.
 *  boundaries.length = slices.length + 1, boundaries[i]는 slice i 시작 raw 위치.
 *  buildHighlightSegments가 paraBreakAfter 계산 시 사용. */
function sliceOriginalByTimingsFull(
  text: string,
  expanded: VoiceTimingSegment[],
): { slices: string[]; boundaries: number[] } {
  const isNormChar = (c: string): boolean => {
    if (/\s/.test(c)) return false
    if (/[()\[\]{}「」『』'"''""《》·.,!?;:。，！？；：、\n\r]/.test(c)) return false
    const code = c.charCodeAt(0)
    if (code >= 0x4E00 && code <= 0x9FFF) return false // 한자 제외
    return true
  }
  const normLen = (s: string): number => {
    let n = 0
    for (const c of s) if (isNormChar(c)) n++
    return n
  }

  const subLens = expanded.map(t => normLen(t.text ?? ''))
  const subTotal = subLens.reduce((a, b) => a + b, 0)

  // 원고 norm 총 길이 + 각 raw 위치의 norm 누적
  let origTotal = 0
  const rawCumNorm: number[] = [0]
  for (let i = 0; i < text.length; i++) {
    if (isNormChar(text[i])) origTotal++
    rawCumNorm.push(origTotal)
  }
  if (origTotal === 0 || subTotal === 0) {
    const fallback = expanded.map(t => t.text ?? '')
    return { slices: fallback, boundaries: [0, ...fallback.map(() => 0)] }
  }

  // 이진 탐색: target norm 위치 ≥ rawCumNorm[i] 인 최소 i
  const normToRaw = (target: number): number => {
    let lo = 0, hi = rawCumNorm.length - 1
    while (lo < hi) {
      const mid = (lo + hi) >> 1
      if (rawCumNorm[mid] < target) lo = mid + 1
      else hi = mid
    }
    return lo
  }

  // slice 경계 앞 구두점·공백을 이전 slice 끝에 흡수하는 헬퍼
  // (경계가 "ABC. DEF"의 'D' 앞에 오면 ". "가 다음 slice 머리로 넘어가는 버그 방지)
  // 따옴표는 제외: '검은 양'처럼 따옴표로 시작하는 덩어리는 다음 slice 머리에 붙어야
  // 하이라이트 타이밍이 뒤 문장에 귀속된다.
  const isBoundaryChar = (c: string): boolean =>
    /[\s.,!?;:。，！？；：、·\n\r]/.test(c)
  const isWordContinuer = (c: string): boolean =>
    !isBoundaryChar(c)
  // 닫는 따옴표 — 문장 종결부호 뒤에 붙는 경우에만 이전 slice로 흡수
  // (`아니하리라.'`에서 `'`가 다음 slice 머리로 넘어가 공백이 삽입되는 버그 방지)
  const isClosingQuote = (c: string): boolean => /['"'"」』]/.test(c)

  // 문단 경계(\n\n+) raw 범위를 미리 수집 — slice가 문단을 넘지 않도록 cap
  const paraBreaks: { start: number; end: number }[] = []
  const paraBreakRe = /\n\s*\n+/g
  let pm: RegExpExecArray | null
  while ((pm = paraBreakRe.exec(text)) !== null) {
    paraBreaks.push({ start: pm.index, end: pm.index + pm[0].length })
  }

  const slices: string[] = []
  const boundaries: number[] = [0]
  let cum = 0
  let prevRaw = 0
  for (let j = 0; j < expanded.length; j++) {
    cum += subLens[j]
    const isLast = j === expanded.length - 1
    if (isLast) {
      slices.push(text.slice(prevRaw, text.length).trim())
      boundaries.push(text.length)
      prevRaw = text.length
      continue
    }
    const targetNorm = Math.round((cum / subTotal) * origTotal)
    let rawEnd = normToRaw(targetNorm)
    // 0) 문단 경계 cap — normToRaw 결과가 \n\n을 넘어 다음 문단으로 진입했으면
    //    문단 경계 직후 위치로 되돌린다. slice는 절대로 문단을 넘지 않는다.
    let paraCapped = false
    for (const pb of paraBreaks) {
      if (pb.start >= prevRaw && pb.start < rawEnd) {
        rawEnd = pb.end
        paraCapped = true
        break
      }
    }
    if (!paraCapped) {
      // 1) 경계가 단어 중간이면 단어 끝까지 전진 (단어 절단 방지)
      while (rawEnd < text.length && isWordContinuer(text[rawEnd])) rawEnd++
      // 2) 뒤따르는 구두점·공백·개행을 이전 slice로 흡수 (다음 slice는 깨끗한 단어로 시작)
      while (rawEnd < text.length && isBoundaryChar(text[rawEnd])) rawEnd++
      // 3) 직전 rawEnd-1이 문장 종결부호(.!?。)이고 rawEnd 위치가 닫는 따옴표면
      //    따옴표도 이전 slice에 흡수 후 뒤따르는 공백도 재흡수
      //    (`아니하리라.'`의 `'`가 다음 slice로 넘어가 공백 삽입되는 문제 방지)
      if (rawEnd > 0 && rawEnd < text.length
          && /[.!?。]/.test(text[rawEnd - 1])
          && isClosingQuote(text[rawEnd])) {
        rawEnd++
        while (rawEnd < text.length && isBoundaryChar(text[rawEnd])) rawEnd++
      }
    }
    slices.push(text.slice(prevRaw, rawEnd).trim())
    boundaries.push(rawEnd)
    prevRaw = rawEnd
  }
  return { slices, boundaries }
}


/**
 * 멀티페이지 분할 — 문장 단위로 페이지 배분, 문장 인덱스 범위도 반환.
 *
 * @param eagerFlush true면 문장 종결(.!?) 뒤마다 즉시 페이지 분리 (쇼츠용).
 *                   false(기본)면 maxChars 초과 시에만 분리 (롱폼용).
 */
export function paginateSentences(
  text: string, maxChars: number, timings?: VoiceTimingSegment[],
  eagerFlush = false,
): { pages: string[]; ranges: { startIdx: number; endIdx: number }[] } {
  const { sentences, paraBreakAfter } = splitSentencesWithBreaks(text, timings)
  if (sentences.length <= 1) return { pages: [text], ranges: [{ startIdx: 0, endIdx: sentences.length }] }
  const pages: string[] = []
  const ranges: { startIdx: number; endIdx: number }[] = []
  let page = ''
  let pageStart = 0
  const flushPage = (endIdx: number) => {
    if (!page) return
    pages.push(page)
    ranges.push({ startIdx: pageStart, endIdx })
    page = ''
    pageStart = endIdx
  }
  for (let i = 0; i < sentences.length; i++) {
    // 문단 경계 강제 flush — 이전 문장 뒤가 문단 경계면 페이지를 끊고 새로 시작
    // (페이지 내부에 \n\n을 두면 빈 줄로 라인 수가 늘어 화면 높이를 초과한다)
    if (i > 0 && paraBreakAfter.has(i - 1)) {
      flushPage(i)
    }
    const candidate = page ? `${page} ${sentences[i]}` : sentences[i]
    if (candidate.length > maxChars && page) {
      flushPage(i)
      page = sentences[i]
      pageStart = i
    } else {
      page = candidate
    }
    // eagerFlush: 문장 종결(.!?) 뒤에서 즉시 flush (쇼츠 자막용)
    if (eagerFlush && page && /[.!?。]$/.test(page.trim()) && i < sentences.length - 1) {
      flushPage(i + 1)
    }
  }
  if (page) {
    pages.push(page)
    ranges.push({ startIdx: pageStart, endIdx: sentences.length })
  }
  return { pages, ranges }
}

/** 페이지별 voiceTimings 슬라이스 — paginateSentences의 ranges 사용 */
export function slicePageTimings(
  ranges: { startIdx: number; endIdx: number }[],
  allTimings: VoiceTimingSegment[] | undefined,
) {
  if (ranges.length <= 1 || !allTimings) return undefined
  const total = ranges[ranges.length - 1].endIdx
  if (total !== allTimings.length) return undefined
  if (allTimings.some(t => t.start == null || t.end == null)) return undefined
  return ranges.map(r => {
    const base = allTimings[r.startIdx].start
    const lastSeg = allTimings[r.endIdx - 1]
    // absEnd: 발화 실제 종료점. Whisper가 trailing silence를 마지막 단어 end에
    // 흡수시키는 케이스를 char 수 대비 duration 비교로 감지, 추정 종료점으로 보정.
    let absEnd = lastSeg.end
    const lastRealWord = lastSeg.words?.filter(w => w.text && !/^[.…]+$/.test(w.text)).slice(-1)[0]
    if (lastRealWord) {
      const wordDur = lastRealWord.end - lastRealWord.start
      const expectedDur = Math.max(lastRealWord.text.replace(/\s/g, '').length * 0.18, 0.3)
      if (wordDur > expectedDur * 1.8) {
        absEnd = lastRealWord.start + expectedDur * 1.3
      } else {
        absEnd = lastRealWord.end
      }
    }
    return {
      range: r,
      timings: allTimings.slice(r.startIdx, r.endIdx).map(t => ({
        ...t,
        start: t.start - base,
        end: t.end - base,
        subTimings: t.subTimings?.map(st => st - base),
      })),
      absStart: base,
      absEnd,
    }
  })
}

/** 긴 자막 조각을 구두점(마침표·물음표·느낌표·쉼표) 경계에서 더 잘게 나눈다.
 *
 *  - 목표 길이(targetChars) 미만이면 분할하지 않는다 → "이순신, 원균, 권율" 같은
 *    짧은 나열 콤마는 모아서 한 자막으로 둔다(문장에서 쉬는 콤마에서만 끊긴다).
 *  - 한 호흡이 목표 길이 이상 쌓인 직후의 구두점 경계에서 끊는다.
 *  - 단어 타이밍이 없으므로 각 조각의 start/end는 글자수 비례로 안분한다.
 *  - 마지막 잔여 조각이 너무 짧으면(<8자) 직전 조각에 흡수한다.
 */
function splitByPunctuation(
  start: number, end: number, speaker: string, text: string, targetChars = 32,
): Sub[] {
  const t = text.trim()
  if (t.length <= targetChars) return [{ start, end, speaker, text: t }]

  // 구두점 경계 위치(구두점 바로 다음 인덱스)
  const breaks: number[] = []
  for (let i = 0; i < t.length; i++) {
    if (/[.?!。,，、]/.test(t[i])) breaks.push(i + 1)
  }
  if (breaks.length === 0) return [{ start, end, speaker, text: t }]

  // 직전 컷에서 targetChars 이상 쌓인 첫 경계에서 컷
  const pieces: [number, number][] = []
  let segStart = 0
  for (const b of breaks) {
    if (b - segStart >= targetChars) { pieces.push([segStart, b]); segStart = b }
  }
  if (segStart < t.length) pieces.push([segStart, t.length])

  // 마지막 조각이 너무 짧으면 직전과 병합
  if (pieces.length >= 2 && pieces[pieces.length - 1][1] - pieces[pieces.length - 1][0] < 8) {
    pieces[pieces.length - 2][1] = pieces[pieces.length - 1][1]
    pieces.pop()
  }
  if (pieces.length <= 1) return [{ start, end, speaker, text: t }]

  const dur = end - start, total = t.length
  return pieces.map(([s, e]) => ({
    start: start + Math.round((dur * s) / total),
    end: start + Math.round((dur * e) / total),
    speaker,
    text: t.slice(s, e).trim(),
  }))
}

/** voiceTimings → 자막 세그먼트 변환. voiceTimings가 없으면 비율 분배 폴백.
 *  Typewriter(하이라이팅), StudioSubtitles, generate-srt 모두 이 함수를 사용한다.
 *
 *  ⚠ text 원천은 **원고(인자 text)** — expanded.text가 아니다. expanded에는 Whisper
 *  STT 오인식("식영", "가보년")이 있을 수 있고, 화면·자막에 노출되면 안 된다.
 *  expanded는 timing range만 제공하며, 원고를 비율 slice하여 각 sub의 text로 쓴다. */
export function splitSub(
  start: number, end: number, speaker: string, text: string,
  timings?: VoiceTimingSegment[],
): Sub[] {
  // voiceTimings가 있으면 sub 펼친 뒤 사용 (하이라이팅과 동일 단위)
  const expanded = timings ? expandSubTimings(timings) : undefined
  if (expanded && expanded.length > 1 && expanded.every(t => t.text && t.start != null && t.end != null)) {
    const origSlices = sliceOriginalByTimings(text, expanded)
    // 각 세그먼트(보통 한 문장)가 길면 구두점 경계에서 더 잘게 나눈다.
    return expanded.flatMap((t, i) => splitByPunctuation(
      start + Math.round(t.start! * FPS),
      start + Math.round(t.end! * FPS),
      speaker,
      origSlices[i] ?? t.text ?? '',
    ))
  }

  // 폴백(voiceTimings 없음 — 음성 미생성): 문장별로 글자수 비율 배치한 뒤,
  // 각 문장을 구두점(마침표·쉬는 콤마) 경계에서 splitByPunctuation으로 더 잘게 나눈다.
  // 음성이 있을 때(위 경로)와 동일한 분할 규칙을 적용해 자막 모양을 일관되게 유지한다.
  const sentences = text.split(SENTENCE_SPLIT).filter(Boolean)
  if (sentences.length === 0) return [{ start, end, speaker, text }]
  const totalChars = sentences.reduce((s, x) => s + x.length, 0) || 1
  const out: Sub[] = []
  let cursor = start
  for (let i = 0; i < sentences.length; i++) {
    const segEnd = i === sentences.length - 1
      ? end
      : cursor + Math.round((end - start) * (sentences[i].length / totalChars))
    out.push(...splitByPunctuation(cursor, segEnd, speaker, sentences[i]))
    cursor = segEnd
  }
  return out
}
