'use client'

import React, { useState, useCallback } from 'react'

type Props = {
  duration: number
  /** 컨테이너 ref — 마우스 위치 계산용 */
  containerRef: React.RefObject<HTMLDivElement | null>
  /** 현재 재생 위치 (초) */
  playhead?: number
  /** 재생 중 여부 */
  playing?: boolean
  /** 경계선 시각 (초) — 노란색으로 표시 */
  boundaries?: number[]
  /** 클래스 */
  className?: string
}

/** 파형 상단 눈금자 + 마우스 호버 시간 — 공통 컴포넌트 */
export function TimeRuler({ duration, containerRef, playhead, playing, boundaries, className }: Props) {
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)

  const pct = (t: number) => duration > 0 ? (t / duration) * 100 : 0

  const tickInterval = duration > 30 ? 5 : duration > 10 ? 2 : 1
  const ticks: number[] = []
  for (let t = tickInterval; t < duration; t += tickInterval) ticks.push(t)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || duration <= 0) { setHoverTime(null); return }
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration
    setHoverTime(t)
    setHoverX(e.clientX - rect.left)
  }, [containerRef, duration])

  return (
    <>
      {/* 눈금자 */}
      <div className={`relative w-full h-5 bg-bg-main ${className ?? ''}`}>
        {ticks.map(t => (
          <div key={t} className="absolute top-0 bottom-0" style={{ left: `${pct(t)}%` }}>
            <div className="w-px h-2 bg-text-dim" />
            <div className="text-[8px] text-text-dim -ml-2 mt-px select-none">{t}s</div>
          </div>
        ))}
        {/* 경계선 시각 */}
        {boundaries?.map((b, i) => (
          <div key={`b-${i}`} className="absolute top-0" style={{ left: `${pct(b)}%` }}>
            <div className="text-[7px] text-amber-400 -ml-3 font-mono select-none">{b.toFixed(1)}</div>
          </div>
        ))}
      </div>

      {/* 호버 + 재생 위치 오버레이 (부모 컨테이너에 겹침) */}
      <div
        className="absolute inset-0 pointer-events-none z-30"
        style={{ pointerEvents: 'none' }}
      >
        {/* 마우스 호버 표시는 부모에서 onMouseMove로 처리 */}
      </div>
    </>
  )
}

/** 마우스 호버 시 커서선 + 시간 표시 — 파형 컨테이너 위에 사용 */
export function useHoverTime(containerRef: React.RefObject<HTMLDivElement | null>, duration: number) {
  const [hoverTime, setHoverTime] = useState<number | null>(null)
  const [hoverX, setHoverX] = useState(0)

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || duration <= 0) { setHoverTime(null); return }
    setHoverTime(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration)
    setHoverX(e.clientX - rect.left)
  }, [containerRef, duration])

  const onMouseLeave = useCallback(() => setHoverTime(null), [])

  const HoverOverlay = hoverTime !== null ? (
    <>
      <div className="absolute top-0 bottom-0 w-px bg-white/30 pointer-events-none z-30" style={{ left: hoverX }} />
      <div className="absolute top-1 pointer-events-none z-30 bg-black/70 text-white text-[9px] px-1 rounded font-mono"
        style={{ left: Math.min(hoverX + 4, (containerRef.current?.clientWidth ?? 200) - 40) }}>
        {hoverTime.toFixed(2)}s
      </div>
    </>
  ) : null

  return { onMouseMove, onMouseLeave, HoverOverlay }
}

/** 재생 헤드 오버레이 — 파형 컨테이너 위에 사용 */
export function PlayheadOverlay({ playhead, duration, playing }: { playhead: number; duration: number; playing: boolean }) {
  if (playhead <= 0 || duration <= 0) return null
  const pct = (playhead / duration) * 100
  return (
    <>
      <div className="absolute top-0 bottom-0 w-px bg-white z-20 pointer-events-none" style={{ left: `${pct}%` }} />
      <div className="absolute bottom-1 pointer-events-none z-20 bg-white/90 text-black text-[9px] px-1 rounded font-mono"
        style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}>
        {playhead.toFixed(2)}s
      </div>
    </>
  )
}
