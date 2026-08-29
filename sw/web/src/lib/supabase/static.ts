import { createClient } from '@supabase/supabase-js'
import { rawFetch } from '@/lib/rawFetch'

/**
 * Cookie 없는 PostgREST 클라이언트 (unstable_cache 내부 사용)
 * 공개 데이터 조회 전용 — RLS anon 정책 적용
 *
 * auth 옵션을 반드시 끈다. supabase-js 는 브라우저가 아니면 생성 즉시 토큰 자동갱신
 * setInterval 을 시작하고 아무도 멈추지 않는다. 그 타이머가 생성 시점의 비동기 컨텍스트
 * (RSC 요청 객체 + React cache + 그 요청의 모든 fetch 응답)를 붙들어, 조회마다 만드는
 * 이 클라이언트 수만큼 요청 전체가 heap 에 남았다(26.08.28 운영 스냅샷: Timeout 1,817개,
 * 요청 객체 135개, 응답 2,515개 잔류 → 시간당 RSS +280MB, 6시간마다 OOM).
 * fetch 는 Next 패치를 우회한 원본을 쓴다. 이유는 `lib/rawFetch.ts` 머리말.
 */
export function createStaticClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      global: { fetch: rawFetch },
    },
  )
}
