'use client'

import { useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { FactionImageCrop } from '@/lib/faction-types'
import { isVideoSrc, normalizeCrop } from '../../../../shared/timing'

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

type Props = {
  src: string
  crop?: FactionImageCrop
  onChange: (crop: FactionImageCrop | undefined) => void
  /** 미리보기 비율 (가로/세로). 기본 9/16 세로 쇼츠 */
  aspect?: number
  /**
   * 채움 방식 — 인물 컷은 'cover'(꽉 채우고 잘림), 로고·화보는 'contain'(통째로 보이고 여백은 흐린 배경).
   * 실제 영상 렌더 방식과 일치시킨다. 기본 'cover'.
   */
  fit?: 'cover' | 'contain'
}

/**
 * 사진 맞춤 편집기 — 실제 영상 화면 비율(기본 9:16) 틀 위에 사진을 얹고,
 * 사진을 끌어 보일 위치를 잡고 슬라이더로 확대를 조절한다.
 * 미리보기가 곧 영상 결과(PersonCard styleFor·FilledImage 와 같은 규칙)다. 켄번스 줌 모션만 영상에서 추가로 더해진다.
 */
export function FactionImageCropEditor({ src, crop, onChange, aspect = 9 / 16, fit = 'cover' }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null)
  const [grabbing, setGrabbing] = useState(false)

  const x = crop?.x ?? 50
  const y = crop?.y ?? 50
  const scale = crop?.scale ?? 1
  const video = isVideoSrc(src)

  const onPointerDown = (e: ReactPointerEvent) => {
    e.preventDefault()
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    drag.current = { px: e.clientX, py: e.clientY, x, y }
    setGrabbing(true)
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    const d = drag.current
    const box = boxRef.current
    if (!d || !box) return
    const r = box.getBoundingClientRect()
    // 사진을 끄는 방향과 반대로 보일 위치가 이동한다(사진을 오른쪽으로 끌면 왼쪽이 보인다)
    const dx = ((e.clientX - d.px) / r.width) * 100
    const dy = ((e.clientY - d.py) / r.height) * 100
    onChange(normalizeCrop({ x: clamp(d.x - dx, 0, 100), y: clamp(d.y - dy, 0, 100), scale }))
  }
  const onPointerUp = (e: ReactPointerEvent) => {
    drag.current = null
    setGrabbing(false)
    try { (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId) } catch { /* noop */ }
  }

  const mediaStyle: CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: fit,
    objectPosition: `${x}% ${y}%`,
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: `${x}% ${y}%`,
  }
  // 3분할 가이드선 — 위치 잡기 보조
  const gridBg: CSSProperties = {
    backgroundImage:
      'linear-gradient(to right, rgba(255,255,255,.28) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,.28) 1px, transparent 1px)',
    backgroundSize: '33.333% 33.333%',
    backgroundPosition: '-1px -1px',
  }

  return (
    <div className="space-y-2">
      <div
        ref={boxRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className={`relative mx-auto select-none overflow-hidden rounded-md border border-border bg-black ${grabbing ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ width: 168, aspectRatio: String(aspect), touchAction: 'none' }}
        title="사진을 끌어 보일 위치를 잡으세요"
      >
        {/* 통째로 보이기(contain) 모드의 여백 — 같은 사진을 흐리게 깔아 영상의 흐린 배경을 흉내낸다(이미지에만) */}
        {fit === 'contain' && !video && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" style={{ filter: 'blur(16px) brightness(0.7)', transform: 'scale(1.15)' }} draggable={false} />
        )}
        {video ? (
          <video src={src} className="pointer-events-none relative h-full w-full" style={mediaStyle} muted loop playsInline autoPlay preload="metadata" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="pointer-events-none relative h-full w-full" style={mediaStyle} draggable={false} />
        )}
        <div className="pointer-events-none absolute inset-0 opacity-50" style={gridBg} />
      </div>
      <p className="text-center text-[10px] text-text-dim">사진을 끌어 위치를 잡고, 아래에서 확대를 조절하세요</p>
      <div className="flex items-center gap-2">
        <span className="shrink-0 text-[11px] text-text-dim">확대</span>
        <input
          type="range" min={1} max={3} step={0.05} value={scale}
          onChange={e => onChange(normalizeCrop({ x, y, scale: Number(e.target.value) }))}
          className="min-w-0 flex-1 accent-accent"
        />
        <span className="w-9 shrink-0 text-right text-[11px] tabular-nums text-text-secondary">{scale.toFixed(2)}x</span>
        <button
          type="button"
          onClick={() => onChange(undefined)}
          className="shrink-0 rounded border border-border px-1.5 py-0.5 text-[10px] text-text-secondary hover:bg-bg-hover"
        >
          초기화
        </button>
      </div>
      <p className="text-center text-[10px] text-text-dim">영상에선 자동 확대 모션이 위에 더해집니다</p>
    </div>
  )
}
