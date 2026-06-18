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
/** part: 토막 인덱스(0-based). 0은 기존 이름 그대로(D01b-summary), 1부터 번호 부착(D01b2-summary) — 기존 음원 전부 호환 */
export function vnBookSummary(i: number, part = 0) {
  return `D${String(i + 1).padStart(2, '0')}b${part > 0 ? part + 1 : ''}-summary.wav`
}
export function vnBookContext(i: number, part = 0) {
  return `D${String(i + 1).padStart(2, '0')}c${part > 0 ? part + 1 : ''}-context.wav`
}
export function vnBookQuote(i: number, pairIdx: number) {
  return `D${String(i + 1).padStart(2, '0')}d${pairIdx * 2 + 1}-quote.wav`
}
/** part: 토막 인덱스(0-based). 0은 기존 이름 그대로(D01d2-after), 1부터 `_N` 접미사 부착(D01d2_2-after).
 *  접미사는 d 번호 뒤에 붙어 같은 인용 쌍 안에서만 분할하며, 다음 쌍의 d 인덱스(d3 등)와 충돌하지 않는다.
 *  알파벳·숫자 정렬 시 D01d2 < D01d2_2 < D01d3 순서가 보장되어 재생 순서가 유지된다. */
export function vnBookAfter(i: number, pairIdx: number, part = 0) {
  return `D${String(i + 1).padStart(2, '0')}d${pairIdx * 2 + 2}${part > 0 ? `_${part + 1}` : ''}-after.wav`
}

// Longform: Outro & continuation
export const VN_OUTRO = 'E1-outro.wav'
export const VN_INTERLUDE = 'E2-interlude.wav'
export const VN_RETURN_INTRO = 'E3-return-intro.wav'
export const VN_PREV_RECAP = 'E4-prev-recap.wav'

// Shorts
/**
 * Shorts 음성 파일 경로 (에피소드 voice 디렉토리 기준 상대경로)
 *
 * 옵션 2 이후: 모든 쇼츠가 `shorts-{shortsIndex}/` 접두사를 사용한다.
 * 접두사 없는 레거시 경로는 더 이상 생성하지 않는다.
 *
 * @param segIndex 세그먼트 인덱스 (0-based)
 * @param segId 세그먼트 ID (hook, intro, celeb-mid, book-context 등)
 * @param shortsIndex 쇼츠 번호 (1-based, 필수)
 * @returns `shorts-{shortsIndex}/S{nn}-{segId}.wav`
 */
export function vnShort(segIndex: number, segId: string, shortsIndex: number) {
  return `shorts-${shortsIndex}/S${String(segIndex + 1).padStart(2, '0')}-${segId}.wav`
}

// 1권 모드(SOLO)
/**
 * 솔로 마디 음성 파일 경로 (에피소드 voice 디렉토리 기준 상대경로).
 *
 * 한 책의 솔로 마디는 책 폴더 단위로 묶인다 — `solo-B{NN}/` 접두사로 다른 솔로와 분리.
 * NN은 1-based 2자리 (책 인덱스 + 1).
 *
 * @param bookIndex 책 인덱스 (0-based)
 * @param segIndex 마디 인덱스 (0-based, 마디 배열 순서)
 * @param segId 마디 ID (영문/숫자/하이픈만, BO 편집기가 발급)
 * @returns `solo-B{NN}/S{nn}-{segId}.wav`
 */
export function vnSolo(bookIndex: number, segIndex: number, segId: string) {
  const bookNN = String(bookIndex + 1).padStart(2, '0')
  return `solo-B${bookNN}/S${String(segIndex + 1).padStart(2, '0')}-${segId}.wav`
}

/** voiceTimings key (filename without .wav) */
export function vnTimingKey(fileName: string) { return fileName.replace('.wav', '') }

/** 셀럽 보이스 파일 판별 — ElevenLabs 자동 라우팅 대상.
 *  쇼츠는 옵션 2 이후 `shorts-{N}/` 접두사가 필수다.
 *  솔로는 `solo-B{NN}/` 접두사 안에서 ID에 `-quote-`·`-celeb-`가 들어가면 셀럽 보이스. */
export function isCelebVoiceFile(file: string): boolean {
  const key = file.replace('.wav', '')
  return key === 'A3-featured-quote' || key === 'B2-philosophy'
    || /^D\d{2}d\d+-quote$/.test(key)
    || /^shorts-\d+\/S\d{2}-celeb-/.test(key)
    || /^shorts-\d+\/S\d{2}-book-quote/.test(key)
    || /^solo-B\d{2}\/S\d{2}-.*-(quote|celeb)/.test(key)
}

/** 공통 음성 파일 집합 — 에피소드 간 재사용 */
export const COMMON_VOICE_FILES = new Set([VN_SERVICE_GREETING, VN_LABEL_SUMMARY, VN_LABEL_CONTEXT])

/**
 * episode name → { person, locale }
 * 'alex-karp'     → { person: 'alex-karp', locale: 'ko' }
 * 'alex-karp-en'  → { person: 'alex-karp', locale: 'en' }
 */
export function parseEpName(epName: string): { person: string; locale: string } {
  if (epName.endsWith('-en')) return { person: epName.slice(0, -3), locale: 'en' }
  return { person: epName, locale: 'ko' }
}

/**
 * voice-select.json 기반 음성 경로 해소 — 단일원천(SSoT)
 *
 * 사용처: makeVf (Remotion 재생), 1-tts (TTS 저장), 3-timings (파형 분석)
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
  hasElevenlabs?: boolean,
): { dir: 'common' | 'common-en' | 'episode'; subPath: string } {
  // 공통 파일 — ko는 common/voice/ko/, en은 common/voice/en/
  if (COMMON_VOICE_FILES.has(file)) {
    return { dir: locale === 'en' ? 'common-en' : 'common', subPath: file }
  }
  // voice-select가 있으면 slots 우선, 없으면 default 엔진
  if (voiceSelect) {
    // ElevenLabs ID가 있는 인물: celeb 파일은 무조건 elevenlabs
    const engine = voiceSelect.slots?.[file]
      ?? (hasElevenlabs && isCelebVoiceFile(file) ? 'elevenlabs' : voiceSelect.default)
    return { dir: 'episode', subPath: `${engine}/${file}` }
  }
  // voice-select 없으면 직접 참조
  return { dir: 'episode', subPath: file }
}

