/**
 * 출간이 만지는 서비스 테이블의 행 형태 — 서버 전용.
 *
 * 클라이언트 생성은 `lib/faction-db.ts` 의 `factionAdminClient()`(service_role)를 그대로 쓴다.
 * 이 파일은 ① 환경변수 누락을 조용히 넘기지 않도록 미리 점검하는 함수와
 * ② 출간이 읽고 쓰는 세 테이블의 행 형태만 못박는다(제네릭 Database 타입 미도입 저장소).
 */

import { factionAdminClient } from '@/lib/faction-db'

/** celeb_tags — 도감의 세력 1행 */
export interface CelebTagRow {
  id: string
  slug: string | null
  name: string
  name_en: string | null
  color: string | null
  team_images: unknown
  /**
   * 이 테마와 이어진 유튜브 영상(롱폼·쇼츠). 원천은 제작·업로드 기록이라
   * 출간이 항상 되쓴다 — 기록이 없으면 null 로 비운다.
   */
  youtube_videos: unknown
  is_featured: boolean | null
  sort_order: number | null
}

/** celeb_tag_assignments — 태그↔셀럽 배정 1행 */
export interface CelebAssignmentRow {
  id: string
  tag_id: string
  celeb_id: string
  short_desc: string | null
  long_desc: string | null
  short_desc_en: string | null
  long_desc_en: string | null
  /** 인물 대사 — 제작 데이터(faction_people.quote)가 유일한 출처라 출간이 항상 되쓴다 */
  quote: string | null
  quote_en: string | null
  spotlight_image_url: string | null
  sort_order: number | null
}

/** profiles — 셀럽 프로필(읽기 전용. 출간은 이 테이블에 쓰지 않는다) */
export interface CelebProfileRow {
  id: string
  slug: string | null
  nickname: string | null
  avatar_url: string | null
  celeb_tier: string | null
  /** 국문 대사에 쓰는 ElevenLabs 목소리 — 진단이 인물 국문 대사 목소리와 견준다 */
  voice_id_ko: string | null
  /** 영문 대사에 쓰는 ElevenLabs 목소리 — 진단이 인물 영문 대사 목소리와 견준다 */
  voice_id_en: string | null
}

export const TAG_COLUMNS = 'id, slug, name, name_en, color, team_images, youtube_videos, is_featured, sort_order'
export const ASSIGNMENT_COLUMNS =
  'id, tag_id, celeb_id, short_desc, long_desc, short_desc_en, long_desc_en, quote, quote_en, spotlight_image_url, sort_order'
export const PROFILE_COLUMNS = 'id, slug, nickname, avatar_url, celeb_tier, voice_id_ko, voice_id_en'

/** 출간에 필요한 Supabase 환경변수 중 빈 것들 */
export function missingSupabaseEnv(): string[] {
  return (['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const).filter(k => !process.env[k])
}

/**
 * 쓰기용 클라이언트. `factionAdminClient()` 가 환경변수 누락 시 즉시 던진다 —
 * 키 없이 만든 클라이언트는 호출 시점에야 알 수 없는 오류로 터진다.
 *
 * ⚠ service_role 은 RLS 를 우회한다. 부르기 전에 반드시 `requireFactionAdmin()` 으로 사람을 확인하라.
 */
export function adminClient() {
  return factionAdminClient()
}

/** team_images(jsonb) → 문자열 배열. 형태가 깨져 있으면 빈 배열 */
export function toImageArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.length > 0)
}
