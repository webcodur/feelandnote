'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play, X } from '@feelandnote/shared/bo/icons'
import {
  FACTION_SCENE_SFX_START_PERCENT_MAX,
  FACTION_SCENE_SFX_START_PERCENT_MIN,
  FACTION_SCENE_SFX_START_PERCENT_STEP,
  normalizeFactionSceneSfxStartPercent,
} from '@feelandnote/shared/lib/faction-scene-timing'
import {
  GAIN_DB_MAX,
  GAIN_DB_MIN,
  GAIN_DB_STEP,
  dbToLinear,
  isUnityGain,
  normalizeGainDb,
} from '@feelandnote/shared/bo/gain'
import type { FactionSceneSfx } from '@/lib/faction-types'

type Props = {
  item: FactionSceneSfx
  index: number
  files: string[]
  series: string
  beatIndex: number
  /** 이 효과음의 주인 이름 — 읽어 주는 라벨에 쓴다. 비우면 「N번 컷」. */
  ownerLabel?: string
  onChange: (patch: Partial<FactionSceneSfx>) => void
  onRemove: () => void
}

function sfxUrl(series: string, file: string): string {
  const encoded = file.split('/').filter(Boolean).map(encodeURIComponent).join('/')
  return `/api/${series}/sfx/${encoded}`
}

export function FactionSceneSfxRow({ item, index, files, series, beatIndex, ownerLabel, onChange, onRemove }: Props) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  // 미리듣기 음량 — 브라우저 audio.volume은 1을 넘지 못해 증량을 들려주지 못한다.
  // 웹오디오 게인 노드를 물려야 +dB가 실제로 커진 소리로 들린다.
  const audioCtxRef = useRef<AudioContext | null>(null)
  const gainNodeRef = useRef<GainNode | null>(null)
  const [playing, setPlaying] = useState(false)
  const [failed, setFailed] = useState(false)
  const storedStartPercent = normalizeFactionSceneSfxStartPercent(item.startPercent)
  const [draftStart, setDraftStart] = useState({ source: storedStartPercent, value: storedStartPercent })
  const shownStartPercent = draftStart.source === storedStartPercent
    ? draftStart.value
    : storedStartPercent
  const storedGainDb = item.gainDb ?? 0
  const [draftGain, setDraftGain] = useState({ source: storedGainDb, value: storedGainDb })
  const shownGainDb = draftGain.source === storedGainDb ? draftGain.value : storedGainDb
  const gainActive = !isUnityGain(shownGainDb)
  const isFirst = index === 0
  const labelSuffix = isFirst ? '' : ` ${index + 1}번`
  const missingCurrent = !!item.file && !files.includes(item.file)
  const owner = ownerLabel ?? `${beatIndex + 1}번 컷`

  const stop = () => {
    audioRef.current?.pause()
    audioRef.current = null
    gainNodeRef.current = null
    setPlaying(false)
  }

  useEffect(() => () => {
    audioRef.current?.pause()
    audioRef.current = null
    gainNodeRef.current = null
    void audioCtxRef.current?.close()
    audioCtxRef.current = null
  }, [])

  // 재생 중에 슬라이더를 움직이면 그 자리에서 소리가 바뀐다.
  useEffect(() => {
    if (gainNodeRef.current) gainNodeRef.current.gain.value = dbToLinear(shownGainDb)
    else if (audioRef.current) audioRef.current.volume = Math.min(1, dbToLinear(shownGainDb))
  }, [shownGainDb])

  /** 미리듣기 음원에 게인 노드를 물린다. 웹오디오를 못 쓰면 감쇠만이라도 반영한다. */
  const attachGain = (audio: HTMLAudioElement) => {
    try {
      const Ctor = window.AudioContext
        ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) throw new Error('웹오디오를 쓸 수 없다')
      const ctx = audioCtxRef.current ?? new Ctor()
      audioCtxRef.current = ctx
      void ctx.resume()
      const gain = ctx.createGain()
      gain.gain.value = dbToLinear(shownGainDb)
      ctx.createMediaElementSource(audio).connect(gain).connect(ctx.destination)
      gainNodeRef.current = gain
    } catch {
      gainNodeRef.current = null
      audio.volume = Math.min(1, dbToLinear(shownGainDb))
    }
  }

  const togglePreview = () => {
    if (!item.file) return
    if (audioRef.current) {
      stop()
      return
    }
    const audio = new Audio(sfxUrl(series, item.file))
    audioRef.current = audio
    attachGain(audio)
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

  const commitStartPercent = (next: number) => {
    const normalized = normalizeFactionSceneSfxStartPercent(next)
    if (normalized === storedStartPercent) return
    onChange({ startPercent: normalized === 0 ? undefined : normalized })
  }

  const commitGainDb = (next: number) => {
    const normalized = normalizeGainDb(next)
    if ((normalized ?? 0) === storedGainDb) return
    onChange({ gainDb: normalized })
  }

  const resetGainDb = () => {
    setDraftGain({ source: storedGainDb, value: 0 })
    commitGainDb(0)
  }

  return (
    <div className="space-y-2 rounded-md border border-border/70 bg-bg-main/25 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="shrink-0 rounded border border-border bg-bg-secondary px-2 py-1 font-mono text-[10px] font-black tabular-nums text-text-primary">SFX {index + 1}</span>
        <select
          value={item.file}
          onChange={event => {
            stop()
            setFailed(false)
            const file = event.target.value
            onChange({ file, startPercent: file ? item.startPercent : undefined })
          }}
          className="min-w-56 max-w-full flex-1 rounded-md border border-border bg-bg-main px-2 py-1.5 text-xs text-text-primary hover:border-accent hover:bg-bg-hover focus:border-accent focus:outline-none"
          aria-label={`${owner} 효과음${labelSuffix} 선택`}
        >
          <option value="">효과음 없음</option>
          {missingCurrent ? <option value={item.file}>{item.file} · 파일 없음</option> : null}
          {files.map(file => <option key={file} value={file}>{file}</option>)}
        </select>
        <button
          type="button"
          onClick={togglePreview}
          disabled={!item.file}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border bg-bg-card px-2.5 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent active:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          aria-label={item.file ? `${item.file} 효과음 ${playing ? '정지' : '미리듣기'}` : '효과음 미리듣기'}
        >
          {playing ? <Pause size={13} /> : <Play size={13} />}
          {playing ? '정지' : '미리듣기'}
        </button>
        <button
          type="button"
          onClick={() => { stop(); setFailed(false); onRemove() }}
          className="inline-flex h-8 items-center gap-1 rounded-md border border-border px-2 text-xs font-semibold text-text-tertiary hover:border-danger/60 hover:bg-danger/15 hover:text-danger-text active:bg-danger/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
          aria-label={isFirst ? `${owner} 효과음 해제` : `${owner} 효과음 ${index + 1}번 삭제`}
        >
          <X size={13} /> {isFirst ? '해제' : '삭제'}
        </button>
        {failed ? <span role="status" className="text-[11px] font-semibold text-danger-text">미리듣기 실패 · 파일을 확인하세요</span> : null}
      </div>

      {item.file ? (
        <div className="rounded-md border border-border/60 bg-bg-card/45 px-3 py-2" data-faction-scene-sfx-timing="true">
          <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
            <span className="font-bold text-text-secondary">시작 시점</span>
            <output className="font-mono font-black tabular-nums text-accent">{shownStartPercent}%</output>
          </div>
          <input
            type="range"
            min={FACTION_SCENE_SFX_START_PERCENT_MIN}
            max={FACTION_SCENE_SFX_START_PERCENT_MAX}
            step={FACTION_SCENE_SFX_START_PERCENT_STEP}
            value={shownStartPercent}
            onChange={event => setDraftStart({
              source: storedStartPercent,
              value: normalizeFactionSceneSfxStartPercent(Number(event.target.value)),
            })}
            onPointerUp={event => commitStartPercent(Number(event.currentTarget.value))}
            onKeyUp={event => commitStartPercent(Number(event.currentTarget.value))}
            onBlur={event => commitStartPercent(Number(event.currentTarget.value))}
            className="block h-5 w-full cursor-pointer accent-accent hover:accent-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label={`${owner} 효과음${labelSuffix} 시작 시점`}
            aria-valuetext={`컷의 ${shownStartPercent}% 지점`}
          />
          <div className="flex justify-between text-[10px] text-text-dim" aria-hidden="true">
            <span>컷 시작 · 0%</span>
            <span>컷 끝 · 100%</span>
          </div>
        </div>
      ) : null}

      {item.file ? (
        <div className="rounded-md border border-border/60 bg-bg-card/45 px-3 py-2" data-faction-scene-sfx-gain="true">
          <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
            <span className="font-bold text-text-secondary">음량</span>
            <div className="flex items-center gap-2">
              {gainActive ? (
                <button
                  type="button"
                  onClick={resetGainDb}
                  className="rounded border border-border px-1.5 py-0.5 text-[10px] font-bold text-text-tertiary hover:border-accent hover:bg-bg-hover hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
                  aria-label={`${owner} 효과음${labelSuffix} 음량 기본값으로`}
                >
                  기본값으로
                </button>
              ) : null}
              <output className={`font-mono font-black tabular-nums ${gainActive ? 'text-accent' : 'text-text-tertiary'}`}>
                {shownGainDb > 0 ? `+${shownGainDb}` : shownGainDb}dB
              </output>
            </div>
          </div>
          <input
            type="range"
            min={GAIN_DB_MIN}
            max={GAIN_DB_MAX}
            step={GAIN_DB_STEP}
            value={shownGainDb}
            onChange={event => setDraftGain({ source: storedGainDb, value: Number(event.target.value) })}
            onPointerUp={event => commitGainDb(Number(event.currentTarget.value))}
            onKeyUp={event => commitGainDb(Number(event.currentTarget.value))}
            onBlur={event => commitGainDb(Number(event.currentTarget.value))}
            className="block h-5 w-full cursor-pointer accent-accent hover:accent-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            aria-label={`${owner} 효과음${labelSuffix} 음량`}
            aria-valuetext={`${shownGainDb > 0 ? `+${shownGainDb}` : shownGainDb}데시벨`}
          />
          <div className="flex justify-between text-[10px] text-text-dim" aria-hidden="true">
            <span>줄임 · {GAIN_DB_MIN}dB</span>
            <span>기본 · 0dB</span>
            <span>키움 · +{GAIN_DB_MAX}dB</span>
          </div>
        </div>
      ) : null}
    </div>
  )
}
