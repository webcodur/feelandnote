'use client'

import { useEffect, useState } from 'react'
import { hasViewed } from '@/lib/board/viewDedup'

/**
 * 이 기기에서 이미 열어본 글을 기억해 "새 글" 딱지를 떼는 데 쓴다.
 * 기록은 조회수 중복 방지와 같은 것을 공유한다(같은 24시간 창) — 목록에서 열든 상세로 들어가든 한 번 보면 사라진다.
 * 브라우저 저장소는 서버에 없으므로 첫 그리기 뒤에 읽는다(서버·클라이언트 화면이 갈리는 것을 막는다).
 */
export function useReadPosts(postIds: string[]) {
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set())
  const idsKey = postIds.join(',')

  useEffect(() => {
    const viewed = idsKey ? idsKey.split(',').filter(hasViewed) : []
    if (viewed.length === 0) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 외부 저장소(localStorage) 동기화. 초기값으로 옮기면 서버 화면과 값이 갈린다
    setReadIds((prev) => new Set([...prev, ...viewed]))
  }, [idsKey])

  const markRead = (postId: string) =>
    setReadIds((prev) => (prev.has(postId) ? prev : new Set(prev).add(postId)))

  return { readIds, markRead }
}
