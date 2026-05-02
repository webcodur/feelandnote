'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { TimeRuler, useHoverTime, PlayheadOverlay } from './TimeRuler'

const BAR_COLOR = 'rgba(200, 164, 110, 0.8)'
const BAR_GAP = 1.5
const BAR_W = 1

// 전역 활성 플레이어 — 가장 최근에 상호작용한 하나만 Space 키에 반응
let _activePlayer: { toggle: () => void } | null = null

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
  /** trim 시작/끝 (초) — 설정 시 오버레이 표시 */
  trimStart?: number
  trimEnd?: number
  /** trim 끝 변경 콜백 — 전달 시 우측 드래그 핸들 표시 */
  onTrimEnd?: (time: number) => void
  /** 초당 픽셀 수 — 지정 시 "화면 꽉차기" 대신 절대 가로폭으로 렌더, 가로 스크롤 발생.
   *  지정 없으면 부모 너비 꽉 채움(기존 동작). 긴 오디오에서 시간 감각 유지용. */
  pxPerSec?: number
}

export function AudioWavePlayer({
  audioUrl, duration, boundaries, children,
  onClick, onTimeClick, onDoubleClick, heightClass = 'h-24', showRuler = true,
  trimStart, trimEnd, onTrimEnd, pxPerSec,
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

  // 이 플레이어를 active로 등록 — 상호작용 시 호출
  const playerHandleRef = useRef({ toggle: togglePlay })
  playerHandleRef.current.toggle = togglePlay
  const activate = useCallback(() => { _activePlayer = playerHandleRef.current }, [])
  // 언마운트 시 자신이 active면 해제
  useEffect(() => {
    const handle = playerHandleRef.current
    return () => { if (_activePlayer === handle) _activePlayer = null }
  }, [])

  // 전역 Space — 오직 active player만 반응 (이중 호출·다중 인스턴스 충돌 방지)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return
      if (e.repeat) return
      const el = document.activeElement as HTMLElement | null
      if (el && (['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName) || el.isContentEditable)) return
      if (!_activePlayer || _activePlayer !== playerHandleRef.current) return
      e.preventDefault()
      _activePlayer.toggle()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 더블클릭
  const handleDblClick = useCallback((e: React.MouseEvent) => {
    if (!onDoubleClick) return
    e.preventDefault()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect || dur <= 0) return
    const t = Math.round(Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * dur * 1000) / 1000
    onDoubleClick(t)
  }, [dur, onDoubleClick])

  // trim 핸들 드래그 — document 이벤트 기반, cleanup ref로 언마운트 안전
  const trimCleanupRef = useRef<(() => void) | null>(null)
  const handleTrimDown = useCallback((e: React.PointerEvent) => {
    if (!onTrimEnd || !containerRef.current || dur <= 0) return
    e.preventDefault()
    e.stopPropagation()
    const rect = containerRef.current.getBoundingClientRect()
    const calcT = (cx: number) =>
      Math.round(Math.max(0.02, Math.min(1, (cx - rect.left) / rect.width)) * dur * 1000) / 1000
    const onMove = (ev: PointerEvent) => onTrimEnd(calcT(ev.clientX))
    const onUp = () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
      trimCleanupRef.current = null
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    trimCleanupRef.current = onUp
  }, [onTrimEnd, dur])
  useEffect(() => () => { trimCleanupRef.current?.() }, [])

  const trimHandlePct = dur > 0 && trimEnd !== undefined ? (trimEnd / dur) * 100 : 100
  const absWidth = pxPerSec && dur > 0 ? Math.round(dur * pxPerSec) : null

  return (
    <div className={absWidth ? 'overflow-x-auto' : ''}>
    <div className="space-y-0" style={absWidth ? { width: `${absWidth}px` } : undefined}>
      {/* 눈금자 */}
      {showRuler && (
        <TimeRuler
          duration={dur}
          containerRef={containerRef}
          boundaries={boundaries}
          className="rounded-t border-b border-border"
        />
      )}

      {/* 파형 + 트림 핸들 래퍼 */}
      <div className="relative">
        {/*
         * ⚠️ Space 정지 버그 근본 원인 & 해결 — 절대 tabIndex={0} 으로 되돌리지 말 것
         *
         * [증상] Space 누르면 "잠깐 멈췄다가 다시 재생됨" / 여러 번 눌러도 안 멈춤
         * [원인] tabIndex={0}이면 컨테이너가 키보드 focus 대상. 브라우저는
         *        focus된 요소에서 Space 키를 누르면 **click 이벤트를 자동 생성**(buttons·링크 접근성 표준).
         *        → window keydown이 togglePlay로 pause 한 직후,
         *          같은 Space가 click을 발동 → handleClick → playFrom → 다시 재생.
         *        재생↔정지가 한 번의 Space에 연달아 일어나 "방해만 잠깐"처럼 보인다.
         * [해결] 1) tabIndex={-1}  : 키보드 focus 제거 → Space-click 자동생성 차단
         *        2) onKeyDown에 Space preventDefault : 혹시 어떤 경로로 focus 들어와도 보호
         *        3) window keydown의 e.repeat 체크    : 키 길게 눌렀을 때 반복 toggle 방지
         *        4) _activePlayer 모듈 레벨 변수      : 여러 AudioWavePlayer 동시 반응 방지
         *
         * 이전 세션에서도 같은 버그로 여러 번 시도·실패했다. tabIndex 이슈를 건너뛰면 재발한다.
         */}
        <div
          ref={containerRef}
          tabIndex={-1}
          className={`relative w-full ${heightClass} bg-bg-main overflow-hidden select-none touch-none cursor-crosshair ${showRuler ? 'rounded-b' : 'rounded'}`}
          onClick={(e) => { activate(); handleClick(e) }}
          onPointerDown={activate}
          onMouseEnter={activate}
          onDoubleClick={onDoubleClick ? handleDblClick : undefined}
          onMouseMove={onMouseMove}
          onMouseLeave={onMouseLeave}
          onKeyDown={(e) => { if (e.code === 'Space') e.preventDefault() }}
        >
          <canvas ref={canvasRef} width={absWidth ?? 1200} height={96} className="w-full h-full" />
          {HoverOverlay}
          <PlayheadOverlay playhead={playhead} duration={dur} playing={playing} />
          {dur > 0 && trimEnd !== undefined && trimEnd < dur - 0.01 && (
            <div className="absolute inset-y-0 right-0 bg-red-900/40 pointer-events-none"
              style={{ width: `${(1 - trimEnd / dur) * 100}%` }} />
          )}
          {dur > 0 && trimStart !== undefined && trimStart > 0.01 && (
            <div className="absolute inset-y-0 left-0 bg-black/40 pointer-events-none"
              style={{ width: `${(trimStart / dur) * 100}%` }} />
          )}
          {children}
        </div>
        {onTrimEnd && dur > 0 && (
          <div
            className="absolute top-0 bottom-0 w-6 -ml-3 cursor-ew-resize z-20 flex items-center justify-center group select-none"
            style={{ left: `${trimHandlePct}%`, touchAction: 'none' }}
            draggable={false}
            onPointerDown={handleTrimDown}
          >
            <div className="w-1 h-full bg-red-400 group-hover:bg-red-300 group-hover:w-1.5 rounded-full transition-all" />
          </div>
        )}
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
    </div>
  )
}

/** 파형 내 pct 헬퍼 — children에서 사용 */
export function usePct(duration: number) {
  return (t: number) => duration > 0 ? (t / duration) * 100 : 0
}
