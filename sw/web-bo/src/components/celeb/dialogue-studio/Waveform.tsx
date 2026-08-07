'use client'

import { useCallback, useEffect, useRef } from 'react'

/** 파형 + 앞뒤 자르기 손잡이 + 재생 위치 표시 */
export function Waveform({ blobUrl, duration, trimStart, trimEnd, onTrimChange, isPlaying }: {
  blobUrl: string
  duration: number
  trimStart: number
  trimEnd: number
  onTrimChange?: (start: number, end: number) => void
  isPlaying?: boolean
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)

  // 파형 그리기
  useEffect(() => {
    if (!blobUrl || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    fetch(blobUrl)
      .then((r) => r.arrayBuffer())
      .then((buf) => new AudioContext().decodeAudioData(buf))
      .then((audioBuffer) => {
        const data = audioBuffer.getChannelData(0)
        const barCount = Math.floor(canvas.width / 2)
        const step = Math.floor(data.length / barCount)
        const amp = canvas.height / 2
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        for (let i = 0; i < barCount; i++) {
          let sum = 0
          for (let j = 0; j < step; j++) sum += Math.abs(data[i * step + j] || 0)
          const h = Math.max(1, (sum / step) * amp * 2)
          ctx.fillStyle = 'rgb(99 102 241 / 0.7)'
          ctx.fillRect(i * 2, amp - h / 2, 1.5, h)
        }
      })
      .catch(() => {})
  }, [blobUrl])

  // 재생 위치 표시 (CSS transition 애니메이션)
  useEffect(() => {
    const el = playheadRef.current
    if (!el) return
    if (isPlaying && duration > 0) {
      const sPct = (trimStart / duration) * 100
      const ePct = (trimEnd / duration) * 100
      el.style.transition = 'none'
      el.style.left = `${sPct}%`
      el.style.display = 'block'
      // force reflow
      void el.offsetHeight
      el.style.transition = `left ${trimEnd - trimStart}s linear`
      el.style.left = `${ePct}%`
    } else {
      el.style.transition = 'none'
      el.style.display = 'none'
    }
  }, [isPlaying, trimStart, trimEnd, duration])

  // 누른 지점에서 가까운 손잡이를 잡아 끈다
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!onTrimChange || !containerRef.current || duration <= 0) return
    e.preventDefault()

    const rect = containerRef.current.getBoundingClientRect()
    const calcT = (cx: number) => Math.max(0, Math.min(1, (cx - rect.left) / rect.width)) * duration
    const t0 = calcT(e.clientX)

    const handle = Math.abs(t0 - trimStart) < Math.abs(t0 - trimEnd) ? 'start' : 'end'

    // 최신 값 추적용
    let curStart = trimStart
    let curEnd = trimEnd

    const apply = (cx: number) => {
      const t = calcT(cx)
      if (handle === 'start') {
        curStart = Math.max(0, Math.min(t, curEnd - 0.02))
        onTrimChange(curStart, curEnd)
      } else {
        curEnd = Math.min(duration, Math.max(t, curStart + 0.02))
        onTrimChange(curStart, curEnd)
      }
    }

    apply(e.clientX)

    const onMove = (ev: PointerEvent) => apply(ev.clientX)
    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [onTrimChange, duration, trimStart, trimEnd])

  const sPct = duration > 0 ? (trimStart / duration) * 100 : 0
  const ePct = duration > 0 ? (trimEnd / duration) * 100 : 100

  return (
    <div
      ref={containerRef}
      className={`relative flex-1 select-none touch-none ${onTrimChange ? 'cursor-ew-resize' : ''}`}
      onPointerDown={onTrimChange ? handlePointerDown : undefined}
    >
      <canvas ref={canvasRef} width={400} height={36} className="w-full h-9 rounded bg-bg-secondary" />
      <div ref={playheadRef} className="absolute top-0 bottom-0 w-0.5 bg-white/90 z-20 pointer-events-none" style={{ display: 'none' }} />
      {duration > 0 && (
        <>
          {sPct > 0.5 && (
            <div className="absolute inset-y-0 left-0 bg-black/40 rounded-l pointer-events-none" style={{ width: `${sPct}%` }} />
          )}
          {ePct < 99.5 && (
            <div className="absolute inset-y-0 right-0 bg-red-900/40 rounded-r pointer-events-none" style={{ width: `${100 - ePct}%` }} />
          )}
          {/* 손잡이는 눈으로만 보이고, 실제 조작은 바깥 상자가 받는다 */}
          <div className="absolute top-0 bottom-0 w-1 -ml-0.5 bg-amber-400 rounded-sm pointer-events-none z-10" style={{ left: `${sPct}%` }} />
          <div className="absolute top-0 bottom-0 w-1 -ml-0.5 bg-amber-400 rounded-sm pointer-events-none z-10" style={{ left: `${ePct}%` }} />
        </>
      )}
    </div>
  )
}

/** 설정 슬라이더. 컴포넌트 바깥에 두어야 매 렌더마다 다시 붙지 않는다 */
export function SliderField({ label, value, onChange, min = 0, max = 1, step = 0.05, suffix }: {
  label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string
}) {
  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-text-secondary w-20 shrink-0">{label}</label>
      <span className="text-xs font-mono text-text-primary w-10 shrink-0 text-right">{suffix ? `${value}${suffix}` : value.toFixed(2)}</span>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1.5 rounded-full appearance-none bg-bg-secondary accent-accent cursor-pointer"
      />
    </div>
  )
}
