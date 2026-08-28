import { createClient } from '@supabase/supabase-js'
import { rawFetch } from '@/lib/rawFetch'

/**
 * Cookie 없는 Supabase 클라이언트 (unstable_cache 내부 사용)
 * 공개 데이터 조회 전용 — RLS anon 정책 적용
 * fetch 는 Next 패치를 우회한 원본을 쓴다. 이유는 `lib/rawFetch.ts` 머리말.
 */
export function createStaticClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { fetch: rawFetch } },
  )
}
