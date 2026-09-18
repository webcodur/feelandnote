import type { SupabaseClient } from '@supabase/supabase-js'
import { FEATURE_EXCLUDED_CELEB_SLUGS } from '@feelandnote/shared/constants/celeb-feature-exclusion'

/**
 * 추천 노출 제외 인물의 id 집합. 명단은 슬러그로 관리하고, 편성 코드는 id로 후보를 거르므로
 * 여기서 한 번 바꾼다. 조회가 실패하면 던진다 — 빈 집합으로 삼키면 명단이 없는 것처럼 굴러간다.
 */
export async function fetchFeatureExcludedCelebIds(db: SupabaseClient): Promise<Set<string>> {
  const { data, error } = await db
    .from('celebs')
    .select('id')
    .in('slug', [...FEATURE_EXCLUDED_CELEB_SLUGS])
  if (error) throw new Error(`추천 노출 제외 인물 조회 실패: ${error.message}`)
  return new Set(((data ?? []) as { id: string }[]).map((row) => row.id))
}
