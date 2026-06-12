import { createStaticClient } from '@/lib/supabase/static'
import type { ContentLocaleRow } from '@/lib/utils/content-locale'

export interface ScriptureContent {
  id: string
  title: string
  creator: string | null
  thumbnail_url: string | null
  type: string
  celeb_count: number
  user_count: number
  avg_rating: number | null
  review?: string | null
  review_en?: string | null
  is_spoiler?: boolean
  source_url?: string | null
  user_content_id?: string
  title_ko?: string | null
  title_en?: string | null
  creator_en?: string | null
  isbn_en?: string | null
  thumbnail_en?: string | null
  has_en_edition?: boolean | null
}

export interface ScripturesResult {
  contents: ScriptureContent[]
  total: number
  totalPages: number
  currentPage: number
}

export interface TopCeleb {
  id: string
  nickname: string
  nickname_en: string | null
  avatar_url: string | null
  title: string | null
  title_en: string | null
  influence: number | null
  count: number
}

export interface ScripturesByProfession {
  profession: string
  label: string
  contents: ScriptureContent[]
  total: number
  topCelebs: TopCeleb[]
}

// contents(content_locales) 임베드 조회 행 — select 문자열과 1:1 대응
export interface ContentJoinRow {
  id: string
  type: string
  content_locales: ContentLocaleRow[] | null
}

// user_contents → contents 조인 조회 행
export interface UserContentJoinRow {
  user_id: string
  content_id: string
  rating: number | null
  contents: ContentJoinRow | ContentJoinRow[] | null
}

export type StaticSupabase = ReturnType<typeof createStaticClient>
