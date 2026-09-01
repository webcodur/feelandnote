'use client'

import { useCallback, useRef, useState } from 'react'
import type { FactionPerson } from '@/lib/faction-types'
import type { VoiceFile } from '@feelandnote/shared/bo/voice-utils'
import { useFactionVoice, type FactionVoiceMeta } from '../../../../shared/FactionVoiceContext'
import { VOICE } from '@feelandnote/shared/lib/voice-policy'
import { effectiveElevenLabsVoiceId, factionVoiceProvider } from '@feelandnote/shared/lib/faction-voice-provider'
import { ChevronDown, ChevronRight, Mic, Pause, Play } from '@feelandnote/shared/bo/icons'
import { AudioWavePlayer, type AudioWaveHandle } from '@feelandnote/shared/bo/audio-wave-player'
import { QUOTE_SLOT, langFieldsOf, voiceLangOf, type FactionVoiceSlot } from './voice-panel/voice-slots'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { folderToParam } from '@/lib/faction-edit-route'

/**
 * 인물 한 명의 대사 음성 패널 — 한 줄 헤더 + 펼치면 나오는 파형.
 *
 * 헤더 한 줄에 이 대사가 어느 목소리를 쓰는지(엔진·보이스·길이), 인물 기본값을 그대로 쓰는지
 * 이 컷에서 덮어썼는지를 함께 적는다. 예전에는 이 상속 상태만 담은 줄이 패널 위에 따로 있었는데,
 * 편집 대상이 다를 뿐 같은 음성 이야기라 한 줄에서 읽히지 않았다.
 *
 * 재생은 접은 채로도 헤더 버튼으로 할 수 있다(누르면 파형이 함께 열린다). 설정 본체는
 * 모달(FactionVoiceSettingsModal)에 있으며 장면의 인물 발화 항목이 소유한다.
 */
export function FactionVoicePanel({
  person,
  series,
  episodeName,
  voiceFile,
  hasContent,
  meta,
  activeFile,
  onOpenModal,
  slot = QUOTE_SLOT,
  lang,
  inheritanceNote,
  headerAction,
}: {
  person: FactionPerson
  series: string
  episodeName: string
  /** 이 인물 음원 파일명 (예 F01P01-quote.wav 또는 -epithet.wav) — 재생 대상 */
  voiceFile: string
  /** 내용(대사/수식어)이 있는지 — 없으면 패널 자체 미노출 */
  hasContent: boolean
  /** 저장된 음원 메타 (없으면 미생성) */
  meta: FactionVoiceMeta | undefined
  /** 북리커맨드 VoiceFile 형태로 어댑트한 활성 음원 (없으면 미생성) */
  activeFile: VoiceFile | undefined
  /** 음성 설정 모달 열기 */
  onOpenModal: () => void
  /** 음성 슬롯 — 대사(기본) 또는 수식어 */
  slot?: FactionVoiceSlot
  /** 편집 언어 — 요약에 보일 ElevenLabs 목소리를 이 언어 칸에서 읽는다 */
  lang?: EditLang
  /** 상속 상태 한 줄 — 「인물 기본값 상속 중」·「2개 덮어씀」처럼 짧게. */
  inheritanceNote?: string
  /** 헤더 오른쪽에 붙는 버튼 — 인물 기본 음성 편집·공용 나레이터 이동 등. */
  headerAction?: React.ReactNode
}) {
  const factionVoice = useFactionVoice()
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  // 접힌 채로 재생을 누르면 파형을 열면서 바로 재생한다(파형이 있어야 소리를 낸다).
  const [autoPlay, setAutoPlay] = useState(false)
  const waveRef = useRef<AudioWaveHandle>(null)
  const handlePlayingChange = useCallback((next: boolean) => setPlaying(next), [])

  if (!hasContent) return null

  const F = slot.fields
  const L = langFieldsOf(slot, lang)
  const inheritedVoiceId = slot.id === 'quote' && person.celebId
    ? factionVoice?.celebVoices[person.celebId]?.[voiceLangOf(lang)]
    : undefined
  const eleVoiceId = effectiveElevenLabsVoiceId(person[L.eleVoiceId] as string | undefined, inheritedVoiceId)
  const engine = factionVoiceProvider(eleVoiceId)
  const engineLabel = engine === 'elevenlabs' ? 'ELE' : 'GEM 2.5'
  const voiceSummary = engine === 'elevenlabs'
    ? eleVoiceId
    : ((person[F.speaker] as string | undefined) || VOICE.celeb)

  const togglePlay = () => {
    if (!activeFile) return
    if (!open) {
      setAutoPlay(true)
      setOpen(true)
      return
    }
    waveRef.current?.toggle()
  }

  return (
    <div className="rounded-md border border-border bg-bg-main/40" data-faction-voice-panel="true">
      {/* 헤더 한 줄 — 재생·펼침·목소리 요약·상속 상태·설정 진입 */}
      <div className="flex flex-wrap items-center gap-2 px-2 py-1.5">
        <button
          type="button"
          onClick={togglePlay}
          disabled={!activeFile}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded border border-border bg-bg-card text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent active:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          title={activeFile ? (playing ? '정지' : '재생') : '아직 음원이 없습니다'}
          aria-label={activeFile ? (playing ? `${slot.label} 정지` : `${slot.label} 재생`) : `${slot.label} 음원 없음`}
        >
          {playing ? <Pause size={12} /> : <Play size={12} />}
        </button>

        <button
          type="button"
          onClick={() => setOpen(value => !value)}
          disabled={!activeFile}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-text-tertiary hover:bg-bg-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          title={activeFile ? (open ? '파형 접기' : '파형 펼치기') : '아직 음원이 없습니다'}
          aria-label={open ? `${slot.label} 파형 접기` : `${slot.label} 파형 펼치기`}
          aria-expanded={open}
        >
          {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>

        <button
          type="button"
          onClick={onOpenModal}
          className="flex min-w-0 flex-1 items-center gap-2 rounded px-1 py-0.5 text-left hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          title="이 인물 음성 설정 열기"
        >
          <Mic size={13} className="shrink-0 text-text-dim" />
          <span className="shrink-0 text-xs font-semibold text-text-secondary">{slot.label}</span>
          <span className="shrink-0 rounded border border-border bg-bg-card px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
            {engineLabel}
          </span>
          <span className="truncate font-mono text-[10px] text-text-dim">{voiceSummary}</span>
          {meta && (
            <span className="shrink-0 font-mono text-[10px] text-accent">{meta.duration.toFixed(1)}s</span>
          )}
          {inheritanceNote && (
            <span className="shrink-0 truncate text-[10px] text-text-dim">· {inheritanceNote}</span>
          )}
          <span className="ml-auto shrink-0 text-[10px] text-text-dim">설정 열기 ▸</span>
        </button>

        {headerAction}
      </div>

      {/* 펼치면 나오는 파형 — 배속·게인은 인물 설정값을 그대로 반영해 렌더와 같은 청취 조건으로 들린다. */}
      {activeFile && open && (
        <div className="border-t border-border px-2 py-1.5">
          <AudioWavePlayer
            ref={waveRef}
            audioUrl={`/api/${series}/voice/${folderToParam(episodeName)}/${encodeURIComponent(voiceFile)}?t=${meta?.size ?? 0}`}
            duration={activeFile.duration}
            heightClass="h-8"
            playbackRate={person[F.rate] as number | undefined}
            gainDb={person[F.gain] as number | undefined}
            autoPlay={autoPlay}
            onPlayingChange={handlePlayingChange}
          />
        </div>
      )}
    </div>
  )
}
