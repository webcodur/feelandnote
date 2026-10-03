import { createClient } from '@feelandnote/db'
import { restFetch } from '@/lib/db/restFetch'

/**
 * Cookie 없는 PostgREST 클라이언트 (unstable_cache 내부 사용)
 * 공개 데이터 조회 전용 — RLS anon 정책 적용
 *
 * 세션 없는 REST 조회는 토큰 갱신 타이머를 만들지 않는다.
 * fetch 는 Next 패치를 우회한 원본에 응답 대기 상한을 건 것을 쓴다(`lib/db/restFetch.ts`).
 */
export function createStaticClient() {
  return createClient(
    process.env.NEXT_PUBLIC_DB_API_URL!,
    process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { fetch: restFetch },
    },
  )
}
