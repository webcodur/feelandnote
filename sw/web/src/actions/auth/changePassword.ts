'use server'

import { createClient } from '@/lib/db/server'

interface ChangePasswordParams {
  currentPassword: string
  newPassword: string
}

export type ChangePasswordErrorCode =
  | 'missingFields'
  | 'passwordTooShort'
  | 'samePassword'
  | 'loginRequired'
  | 'wrongCurrentPassword'
  | 'updateFailed'

export async function changePassword({ currentPassword, newPassword }: ChangePasswordParams) {
  if (!currentPassword || !newPassword) {
    return { error: 'missingFields' as const }
  }

  if (newPassword.length < 6) {
    return { error: 'passwordTooShort' as const }
  }

  if (currentPassword === newPassword) {
    return { error: 'samePassword' as const }
  }

  const db = await createClient()
  const { data: { user } } = await db.auth.getUser()

  if (!user?.email) {
    return { error: 'loginRequired' as const }
  }

  // 현재 비밀번호 확인
  const { error: signInError } = await db.auth.signInWithPassword({
    email: user.email,
    password: currentPassword
  })

  if (signInError) {
    return { error: 'wrongCurrentPassword' as const }
  }

  // 새 비밀번호로 변경
  const { error: updateError } = await db.auth.updateUser({
    password: newPassword
  })

  if (updateError) {
    console.error('[changePassword]', updateError)
    return { error: 'updateFailed' as const }
  }

  return { success: true as const }
}
