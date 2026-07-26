'use client'

import type { FactionPerson } from '@/lib/faction-types'
import type { VoiceFile } from '@feelandnote/shared/bo/voice-utils'
import type { FactionVoiceMeta } from '../../../../shared/FactionVoiceContext'
import { VOICE } from '@feelandnote/shared/lib/voice-policy'
import { Mic } from '@feelandnote/shared/bo/icons'
import { AudioWavePlayer } from '@feelandnote/shared/bo/audio-wave-player'
import { QUOTE_SLOT, langFieldsOf, type FactionVoiceSlot } from './voice-panel/voice-slots'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { folderToParam } from '@/lib/faction-edit-route'

/**
 * 인물 한 명의 대사 음성 패널 — 펼친 폼 안에 놓이는 음성 설정 진입부 + 인라인 재생바.
 *
 * 설정 본체는 모달(FactionVoiceSettingsModal)에 있으며 행(FactionPersonRow)이 소유한다.
 * 헤더 버튼은 onOpenModal 로 그 모달을 연다(아코디언 헤더의 음성 버튼과 같은 모달).
 * meta·activeFile 은 행에서 한 번 계산해 내려준다.
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
  /** 편집 언어 — 요약에 보일 엔진·목소리를 이 언어 칸에서 읽는다 */
  lang?: EditLang
}) {
  if (!hasContent) return null

  const F = slot.fields
  const L = langFieldsOf(slot, lang)
  const engine = (person[L.engine] as string | undefined) ?? 'gemini'
  const engineLabel = engine === 'elevenlabs' ? 'ELE' : engine === 'gemini-v3' ? 'GEM 3.1' : 'GEM 2.5'
  const voiceSummary = engine === 'elevenlabs'
    ? ((person[L.eleVoiceId] as string | undefined) || 'ID 미설정')
    : ((person[F.speaker] as string | undefined) || VOICE.celeb)

  return (
    <div className="rounded-md border border-border bg-bg-main/40">
      {/* 헤더 — 모달 열기 버튼 + 현재 엔진/보이스 요약 */}
      <button
        type="button"
        onClick={onOpenModal}
        className="flex w-full items-center gap-2 px-2 py-1.5 text-left hover:bg-bg-hover"
        title="이 인물 음성 설정 열기"
      >
        <Mic size={13} className="shrink-0 text-text-dim" />
        <span className="text-xs font-semibold text-text-secondary">{slot.label}</span>
        <span className="rounded border border-border bg-bg-card px-1.5 py-0.5 font-mono text-[10px] text-text-secondary">
          {engineLabel}
        </span>
        <span className="truncate font-mono text-[10px] text-text-dim">{voiceSummary}</span>
        {meta && (
          <span className="font-mono text-[10px] text-accent">{meta.duration.toFixed(1)}s</span>
        )}
        <span className="ml-auto text-[10px] text-text-dim">설정 열기 ▸</span>
      </button>

      {/* 헤더 아래 재생바 — 모달을 열지 않고 저장된 음원을 바로 들어본다.
          배속·게인은 인물 설정값을 그대로 반영해 렌더와 같은 청취 조건으로 들린다. */}
      {activeFile && (
        <div className="border-t border-border px-2 py-1.5">
          <AudioWavePlayer
            audioUrl={`/api/${series}/voice/${folderToParam(episodeName)}/${encodeURIComponent(voiceFile)}?t=${meta?.size ?? 0}`}
            duration={activeFile.duration}
            heightClass="h-8"
            playbackRate={person[F.rate] as number | undefined}
            gainDb={person[F.gain] as number | undefined}
          />
        </div>
      )}
    </div>
  )
}
