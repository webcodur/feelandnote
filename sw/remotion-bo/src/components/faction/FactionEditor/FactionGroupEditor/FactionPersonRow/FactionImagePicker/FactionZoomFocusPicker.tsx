'use client'

import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { ZoomFocus } from '@/lib/faction-types'
import { isVideoSrc } from '../../../../shared/timing'

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v))

type Props = {
  src: string
  focus?: ZoomFocus
  onChange: (focus: ZoomFocus | undefined) => void
  /** 미리보기 비율 (가로/세로). 기본 9/16 세로 쇼츠 */
  aspect?: number
}

/**
 * 줌 푸시인 목표점 찍기 — 화면 비율 틀 위에 화보를 얹고, 클릭한 자리를 다가갈 지점(x·y %)으로 저장한다.
 * 줌인(zoomin) 지속 효과가 이 지점을 화면 중앙으로 끌어당기며 확대한다. 미지정이면 가운데(50·50).
 */
export function FactionZoomFocusPicker({ src, focus, onChange, aspect = 9 / 16 }: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null)
  const fx = focus?.x ?? 50
  const fy = focus?.y ?? 50
  const has = focus?.x != null || focus?.y != null
  const video = isVideoSrc(src)

  const pick = (e: ReactPointerEvent) => {
    const box = boxRef.current
    if (!box) return
    const r = box.getBoundingClientRect()
    const x = Math.round(clamp(((e.clientX - r.left) / r.width) * 100, 0, 100))
    const y = Math.round(clamp(((e.clientY - r.top) / r.height) * 100, 0, 100))
    onChange({ x, y })
  }

  return (
    <div className="space-y-1">
      <div
        ref={boxRef}
        onPointerDown={pick}
        className="relative mx-auto cursor-crosshair select-none overflow-hidden rounded-md border border-border bg-black"
        style={{ width: 168, aspectRatio: String(aspect), touchAction: 'none' }}
        title="다가갈 지점을 클릭하세요"
      >
        {video ? (
          <video src={src} className="pointer-events-none h-full w-full object-cover" muted loop playsInline autoPlay preload="metadata" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="" className="pointer-events-none h-full w-full object-cover" draggable={false} />
        )}
        {/* 목표점 마커 — 십자 + 점 */}
        {has && (
          <div className="pointer-events-none absolute -ml-3 -mt-3 h-6 w-6" style={{ left: `${fx}%`, top: `${fy}%` }}>
            <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-amber-400/80" />
            <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-amber-400/80" />
            <div className="absolute left-1/2 top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-black/60 bg-amber-400" />
          </div>
        )}
      </div>
      <div className="flex items-center justify-center gap-2 text-[10px] text-text-dim">
        <span>{has ? `목표점 ${fx}·${fy}%` : '가운데(기본)'}</span>
        {has && (
          <button type="button" onClick={() => onChange(undefined)} className="rounded border border-border px-1.5 py-0.5 text-text-secondary hover:bg-bg-hover">
            초기화
          </button>
        )}
      </div>
      <p className="text-center text-[10px] text-text-dim">줌 종류가 「줌 인」일 때 이 지점으로 다가갑니다</p>
    </div>
  )
}
