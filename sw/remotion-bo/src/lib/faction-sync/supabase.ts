/**
 * 팩션 동기화 전용 Supabase 래퍼 — 서버 전용.
 *
 * 클라이언트 생성은 lib/supabase.ts 의 createAdminClient()(service_role)를 그대로 쓴다.
 * 이 파일은 ① 환경변수 누락을 조용히 넘기지 않도록 먼저 점검하고,
 * ② 팩션 동기화가 만지는 세 테이블의 행 형태만 타입으로 못박는다(제네릭 Database 타입 미도입 저장소).
 */

import { createAdminClient } from '@/lib/supabase'

/** celeb_tags — 세력 1행 */
export interface CelebTagRow {
  id: string
  slug: string | null
  name: string
  name_en: string | null
  color: string | null
  team_images: unknown
  is_featured: boolean | null
  sort_order: number | null
}

/** celeb_tag_assignments — 태그↔인물 배정 1행 */
export interface CelebAssignmentRow {
  id: string
  tag_id: string
  celeb_id: string
  short_desc: string | null
  long_desc: string | null
  short_desc_en: string | null
  long_desc_en: string | null
  spotlight_image_url: string | null
  sort_order: number | null
}

/** profiles — 인물 프로필(읽기 전용. 팩션 출간은 이 테이블을 쓰지 않는다) */
export interface CelebProfileRow {
  id: string
  slug: string | null
  nickname: string | null
  avatar_url: string | null
  celeb_tier: string | null
  profile_type: string | null
  status: string | null
}

/** 팩션 동기화에 필요한 Supabase 환경변수 중 빈 것들 */
export function missingSupabaseEnv(): string[] {
  return (['NEXT_PUBLIC_SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'] as const).filter(k => !process.env[k])
}

/**
 * 쓰기용 클라이언트. 환경변수가 없으면 여기서 즉시 끊는다 —
 * 키 없이 만든 클라이언트는 호출 시점에야 알 수 없는 오류로 터진다.
 */
export function adminClient() {
  const missing = missingSupabaseEnv()
  if (missing.length) throw new Error(`Supabase 환경변수 누락: ${missing.join(', ')}`)
  return createAdminClient()
}

/** team_images(jsonb) → 문자열 배열. 형태가 깨져 있으면 빈 배열 */
export function toImageArray(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return v.filter((x): x is string => typeof x === 'string' && x.length > 0)
}
