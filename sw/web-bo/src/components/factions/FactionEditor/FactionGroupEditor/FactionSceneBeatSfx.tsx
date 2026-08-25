'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, X } from '@feelandnote/shared/bo/icons'

type Props = {
  value?: string
  files: string[]
  series: string
  index: number
  onChange: (next: string | undefined) => void
}

function sfxUrl(series: string, file: string): string {
  const encoded = file.split('/').filter(Boolean).map(encodeURIComponent).join('/')
  return `/api/${series}/sfx/${encoded}`
}

/** 통합 장면의 컷 시작과 함께 재생되는 공용 효과음 한 개를 고르고 바로 확인한다. */
export function FactionSceneBeatSfx({ value, files, series, index, onChange }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)

  const stop = () => {
    audioRef.current?.pause()
    audioRef.current = null
    setPlaying(false)
  }

  useEffect(() => () => {
    audioRef.current?.pause()
    audioRef.current = null
  }, [])

  const togglePreview = () => {
    if (!value) return
    if (audioRef.current) {
      stop()
      return
    }
    const audio = new Audio(sfxUrl(series, value))
    audioRef.current = audio
    audio.onended = () => {
      if (audioRef.current === audio) audioRef.current = null
      setPlaying(false)
    }
    audio.onerror = () => {
      if (audioRef.current === audio) audioRef.current = null
      setPlaying(false)
      setFailed(true)
    }
    audio.play().then(() => {
      setPlaying(true)
      setFailed(false)
    }).catch(() => {
      if (audioRef.current === audio) audioRef.current = null
      setPlaying(false)
      setFailed(true)
    })
  }

  const missingCurrent = !!value && !files.includes(value)

  return (
    <section
      data-faction-scene-sfx="true"
      className="mt-2 grid gap-2 rounded-md border border-border/70 bg-bg-main/25 px-3 py-2.5 md:grid-cols-[7rem_minmax(0,1fr)] md:items-center"
      aria-label={`${index + 1}번 컷 효과음`}
    >
      <div>
        <div className="text-[11px] font-black text-text-secondary">효과음</div>
        <div className="text-[10px] text-text-dim">이 컷이 시작될 때 1회 재생</div>
      </div>
      <div className="flex min-w-0 max-w-5xl flex-wrap items-center gap-2">
        <select
          value={value ?? ''}
          onChange={event => {
            stop()
            setFailed(false)
            onChange(event.target.value || undefined)
          }}
          className="min-w-56 max-w-full flex-1 rounded-md border border-border bg-bg-main px-2 py-1.5 text-xs text-text-primary hover:border-accent hover:bg-bg-hover focus:border-accent focus:outline-none"
          aria-label={`${index + 1}번 컷 효과음 선택`}
        >
          <option value="">효과음 없음</option>
          {missingCurrent ? <option value={value}>{value} · 파일 없음</option> : null}
          {files.map(file => <option key={file} value={file}>{file}</option>)}
        </select>
        <button
          type="button"
          onClick={togglePreview}
          disabled={!value}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-bg-card px-2.5 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent active:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label={value ? `${value} 효과음 ${playing ? '정지' : '미리듣기'}` : '효과음 미리듣기'}
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
          {playing ? '정지' : '미리듣기'}
        </button>
        {value ? (
          <button
            type="button"
            onClick={() => {
              stop()
              setFailed(false)
              onChange(undefined)
            }}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs font-semibold text-text-tertiary hover:border-danger/60 hover:bg-danger/15 hover:text-danger-text active:bg-danger/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
            aria-label={`${index + 1}번 컷 효과음 해제`}
          >
            <X size={13} /> 해제
          </button>
        ) : null}
        {failed ? <span role="status" className="text-[11px] font-semibold text-danger-text">미리듣기 실패 · 파일을 확인하세요</span> : null}
      </div>
    </section>
  )
}
