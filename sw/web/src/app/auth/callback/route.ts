import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  // OAuth 에러 처리
  if (error) {
    console.error('OAuth error:', error, errorDescription)
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error)}`
    )
  }

  if (code) {
    const supabase = await createClient()

    const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

    if (exchangeError) {
      console.error('Exchange code error:', exchangeError)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    if (data.user) {
      // 신규 사용자인 경우 프로필 생성
      const { error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single()

      if (profileError && profileError.code === 'PGRST116') {
        // 프로필이 없으면 생성
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: data.user.email,
            nickname: (data.user.user_metadata.full_name as string)
              || (data.user.user_metadata.name as string)
              || data.user.email?.split('@')[0]
              || 'User',
            avatar_url: (data.user.user_metadata.avatar_url as string)
              || (data.user.user_metadata.picture as string)
              || null
          })

        if (insertError) {
          console.error('Insert profile error:', insertError)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=no_code`)
}
