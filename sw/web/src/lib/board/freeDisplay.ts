import type { FreePost } from '@/types/database'

// 글·댓글 공통: 계정 글이면 프로필, 익명이면 입력 닉네임 또는 "익명"
type FreeAuthored = Pick<FreePost, 'nickname' | 'author_id' | 'is_anonymous' | 'author'>

export function freeDisplayName(item: FreeAuthored, anonymousLabel: string): string {
  if (item.author_id && !item.is_anonymous && item.author) return item.author.nickname || anonymousLabel
  return item.nickname || anonymousLabel
}

export function freeDisplayAvatar(item: FreeAuthored): string | null {
  if (item.author_id && !item.is_anonymous && item.author) return item.author.avatar_url
  return null
}
