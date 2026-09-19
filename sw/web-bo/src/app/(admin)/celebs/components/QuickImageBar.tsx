'use client'

import { MousePointerClick } from 'lucide-react'
import type { ImageSlot } from './useQuickImageInbox'

export const SLOT_LABEL: Record<ImageSlot, string> = {
  avatar: '아바타',
  portrait: '대표 사진',
  awakened: '각성 이미지',
}

/** 밀어넣은 사진이 어디로 들어갈지 알려주고, 받기를 켜고 끄는 안내줄. */
export default function QuickImageBar({
  on,
  editing,
  targetName,
  targetSlot,
  onToggle,
}: {
  on: boolean
  /** 밀어넣은 사진의 편집 창이 떠 있는 상태. */
  editing: boolean
  targetName: string | null
  targetSlot: ImageSlot | null
  onToggle: () => void
}) {
  const message = !on
    ? '다른 브라우저에서 바로 받기 꺼짐'
    : editing
      ? '사진이 도착했습니다. 열린 창에서 마무리해 주세요.'
      : targetName && targetSlot
        ? `Alt+클릭이나 Ctrl+V로 «${targetName}»의 ${SLOT_LABEL[targetSlot]} 자리에 들어갑니다.`
        : '받을 자리가 없습니다. 목록을 스크롤하거나 1·2·3을 눌러 자리를 고르세요.'

  return (
    <div className="flex items-center justify-between gap-3 border-b border-border bg-bg-secondary/40 px-3 py-2">
      <p className="flex min-w-0 items-center gap-2 text-xs text-text-secondary">
        <MousePointerClick className={`h-3.5 w-3.5 shrink-0 ${on ? 'text-accent' : 'text-text-tertiary'}`} />
        <span className="truncate">{message}</span>
      </p>
      <div className="flex shrink-0 items-center gap-1.5">
        <span className="hidden items-center gap-1 text-[11px] text-text-tertiary sm:flex">
          <SlotKey digit="1" slot="avatar" active={targetSlot === 'avatar'} />
          <SlotKey digit="2" slot="portrait" active={targetSlot === 'portrait'} />
          <SlotKey digit="3" slot="awakened" active={targetSlot === 'awakened'} />
        </span>
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

/** 숫자키와 자리의 대응을 늘 보여 준다. 고른 자리는 강조한다. */
function SlotKey({ digit, slot, active }: { digit: string; slot: ImageSlot; active: boolean }) {
  return (
    <span
      className={`rounded border px-1.5 py-0.5 font-semibold ${
        active ? 'border-accent bg-accent/10 text-accent' : 'border-border text-text-tertiary'
      }`}
    >
      {digit} {SLOT_LABEL[slot]}
    </span>
  )
}
