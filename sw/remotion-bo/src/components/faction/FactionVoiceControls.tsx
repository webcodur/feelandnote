'use client'

import { useEffect, useRef, useState } from 'react'
import { Play, Pause, Mic, Loader } from './icons'

/**
 * 인물 행에 붙는 음성 재생·재생성 컨트롤.
 *
 * - 음성 파일이 있으면(존재 여부 fileExists 또는 quoteDuration>0) 재생/일시정지 버튼과 길이를 보인다.
 * - 진행바: 재생 위치 표시(클릭으로 위치 이동).
 * - 재생성: 이 인물 한 명만 다시 만든다(--only <파일명>). 백그라운드 task로 실행.
 * - 자체 <audio> 한 개로 동작 — 다른 행과 상태를 공유하지 않는다(단순·독립).
 */
export function FactionVoiceControls({
  voiceUrl,
  fileExists,
  duration,
  hasQuote,
  regenerating,
  onRegenerate,
}: {
  /** 재생용 음성 파일 URL (없으면 미생성 상태) */
  voiceUrl: string | null
  /** voice/ 폴더에 실제 파일이 있는지 */
  fileExists: boolean
  /** 음성 길이(초) — data.json quoteDuration 또는 파일 스캔 길이 */
  duration: number
  /** 이 인물에 대사 텍스트가 있는지 — 없으면 생성 대상이 아니다 */
  hasQuote: boolean
  /** 이 인물 음성 재생성 중인지 */
  regenerating: boolean
  /** 이 인물만 재생성 트리거 */
  onRegenerate: () => void
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const barRef = useRef<HTMLDivElement>(null)
  const [playing, setPlaying] = useState(false)
  const [pos, setPos] = useState(0)
  const [dur, setDur] = useState(duration)

  // 음원이 바뀌면(URL·길이) 재생 상태 초기화
  useEffect(() => {
    setPlaying(false)
    setPos(0)
    setDur(duration)
  }, [voiceUrl, duration])

  const has = fileExists && !!voiceUrl

  const toggle = () => {
    const a = audioRef.current
    if (!a) return
    if (playing) { a.pause() } else { a.play().catch(() => {}) }
  }

  const seek = (clientX: number) => {
    const a = audioRef.current
    const rect = barRef.current?.getBoundingClientRect()
    if (!a || !rect || dur <= 0) return
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    a.currentTime = ratio * dur
  }

  const fmt = (s: number) => (Number.isFinite(s) ? s.toFixed(1) : '0.0')
  const pct = dur > 0 ? Math.min(100, (pos / dur) * 100) : 0

  // 대사 없는 인물은 음성 영역 자체를 생략
  if (!hasQuote) return null

  return (
    <div className="flex items-center gap-1.5 rounded-md border border-border bg-bg-main px-2 py-1">
      <Mic size={13} className="shrink-0 text-text-dim" />
      {has ? (
        <>
          <audio
            ref={audioRef}
            src={voiceUrl ?? undefined}
            preload="metadata"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
            onEnded={() => { setPlaying(false); setPos(0) }}
            onTimeUpdate={e => setPos(e.currentTarget.currentTime)}
            onLoadedMetadata={e => { if (Number.isFinite(e.currentTarget.duration)) setDur(e.currentTarget.duration) }}
          />
          <button
            onClick={toggle}
            className="flex shrink-0 items-center justify-center rounded border border-border bg-bg-card p-1 text-text-secondary hover:bg-bg-hover"
            title={playing ? '일시정지' : '재생'}
          >
            {playing ? <Pause size={12} /> : <Play size={12} />}
          </button>
          <div
            ref={barRef}
            onPointerDown={e => seek(e.clientX)}
            className="relative h-1.5 w-20 shrink-0 cursor-pointer overflow-hidden rounded bg-bg-secondary border border-border/40"
            title="클릭으로 위치 이동"
          >
            <div className="absolute inset-y-0 left-0 bg-accent/70" style={{ width: `${pct}%` }} />
          </div>
          <span className="shrink-0 font-mono text-[11px] tabular-nums text-text-secondary whitespace-nowrap">
            {fmt(pos)} / {fmt(dur)}s
          </span>
        </>
      ) : (
        <span className="text-[11px] text-text-dim whitespace-nowrap">음성 없음</span>
      )}
      <button
        onClick={onRegenerate}
        disabled={regenerating}
        className="ml-auto flex shrink-0 items-center gap-1 rounded border border-border bg-bg-card px-1.5 py-0.5 text-[11px] font-semibold text-text-secondary hover:bg-bg-hover disabled:opacity-50"
        title={has ? '이 인물 음성만 다시 생성' : '이 인물 음성 생성'}
      >
        {regenerating ? <Loader size={12} /> : <Mic size={12} />}
        {regenerating ? '생성 중' : (has ? '재생성' : '생성')}
      </button>
    </div>
  )
}
