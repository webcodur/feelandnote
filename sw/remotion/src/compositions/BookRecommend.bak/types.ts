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
  /** 인터뷰어가 머스크에게 토스하는 멘트 */
  interviewerLine: string
  /** 셀럽의 1인칭 응답 */
  narration: string
  /** 출처 */
  source?: string
  rating?: number
  /** 인터뷰어 음성 길이 (초) */
  descVoiceDuration: number
  /** 셀럽 응답 음성 길이 (초) */
  narrVoiceDuration: number
}

export interface BookRecommendScript {
  host: CelebHost
  books: BookEntry[]
}
