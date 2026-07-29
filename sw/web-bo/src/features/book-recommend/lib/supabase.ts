import { createClient } from '@supabase/supabase-js'

/** 읽기 전용 anon key 클라이언트 (인증 불필요) */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

/** service_role 키 클라이언트 — DB 쓰기 전용 (서버 사이드에서만 사용) */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { autoRefreshToken: false, persistSession: false },
    },
  )
}
