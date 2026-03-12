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

export interface BookEntry {
  title: string
  creator: string
  thumbnail_url: string
  /** 나레이터의 도서 소개 멘트 */
  narratorLine: string
  /** 셀럽의 1인칭 감상 응답 */
  narration: string
  /** 출처 */
  source?: string
  rating?: number
  /** 제목+저자 음성 길이 (초) */
  titleDuration: number
  /** 나레이터 설명 음성 길이 (초) */
  narratorDuration: number
  /** 셀럽 응답 음성 길이 (초) */
  narrationDuration: number
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

export interface BookRecommendScript {
  host: CelebHost
  books: BookEntry[]
  narrator: NarratorLines
}
