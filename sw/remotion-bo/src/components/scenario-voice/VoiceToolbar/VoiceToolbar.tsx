'use client'

import type { EpisodeData } from '../../EpisodeEditor'
import type { VoiceSummary } from '../../voice-utils'
import { type EleSettings, type EleSendOpts, type VoiceSelect } from '../types'
import { useVoiceToolbar } from './useVoiceToolbar'
import { GenerateToolsSection } from './sections/GenerateToolsSection'
import { EleSettingsSection } from './sections/EleSettingsSection'
import { UiLabel } from '@/components/ui-label'

// ── VoiceToolbar ──

type VoiceToolbarProps = {
  episode: EpisodeData
  series: string
  name: string
  voiceSummary: VoiceSummary
  mode: { label: string; color: string }
  hasELVoiceId: boolean
  vs: VoiceSelect
  onSaveVs: (next: VoiceSelect) => Promise<void>
  eleSettings: EleSettings
  onEleSettingsChange: (s: EleSettings) => void
  eleSendOpts: EleSendOpts
  onEleSendOptsChange: (o: EleSendOpts) => void
  onRefresh: () => void
  post: (url: string, body: unknown) => Promise<void>
  speakerPanelNode?: React.ReactNode
}

export function VoiceToolbar({
  episode, series, name, voiceSummary, hasELVoiceId,
  eleSettings, onEleSettingsChange, eleSendOpts, onEleSendOptsChange, onRefresh, post,
  speakerPanelNode,
}: VoiceToolbarProps) {
  const {
    engine, setEngine,
    role, setRole,
    only, setOnly,
    eleSettingsOpen, setEleSettingsOpen,
    eleBatchRunning,
    eleBatchStatus,
    emotionDraft, setEmotionDraft,
    expanded, setExpanded,
    toggleEmotion,
    addCustomEmotion,
    hasShorts,
    runEleBatch,
  } = useVoiceToolbar({
    episode, series, name, eleSettings, eleSendOpts, onEleSendOptsChange, onRefresh,
  })

  return (
    <div className="relative bg-bg-card border border-border/50 rounded-lg mb-4 overflow-hidden">
      <UiLabel ko="음성 도구막대" code="VoiceToolbar" />
      <button
        type="button"
        className={`w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer select-none outline-none hover:bg-bg-hover transition-colors ${expanded ? 'border-b border-border/40' : ''}`}
        onClick={() => setExpanded(!expanded)}
      >
        <span className={`inline-block text-[10px] text-text-dim shrink-0 transition-transform ${expanded ? 'rotate-90' : ''}`}>▶</span>
        <span className="font-bold text-[12px] text-text-secondary shrink-0">음성 엔진 제어판 (VoiceToolbar)</span>
        <span className="ml-auto text-[10px] font-mono shrink-0">
          <span className="bg-bg-main px-2 py-0.5 rounded-full border border-border text-slate-800 font-bold whitespace-nowrap">
            {voiceSummary.total}파일 · {(voiceSummary.totalSizeKB / 1024).toFixed(1)}MB
          </span>
        </span>
      </button>

      {expanded && (
      <div className="p-3 pt-1 space-y-1.5">
        {/* 2. Generate tools */}
        <GenerateToolsSection
          series={series}
          name={name}
          engine={engine}
          setEngine={setEngine}
          role={role}
          setRole={setRole}
          only={only}
          setOnly={setOnly}
          hasShorts={hasShorts}
          post={post}
        />

        {/* 3. 화자 설정 (Host + 추가 화자 통합) */}
        {speakerPanelNode}

        {/* 4. ELE settings */}
        {hasELVoiceId && (
          <EleSettingsSection
            episode={episode}
            eleSettingsOpen={eleSettingsOpen}
            setEleSettingsOpen={setEleSettingsOpen}
            eleSettings={eleSettings}
            onEleSettingsChange={onEleSettingsChange}
            eleSendOpts={eleSendOpts}
            onEleSendOptsChange={onEleSendOptsChange}
            emotionDraft={emotionDraft}
            setEmotionDraft={setEmotionDraft}
            toggleEmotion={toggleEmotion}
            addCustomEmotion={addCustomEmotion}
            eleBatchRunning={eleBatchRunning}
            eleBatchStatus={eleBatchStatus}
            runEleBatch={runEleBatch}
          />
        )}
      </div>
      )}
    </div>
  )
}
