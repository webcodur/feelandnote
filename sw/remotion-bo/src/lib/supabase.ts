import { createClient } from '@supabase/supabase-js'

/** 읽기 전용 anon key 클라이언트 (인증 불필요) */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)
