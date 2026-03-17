'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'

type Timing = { start: number; end: number }

type Props = {
  /** 음성 파일 URL */
  audioUrl: string
  /** 전체 오디오 길이 (초) */
  duration: number
  /** 문장 목록 */
  sentences: string[]
  /** 문장별 타이밍 */
  timings: Timing[]
  /** 타이밍 변경 콜백 */
  onChange: (timings: Timing[]) => void
}

const COLORS = [
  'rgba(200,164,110,0.6)',
  'rgba(139,184,168,0.6)',
  'rgba(180,140,200,0.6)',
  'rgba(200,160,120,0.6)',
  'rgba(120,180,200,0.6)',
  'rgba(200,120,140,0.6)',
]

export function VoiceTimingEditor({ audioUrl, duration, sentences, timings, onChange }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [playhead, setPlayhead] = useState(0)
  const animRef = useRef<number>(0)

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
        const data = audioBuffer.getChannelData(0)
        const barCount = Math.floor(canvas.width / 2)
        const step = Math.floor(data.length / barCount)
        const amp = canvas.height / 2
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        for (let i = 0; i < barCount; i++) {
          let sum = 0
          for (let j = 0; j < step; j++) sum += Math.abs(data[i * step + j] || 0)
          const h = Math.max(1, (sum / step) * amp * 2)
          ctx.fillStyle = 'rgba(200, 164, 110, 0.5)'
          ctx.fillRect(i * 2, amp - h / 2, 1.5, h)
        }
      })
      .catch(() => {})
  }, [audioUrl])

  // 재생/정지
  const togglePlay = useCallback(() => {
    if (playing && audioRef.current) {
      audioRef.current.pause()
      audioRef.current = null
      setPlaying(false)
      cancelAnimationFrame(animRef.current)
      return
    }
    const a = new Audio(audioUrl)
    audioRef.current = a
    a.onended = () => { setPlaying(false); setPlayhead(0) }
    a.play().then(() => {
      setPlaying(true)
      const tick = () => {
        if (a.paused) return
        setPlayhead(a.currentTime)
        animRef.current = requestAnimationFrame(tick)
      }
      tick()
    }).catch(() => {})
  }, [playing, audioUrl])

  // 경계선 드래그
  const handlePointerDown = useCallback((boundaryIdx: number, e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || duration <= 0) return

    const onMove = (ev: PointerEvent) => {
      const t = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width)) * duration
      const newTimings = [...timings]

      // boundaryIdx는 문장 i의 끝 = 문장 i+1의 시작
      const minT = boundaryIdx > 0 ? newTimings[boundaryIdx - 1].start + 0.05 : 0.05
      const maxT = boundaryIdx < newTimings.length - 1 ? newTimings[boundaryIdx + 1].end - 0.05 : duration - 0.05
      const clamped = Math.max(minT, Math.min(maxT, t))

      newTimings[boundaryIdx].end = Math.round(clamped * 1000) / 1000
      if (boundaryIdx + 1 < newTimings.length) {
        newTimings[boundaryIdx + 1].start = Math.round(clamped * 1000) / 1000
      }
      onChange(newTimings)
    }

    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [timings, duration, onChange])

  // 클릭으로 해당 위치부터 재생
  const handleWaveClick = useCallback((e: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || duration <= 0) return
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * duration

    if (audioRef.current) {
      audioRef.current.pause()
      cancelAnimationFrame(animRef.current)
    }
    const a = new Audio(audioUrl)
    audioRef.current = a
    a.currentTime = t
    a.onended = () => { setPlaying(false); setPlayhead(0) }
    a.play().then(() => {
      setPlaying(true)
      const tick = () => {
        if (a.paused) return
        setPlayhead(a.currentTime)
        animRef.current = requestAnimationFrame(tick)
      }
      tick()
    }).catch(() => {})
  }, [audioUrl, duration])

  const pct = (t: number) => duration > 0 ? (t / duration) * 100 : 0

  return (
    <div className="space-y-2">
      {/* 파형 + 경계선 */}
      <div
        ref={containerRef}
        className="relative w-full h-16 bg-bg-main rounded overflow-hidden select-none touch-none cursor-pointer"
        onClick={handleWaveClick}
      >
        <canvas ref={canvasRef} width={800} height={64} className="w-full h-full" />

        {/* 문장 구간 배경 */}
        {timings.map((t, i) => (
          <div
            key={`bg-${i}`}
            className="absolute inset-y-0 pointer-events-none"
            style={{
              left: `${pct(t.start)}%`,
              width: `${pct(t.end - t.start)}%`,
              backgroundColor: COLORS[i % COLORS.length],
              opacity: 0.15,
            }}
          />
        ))}

        {/* 경계선 (드래그 가능) */}
        {timings.slice(0, -1).map((t, i) => (
          <div
            key={`line-${i}`}
            className="absolute top-0 bottom-0 w-1 -ml-0.5 bg-amber-400 cursor-ew-resize z-10 hover:bg-amber-300"
            style={{ left: `${pct(t.end)}%` }}
            onPointerDown={(e) => handlePointerDown(i, e)}
            onClick={(e) => e.stopPropagation()}
          />
        ))}

        {/* 재생 헤드 */}
        {playing && (
          <div
            className="absolute top-0 bottom-0 w-px bg-white z-20 pointer-events-none"
            style={{ left: `${pct(playhead)}%` }}
          />
        )}
      </div>

      {/* 재생 버튼 + 문장 목록 */}
      <div className="flex items-center gap-2 mb-1">
        <button onClick={togglePlay} className="px-2 py-0.5 rounded text-xs bg-bg-card border border-border hover:bg-bg-hover">
          {playing ? '■ 정지' : '▶ 재생'}
        </button>
        <span className="text-[10px] text-text-dim">{duration.toFixed(2)}s</span>
      </div>

      <div className="space-y-0.5">
        {sentences.map((s, i) => {
          const t = timings[i]
          if (!t) return null
          return (
            <div key={i} className="flex items-start gap-2 text-xs">
              <div
                className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                style={{ backgroundColor: COLORS[i % COLORS.length] }}
              />
              <span className="text-text-dim w-20 flex-shrink-0">
                {t.start.toFixed(2)}~{t.end.toFixed(2)}
              </span>
              <span className="text-text-primary truncate">{s}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
