import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/db/server'
import { getAccountAccessState } from '@/lib/auth/account-access'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const nextParam = searchParams.get('next')
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // OAuth 에러 처리
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error)}`
    )
  }

  const db = await createClient()

  // #region 이메일 확인 흐름 (token_hash 파라미터가 있는 경우)
  if (tokenHash && type) {
    const { data, error: verifyError } = await db.auth.verifyOtp({
      type,
      token_hash: tokenHash
    })

    if (verifyError) {
      console.error('Verify OTP error:', verifyError)
      return NextResponse.redirect(`${origin}/login?error=verify_failed`)
    }

    if (data.user) {
      const accessRedirect = await getAccountAccessRedirect(db, origin)
      if (accessRedirect) return accessRedirect

      // 비밀번호 리셋인 경우 리셋 페이지로 이동
      if (type === 'recovery') {
        return NextResponse.redirect(`${origin}/reset-password`)
      }

      const redirectPath = nextParam ?? `/${data.user.id}/reading`
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }
  // #endregion

  // #region OAuth 흐름 (code 파라미터가 있는 경우)
  if (code) {
    const { data, error: exchangeError } = await db.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('[OAuth Callback] Exchange code error:', {
        message: exchangeError.message,
        status: exchangeError.status,
        code: exchangeError.code,
      })
      return NextResponse.redirect(`${origin}/login?error=auth_failed&reason=${encodeURIComponent(exchangeError.message)}`)
    }

    if (data.user) {
      const accessRedirect = await getAccountAccessRedirect(db, origin)
      if (accessRedirect) return accessRedirect
      const redirectPath = nextParam ?? `/${data.user.id}/reading`
      return NextResponse.redirect(`${origin}${redirectPath}`)
    }
  }
  // #endregion

  // #region 세션이 이미 설정된 경우 (Auth /verify에서 리다이렉트)
  const { data: { user } } = await db.auth.getUser()

  if (user) {
    const accessRedirect = await getAccountAccessRedirect(db, origin)
    if (accessRedirect) return accessRedirect
    const redirectPath = nextParam ?? `/${user.id}/reading`
    return NextResponse.redirect(`${origin}${redirectPath}`)
  }
  // #endregion

  return NextResponse.redirect(`${origin}/login?error=no_session`)
}

async function getAccountAccessRedirect(
  db: Awaited<ReturnType<typeof createClient>>,
  origin: string
): Promise<NextResponse | null> {
  const accessState = await getAccountAccessState(db)
  if (accessState === 'active') return null

  await db.auth.signOut({ scope: 'local' })
  const error = accessState === 'blocked'
    ? 'account_suspended'
    : accessState === 'incomplete'
      ? 'account_incomplete'
      : 'auth_unavailable'
  return NextResponse.redirect(`${origin}/login?error=${error}`)
}
