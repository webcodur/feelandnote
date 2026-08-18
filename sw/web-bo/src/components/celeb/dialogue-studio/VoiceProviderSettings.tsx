'use client'

import { Save } from 'lucide-react'
import { EleVoicePicker, useEleVoiceCatalog } from '@/components/voice/ele-voice-picker'
import { GeminiVoiceSelect } from '@/components/scenario-voice/GeminiVoiceSelect'
import {
  SpeakerEngineToggle,
  type SpeakerEngine,
} from '@/components/scenario-voice/SpeakerEngineToggle'
import { LOCALE_BADGE, type Locale } from './constants'

interface Props {
  locale: Locale
  engine: SpeakerEngine
  onEngineChange: (engine: SpeakerEngine) => void
  geminiVoice: string
  onGeminiVoiceChange: (voice: string) => void
  elevenlabsVoiceId: string
  onElevenlabsVoiceIdChange: (voiceId: string) => void
  onSaveElevenlabsVoiceId: () => void
}

/** 언어별 생성 엔진과 그 엔진의 보이스를 한 자리에서 고른다. */
export function VoiceProviderSettings({
  locale,
  engine,
  onEngineChange,
  geminiVoice,
  onGeminiVoiceChange,
  elevenlabsVoiceId,
  onElevenlabsVoiceIdChange,
  onSaveElevenlabsVoiceId,
}: Props) {
  const catalog = useEleVoiceCatalog()

  return (
    <section className="space-y-2 rounded-lg border border-border bg-bg-secondary/40 p-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xs font-semibold text-text-primary">
            {LOCALE_BADGE[locale].label} 생성 엔진 · 보이스
          </h3>
          <p className="mt-0.5 text-[10px] text-text-tertiary">
            단건·일괄 생성과 음성 편집 창에 함께 적용됩니다.
          </p>
        </div>
        <SpeakerEngineToggle engine={engine} onChange={onEngineChange} />
      </div>

      {engine === 'gemini' ? (
        <>
          <GeminiVoiceSelect
            value={geminiVoice}
            onChange={onGeminiVoiceChange}
            title={`${LOCALE_BADGE[locale].label} Gemini 보이스`}
            placeholderLabel="Gemini 보이스 선택"
            className="h-9 w-full border-border bg-bg-card px-3 py-1.5 text-text-primary"
          />
          <p className="text-[10px] text-text-tertiary">
            GEM 선택은 현재 생성 작업에 적용됩니다. 프로필의 ElevenLabs Voice ID는 덮어쓰지 않습니다.
          </p>
        </>
      ) : (
        <div className="flex items-start gap-1.5">
          <div className="min-w-0 flex-1">
            <EleVoicePicker
              voices={catalog.voices}
              value={elevenlabsVoiceId}
              onChange={onElevenlabsVoiceIdChange}
              loading={catalog.loading}
              error={catalog.error}
            />
          </div>
          <button
            type="button"
            onClick={onSaveElevenlabsVoiceId}
            disabled={!elevenlabsVoiceId.trim()}
            title={`프로필 Voice ID (${LOCALE_BADGE[locale].label}) 저장`}
            className="flex h-8 w-9 shrink-0 items-center justify-center rounded border border-accent/30 bg-accent/10 text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </section>
  )
}
