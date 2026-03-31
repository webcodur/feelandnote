/**
 * voice-names — centralized voice file name mapping
 * Alphabetical sort = playback order
 */

// Longform: Pre-intro
export const VN_SERVICE_GREETING = 'A1-service-greeting.wav'
export const VN_SERVICE_INTRO = 'A2-service-intro.wav'
export const VN_FEATURED_QUOTE = 'A3-featured-quote.wav'

// Longform: Host intro
export const VN_CELEB_INTRO = 'B1-celeb-intro.wav'
export const VN_PHILOSOPHY = 'B2-philosophy.wav'

// Longform: Shared labels
export const VN_LABEL_SUMMARY = 'C1-label-summary.wav'
export const VN_LABEL_CONTEXT = 'C2-label-context.wav'

// Longform: Book phases
export function vnBookTitle(i: number) { return `D${String(i + 1).padStart(2, '0')}a-title.wav` }
export function vnBookSummary(i: number) { return `D${String(i + 1).padStart(2, '0')}b-summary.wav` }
export function vnBookContext(i: number) { return `D${String(i + 1).padStart(2, '0')}c-context.wav` }
export function vnBookQuote(i: number) { return `D${String(i + 1).padStart(2, '0')}d-quote.wav` }
export function vnBookContextAfter(i: number) { return `D${String(i + 1).padStart(2, '0')}e-context-after.wav` }

// Longform: Outro & continuation
export const VN_OUTRO = 'E1-outro.wav'
export const VN_INTERLUDE = 'E2-interlude.wav'
export const VN_RETURN_INTRO = 'E3-return-intro.wav'
export const VN_PREV_RECAP = 'E4-prev-recap.wav'

// Shorts
export function vnShort(segIndex: number, segId: string) { return `S${String(segIndex + 1).padStart(2, '0')}-${segId}.wav` }

/** voiceTimings key (filename without .wav) */
export function vnTimingKey(fileName: string) { return fileName.replace('.wav', '') }

/** 공통 음성 파일 집합 — 에피소드 간 재사용 */
export const COMMON_VOICE_FILES = new Set([VN_SERVICE_GREETING, VN_LABEL_SUMMARY, VN_LABEL_CONTEXT])

/**
 * episode name → { person, locale }
 * 'alexander-the-great' → { person: 'alexander-the-great', locale: 'ko' }
 * 'alexander-the-great-en' → { person: 'alexander-the-great', locale: 'en' }
 * 'elon-musk-2' → { person: 'elon-musk', locale: 'ko-2' }
 * 'elon-musk-2-en' → { person: 'elon-musk', locale: 'en-2' }
 */
export function parseEpName(epName: string): { person: string; locale: string } {
  let rest = epName
  let lang = 'ko'
  if (rest.endsWith('-en')) { lang = 'en'; rest = rest.slice(0, -3) }
  const m = rest.match(/-(\d+)$/)
  if (m) { rest = rest.slice(0, -m[0].length); lang = `${lang}-${m[1]}` }
  return { person: rest, locale: lang }
}

/**
 * voice-select.json 기반 음성 경로 해소 — 단일원천(SSoT)
 *
 * 사용처: makeVf (Remotion 재생), generate-voice (TTS 저장), analyze-voice (파형 분석)
 *
 * @param epName 에피소드명
 * @param file 음성 파일명 (e.g. 'B2-philosophy.wav')
 * @param voiceSelect voice-select.json 파싱 결과 (없으면 null)
 * @param locale 'ko' | 'en' — 영문은 common 사용 안 함
 * @returns 에피소드 기준 상대 경로 (e.g. 'elevenlabs/B2-philosophy.wav' 또는 'B2-philosophy.wav')
 */
export function resolveVoiceRelPath(
  file: string,
  voiceSelect: { default: string; slots?: Record<string, string> } | null,
  locale?: 'ko' | 'en',
): { dir: 'common' | 'common-en' | 'episode'; subPath: string } {
  // 공통 파일 — ko는 common/voice/ko/, en은 common/voice/en/
  if (COMMON_VOICE_FILES.has(file)) {
    return { dir: locale === 'en' ? 'common-en' : 'common', subPath: file }
  }
  // voice-select가 있으면 slots 우선, 없으면 default 엔진
  if (voiceSelect) {
    const engine = voiceSelect.slots?.[file] ?? voiceSelect.default
    return { dir: 'episode', subPath: `${engine}/${file}` }
  }
  // voice-select 없으면 직접 참조
  return { dir: 'episode', subPath: file }
}

/** Old name -> New name mapping for migration */
export function oldToNew(oldName: string, bookCount: number, shortSegments?: { id: string }[]): string | null {
  // Direct mappings
  const direct: Record<string, string> = {
    'service-greeting.wav': VN_SERVICE_GREETING,
    'service-intro.wav': VN_SERVICE_INTRO,
    'featured-quote.wav': VN_FEATURED_QUOTE,
    'narrator-celeb-intro.wav': VN_CELEB_INTRO,
    'philosophy.wav': VN_PHILOSOPHY,
    'label-summary.wav': VN_LABEL_SUMMARY,
    'label-context.wav': VN_LABEL_CONTEXT,
    'narrator-outro.wav': VN_OUTRO,
    'interlude.wav': VN_INTERLUDE,
    'return-intro.wav': VN_RETURN_INTRO,
    'prev-recap.wav': VN_PREV_RECAP,
  }
  if (direct[oldName]) return direct[oldName]

  // Book files: book-{i}-{phase}.wav
  const bookMatch = oldName.match(/^book-(\d+)-(title|summary|context-after|context|quote)\.wav$/)
  if (bookMatch) {
    const i = parseInt(bookMatch[1])
    const phase = bookMatch[2]
    const map: Record<string, (i: number) => string> = {
      'title': vnBookTitle,
      'summary': vnBookSummary,
      'context': vnBookContext,
      'quote': vnBookQuote,
      'context-after': vnBookContextAfter,
    }
    return map[phase]?.(i) ?? null
  }

  // Shorts: short-{segId}.wav
  const shortMatch = oldName.match(/^short-(.+)\.wav$/)
  if (shortMatch && shortSegments) {
    const segId = shortMatch[1]
    const idx = shortSegments.findIndex(s => s.id === segId)
    if (idx >= 0) return vnShort(idx, segId)
  }

  return null // Unknown file, skip
}
