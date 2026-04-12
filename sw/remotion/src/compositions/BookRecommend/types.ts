export interface CelebHost {
  nickname: string
  nickname_en: string
  speech_tone: string
  avatar_url: string
  /** 인물 소개 (DB bio) */
  bio: string
  /** 직함 */
  title: string
  /** 대표 명언 */
  featuredQuote?: string
  /** 명언 음성 길이 (초) */
  featuredQuoteDuration?: number
  /** 감상철학 요약 (continuation에서는 없음) */
  philosophy?: string
  /** 감상철학 음성 길이 (초, continuation에서는 없음) */
  voiceDuration?: number
  /** ElevenLabs 보이스 ID (셀럽 음성용, 없으면 Gemini/Cloud 사용) */
  elevenlabsVoiceId?: string
  /** Gemini TTS 셀럽 보이스 (없으면 기본 Puck) — voice-actors.md 참조 */
  geminiVoice?: string
  /** 셀럽 발화 스타일 prefix (한·영 공통) — 롱폼 celeb + 쇼츠 celeb-mid에 적용. 정속 prefix. */
  voiceStyle?: string
  /** 쇼츠 narrator/summary 속도 prefix 오버라이드 — 미지정 시 SHORTS_SPEED_DEFAULT('1.2배속으로') 적용. 셀럽 단위 조절용. */
  shortsSpeed?: string
}

export interface BookStats {
  /** 출판사 */
  publisher?: string
  /** 원서 제목 */
  originalTitle?: string
  /** 출판년도 */
  publishYear?: string
}

/** 시네마틱 이미지 — 텍스트 앵커 기반 전환 */
export interface CinematicImage {
  /** 이미지 파일명 (에피소드 images/ 디렉토리 기준, 확장자 포함. e.g. "1-1.jpg") */
  file: string
  /** 텍스트 앵커 — 나레이션에서 이 텍스트가 시작될 때 이미지 전환.
   *  배열 첫 이미지는 생략 가능 (북 섹션 시작부터 표시) */
  text?: string
  /** 귀속 필드 — summary(책 장면) 또는 context(인물 장면). 세부 위치는 text 앵커가 결정 */
  field?: 'summary' | 'context'
  /** 이미지 키워드 (Studio 표시용) */
  keyword?: string
  /** 이미지 프롬프트 (생성용) */
  prompt?: string
  /** 한국어 프롬프트 (생성용) */
  ko?: string
}

/** CinematicPanel에 전달되는 이미지 전환 정보 (프레임 해석 완료) */
export interface ImageTransition {
  frame: number
  file: string
  keyword?: string
}

/** 콘텐츠 카테고리 — 포스터 아이콘·타이틀 라벨에 사용 */
export type ContentCategory = 'BOOK' | 'VIDEO' | 'GAME' | 'MUSIC'

/** 인용+후속맥락 한 쌍 */
export interface QuotePair {
  quote: string
  quoteSource?: string
  quoteDuration?: number
  after?: string
  afterDuration?: number
}

export interface BookEntry {
  title: string
  creator: string
  thumbnail_url: string
  /** 콘텐츠 카테고리 (생략 시 BOOK) */
  category?: ContentCategory
  /** 요약맨: 책 소개 + 핵심 인사이트 */
  summary: string
  /** 요약맨 음성 길이 (초) */
  summaryDuration: number
  /** 나레이터 3인칭: 감상 배경 */
  contextMain: string
  /** 감상 배경 음성 길이 (초). voice: c-context.wav */
  contextDuration: number
  /** 인용+후속맥락 쌍 배열 (동적 N개). voice: d1-quote, d2-after, d3-quote, d4-after, ... */
  quotePairs?: QuotePair[]
  /** 섹션별 BGM — summary/contextMain 구간에 배경 음악 배정 */
  bgm?: {
    summary?: BgmTrack
    context?: BgmTrack
  }
  /** 출처 URL */
  source?: string
  /** 통계 데이터 */
  stats: BookStats
  /** 제목+저자 음성 길이 (초) */
  titleDuration: number
  /** 시네마틱 이미지 배열 (텍스트 앵커 기반 N장 전환). imagePrompts보다 우선 */
  images?: CinematicImage[]
  /** 시네마틱 이미지 프롬프트 (레거시 — 2슬롯 고정) */
  imagePrompts?: {
    '1': { prompt: string; ko: string; keyword: string }
    '2': { prompt: string; ko: string; keyword: string }
  }
}

export interface NarratorLines {
  /** 서비스 인사 — 고정 문구, 공용 오디오(common/) 재사용 */
  serviceGreeting?: string
  serviceGreetingDuration?: number
  /** Section 0: 서비스 인트로 — 본문 (예: "서재 탐방 코너에서는..."). continuation에서는 없음 */
  serviceIntro?: string
  serviceIntroDuration?: number
  /** Section 1: 인물 소개 (bio 읊기). continuation에서는 없음 */
  celebIntro?: string
  celebIntroDuration?: number
  /** continuation: 복귀 인사 (예: "서재 탐방, 두 번째 이야기입니다") */
  returnIntro?: string
  returnIntroDuration?: number
  /** continuation: 이전 파트 요약 (예: "지난 1부에서는 ...") */
  prevRecap?: string
  prevRecapDuration?: number
  /** 서재 이동 브릿지 */
  bridge: string
  bridgeDuration: number
  /** "핵심 요약" 라벨 오디오 길이 (초) */
  labelSummaryDuration?: number
  /** "감상경위" 라벨 오디오 길이 (초) */
  labelContextDuration?: number
  /** 중간안내 텍스트 (10개 초과 시) */
  interlude?: string
  interludeDuration?: number
  /** Section 6/7: 아웃트로 */
  outro: string
  outroDuration: number
}

/**
 * TTS 텍스트 오버라이드 (한글 숫자, 발음 조정 등)
 * 자막용(기본 텍스트)과 다를 때만 지정. 미지정 시 기본 텍스트 사용.
 */
export interface TtsOverrides {
  /** 책 제목 TTS (생성값 전문 오버라이드) — books[]와 인덱스 대응, null이면 자동 생성 */
  titles?: (string | null)[]
  /** 전역 텍스트 치환맵 — 숫자→한글 등 발음 변환. 모든 텍스트 필드에 적용 */
  replace?: Record<string, string>
}

/** 슬롯별 TTS 엔진 선택 (voice-select.json) */
export interface VoiceSelect {
  default: string
  slots?: Record<string, string>
}

/** 쇼츠 세그먼트 — 나레이션 한 구간 */
export interface ShortSegment {
  /** 고유 ID (음성 파일명: short-{id}.wav) */
  id: string
  /** 화자: narrator, celeb, summary(요약맨 — 롱폼 Charon 보이스) */
  role: 'narrator' | 'celeb' | 'summary'
  /** 자막/TTS 텍스트 */
  text: string
  /** 비주얼 유형: hook, intro, book, cta */
  visual: 'hook' | 'intro' | 'book' | 'cta'
  /** TTS 생성 후 자동 반영 (초) */
  duration?: number
  /** 구간별 커스텀 배경 이미지 경로 (옵션) */
  image?: string
  /** 세그먼트 내 이미지 전환 — t초 시점에서 다른 이미지로 교체.
   *  text 앵커 지정 시 3-timings가 voiceTimings에서 해당 텍스트 시작 시간을 t에 자동 반영.
   *  배열로 여러 전환점을 지정할 수 있다. */
  imageChangeAt?: { t: number; image: string; text?: string } | { t: number; image: string; text?: string }[]
  /** 인용 출처 — celeb role 세그먼트에서 인용문 아래에 표시 */
  quoteSource?: string
}

/**
 * 쇼츠(9:16) 설정
 * 세그먼트 배열로 자유롭게 구성. 나레이션이 흐르고 비주얼이 따라간다.
 */
export interface ShortsConfig {
  /** 소개할 책 인덱스 (기본 0) */
  featuredBookIndex?: number
  /** 인트로/리빌 배경 이미지 파일명 (images/ 기준) */
  revealBg?: string
  /** 책 구간 폴백 배경 이미지 파일명 (images/ 기준) */
  bookBg?: string
  /** 세그먼트 배열 — 순서대로 재생 */
  segments: ShortSegment[]
  /** 쇼츠 BGM — 에피소드 전체가 아닌 쇼츠 변형별 독립 */
  bgm?: BgmTrack[]
}

/** 파형 분석 기반 음성 타이밍 */
export type VoiceTimingSegment = {
  start: number; end: number; text?: string
  /** 자막 표시용 의미 단위 분할 — LLM이 지정. 없으면 text 그대로 사용 */
  sub?: string[]
  /** sub 경계 시점 (초) — analyze가 단어 타이밍에서 산출. sub.length - 1개. 없으면 글자수 비례 폴백 */
  subTimings?: number[]
  /** 단어 단위 타이밍 — imageChangeAt anchor의 word-level 매칭에 사용. analyze가 자동 채움 */
  words?: { text: string; start: number; end: number }[]
}
export type VoiceTimings = Record<string, VoiceTimingSegment[]>

/** 시리즈 정보 — 2부 이상 에피소드에만 존재 */
export interface SeriesInfo {
  part: number
  totalParts: number
  totalBooks: number
  prevEpisode: string
}

/** timing.json 구조 — 파이프라인이 자동 생성하는 기계 데이터 */
export interface EpisodeTimingData {
  voiceTimings?: VoiceTimings
  narrator?: {
    serviceGreetingDuration?: number
    serviceIntroDuration?: number
    celebIntroDuration?: number
    bridgeDuration?: number
    outroDuration?: number
    labelSummaryDuration?: number
    labelContextDuration?: number
    returnIntroDuration?: number
    prevRecapDuration?: number
    interludeDuration?: number
  }
  host?: {
    featuredQuoteDuration?: number
    voiceDuration?: number
  }
  books?: Array<{
    titleDuration?: number
    summaryDuration?: number
    contextDuration?: number
    quotePairDurations?: Array<{ quoteDuration?: number; afterDuration?: number }>
  }>
  /**
   * 쇼츠 타이밍 — 옵션 2 전환 이후 에피소드 timing.json 루트에는 shorts 필드가 저장되지 않는다.
   * shorts timing은 `shorts/{locale}-{N}.timing.json` 파일로 분리 저장되며
   * script.ts가 직접 읽어 BookRecommendScript.shorts 배열에 주입한다.
   * 타입은 레거시 호환용으로 남겨두지만 mergeEpisode에서는 사용하지 않는다.
   */
  shorts?: Array<{
    segments?: Array<{
      duration?: number
    }>
  }>
}

export interface BookRecommendScript {
  /** 시리즈 continuation 정보 (2부 이상일 때만 존재) */
  series?: SeriesInfo
  /** 로케일 — 기본 ko, 영문 에피소드는 'en' */
  locale?: 'ko' | 'en'
  host: CelebHost
  books: BookEntry[]
  narrator: NarratorLines
  /** TTS 텍스트 오버라이드 — 한글 숫자 등 발음 차이가 있는 필드만 지정 */
  tts?: TtsOverrides
  /** 쇼츠 설정 (배열: 동일 에피소드 내 복수 쇼츠 버전. shorts[0]=기본, shorts[1]=alt 등) */
  shorts?: ShortsConfig[]
  /** 파형 분석 기반 음성 타이밍 (3-timings.ts로 생성) */
  voiceTimings?: VoiceTimings
}

/** 배경 음악 트랙 */
export interface BgmTrack {
  /** 파일 경로 (public/ 기준, e.g. "episodes/done/yi-sun-sin/music/theme.mp3") */
  file: string
  /** 볼륨 0-1 (기본 0.15) */
  volume?: number
  /** 재생 시작 (초, 컴포지션 기준. 기본 0) */
  from?: number
  /** 재생 종료 (초, 컴포지션 기준. 미지정 시 끝까지) */
  to?: number
  /** 페이드인 (초, 기본 2) */
  fadeIn?: number
  /** 페이드아웃 (초, 기본 3) */
  fadeOut?: number
  /** 음악 파일 내 시작 오프셋 (초, 기본 0) */
  startFrom?: number
  /** 구간이 트랙보다 길 때 루프 반복 (기본 true) */
  loop?: boolean
  /** 트랙 원본 길이 (초). loop 계산에 필요. music 파일 목록 API가 자동 채워줌 */
  trackDuration?: number
}
