import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { EmailOtpType } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/archive'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // OAuth 에러 처리
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error)}`
    )
  }

  const supabase = await createClient()

  // #region 이메일 확인 흐름 (token_hash 파라미터가 있는 경우)
  if (tokenHash && type) {
    const { data, error: verifyError } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash
    })

    if (verifyError) {
      console.error('Verify OTP error:', verifyError)
      return NextResponse.redirect(`${origin}/login?error=verify_failed`)
    }

    if (data.user) {
      await createProfileIfNotExists(supabase, data.user)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  // #endregion

  // #region OAuth 흐름 (code 파라미터가 있는 경우)
  if (code) {
    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Exchange code error:', exchangeError)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    if (data.user) {
      await createProfileIfNotExists(supabase, data.user)
      return NextResponse.redirect(`${origin}${next}`)
    }
  }
  // #endregion

  // #region 세션이 이미 설정된 경우 (Supabase /verify에서 리다이렉트)
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    await createProfileIfNotExists(supabase, user)
    return NextResponse.redirect(`${origin}${next}`)
  }
  // #endregion

  return NextResponse.redirect(`${origin}/login?error=no_session`)
}

// 프로필이 없으면 생성
async function createProfileIfNotExists(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: { id: string; email?: string; user_metadata: Record<string, unknown> }
) {
  const { error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single()

  if (profileError && profileError.code === 'PGRST116') {
    // 닉네임 우선순위: 이메일 가입 시 입력한 nickname > OAuth full_name > OAuth name > 이메일 앞부분
    const nickname = (user.user_metadata.nickname as string)
      || (user.user_metadata.full_name as string)
      || (user.user_metadata.name as string)
      || user.email?.split('@')[0]
      || 'User'

    const { error: insertError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        email: user.email,
        nickname,
        avatar_url: (user.user_metadata.avatar_url as string)
          || (user.user_metadata.picture as string)
          || null
      })

    if (insertError) {
      console.error('Insert profile error:', insertError)
    }
  }
}
