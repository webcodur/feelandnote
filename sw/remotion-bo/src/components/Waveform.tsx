'use client'

import { useRef, useEffect, useCallback, useState } from 'react'
import { TimeRuler, useHoverTime, PlayheadOverlay } from './TimeRuler'

const BAR_COLOR = 'rgba(200, 164, 110, 0.8)'
const BAR_WIDTH = 1
const BAR_GAP = 1.5

interface WaveformProps {
  audioUrl: string
  isPlaying: boolean
  duration: number
  /** 현재 재생 위치 (초) — 외부에서 전달 */
  currentTime?: number
  trimStart?: number
  trimEnd?: number
  onTrimChange?: (start: number, end: number) => void
  onSeek?: (time: number) => void
  /** 눈금자 표시 여부 */
  showRuler?: boolean
}

export function Waveform({ audioUrl, isPlaying, duration, currentTime = 0, trimStart = 0, trimEnd, onTrimChange, onSeek, showRuler }: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const effectiveEnd = trimEnd ?? duration
  const { onMouseMove, onMouseLeave, HoverOverlay } = useHoverTime(containerRef, duration)

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
        // 중앙선
        ctx.fillStyle = 'rgba(200, 164, 110, 0.1)'
        ctx.fillRect(0, amp, canvas.width, 1)

        for (let i = 0; i < barCount; i++) {
          let sum = 0
          for (let j = 0; j < step; j++) sum += Math.abs(data[i * step + j] || 0)
          const avg = sum / step
          const h = Math.max(2, Math.pow(avg, 0.6) * amp * 4)
          ctx.fillStyle = BAR_COLOR
          ctx.fillRect(i * BAR_GAP, amp - h / 2, BAR_WIDTH, h)
        }
      })
      .catch(() => {})
  }, [audioUrl])

  // 파형 클릭 → 재생 위치
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (!onSeek || !containerRef.current || duration <= 0) return
    const rect = containerRef.current.getBoundingClientRect()
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration
    onSeek(t)
  }, [onSeek, duration])

  // trim 핸들 드래그
  const handleHandleDrag = useCallback((handle: 'start' | 'end', e: React.PointerEvent) => {
    if (!onTrimChange || !containerRef.current || duration <= 0) return
    e.preventDefault()
    e.stopPropagation()

    const rect = containerRef.current.getBoundingClientRect()
    const calcT = (cx: number) => Math.max(0, Math.min(1, (cx - rect.left) / rect.width)) * duration

    let curStart = trimStart
    let curEnd = effectiveEnd

    const onMove = (ev: PointerEvent) => {
      const t = calcT(ev.clientX)
      if (handle === 'start') {
        curStart = Math.max(0, Math.min(t, curEnd - 0.02))
      } else {
        curEnd = Math.min(duration, Math.max(t, curStart + 0.02))
      }
      onTrimChange(curStart, curEnd)
    }

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
    <div className="space-y-0">
      {showRuler && (
        <TimeRuler
          duration={duration}
          containerRef={containerRef}
          className="rounded-t border-b border-border"
        />
      )}
      <div
        ref={containerRef}
        className={`relative w-full h-12 bg-bg-main overflow-hidden select-none touch-none cursor-pointer ${showRuler ? 'rounded-b' : 'rounded'}`}
        onClick={handleClick}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        <canvas ref={canvasRef} width={1200} height={96} className="w-full h-full" />

        {HoverOverlay}

        {/* 재생 헤드 */}
        <PlayheadOverlay playhead={currentTime} duration={duration} playing={isPlaying} />

        {/* Trim overlays and handles */}
        {duration > 0 && onTrimChange && (
          <>
            {sPct > 0.5 && (
              <div className="absolute inset-y-0 left-0 bg-black/40 rounded-l pointer-events-none" style={{ width: `${sPct}%` }} />
            )}
            {ePct < 99.5 && (
              <div className="absolute inset-y-0 right-0 bg-red-900/40 rounded-r pointer-events-none" style={{ width: `${100 - ePct}%` }} />
            )}
            <div
              className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize z-10 flex items-center justify-center"
              style={{ left: `${sPct}%` }}
              onPointerDown={(e) => handleHandleDrag('start', e)}
            >
              <div className="w-1 h-full bg-amber-400 rounded-sm" />
            </div>
            <div
              className="absolute top-0 bottom-0 w-3 -ml-1.5 cursor-ew-resize z-10 flex items-center justify-center"
              style={{ left: `${ePct}%` }}
              onPointerDown={(e) => handleHandleDrag('end', e)}
            >
              <div className="w-1 h-full bg-amber-400 rounded-sm" />
            </div>
          </>
        )}
      </div>
    </div>
  )
}
