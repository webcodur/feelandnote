import { createClient } from '@supabase/supabase-js'
import { rawFetch } from '@/lib/rawFetch'

/**
 * Service Role 키 기반 서버 전용 클라이언트 (RLS bypass).
 * 로그인 없는 익명 자유게시판처럼 anon 직접 접근을 막고 서버 액션이 전담하는 경우에만 사용한다.
 * 절대 클라이언트 컴포넌트에서 import하지 않는다.
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_DB_API_URL!,
    process.env.DB_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false }, global: { fetch: rawFetch } },
  )
}
