/*
  파일명: /components/features/board/notices/NoticeContent.tsx
  기능: 공지 메타 줄과 본문
  책임: 공지 상세 화면과 홈 공지 모달이 같은 모양으로 공지를 읽히게 한다.
*/

import { Eye } from 'lucide-react'
import { formatBoardDateTime } from '@/lib/board/boardDate'

type BoardLocale = Parameters<typeof formatBoardDateTime>[1]

export const Dot = ({ className = '' }: { className?: string }) => (
  <span aria-hidden className={`text-white/20 ${className}`}>·</span>
)

interface NoticeMetaProps {
  /** 닉네임이 없는 계정이면 작성자 칸과 구분점을 함께 뺀다 */
  author?: string | null
  createdAt: string
  viewCount: number
  locale: BoardLocale
  className?: string
}

export function NoticeMeta({ author, createdAt, viewCount, locale, className = '' }: NoticeMetaProps) {
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-text-tertiary ${className}`}>
      {author && (
        <>
          <span className="font-serif text-text-secondary">{author}</span>
          <Dot />
        </>
      )}
      <span>{formatBoardDateTime(createdAt, locale)}</span>
      <Dot />
      <span className="flex items-center gap-1">
        <Eye size={14} />
        {viewCount}
      </span>
    </div>
  )
}

/** 줄바꿈을 살리고 HTTP(S) 주소를 공지 상세·홈 모달에서 같은 링크로 표시한다 */
export function NoticeBody({ content, className = '' }: { content: string; className?: string }) {
  const parts = content.split(/(https?:\/\/[^\s<>"']+[^\s<>"'.,!?;:)\]}>])/g)

  return (
    <div className={`whitespace-pre-wrap break-keep text-[15px] md:text-base leading-[1.85] text-text-primary/90 font-serif ${className}`}>
      {parts.map((part, index) => index % 2 === 1 ? (
        <a
          key={index}
          href={part}
          className="break-all text-accent underline underline-offset-4 hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {part}
        </a>
      ) : part)}
    </div>
  )
}
