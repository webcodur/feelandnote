import { createClient } from '@supabase/supabase-js'

// Admin 클라이언트 (service_role_key 사용)
// auth.admin API 호출에만 사용
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
