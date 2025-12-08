'use server'

import { createClient } from '@/lib/supabase/server'

export interface ContentInfo {
  id: string
  type: string
  title: string
  creator: string | null
  thumbnail_url: string | null
  description: string | null
  publisher: string | null
  release_date: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export interface UserContentStatus {
  id: string
  status: string
  progress: number | null
  created_at: string
}

export interface ContentWithUserStatus extends ContentInfo {
  userContent: UserContentStatus | null
}

export async function getContentInfo(contentId: string): Promise<ContentWithUserStatus> {
  const supabase = await createClient()

  // 콘텐츠 정보 조회
  const { data: content, error: contentError } = await supabase
    .from('contents')
    .select('*')
    .eq('id', contentId)
    .single()

  if (contentError || !content) {
    throw new Error('콘텐츠를 찾을 수 없습니다')
  }

  // 로그인한 사용자인지 확인
  const {
    data: { user }
  } = await supabase.auth.getUser()

  let userContent: UserContentStatus | null = null

  // 로그인한 사용자면 해당 콘텐츠의 기록 여부 확인
  if (user) {
    const { data: userContentData } = await supabase
      .from('user_contents')
      .select('id, status, progress, created_at')
      .eq('user_id', user.id)
      .eq('content_id', contentId)
      .single()

    if (userContentData) {
      userContent = userContentData as UserContentStatus
    }
  }

  return {
    ...content,
    userContent
  } as ContentWithUserStatus
}
