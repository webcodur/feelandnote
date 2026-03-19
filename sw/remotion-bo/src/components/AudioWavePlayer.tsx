'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { TimeRuler, useHoverTime, PlayheadOverlay } from './TimeRuler'

const BAR_COLOR = 'rgba(200, 164, 110, 0.8)'
const BAR_GAP = 1.5
const BAR_W = 1

type Props = {
  audioUrl: string
  duration: number
  /** 눈금자 위 경계선 시각 표시 */
  boundaries?: number[]
  /** 파형 위에 겹칠 children (경계선, 구간 배경 등) */
  children?: React.ReactNode
  /** 클릭 시 콜백 (시간) — 기본: 해당 위치부터 재생 */
  onClick?: (time: number) => void
  /** 클릭 시 추가 콜백 — 기본 재생/onClick과 별도로 항상 호출 */
  onTimeClick?: (time: number) => void
  /** 더블클릭 시 콜백 (시간) */
  onDoubleClick?: (time: number) => void
  /** 높이 클래스 */
  heightClass?: string
  /** 눈금자 표시 */
  showRuler?: boolean
}

export function AudioWavePlayer({
  audioUrl, duration, boundaries, children,
  onClick, onTimeClick, onDoubleClick, heightClass = 'h-24', showRuler = true,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const animRef = useRef<number>(0)
  const [playing, setPlaying] = useState(false)
  const [playhead, setPlayhead] = useState(0)
  const [realDuration, setRealDuration] = useState(duration)
  const dur = realDuration > 0 ? realDuration : duration
  const { onMouseMove, onMouseLeave, HoverOverlay } = useHoverTime(containerRef, dur)

  // 파형 그리기
  useEffect(() => {
    if (!audioUrl || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    fetch(audioUrl)
      .then(r => r.arrayBuffer())
      .then(buf => new AudioContext().decodeAudioData(buf))
      .then(audioBuffer => {
        setRealDuration(audioBuffer.duration)
        const data = audioBuffer.getChannelData(0)
        const barCount = Math.floor(canvas.width / BAR_GAP)
        const step = Math.floor(data.length / barCount)
        const amp = canvas.height / 2
        ctx.clearRect(0, 0, canvas.width, canvas.height)

        ctx.fillStyle = 'rgba(200, 164, 110, 0.1)'
        ctx.fillRect(0, amp, canvas.width, 1)

        for (let i = 0; i < barCount; i++) {
          let sum = 0
          for (let j = 0; j < step; j++) sum += Math.abs(data[i * step + j] || 0)
          const avg = sum / step
          const h = Math.max(2, Math.pow(avg, 0.6) * amp * 4)
          ctx.fillStyle = BAR_COLOR
          ctx.fillRect(i * BAR_GAP, amp - h / 2, BAR_W, h)
        }
      })
      .catch(() => {})
  }, [audioUrl])

  // 지정 위치부터 재생
  const playFrom = useCallback((t: number) => {
    if (audioRef.current) { audioRef.current.pause(); cancelAnimationFrame(animRef.current) }
    const a = new Audio(audioUrl)
    audioRef.current = a
    a.onended = () => { setPlaying(false); setPlayhead(0) }
    a.addEventListener('loadedmetadata', () => {
      a.currentTime = t
      a.play().then(() => {
        setPlaying(true)
        const tick = () => {
          if (a.paused) return
          setPlayhead(a.currentTime)
          animRef.current = requestAnimationFrame(tick)
        }
        tick()
      }).catch(() => {})
    }, { once: true })
  }, [audioUrl])

  // 전체 재생/일시정지/정지
  const togglePlay = useCallback(() => {
    if (playing && audioRef.current) {
      audioRef.current.pause()
      cancelAnimationFrame(animRef.current)
      setPlaying(false)
      return
    }
    playFrom(playhead > 0 && playhead < dur ? playhead : 0)
  }, [playing, playhead, dur, playFrom])

  const stop = useCallback(() => {
    if (audioRef.current) { audioRef.current.pause(); cancelAnimationFrame(animRef.current) }
    audioRef.current = null
    setPlaying(false)
    setPlayhead(0)
  }, [])

  // 클릭
  const handleClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || dur <= 0) return
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * dur
    if (onClick) onClick(t)
    else playFrom(t)
    onTimeClick?.(t)
  }, [dur, onClick, playFrom, onTimeClick])

  // 키보드: Space → 재생/일시정지 토글
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.code === 'Space') { e.preventDefault(); togglePlay() }
  }, [togglePlay])

  // 더블클릭
  const handleDblClick = useCallback((e: React.MouseEvent) => {
    if (!onDoubleClick) return
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || duration <= 0) return
    const t = Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration * 1000) / 1000
    onDoubleClick(t)
  }, [dur, onDoubleClick])

  const pct = (t: number) => dur > 0 ? (t / dur) * 100 : 0

  return (
    <div className="space-y-0">
      {/* 눈금자 */}
      {showRuler && (
        <TimeRuler
          duration={dur}
          containerRef={containerRef}
          boundaries={boundaries}
          className="rounded-t border-b border-border"
        />
      )}

      {/* 파형 */}
      <div
        ref={containerRef}
        tabIndex={0}
        className={`relative w-full ${heightClass} bg-bg-main overflow-hidden select-none touch-none cursor-crosshair focus:outline focus:outline-1 focus:outline-accent/40 ${showRuler ? 'rounded-b' : 'rounded'}`}
        onClick={handleClick}
        onDoubleClick={onDoubleClick ? handleDblClick : undefined}
        onKeyDown={handleKeyDown}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
      >
        <canvas ref={canvasRef} width={1200} height={96} className="w-full h-full" />
        {HoverOverlay}
        <PlayheadOverlay playhead={playhead} duration={dur} playing={playing} />
        {children}
      </div>

      {/* 컨트롤 */}
      <div className="flex items-center gap-2 mt-1">
        <button onClick={togglePlay}
          className="px-2 py-0.5 rounded text-xs bg-bg-card border border-border hover:bg-bg-hover">
          {playing ? '⏸ 일시정지' : '▶ 재생'}
        </button>
        {(playing || playhead > 0) && (
          <button onClick={stop}
            className="px-2 py-0.5 rounded text-xs bg-bg-card border border-border hover:bg-bg-hover">
            ■ 정지
          </button>
        )}
        <span className="text-[10px] text-text-secondary font-mono">
          {playhead.toFixed(2)}s / {dur.toFixed(2)}s
        </span>
      </div>
    </div>
  )
}

/** 파형 내 pct 헬퍼 — children에서 사용 */
export function usePct(duration: number) {
  return (t: number) => duration > 0 ? (t / duration) * 100 : 0
}
