'use server'

import { createClient } from '@/lib/supabase/server'
import { getAccountAccessState } from '@/lib/auth/account-access'
import { redirect } from 'next/navigation'

export type LoginErrorCode =
  | 'missingCredentials'
  | 'invalidCredentials'
  | 'emailNotConfirmed'
  | 'accountSuspended'
  | 'unknown'

export type SignupErrorCode =
  | 'missingFields'
  | 'passwordTooShort'
  | 'alreadyRegistered'
  | 'unknown'

// #region 이메일 로그인/회원가입
export async function loginWithEmail(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'missingCredentials' as const }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  if (error) {
    if (error.message === 'Invalid login credentials') {
      return { error: 'invalidCredentials' as const }
    }
    if (error.message === 'Email not confirmed') {
      return { error: 'emailNotConfirmed' as const }
    }
    console.error('[loginWithEmail]', error)
    return { error: 'unknown' as const }
  }

  const accessState = await getAccountAccessState(supabase)
  if (accessState !== 'active') {
    await supabase.auth.signOut({ scope: 'local' })
    return {
      error: accessState === 'blocked' ? 'accountSuspended' as const : 'unknown' as const,
    }
  }

  redirect(`/${data.user.id}/reading`)
}

export async function signupWithEmail(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const nickname = formData.get('nickname') as string

  if (!email || !password || !nickname) {
    return { error: 'missingFields' as const }
  }

  if (password.length < 6) {
    return { error: 'passwordTooShort' as const }
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
      return { error: 'alreadyRegistered' as const }
    }
    console.error('[signupWithEmail]', error)
    return { error: 'unknown' as const }
  }

  // 이메일 확인 활성화 상태: session이 null
  // 이메일 확인 비활성화 상태: session이 존재 (즉시 로그인됨)
  if (data.session) {
    const accessState = await getAccountAccessState(supabase)
    if (accessState !== 'active') {
      console.error('[signupWithEmail] 회원가입 트리거가 계정 자료를 완성하지 못했습니다.')
      await supabase.auth.signOut({ scope: 'local' })
      return { error: 'unknown' as const }
    }

    redirect(`/${data.user!.id}/records`)
  }

  return { success: 'verificationSent' as const }
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
