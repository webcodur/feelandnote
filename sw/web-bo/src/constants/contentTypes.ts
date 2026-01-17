// 콘텐츠 타입 상수 (Single Source of Truth for web-bo)
import { Book, Film, Gamepad2, Music, Award } from 'lucide-react'

// DB에 저장되는 콘텐츠 타입
export type ContentType = 'BOOK' | 'VIDEO' | 'GAME' | 'MUSIC' | 'CERTIFICATE'

// 콘텐츠 타입 설정
export interface ContentTypeConfig {
  label: string
  icon: typeof Book
  color: string // text-color
  bgColor: string // bg-color
}

// 콘텐츠 타입별 설정 (SSoT)
export const CONTENT_TYPE_CONFIG: Record<ContentType, ContentTypeConfig> = {
  BOOK: { label: '도서', icon: Book, color: 'text-blue-400', bgColor: 'bg-blue-500/10' },
  VIDEO: { label: '영상', icon: Film, color: 'text-red-400', bgColor: 'bg-red-500/10' },
  GAME: { label: '게임', icon: Gamepad2, color: 'text-green-400', bgColor: 'bg-green-500/10' },
  MUSIC: { label: '음악', icon: Music, color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
  CERTIFICATE: { label: '자격증', icon: Award, color: 'text-yellow-400', bgColor: 'bg-yellow-500/10' },
}

// 콘텐츠 타입 배열 (순회용)
export const CONTENT_TYPES = Object.keys(CONTENT_TYPE_CONFIG) as ContentType[]

// 유틸 함수
export const getContentTypeConfig = (type: ContentType): ContentTypeConfig => {
  return CONTENT_TYPE_CONFIG[type]
}

export const getContentTypeLabel = (type: ContentType): string => {
  return CONTENT_TYPE_CONFIG[type]?.label ?? type
}

export const getContentTypeIcon = (type: ContentType) => {
  return CONTENT_TYPE_CONFIG[type]?.icon ?? Book
}
