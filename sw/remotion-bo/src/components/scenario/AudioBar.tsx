'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { ENGINE_COLORS, ENGINE_LABELS, ROLE_COLORS, ROLE_LABELS, normalizeRole } from './types'

export function InlineAudioBar({ sectionKey, audioUrl, duration, exists, activeEngine, isPlaying, onTogglePlay }: {
  sectionKey: string; audioUrl: string; duration?: number; exists: boolean
  activeEngine?: string; isPlaying: boolean; onTogglePlay: () => void
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const barRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isPlaying && exists) {
      const audio = new Audio(audioUrl)
      audioRef.current = audio
      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime)
        if (audio.duration > 0) setProgress((audio.currentTime / audio.duration) * 100)
      }
      audio.onended = () => { setProgress(0); setCurrentTime(0); onTogglePlay() }
      audio.play().catch(() => onTogglePlay())
    } else {
      if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
      setProgress(0); setCurrentTime(0)
    }
    return () => { if (audioRef.current) { audioRef.current.pause(); audioRef.current = null } }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying])

  const handleSeek = (e: React.MouseEvent) => {
    if (!audioRef.current || !barRef.current || !isPlaying) return
    const rect = barRef.current.getBoundingClientRect()
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    audioRef.current.currentTime = pct * (audioRef.current.duration || 0)
  }

  if (!exists) {
    return (
      <div className="flex items-center gap-1 py-0.5 text-xs font-bold text-text-secondary">
        <span className="w-1.5 h-1.5 rounded-full bg-neutral-600 inline-block shrink-0" />
        <span className="font-mono truncate">{sectionKey}</span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <button onClick={onTogglePlay} className={`text-sm font-bold w-4 text-center shrink-0 ${isPlaying ? 'text-accent' : 'text-text-secondary hover:text-accent'}`}>
        {isPlaying ? '■' : '▶'}
      </button>
      <div ref={barRef} className="flex-1 h-1 bg-bg-main rounded-full cursor-pointer relative" onClick={handleSeek}>
        <div className="h-full bg-accent/60 rounded-full transition-[width] duration-100" style={{ width: `${progress}%` }} />
      </div>
      <span className="text-xs font-bold text-text-secondary font-mono w-10 text-right shrink-0">
        {isPlaying ? currentTime.toFixed(1) : (duration ?? 0).toFixed(1)}s
      </span>
      {activeEngine && (
        <span className={`text-xs font-bold font-mono shrink-0 ${ENGINE_COLORS[activeEngine] ?? 'text-text-secondary'}`}>
          {ENGINE_LABELS[activeEngine] ?? ''}
        </span>
      )}
    </div>
  )
}

export function VoiceBadge({ label, role }: { label: ReactNode; role: string }) {
  const simple = normalizeRole(role)
  return (
    <div className="pt-1 space-y-0.5">
      <div className="text-xs font-semibold text-text-secondary leading-tight">{label}</div>
      <div className={`text-sm font-bold ${ROLE_COLORS[simple]}`}>{ROLE_LABELS[simple]}</div>
    </div>
  )
}
