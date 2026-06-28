'use client'

import { useState } from 'react'
import type { FactionImageCrop, ZoomFocus } from '@/lib/faction-types'
import { imageSrc } from '../../../shared/timing'
import { useFactionImageDrop } from '../../../shared/useFactionImageDrop'
import { FactionMediaThumb } from '../../../shared/FactionMediaThumb'
import { ImageIcon } from '../../../shared/icons'
import { FactionImagePicker } from '../FactionPersonRow/FactionImagePicker/FactionImagePicker'

export function CoverPickerButton({
  value, onChange, series, episodeName, crop, onCropChange, zoomFocus, onZoomFocusChange, className,
  label = '화보', emptyText,
}: {
  value?: string
  onChange: (next: string | undefined) => void
  series: string
  episodeName: string
  crop?: FactionImageCrop
  onCropChange?: (crop: FactionImageCrop | undefined) => void
  zoomFocus?: ZoomFocus
  onZoomFocusChange?: (focus: ZoomFocus | undefined) => void
  className?: string
  /** 칸 정체성 — 하단 띠 텍스트. 기본 '화보' */
  label?: string
  /** 비었을 때 가운데 안내 — 무엇이 대신 나가는지. 미지정이면 label */
  emptyText?: string
}) {
  const [open, setOpen] = useState(false)
  const src = imageSrc(series, episodeName, value)
  // 이미지 풀에서 끌어온 이미지를 화보 칸에 놓으면 연결
  const { dragOver, dropProps } = useFactionImageDrop(path => onChange(path))
  
  const sizeClass = className || "h-28 w-48"
  
  return (
    <>
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(true) }}
        {...dropProps}
        className={`group relative shrink-0 overflow-hidden rounded-md border bg-bg-card ${sizeClass} ${dragOver ? 'border-accent ring-2 ring-accent' : 'border-border hover:border-accent'}`}
        title="클릭: 화보 선택 · 풀에서 끌어다 놓기: 연결"
      >
        {src ? (
          <FactionMediaThumb src={src} alt="" showExt className="h-full w-full object-cover" />
        ) : (
          <span className="flex h-full w-full flex-col items-center justify-center gap-1 px-1 text-sm text-text-secondary">
            <ImageIcon size={24} />
            <span className="text-center text-[10px] leading-tight">{emptyText ?? label}</span>
          </span>
        )}
        <span className="absolute bottom-0 left-0 right-0 bg-black/50 py-0.5 text-center text-[10px] font-semibold text-white">
          {dragOver ? '여기에 연결' : label}
        </span>
      </button>
      {open && (
        <FactionImagePicker
          value={value}
          onChange={onChange}
          crop={crop}
          onCropChange={onCropChange}
          cropFit="contain"
          zoomFocus={zoomFocus}
          onZoomFocusChange={onZoomFocusChange}
          series={series}
          episodeName={episodeName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}
