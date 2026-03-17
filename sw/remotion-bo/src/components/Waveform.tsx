'use client'

import { useRef, useEffect, useCallback } from 'react'

const BAR_COLOR = 'rgba(200, 164, 110, 0.7)'
const BAR_WIDTH = 1.5
const BAR_GAP = 2

interface WaveformProps {
  audioUrl: string
  isPlaying: boolean
  duration: number
  trimStart?: number
  trimEnd?: number
  onTrimChange?: (start: number, end: number) => void
}

export function Waveform({ audioUrl, isPlaying, duration, trimStart = 0, trimEnd, onTrimChange }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const playheadRef = useRef<HTMLDivElement>(null)
  const effectiveEnd = trimEnd ?? duration

  // Draw waveform bars
  useEffect(() => {
    if (!audioUrl || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    fetch(audioUrl)
      .then(r => r.arrayBuffer())
      .then(buf => new AudioContext().decodeAudioData(buf))
      .then(audioBuffer => {
        const data = audioBuffer.getChannelData(0)
        const barCount = Math.floor(canvas.width / BAR_GAP)
        const step = Math.floor(data.length / barCount)
        const amp = canvas.height / 2
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        for (let i = 0; i < barCount; i++) {
          let sum = 0
          for (let j = 0; j < step; j++) sum += Math.abs(data[i * step + j] || 0)
          const h = Math.max(1, (sum / step) * amp * 2)
          ctx.fillStyle = BAR_COLOR
          ctx.fillRect(i * BAR_GAP, amp - h / 2, BAR_WIDTH, h)
        }
      })
      .catch(() => {})
  }, [audioUrl])

  // Playhead animation (trim-aware)
  useEffect(() => {
    const el = playheadRef.current
    if (!el) return
    if (isPlaying && duration > 0) {
      const sPct = (trimStart / duration) * 100
      const ePct = (effectiveEnd / duration) * 100
      el.style.transition = 'none'
      el.style.left = `${sPct}%`
      el.style.display = 'block'
      void el.offsetHeight
      el.style.transition = `left ${effectiveEnd - trimStart}s linear`
      el.style.left = `${ePct}%`
    } else {
      el.style.display = 'none'
      el.style.transition = 'none'
      el.style.left = '0%'
    }
  }, [isPlaying, duration, trimStart, effectiveEnd])

  // Pointer drag for trim handles
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!onTrimChange || !containerRef.current || duration <= 0) return
    e.preventDefault()

    const rect = containerRef.current.getBoundingClientRect()
    const calcT = (cx: number) => Math.max(0, Math.min(1, (cx - rect.left) / rect.width)) * duration
    const t0 = calcT(e.clientX)

    // Determine closest handle
    const handle = Math.abs(t0 - trimStart) < Math.abs(t0 - effectiveEnd) ? 'start' : 'end'

    let curStart = trimStart
    let curEnd = effectiveEnd

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
  }, [onTrimChange, duration, trimStart, effectiveEnd])

  const sPct = duration > 0 ? (trimStart / duration) * 100 : 0
  const ePct = duration > 0 ? (effectiveEnd / duration) * 100 : 100

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-12 bg-bg-main rounded overflow-hidden select-none touch-none ${onTrimChange ? 'cursor-ew-resize' : ''}`}
      onPointerDown={onTrimChange ? handlePointerDown : undefined}
    >
      <canvas ref={canvasRef} width={600} height={48} className="w-full h-full" />
      {/* Playhead */}
      <div
        ref={playheadRef}
        className="absolute top-0 bottom-0 w-px bg-accent z-20 pointer-events-none"
        style={{ display: 'none', left: '0%' }}
      />
      {/* Trim overlays and handles */}
      {duration > 0 && onTrimChange && (
        <>
          {sPct > 0.5 && (
            <div className="absolute inset-y-0 left-0 bg-black/40 rounded-l pointer-events-none" style={{ width: `${sPct}%` }} />
          )}
          {ePct < 99.5 && (
            <div className="absolute inset-y-0 right-0 bg-red-900/40 rounded-r pointer-events-none" style={{ width: `${100 - ePct}%` }} />
          )}
          <div className="absolute top-0 bottom-0 w-1 -ml-0.5 bg-amber-400 rounded-sm pointer-events-none z-10" style={{ left: `${sPct}%` }} />
          <div className="absolute top-0 bottom-0 w-1 -ml-0.5 bg-amber-400 rounded-sm pointer-events-none z-10" style={{ left: `${ePct}%` }} />
        </>
      )}
    </div>
  )
}
