'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

// #region 이메일 로그인/회원가입
export async function loginWithEmail(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: '이메일과 비밀번호를 입력해주세요' }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    if (error.message === 'Invalid login credentials') {
      return { error: '이메일 또는 비밀번호가 올바르지 않습니다' }
    }
    if (error.message === 'Email not confirmed') {
      return { error: '이메일 인증이 필요합니다. 메일함을 확인해주세요' }
    }
    return { error: error.message }
  }

  redirect('/archive')
}

export async function signupWithEmail(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const nickname = formData.get('nickname') as string

  if (!email || !password || !nickname) {
    return { error: '모든 필드를 입력해주세요' }
  }

  if (password.length < 6) {
    return { error: '비밀번호는 6자 이상이어야 합니다' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      data: {
        nickname
      }
    }
  })

  if (error) {
    if (error.message.includes('already registered')) {
      return { error: '이미 가입된 이메일입니다' }
    }
    return { error: error.message }
  }

  // 이메일 확인 활성화 상태: session이 null
  // 이메일 확인 비활성화 상태: session이 존재 (즉시 로그인됨)
  if (data.session) {
    // 즉시 로그인됨 - 프로필 생성 후 리다이렉트
    const { error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', data.user!.id)
      .single()

    if (profileError && profileError.code === 'PGRST116') {
      await supabase.from('profiles').insert({
        id: data.user!.id,
        email: data.user!.email,
        nickname,
        avatar_url: null
      })
    }

    redirect('/archive')
  }

  return { success: '인증 메일을 발송했습니다. 메일함을 확인해주세요' }
}
// #endregion

// #region OAuth 로그인
export async function loginWithGoogle() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      queryParams: {
        access_type: 'offline',
        prompt: 'consent'
      }
    }
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect(data.url)
}

export async function loginWithKakao() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
      scopes: 'profile_nickname profile_image'
    }
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect(data.url)
}
// #endregion
