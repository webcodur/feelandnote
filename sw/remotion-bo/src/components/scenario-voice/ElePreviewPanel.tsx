'use client'

import React, { useState, useRef } from 'react'
import { AudioWavePlayer } from '../AudioWavePlayer'

/** preview panel with playback and save (ELE/GEM 공용) */
export function ElePreviewPanel({ blobUrl, duration, onSave, saving, onClose, label = 'ELE preview', tone = 'purple', autoPlay, onRegenerate, regenerating }: {
  blobUrl: string; duration: number
  onSave: (e: React.MouseEvent) => void; saving: boolean; onClose: () => void
  label?: string
  tone?: 'purple' | 'blue'
  autoPlay?: boolean
  onRegenerate?: () => void
  regenerating?: boolean
}) {
  const toneCls = tone === 'blue'
    ? { bg: 'bg-blue-500/5', border: 'border-blue-500/20', text: 'text-blue-300', btn: 'bg-blue-500 hover:bg-blue-400' }
    : { bg: 'bg-purple-500/5', border: 'border-purple-500/20', text: 'text-purple-300', btn: 'bg-purple-500 hover:bg-purple-400' }
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [eleTrimStart, setEleTrimStart] = useState(0)
  const [eleTrimEnd, setEleTrimEnd] = useState(duration)

  const togglePlay = () => {
    if (playing && audioRef.current) { audioRef.current.pause(); audioRef.current = null; setPlaying(false); return }
    const a = new Audio(blobUrl)
    audioRef.current = a
    a.currentTime = eleTrimStart
    a.onended = () => setPlaying(false)
    a.ontimeupdate = () => { if (a.currentTime >= eleTrimEnd) { a.pause(); setPlaying(false) } }
    a.play().then(() => setPlaying(true)).catch(() => {})
  }

  return (
    <div className={`space-y-1.5 p-2 rounded-lg ${toneCls.bg} border ${toneCls.border}`}>
      <div className={`text-[10px] ${toneCls.text} font-semibold`}>{label}</div>
      <AudioWavePlayer audioUrl={blobUrl} duration={duration} heightClass="h-12" showRuler={false} autoPlay={autoPlay} onRegenerate={onRegenerate} regenerating={regenerating} />
      <div className="flex items-center gap-2">
        <button onClick={onSave} disabled={saving}
          className={`px-2 py-0.5 rounded ${toneCls.btn} text-white text-[10px] font-semibold disabled:opacity-50`}>
          {saving ? '저장 중...' : '저장 (WAV)'}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onClose() }}
          className="text-[10px] text-text-dim hover:text-danger-text">
          닫기
        </button>
      </div>
    </div>
  )
}
