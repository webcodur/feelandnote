export interface CelebHost {
  nickname: string
  nickname_en: string
  speech_tone: string
  avatar_url: string
  /** 인물 소개 (DB bio) */
  bio: string
  /** 직함 */
  title: string
  /** 감상철학 요약 */
  philosophy: string
  /** 감상철학 음성 길이 (초) */
  voiceDuration: number
}

export interface BookStats {
  /** 추천한 셀럽 수 */
  celebCount: number
  /** 추천한 셀럽 이름 목록 (본인 제외) */
  celebNames: string[]
  /** 출판사 */
  publisher?: string
  /** 원서 제목 */
  originalTitle?: string
  /** 출판년도 */
  publishYear?: string
}

export interface BookEntry {
  title: string
  creator: string
  thumbnail_url: string
  /** 요약맨: 책 소개 + 핵심 인사이트 */
  summary: string
  /** 요약맨 음성 길이 (초) */
  summaryDuration: number
  /** 나레이터 3인칭: 추천 경위 + 맥락 해석 */
  context: string
  /** 나레이터 맥락 음성 길이 (초) */
  contextDuration: number
  /** 셀럽 실제 발언 (있을 때만) */
  directQuote?: string
  /** 인용 출처 표시 (예: "Fresh Dialogues 인터뷰") */
  directQuoteSource?: string
  /** 인용 음성 길이 (초, 있을 때만) */
  quoteDuration?: number
  /** 인용문 뒤 나레이터 후속 맥락 (있을 때만) */
  contextAfter?: string
  /** 후속 맥락 음성 길이 (초, 있을 때만) */
  contextAfterDuration?: number
  /** 출처 URL */
  source?: string
  /** 리캡용 한줄 요약 */
  oneLiner: string
  /** 통계 데이터 */
  stats: BookStats
  /** 제목+저자 음성 길이 (초) */
  titleDuration: number
}

export interface NarratorLines {
  /** Section 0: 서비스 인트로 (미사용) */
  serviceIntro: string
  serviceIntroDuration: number
  /** Section 1: 인물 소개 (bio 읊기) */
  celebIntro: string
  celebIntroDuration: number
  /** 서재 이동 브릿지 */
  bridge: string
  bridgeDuration: number
  /** Section 6/7: 아웃트로 */
  outro: string
  outroDuration: number
}

/**
 * TTS 텍스트 오버라이드 (한글 숫자, 발음 조정 등)
 * 자막용(기본 텍스트)과 다를 때만 지정. 미지정 시 기본 텍스트 사용.
 */
export interface TtsOverrides {
  narrator?: {
    celebIntro?: string
    outro?: string
  }
  host?: {
    philosophy?: string
  }
  books?: Array<{
    /** TTS용 제목+저자+연도 (예: "..., 천구백칠십구 년 집필") */
    title?: string
    summary?: string
    context?: string
    contextAfter?: string
    directQuote?: string
  }>
}

export interface BookRecommendScript {
  host: CelebHost
  books: BookEntry[]
  narrator: NarratorLines
  /** TTS 텍스트 오버라이드 — 한글 숫자 등 발음 차이가 있는 필드만 지정 */
  tts?: TtsOverrides
}
