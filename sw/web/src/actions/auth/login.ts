'use server'

import { createClient } from '@/lib/db/server'
import { getAccountAccessState } from '@/lib/auth/account-access'
import { resolveAuthCallbackUrl } from '@/lib/auth/callback-url'
import { headers } from 'next/headers'
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

export type PasswordResetRequestErrorCode =
  | 'missingEmail'
  | 'rateLimited'
  | 'unknown'

async function authCallbackUrl(): Promise<string> {
  return resolveAuthCallbackUrl(await headers())
}

// #region 이메일 로그인/회원가입
export async function loginWithEmail(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'missingCredentials' as const }
  }

  const db = await createClient()

  const { data, error } = await db.auth.signInWithPassword({
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

  const accessState = await getAccountAccessState(db)
  if (accessState !== 'active') {
    await db.auth.signOut({ scope: 'local' })
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

  const db = await createClient()
  const callbackUrl = await authCallbackUrl()

  const { data, error } = await db.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl,
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
    const accessState = await getAccountAccessState(db)
    if (accessState !== 'active') {
      console.error('[signupWithEmail] 회원가입 트리거가 계정 자료를 완성하지 못했습니다.')
      await db.auth.signOut({ scope: 'local' })
      return { error: 'unknown' as const }
    }

    redirect(`/${data.user!.id}/records`)
  }

  return { success: 'verificationSent' as const }
}

export async function requestPasswordReset(formData: FormData) {
  const email = formData.get('email') as string

  if (!email) {
    return { error: 'missingEmail' as const }
  }

  const db = await createClient()
  const callbackUrl = new URL(await authCallbackUrl())
  callbackUrl.searchParams.set('next', '/reset-password')

  const { error } = await db.auth.resetPasswordForEmail(email, {
    redirectTo: callbackUrl.toString(),
  })

  if (error) {
    if (error.status === 429 || error.code === 'over_email_send_rate_limit') {
      return { error: 'rateLimited' as const }
    }
    console.error('[requestPasswordReset]', error)
    return { error: 'unknown' as const }
  }

  return { success: 'resetEmailSent' as const }
}
// #endregion

// #region OAuth 로그인
export async function loginWithGoogle() {
  const db = await createClient()
  const callbackUrl = await authCallbackUrl()

  const { data, error } = await db.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: callbackUrl,
    }
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect(data.url)
}

export async function loginWithKakao() {
  const db = await createClient()
  const callbackUrl = await authCallbackUrl()

  const { data, error } = await db.auth.signInWithOAuth({
    provider: 'kakao',
    options: {
      redirectTo: callbackUrl,
      scopes: 'profile_nickname profile_image'
    }
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect(data.url)
}
// #endregion
