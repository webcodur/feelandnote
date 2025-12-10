import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 세션 유지 기간: 30일 (초 단위)
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                maxAge: SESSION_MAX_AGE,
                sameSite: 'lax',
                secure: process.env.NODE_ENV === 'production',
              })
            })
          } catch {
            // Server Component에서 호출 시 무시
          }
        }
      }
    }
  )
}
