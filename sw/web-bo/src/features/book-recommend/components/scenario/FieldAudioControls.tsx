'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { PLAYBACK_RATES, usePlaybackRate } from './usePlaybackRate'
import { useAudioPreviewCtx } from './AudioPreviewContext'

/**
 * 필드 행 하단에 붙는 오디오 컨트롤 줄.
 *
 * - 재생: 이 필드가 현재 재생 중이면 일시정지/재개, 아니면 새로 재생.
 * - 정지: 현재 재생/일시정지 중인 필드일 때만 노출, 누르면 처음으로 되돌리며 정지.
 * - 진행바: 클릭/드래그로 위치 이동. 현재 필드일 때만 활성.
 * - 시간 표시: `현재초 / 총초`.
 * - 배속 셔터: 현재 배속 표시 + 클릭 시 드롭다운으로 0.75/1/1.25/1.5/2/3/4 선택.
 *   배속은 전역값을 공유하므로 어떤 필드의 셔터에서 바꿔도 모든 재생에 즉시 반영된다.
 */
export function FieldAudioControls({
  sectionKey,
  fallbackDuration,
  isPlaying,
  onTogglePlay,
  playbackRate,
  fillColor,
}: {
  sectionKey: string
  /** voiceInfo.duration — 메타데이터 로드 전 표시용. */
  fallbackDuration: number
  isPlaying: boolean
  onTogglePlay: () => void
  /** 이 음원의 영상 배속(*PlaybackRate 필드 값). 지정 시 총 시간을 「원본(취소선) 환산」으로 표시. */
  playbackRate?: number
  /** 진행 막대 채움 색 — 섹션 구분색. 미지정 시 기본 accent. */
  fillColor?: string
}) {
  const ctl = useAudioPreviewCtx()
  const [rate, setRate] = usePlaybackRate()
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const barRef = useRef<HTMLDivElement>(null)

  const isCurrent = !!ctl && ctl.playingKey === sectionKey
  const paused = isCurrent && !!ctl?.paused
  const duration = isCurrent && ctl && ctl.duration > 0 ? ctl.duration : fallbackDuration
  const currentTime = isCurrent && ctl ? ctl.currentTime : 0
  const playing = isCurrent && !paused

  // 외부 클릭으로 드롭다운 닫기
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    window.addEventListener('mousedown', handler)
    return () => window.removeEventListener('mousedown', handler)
  }, [open])

  const handleSeekFromEvent = useCallback((clientX: number) => {
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect || !ctl || !isCurrent || duration <= 0) return
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    ctl.seek(ratio * duration)
  }, [ctl, isCurrent, duration])

  // 진행바 드래그
  const dragRef = useRef<((e: PointerEvent) => void) | null>(null)
  const dragUpRef = useRef<(() => void) | null>(null)
  const handleBarPointerDown = useCallback((e: React.PointerEvent) => {
    if (!isCurrent || duration <= 0) return
    e.preventDefault()
    handleSeekFromEvent(e.clientX)
    const onMove = (ev: PointerEvent) => handleSeekFromEvent(ev.clientX)
    const onUp = () => {
      if (dragRef.current) document.removeEventListener('pointermove', dragRef.current)
      if (dragUpRef.current) document.removeEventListener('pointerup', dragUpRef.current)
      dragRef.current = null
      dragUpRef.current = null
    }
    dragRef.current = onMove
    dragUpRef.current = onUp
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
  }, [isCurrent, duration, handleSeekFromEvent])

  useEffect(() => () => {
    if (dragRef.current) document.removeEventListener('pointermove', dragRef.current)
    if (dragUpRef.current) document.removeEventListener('pointerup', dragUpRef.current)
  }, [])

  const handlePlayBtn = useCallback(() => {
    if (isCurrent) ctl?.togglePause()
    else onTogglePlay()
  }, [isCurrent, ctl, onTogglePlay])

  const handleStop = useCallback(() => { ctl?.stop() }, [ctl])

  const fmt = (s: number) => Number.isFinite(s) ? s.toFixed(1) : '0.0'
  const pct = duration > 0 ? Math.min(100, (currentTime / duration) * 100) : 0
  const rateActive = rate !== 1
  // 영상 배속 환산 — 배속이 걸린 구간은 영상에서 duration/r 초로 재생된다.
  const mediaRate = playbackRate !== undefined && Number.isFinite(playbackRate) && playbackRate > 0 ? playbackRate : 1
  const mediaRated = Math.abs(mediaRate - 1) > 1e-6

  return (
    <div className="flex items-center gap-1.5 flex-1 min-w-0">
      <button
        onClick={handlePlayBtn}
        className="px-1.5 py-0.5 rounded bg-bg-card border border-border hover:bg-bg-hover text-text-secondary text-sm font-bold flex-none"
        title={playing ? '일시정지' : (paused ? '재개' : '재생')}
      >{playing ? '❚❚' : '▶'}</button>
      {isCurrent ? (
        <button
          onClick={handleStop}
          className="px-1.5 py-0.5 rounded bg-bg-card border border-border hover:bg-bg-hover text-text-secondary text-sm font-bold flex-none"
          title="정지 (처음으로)"
        >■</button>
      ) : (
        <span className="w-[22px] flex-none" aria-hidden="true" />
      )}
      <div
        ref={barRef}
        onPointerDown={handleBarPointerDown}
        className={`relative flex-1 h-2 rounded bg-bg-main border border-border/40 overflow-hidden ${
          isCurrent && duration > 0 ? 'cursor-pointer' : 'cursor-default opacity-60'
        }`}
        title={isCurrent ? '클릭/드래그로 위치 이동' : ''}
      >
        <div
          className={fillColor ? 'absolute inset-y-0 left-0' : 'absolute inset-y-0 left-0 bg-accent/70'}
          style={fillColor ? { width: `${pct}%`, backgroundColor: fillColor } : { width: `${pct}%` }}
        />
      </div>
      <span
        className="text-sm font-bold text-text-secondary font-mono tabular-nums whitespace-nowrap flex-none"
        title={mediaRated ? `영상 배속 ×${mediaRate.toFixed(2)} — 원본 ${fmt(duration)}초가 영상에선 ${fmt(duration / mediaRate)}초로 재생된다.` : undefined}
      >
        {fmt(currentTime)} / {mediaRated ? (
          <>
            <span className="line-through opacity-50">{fmt(duration)}s</span>
            {' '}<span className="text-sky-500">{fmt(duration / mediaRate)}s</span>
          </>
        ) : `${fmt(duration)}s`}
      </span>
      <div ref={dropdownRef} className="relative flex-none">
        <button
          onClick={() => setOpen(o => !o)}
          className={`px-1.5 py-0.5 rounded text-sm font-bold font-mono tabular-nums border ${
            rateActive
              ? 'border-accent text-accent bg-accent/10 font-semibold'
              : 'border-border text-text-secondary bg-bg-card hover:bg-bg-hover'
          }`}
          title="재생 배속 (전역 적용)"
        >×{rate}</button>
        {open && (
          <div className="absolute right-0 bottom-full mb-1 z-30 flex flex-col rounded border border-border bg-bg-card shadow-lg min-w-[56px]">
            {PLAYBACK_RATES.map(r => {
              const active = r === rate
              return (
                <button
                  key={r}
                  onClick={() => { setRate(r); setOpen(false) }}
                  className={`px-2 py-1 text-sm font-bold font-mono tabular-nums text-right hover:bg-bg-hover ${
                    active ? 'text-accent font-semibold' : 'text-text-secondary'
                  }`}
                >×{r}</button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
