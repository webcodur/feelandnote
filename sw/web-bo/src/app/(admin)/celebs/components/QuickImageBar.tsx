'use client'

import { MousePointerClick } from 'lucide-react'
import type { ImageSlot } from './useQuickImageInbox'

/** 즉시 등록의 다음 차례를 알려주고, 받기 범위를 조절하는 안내줄. */
export default function QuickImageBar({
  on,
  avatarOnly,
  editing,
  nextName,
  nextSlot,
  onToggle,
  onToggleAvatarOnly,
}: {
  on: boolean
  avatarOnly: boolean
  /** 밀어넣은 사진의 편집 창이 떠 있는 상태. */
  editing: boolean
  nextName: string | null
  nextSlot: ImageSlot | null
  onToggle: () => void
  onToggleAvatarOnly: () => void
}) {
  const slotLabel = nextSlot === 'portrait' ? '대표사진' : '얼굴 사진'
  const message = !on
    ? '다른 브라우저에서 바로 받기 꺼짐'
    : editing
      ? '사진이 도착했습니다. 열린 창에서 마무리해 주세요.'
      : nextName
        ? `다른 브라우저에서 Alt+클릭하면 «${nextName}»의 ${slotLabel} 자리에 들어갑니다.`
        : avatarOnly
          ? '이 페이지에는 얼굴 사진이 빠진 인물이 없습니다.'
          : '이 페이지에는 빈 자리가 없습니다.'

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-bg-secondary/40 px-3 py-2">
      <p className="flex min-w-0 items-center gap-2 text-xs text-text-secondary">
        <MousePointerClick className={`h-3.5 w-3.5 shrink-0 ${on ? 'text-accent' : 'text-text-tertiary'}`} />
        <span className="truncate">{message}</span>
      </p>
      <div className="flex shrink-0 items-center gap-1.5">
        {on && (
          <button
            type="button"
            onClick={onToggleAvatarOnly}
            aria-pressed={avatarOnly}
            className={`rounded-md border px-2 py-1 text-xs font-semibold ${
              avatarOnly
                ? 'border-accent bg-accent/10 text-accent'
                : 'border-border text-text-secondary hover:border-accent hover:text-accent'
            }`}
          >
            얼굴만
          </button>
        )}
        <button
          type="button"
          onClick={onToggle}
          className="rounded-md border border-border px-2 py-1 text-xs font-semibold text-text-secondary hover:border-accent hover:text-accent"
        >
          {on ? '끄기' : '켜기'}
        </button>
      </div>
    </div>
  )
}
