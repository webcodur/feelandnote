import { headers } from 'next/headers'

/**
 * 익명 자유게시판 공통 상수·헬퍼.
 * 읽기 응답에서 가져올 컬럼은 민감 정보(password_hash, ip_hash)를 제외한다.
 */
export const FREE_POST_COLS = 'id, title, content, locale, nickname, author_id, is_anonymous, view_count, is_deleted, created_at, updated_at'
export const FREE_COMMENT_COLS = 'id, post_id, content, nickname, author_id, is_anonymous, is_deleted, created_at, updated_at'
// 작성자 프로필 조인 (계정 글 표시용)
export const FREE_AUTHOR_JOIN = 'author:profiles!author_id(id, nickname, avatar_url)'
export const FREE_RATE_LIMIT_SECONDS = 30
export const FREE_BOARD_PATH = '/agora/board/free'

// 프록시를 거친 실제 접속 IP 추출
export async function getClientIp(): Promise<string | null> {
  const h = await headers()
  const fwd = h.get('x-forwarded-for')
  if (fwd) return fwd.split(',')[0]?.trim() ?? null
  return h.get('x-real-ip')
}
