import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 세션 유지 기간: 30일 (초 단위)
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

// admin-auth.ts 의 requireAdmin() 보호를 받지 않는 읽기 전용 액션들.
// getUser()가 실패해도 null만 받고 멈춘다(getCelebs 등).
let ssrInServerAction = false

export function setSsrInServerAction(v: boolean) {
  ssrInServerAction = v
}

export async function createClient() {
  const cookieStore = await cookies()
  const attemptedRefresh = new Set<string>()

  // 확장 쿠키 저장소: JWT 만료 시 새 토큰 저장을 받아내고,
  // 한 번 getChunks로 덮어쓰기를 시도한 이름은 setAll에서 중복으로 다시 쓰지 않는다.
  const cookieMethods: CookieMethodsServer = {
    getAll() {
      return cookieStore.getAll()
    },
    setAll(cookiesToSet, _headers) {
      cookiesToSet.forEach(({ name, value, options }) => {
        if (attemptedRefresh.has(name)) return
        attemptedRefresh.add(name)
        try {
          cookieStore.set(name, value, {
            ...options,
            maxAge: SESSION_MAX_AGE,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
          })
        } catch {
          if (ssrInServerAction) {
            console.error('[supabase/server] 서버 액션 내 쿠키 갱신 실패: 토큰이 만료되었을 수 있습니다')
          }
        }
      })
    },
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieMethods },
  )
}
