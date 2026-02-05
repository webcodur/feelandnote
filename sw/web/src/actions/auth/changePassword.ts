'use server'

import { createClient } from '@/lib/supabase/server'

interface ChangePasswordParams {
  currentPassword: string
  newPassword: string
}

export async function changePassword({ currentPassword, newPassword }: ChangePasswordParams) {
  if (!currentPassword || !newPassword) {
    return { error: '현재 비밀번호와 새 비밀번호를 입력해주세요' }
  }

  if (newPassword.length < 6) {
    return { error: '새 비밀번호는 6자 이상이어야 합니다' }
  }

  if (currentPassword === newPassword) {
    return { error: '새 비밀번호는 현재 비밀번호와 달라야 합니다' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user?.email) {
    return { error: '로그인이 필요합니다' }
  }

  // 현재 비밀번호 확인
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: user.email,
    password: currentPassword
  })

  if (signInError) {
    return { error: '현재 비밀번호가 올바르지 않습니다' }
  }

  // 새 비밀번호로 변경
  const { error: updateError } = await supabase.auth.updateUser({
    password: newPassword
  })

  if (updateError) {
    return { error: updateError.message }
  }

  return { success: '비밀번호가 변경되었습니다' }
}
