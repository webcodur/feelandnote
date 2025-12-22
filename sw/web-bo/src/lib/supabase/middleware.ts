import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// 세션 유지 기간: 30일 (초 단위)
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, {
              ...options,
              maxAge: SESSION_MAX_AGE,
              sameSite: 'lax',
              secure: process.env.NODE_ENV === 'production',
            })
          )
        }
      }
    }
  )

  // 세션 갱신 (중요!)
  const {
    data: { user }
  } = await supabase.auth.getUser()

  return { supabaseResponse, user }
}
