import { createServerClient } from '@feelandnote/db'
import { cookies } from 'next/headers'
import { cache } from 'react'

// 세션 유지 기간: 30일 (초 단위)
const SESSION_MAX_AGE = 60 * 60 * 24 * 30

/** 인증 검증 결과는 현재 서버 렌더 요청 안에서만 공유한다. 다른 방문자와 공유하지 않는다. */
export const getRequestUser = cache(async () => (await createClient()).auth.getUser())

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_DB_API_URL!,
    process.env.NEXT_PUBLIC_DB_PUBLISHABLE_KEY!,
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
                maxAge: options.maxAge === 0 ? 0 : SESSION_MAX_AGE,
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
