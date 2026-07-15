import Image from 'next/image'
import type { FreePost } from '@/types/database'
import { freeDisplayAvatar, freeDisplayName } from '@/lib/board/freeDisplay'

// 글·댓글 공통 작성자 필드 (freeDisplay 헬퍼와 동일 범위)
type FreeAuthored = Pick<FreePost, 'nickname' | 'author_id' | 'is_anonymous' | 'author'>

interface FreeAvatarProps {
  item: FreeAuthored
  anonymousLabel: string
  size?: number
}

/**
 * 자유게시판 작성자 아바타.
 * 계정 글이면 프로필 사진, 익명 글이면 표시 이름 첫 글자 배지.
 * 익명 판정은 freeDisplayAvatar가 하므로 author.avatar_url을 직접 읽지 않는다.
 */
export default function FreeAvatar({ item, anonymousLabel, size = 28 }: FreeAvatarProps) {
  const avatar = freeDisplayAvatar(item)
  const name = freeDisplayName(item, anonymousLabel)
  const box = { width: size, height: size }

  if (avatar) {
    return (
      <div className="relative shrink-0" style={box}>
        {/* 외부(R2·네이버) URL이라 최적화를 거치지 않는다 */}
        <Image src={avatar} alt={name} fill unoptimized className="rounded-full object-cover ring-1 ring-accent/30" />
      </div>
    )
  }

  return (
    <div
      style={{ ...box, fontSize: Math.round(size * 0.45) }}
      className="shrink-0 flex items-center justify-center rounded-full bg-accent/20 text-accent font-bold ring-1 ring-accent/30 leading-none select-none"
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}
