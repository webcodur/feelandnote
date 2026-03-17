import { createClient } from '@supabase/supabase-js'

/**
 * Cookie 없는 Supabase 클라이언트 (unstable_cache 내부 사용)
 * 공개 데이터 조회 전용 — RLS anon 정책 적용
 */
export function createStaticClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
