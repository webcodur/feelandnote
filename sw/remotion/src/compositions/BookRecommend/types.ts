/** 단일 SFX 큐. 쇼츠 segment.sfx와 롱폼 음성 행의 xxxSfx 모두 동일 형식. */
export interface SfxItem {
  /** 에피소드 soundeffect/ 기준 상대 또는 'episodes/...' 절대 경로 */
  file: string
  /** 앵커 텍스트 — 해당 구절 시작 시점이 기준점. 비우면 구간 시작 0초가 기준점 */
  text?: string
  /** 기준점에서 ± 초 (양수=뒤로 밀기, 음수=앞당기기) */
  offset?: number
  /** 볼륨 0~1 (기본 0.7) */
  volume?: number
  /** 재생 길이 제한(초). 미지정 시 음원 끝까지. */
  duration?: number
  /** 시작 페이드인(초). 0초부터 이 시간만큼 0→volume으로 ramp. */
  fadeIn?: number
  /** 끝나기 전 페이드아웃(초). duration이 지정되어 있어야 의미가 있다. */
  fadeOut?: number
}

export interface CelebHost {
  nickname: string
  nickname_en: string
  speech_tone: string
  avatar_url: string
  /** 직함 */
  title: string
  /** 대표 명언 */
  featuredQuote?: string
  /** 명언 음성 길이 (초) */
  featuredQuoteDuration?: number
  /** 명언 SFX */
  featuredQuoteSfx?: SfxItem[]
  /** 명언 화자 */
  featuredQuoteSpeaker?: string
  /** 명언 음량 dB 게인 */
  featuredQuoteGainDb?: number
  /** 명언 재생 배속 (1=원본, 0.5~2) */
  featuredQuotePlaybackRate?: number
  /** 감상철학 요약 (continuation에서는 없음) */
  philosophy?: string
  /** 감상철학 음성 길이 (초, continuation에서는 없음) */
  voiceDuration?: number
  /** 감상철학 SFX */
  philosophySfx?: SfxItem[]
  /** 감상철학 화자 */
  philosophySpeaker?: string
  /** 감상철학 음량 dB 게인 */
  philosophyGainDb?: number
  /** 감상철학 재생 배속 (1=원본, 0.5~2) */
  philosophyPlaybackRate?: number
  /**
   * 셀럽 DB 인물 식별자(profiles.id, 불변 UUID) — slug·표기가 바뀌어도 보이스·셀럽 정보를 다시 잇는 열쇠.
   * 에피소드 생성 시 셀럽 프로필에서 박힌다.
   */
  celebId?: string
  /** ElevenLabs 보이스 ID (셀럽 음성용, 없으면 Gemini/Cloud 사용) */
  elevenlabsVoiceId?: string
  /** Gemini TTS 셀럽 보이스 (없으면 기본 Puck) — voice-actors.md 참조 */
  geminiVoice?: string
  /** 셀럽 발화 스타일 prefix (한·영 공통) — 롱폼 celeb + 쇼츠 celeb-mid에 적용. 정속 prefix. */
  voiceStyle?: string
  /** narrator/summary 발화 스타일 prefix 오버라이드 (레거시 필드명, 쇼츠·롱폼 공통) — 미지정 시 NARRATOR_STYLE_DEFAULT('숨소리 안나게 발화') 적용. 셀럽 단위 조절용. */
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
  /** 귀속 필드 — summary(책 장면), context(인물 배경), quote(직접 인용 전용).
   *  세부 위치는 text 앵커가 결정. 레거시 데이터는 quote 이미지도 'context'일 수 있음 */
  field?: 'summary' | 'context' | 'quote'
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
  /** 직접 인용 SFX */
  quoteSfx?: SfxItem[]
  /** 직접 인용 화자 — episode.speakers[].id 참조. TTS 파이프라인에서 voiceId 라우팅. */
  quoteSpeaker?: string
  /** 직접 인용 음량 dB 게인 */
  quoteGainDb?: number
  /** 직접 인용 재생 배속 (1=원본, 0.5~2) */
  quotePlaybackRate?: number
  after?: string
  /** 후속 맥락 토막 분할 — 2개 이상이면 토막별 wav(D{NN}d{P}-after, D{NN}d{P}_2-after, ...)로 처리.
   *  불변식: afterParts.join('\n\n') === after. 같은 인용 쌍 안에서만 분할(pairIdx·셀럽 음성 파일명 불변) */
  afterParts?: string[]
  afterDuration?: number
  /** 토막별 음성 길이 (초) — afterParts와 1:1 대응. 파이프라인 자동 기록 */
  afterPartDurations?: number[]
  /** 후속 맥락 SFX */
  afterSfx?: SfxItem[]
  /** 후속 맥락 화자 */
  afterSpeaker?: string
  /** 후속 맥락 음량 dB 게인 */
  afterGainDb?: number
  /** 후속 맥락 재생 배속 (1=원본, 0.5~2) */
  afterPlaybackRate?: number
  /** 후속 맥락 토막별 화자 — afterParts와 1:1 대응. 토막 2개↑ 분할 시에만 생성.
   *  읽기 폴백: afterPartSpeakers?.[p] ?? afterSpeaker */
  afterPartSpeakers?: string[]
  /** 후속 맥락 토막별 음량 dB 게인 — 읽기 폴백: afterPartGainDbs?.[p] ?? afterGainDb */
  afterPartGainDbs?: number[]
  /** 후속 맥락 토막별 재생 배속 — 읽기 폴백: afterPartPlaybackRates?.[p] ?? afterPlaybackRate */
  afterPartPlaybackRates?: number[]
  /** 후속 맥락 토막별 SFX — 읽기 폴백: afterPartSfxs?.[p] ?? afterSfx */
  afterPartSfxs?: SfxItem[][]
}

export interface BookEntry {
  title: string
  creator: string
  thumbnail_url: string
  /** 콘텐츠 카테고리 (생략 시 BOOK) */
  category?: ContentCategory
  /** 요약맨: 책 소개 + 핵심 인사이트. 토막 분할 시에도 전체 글(join('\n\n'))을 항상 유지 — 텍스트 소비자의 단일원천 */
  summary: string
  /** 핵심 요약 토막 분할 — 2개 이상이면 음성·렌더가 토막별 wav(D{NN}b-summary, D{NN}b2-summary, ...)로 처리.
   *  불변식: summaryParts.join('\n\n') === summary (BO 편집기가 유지) */
  summaryParts?: string[]
  /** 요약맨 음성 길이 (초) */
  summaryDuration: number
  /** 토막별 음성 길이 (초) — summaryParts와 1:1 대응. 파이프라인 자동 기록 */
  summaryPartDurations?: number[]
  /** 핵심 요약 SFX */
  summarySfx?: SfxItem[]
  /** 핵심 요약 화자 — episode.speakers[].id 참조. */
  summarySpeaker?: string
  /** 핵심 요약 음량 dB 게인 */
  summaryGainDb?: number
  /** 핵심 요약 재생 배속 (1=원본, 0.5~2) */
  summaryPlaybackRate?: number
  /** 핵심 요약 토막별 화자 — summaryParts와 1:1 대응. 토막 2개↑ 분할 시에만 생성.
   *  읽기 폴백: summaryPartSpeakers?.[p] ?? summarySpeaker */
  summaryPartSpeakers?: string[]
  /** 핵심 요약 토막별 음량 dB 게인 — 읽기 폴백: summaryPartGainDbs?.[p] ?? summaryGainDb */
  summaryPartGainDbs?: number[]
  /** 핵심 요약 토막별 재생 배속 — 읽기 폴백: summaryPartPlaybackRates?.[p] ?? summaryPlaybackRate */
  summaryPartPlaybackRates?: number[]
  /** 핵심 요약 토막별 SFX — 읽기 폴백: summaryPartSfxs?.[p] ?? summarySfx */
  summaryPartSfxs?: SfxItem[][]
  /** 나레이터 3인칭: 감상 배경. 토막 분할 시에도 전체 글(join('\n\n'))을 항상 유지 */
  contextMain: string
  /** 감상 배경 토막 분할 — 2개 이상이면 토막별 wav(D{NN}c-context, D{NN}c2-context, ...)로 처리.
   *  불변식: contextMainParts.join('\n\n') === contextMain */
  contextMainParts?: string[]
  /** 감상 배경 음성 길이 (초). voice: c-context.wav */
  contextDuration: number
  /** 토막별 음성 길이 (초) — contextMainParts와 1:1 대응. 파이프라인 자동 기록 */
  contextPartDurations?: number[]
  /** 감상 배경 SFX */
  contextMainSfx?: SfxItem[]
  /** 감상 배경 화자 */
  contextMainSpeaker?: string
  /** 감상 배경 음량 dB 게인 */
  contextMainGainDb?: number
  /** 감상 배경 재생 배속 (1=원본, 0.5~2) */
  contextMainPlaybackRate?: number
  /** 감상 배경 토막별 화자 — contextMainParts와 1:1 대응. 토막 2개↑ 분할 시에만 생성.
   *  읽기 폴백: contextMainPartSpeakers?.[p] ?? contextMainSpeaker */
  contextMainPartSpeakers?: string[]
  /** 감상 배경 토막별 음량 dB 게인 — 읽기 폴백: contextMainPartGainDbs?.[p] ?? contextMainGainDb */
  contextMainPartGainDbs?: number[]
  /** 감상 배경 토막별 재생 배속 — 읽기 폴백: contextMainPartPlaybackRates?.[p] ?? contextMainPlaybackRate */
  contextMainPartPlaybackRates?: number[]
  /** 감상 배경 토막별 SFX — 읽기 폴백: contextMainPartSfxs?.[p] ?? contextMainSfx */
  contextMainPartSfxs?: SfxItem[][]
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
  /** 제목 읽기 SFX */
  titleSfx?: SfxItem[]
  /** 제목 읽기 화자 */
  titleSpeaker?: string
  /** 제목 읽기 음량 dB 게인 */
  titleGainDb?: number
  /** 제목 읽기 재생 배속 (1=원본, 0.5~2) */
  titlePlaybackRate?: number
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
  serviceGreetingSfx?: SfxItem[]
  serviceGreetingSpeaker?: string
  serviceGreetingGainDb?: number
  serviceGreetingPlaybackRate?: number
  /** Section 0: 서비스 인트로 — 본문 (예: "서재 탐방 코너에서는..."). continuation에서는 없음 */
  serviceIntro?: string
  serviceIntroDuration?: number
  serviceIntroSfx?: SfxItem[]
  serviceIntroSpeaker?: string
  serviceIntroGainDb?: number
  serviceIntroPlaybackRate?: number
  /** Section 1: 인물 소개 (bio 읊기). continuation에서는 없음 */
  celebIntro?: string
  celebIntroDuration?: number
  celebIntroSfx?: SfxItem[]
  celebIntroSpeaker?: string
  celebIntroGainDb?: number
  celebIntroPlaybackRate?: number
  /** continuation: 복귀 인사 (예: "서재 탐방, 두 번째 이야기입니다") */
  returnIntro?: string
  returnIntroDuration?: number
  returnIntroSfx?: SfxItem[]
  returnIntroSpeaker?: string
  returnIntroGainDb?: number
  returnIntroPlaybackRate?: number
  /** continuation: 이전 파트 요약 (예: "지난 1부에서는 ...") */
  prevRecap?: string
  prevRecapDuration?: number
  prevRecapSfx?: SfxItem[]
  prevRecapSpeaker?: string
  prevRecapGainDb?: number
  prevRecapPlaybackRate?: number
  /** 서재 이동 브릿지 */
  bridge: string
  bridgeDuration: number
  bridgeSfx?: SfxItem[]
  bridgeSpeaker?: string
  bridgeGainDb?: number
  bridgePlaybackRate?: number
  /** "핵심 요약" 라벨 오디오 길이 (초) */
  labelSummaryDuration?: number
  /** "감상경위" 라벨 오디오 길이 (초) */
  labelContextDuration?: number
  /** 중간안내 텍스트 (10개 초과 시) */
  interlude?: string
  interludeDuration?: number
  interludeSfx?: SfxItem[]
  interludeSpeaker?: string
  interludeGainDb?: number
  interludePlaybackRate?: number
  /** Section 6/7: 아웃트로 */
  outro: string
  outroDuration: number
  outroSfx?: SfxItem[]
  outroSpeaker?: string
  outroGainDb?: number
  outroPlaybackRate?: number
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
  /** 비주얼 유형: hook, intro, book */
  visual: 'hook' | 'intro' | 'book'
  /** TTS 생성 후 자동 반영 (초) */
  duration?: number
  /** 구간별 커스텀 배경 이미지 경로 (옵션) */
  image?: string
  /** 세그먼트 내 이미지 전환 — t초 시점에서 다른 이미지로 교체.
   *  text 앵커 지정 시 3-timings가 voiceTimings에서 해당 텍스트 시작 시간을 t에 자동 반영.
   *  배열로 여러 전환점을 지정할 수 있다. */
  imageChangeAt?: { t: number; image: string; text?: string } | { t: number; image: string; text?: string }[]
  /** 다음 세그먼트로 넘어가기 전 추가 멈춤(초). 자동 gap에 더해진다.
   *  이 시간 동안 마지막 이미지가 그대로 유지되어 다음 장면으로 천천히 전환된다.
   *  자막·음성은 세그먼트 끝과 함께 사라지고, 다음 세그먼트는 그만큼 늦게 시작한다. */
  gapAfter?: number
  /** 사운드 이펙트 — 이 세그먼트 내에서 재생할 단발성 효과음.
   *  text 앵커 + offset(초) 조합으로 재생 시각을 결정한다.
   *  - text 없음: 세그먼트 시작 + offset
   *  - text 있음: 해당 구절 시작 시점(voiceTimings 매칭) + offset
   *  - voiceTimings 없거나 매칭 실패 시 세그먼트 텍스트 내 위치 비율로 폴백
   *  file은 에피소드 soundeffect/ 폴더 기준 상대 경로 또는 'episodes/...' 절대 경로. */
  sfx?: SfxItem[]
  /** 인용 출처 — celeb role 세그먼트에서 인용문 아래에 표시 */
  quoteSource?: string
  /** 우상단 표시 — 'avatar': 인물 얼굴, 'book': 책 표지, 'none': 표시 안 함.
   *  미지정 시 자동(intro 다음 세그먼트부터 얼굴, book 구간에서 책으로 전환). */
  topRight?: 'avatar' | 'book' | 'none'
  /** 화면 어둡게 처리 강도.
   *  true(=heavy): 강하게 어둡게(brightness 0.35·saturate 0.5),
   *  'light': 살짝 어둡게(brightness 0.65·saturate 0.75),
   *  undefined: 평소 밝기. */
  darken?: boolean | 'light'
  /** 배경 이미지 켄번즈 줌. true: 줌 ON(1→1.08), false: 고정 배경.
   *  미지정 시 ON. */
  zoomIn?: boolean
  /** 본문 텍스트 강조 표시 모드.
   *  true(=fullscreen): 화면 중앙에 좌측정렬 큰 글씨(54px)로 본문을 덮어 표시.
   *  'bottom': 화면 하단에 좌측정렬 큰 글씨(50px, 풀스크린보다 살짝 작게)로 표시.
   *  미지정: 일반 자막(ShortCaption)으로 하단 가운데 페이지 단위 표시.
   *  truthy 모드(true·'bottom')에서는 일반 자막은 숨김. */
  textOverlay?: boolean | 'bottom'
  /** 세그먼트 오디오 볼륨. 기본값 1. 음악이나 효과음에 묻히는 경우 조절. */
  volume?: number
  /** dB 게인. BO 입력값 그대로. 0(또는 미설정)이면 원본 음량. volume과 함께 곱셈 적용된다. */
  gainDb?: number
  /** 재생 배속 (1=원본, 0.5~2). 적재 시 duration·voiceTimings·imageChangeAt.t가 1/r 스케일되고
   *  <Audio playbackRate>로 음원만 빠르게 재생된다. playback-rate.ts 참조. */
  playbackRate?: number
  /** Gemini TTS 발화 스타일 prefix (예: "낮고 간절하게 속삭이듯"). narrator/summary 우선 적용, celeb는 host.voiceStyle 대체. */
  style?: string
  /** Gemini TTS 보이스 명시 오버라이드 (예: "Sulafat"). 지정 시 role과 무관하게 Gemini로 합성하며 ElevenLabs 셀럽 차단도 우회한다. 캐릭터 보이스(다중 화자) 용도. */
  geminiVoice?: string
  /** ElevenLabs 보이스 ID 세그먼트 단위 오버라이드. 지정 시 host.elevenlabsVoiceId 대신 이 값을 사용한다. 다중 화자(예: 손권 별도 보이스) 용도.
   *  speaker 참조보다 우선한다. */
  elevenlabsVoiceId?: string
  /** 화자 ID — ShortsConfig.speakers 배열의 항목과 매칭. 화자 카드의 voiceId·색상이 이 세그먼트에 적용된다. */
  speaker?: string
  /** 음성 잠금 — true 시 TTS 1단계가 이 세그먼트를 무조건 스킵.
   *  텍스트가 바뀌어 매니페스트 해시가 어긋나거나 `--force`가 와도 재합성하지 않는다.
   *  손으로 톤·발화 톤을 다듬어 마음에 든 결과를 그대로 보존하는 용도.
   *  의도적으로 다시 생성하려면 이 필드를 제거하거나 `--include-locked` 플래그를 사용. */
  voiceLock?: boolean
  /** 영상 제외 — true 시 이 세그먼트를 영상 렌더에서 완전히 건너뛴다(시간 0, 음성·자막·이미지 미표시).
   *  음성 파일과 데이터는 보존되므로, false로 되돌리면 그대로 다시 살아난다.
   *  배열에서 삭제하지 않고 잠시 빼두는 용도. 인덱스가 유지되어 음성 파일명이 어긋나지 않는다. */
  disabled?: boolean
}

/** 화자 카드 — 쇼츠 내 다중 화자 정의. segment.speaker가 이 id를 참조한다. */
export interface Speaker {
  /** 고유 ID (예: 'zhuge', 'sunquan'). segment.speaker에서 참조. */
  id: string
  /** 표시 라벨 (BO 화면용, 예: '제갈량') */
  label: string
  /** 색상 (hex, 예: '#3b82f6'). 시나리오 행 좌측 색띠·드롭다운 칩 등에 사용. */
  color: string
  /** ElevenLabs 보이스 ID — 이 화자 라인 합성 시 host.elevenlabsVoiceId 대신 사용. */
  elevenlabsVoiceId?: string
}

/**
 * 쇼츠(9:16) 설정
 * 세그먼트 배열로 자유롭게 구성. 나레이션이 흐르고 비주얼이 따라간다.
 */
export interface ShortsConfig {
  /** 고정 출력 번호. 음성 파일·voiceTimings 키(shorts-{slot}/…)와 컴포지션 ID 의 기준.
   *  배열 위치와 달리 책 발행 순서가 바뀌어도 유지된다. script.ts 조립 시 부여(없으면 폴더순). */
  slot?: number
  /** 소개할 책 인덱스 (기본 0) */
  featuredBookIndex?: number
  /** 쇼츠 썸네일에 표시할 책 제목 오버라이드. 없으면 books[featuredBookIndex].title 사용 */
  bookTitleOverride?: string
  /** 인트로/리빌 배경 이미지 파일명 (images/ 기준) */
  revealBg?: string
  /** 책 구간 폴백 배경 이미지 파일명 (images/ 기준) */
  bookBg?: string
  /** 화자 카드 배열 — 다중 화자(예: 셀럽 본인 + 상대 인물) 정의. segment.speaker로 참조. */
  speakers?: Speaker[]
  /** 세그먼트 배열 — 순서대로 재생 */
  segments: ShortSegment[]
  /** 쇼츠 BGM — 에피소드 전체가 아닌 쇼츠 변형별 독립 */
  bgm?: BgmTrack[]
  /** 마지막 로고(엔드 카드) 노출 길이(초). 미설정 시 BGM 유무로 자동(3 또는 5). 0.5~10 클램프. */
  logoDurationSec?: number
}

/** 파형 분석 기반 음성 타이밍 */
// 음성 타이밍 타입은 공통 모듈(src/lib/voice-timing)로 이관됨. 기존 import 경로 유지를 위해 재export.
import type { VoiceTimingSegment, VoiceTimings } from '../../lib/voice-timing'
export type { VoiceTimingSegment, VoiceTimings }

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
    /** 핵심 요약 토막별 길이 — summaryParts 분할 시 1:1 기록 */
    summaryPartDurations?: number[]
    contextDuration?: number
    /** 감상 배경 토막별 길이 — contextMainParts 분할 시 1:1 기록 */
    contextPartDurations?: number[]
    quotePairDurations?: Array<{ quoteDuration?: number; afterDuration?: number; afterPartDurations?: number[] }>
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
  /** 롱폼 화자 목록 — 인트로·책 본문·인용 모든 행이 공유. 쇼츠는 shorts[].speakers를 따로 보유. */
  speakers?: Speaker[]
  /** TTS 텍스트 오버라이드 — 한글 숫자 등 발음 차이가 있는 필드만 지정 */
  tts?: TtsOverrides
  /** 쇼츠 설정 (배열: 동일 에피소드 내 복수 쇼츠 버전. shorts[0]=기본, shorts[1]=alt 등) */
  shorts?: ShortsConfig[]
  /** 파형 분석 기반 음성 타이밍 (3-timings.ts로 생성) */
  voiceTimings?: VoiceTimings
  /** 롱폼 구간별 Gemini TTS 발화 스타일 prefix. 키는 구간 식별자(예: "B2-philosophy", "D01b-summary").
   *  쇼츠는 segment.style을 따로 쓰므로 여기 포함하지 않는다. 빈 문자열은 prefix 없음(명시적 옵트아웃). */
  voiceStyles?: Record<string, string>
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
