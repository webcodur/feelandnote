'use client'

import { useState } from 'react'
import type { VoiceFile } from '../../voice-utils'
import { prodFile } from '../utils'
import { SyncModeContent } from '../SyncModeContent'
import { BreathModeContent } from '../BreathModeContent'
import type { ExpandedVoicePanelProps } from './types'
import { useVoiceSpec } from './useVoiceSpec'
import { useSegmentMeta } from './useSegmentMeta'
import { useVoiceGeneration } from './useVoiceGeneration'
import { SavedVoiceSection } from './sections/SavedVoiceSection'
import { GenerateSection } from './sections/GenerateSection'

export function ExpandedVoicePanel({
  sectionKey: secKey, section, episode, series, name,
  eleSettings, eleSendOpts, activeEngine,
  onEpisodeChange, onSave, onRefresh, onActivateEngine,
  expandMode = 'trim',
  overrideText, voiceOverride,
}: ExpandedVoicePanelProps) {
  const engineFile: Record<string, VoiceFile | undefined> = { gemini: section.gemini, elevenlabs: section.elevenlabs, common: section.common }
  const activeFile = engineFile[activeEngine] ?? prodFile(section)

  // error 는 양쪽 hook(메타·생성)이 공유하므로 orchestrator 가 소유한다.
  const [error, setError] = useState<string | null>(null)

  const spec = useVoiceSpec({ secKey, episode, overrideText, voiceOverride })
  const meta = useSegmentMeta({
    secKey, episode, series, name, eleSendOpts,
    segmentLocator: spec.segmentLocator,
    geminiSpec: spec.geminiSpec,
    onEpisodeChange, setError,
  })
  const gen = useVoiceGeneration({
    series, name, activeFile,
    chosenEngine: spec.chosenEngine,
    styleEdit: meta.styleEdit,
    effectiveOpts: meta.effectiveOpts,
    eleSettings, error, setError,
    onActivateEngine, onRefresh,
  })

  const hasTempPreview = gen.tempPreview?.key === secKey
  const previewEngine = gen.tempPreview?.engine ?? null

  return (
    <div className="relative space-y-3" onClick={e => e.stopPropagation()}>
      {/* TRIM | SYNC 탭은 모달 헤더로 이동. ENGINE 토글(default/override 시각화)도 헤더로 이동. */}

      {/* SYNC mode */}
      {expandMode === 'sync' && (
        <SyncModeContent
          secKey={secKey} episode={episode} episodeData={episode}
          series={series} name={name}
          onEpisodeChange={onEpisodeChange} onSave={onSave} onRefresh={onRefresh}
        />
      )}

      {/* BREATH mode — 들숨·잡소리 구간 무음 처리 */}
      {expandMode === 'breath' && (
        activeFile ? (
          <BreathModeContent series={series} name={name} file={activeFile} onRefresh={onRefresh} />
        ) : (
          <div className="text-sm text-text-secondary italic px-1 py-2">
            저장된 음원이 없다. 생성 탭에서 먼저 만든다.
          </div>
        )
      )}

      {/* TRIM mode */}
      {expandMode === 'trim' && (<>
        {/* 저장된 음원 — 디스크 wav + 트림 */}
        <SavedVoiceSection
          section={section}
          series={series}
          name={name}
          activeEngine={activeEngine}
          activeFile={activeFile}
          trimStart={gen.trimStart}
          setTrimStart={gen.setTrimStart}
          trimEnd={gen.trimEnd}
          setTrimEnd={gen.setTrimEnd}
          trimSaving={gen.trimSaving}
          reloadTick={gen.reloadTick}
          saveTrimmed={gen.saveTrimmed}
        />

        {/* 새 음원 생성 — TTS 미리듣기 → 저장 */}
        <GenerateSection
          secKey={secKey}
          sectionTexts={spec.sectionTexts}
          overrideText={overrideText}
          ttsText={spec.ttsText}
          setTtsText={spec.setTtsText}
          chosenEngine={spec.chosenEngine}
          setChosenEngine={spec.setChosenEngine}
          generating={gen.generating}
          handleCancelGenerate={gen.handleCancelGenerate}
          engineSpec={spec.engineSpec}
          eleSpec={spec.eleSpec}
          geminiSpec={spec.geminiSpec}
          activeSpec={spec.activeSpec}
          voiceOverride={voiceOverride}
          segmentLocator={spec.segmentLocator}
          handleSegmentFieldChange={meta.handleSegmentFieldChange}
          styleEdit={meta.styleEdit}
          setStyleEdit={meta.setStyleEdit}
          handleLongformStyleChange={meta.handleLongformStyleChange}
          hasTempPreview={hasTempPreview}
          tempPreview={gen.tempPreview}
          previewEngine={previewEngine}
          handleSavePreview={gen.handleSavePreview}
          trimSaving={gen.trimSaving}
          setTempPreview={gen.setTempPreview}
          handleGenerate={gen.handleGenerate}
          segmentPath={meta.segmentPath}
          segmentMeta={meta.segmentMeta}
          metaSaving={meta.metaSaving}
          metaError={meta.metaError}
          handleSegmentMetaChange={meta.handleSegmentMetaChange}
          eleSendOpts={eleSendOpts}
          onAlign={() => gen.alignCurrent(secKey)}
          aligning={gen.aligning}
          canAlign={!!activeFile}
        />

        {error && <div className="text-xs text-danger-text">{error}</div>}
      </>)}
    </div>
  )
}
