'use client'

import { useMemo, useState } from 'react'
import type { VoiceFile } from '../../voice-utils'
import { engineSlotPrefix } from '../../voice-utils'
import { buildEleText } from '../types'
import { prodFile } from '../utils'
import { SyncModeContent } from '../SyncModeContent'
import { BreathModeContent } from '../BreathModeContent'
import { AgeModeContent, type AgeEndpoints } from '../AgeModeContent'
import type { ExpandedVoicePanelProps } from './types'
import { useVoiceSpec } from './useVoiceSpec'
import { useSegmentMeta } from './useSegmentMeta'
import {
  SavedVoiceSection, useVoiceGeneration,
  type SavedVoiceTrack, type VoiceGenEndpoints,
} from '@/components/voice'
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

  // 저장된 음원 — 엔진 슬롯(GEM/ELE) 중 파일이 있는 것만 파형으로 그린다
  const savedTracks: SavedVoiceTrack[] = [
    { label: 'GEM', slot: 'gemini', file: section.gemini },
    { label: 'ELE', slot: 'elevenlabs', file: section.elevenlabs },
  ]
    .filter((e): e is { label: string; slot: string; file: VoiceFile } => !!e.file)
    .map(e => ({ label: e.label, file: e.file, active: activeEngine === e.slot }))

  // error 는 양쪽 hook(메타·생성)이 공유하므로 orchestrator 가 소유한다.
  const [error, setError] = useState<string | null>(null)

  const spec = useVoiceSpec({ secKey, episode, overrideText, voiceOverride })
  const meta = useSegmentMeta({
    secKey, episode, series, name, eleSendOpts,
    segmentLocator: spec.segmentLocator,
    geminiSpec: spec.geminiSpec,
    onEpisodeChange, setError,
  })
  // 서재 탐방 서버 창구 — 에피소드 단위 저장(엔진 폴더로 갈라 넣기)·재생·정렬.
  const voiceEndpoints: VoiceGenEndpoints = {
    previewUrl: route => `/api/${series}/voice/${route}/preview`,
    save: async (fileName, base64) => {
      const res = await fetch(`/api/${series}/voice/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode: name, fileName, base64 }),
      })
      return res.json()
    },
    sourceUrl: fileName => `/api/${series}/voice/play/${name}/${fileName}`,
    analyze: key => fetch(`/api/${series}/voice/analyze`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ episode: name, only: key }),
    }),
  }

  const gen = useVoiceGeneration({
    endpoints: voiceEndpoints,
    activeFile,
    chosenEngine: spec.chosenEngine,
    styleEdit: meta.styleEdit,
    buildText: t => buildEleText(t, meta.effectiveOpts),
    eleSettings,
    // 엔진마다 저장 폴더가 갈린다(gemini/ · elevenlabs/).
    targetFile: (engine, key) => `${engineSlotPrefix(engine)}/${key}.wav`,
    error, setError,
    onActivateEngine, onRefresh,
    onAligned: onRefresh,
  })

  const hasTempPreview = gen.tempPreview?.key === secKey
  const previewEngine = gen.tempPreview?.engine ?? null

  // 연령 변형 라우트 — 서버 ffmpeg 로 늙게/젊게 변형. 원본은 voice/{locale}/ori/ 에 보관.
  const ageEndpoints: AgeEndpoints = useMemo(() => {
    const post = async (s: string, action: string, fileName: string, age: number) => {
      const res = await fetch(`/api/${s}/voice/age`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode: name, fileName, age, action }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? '요청 실패')
      return data
    }
    return {
      loadUrl: (s, n, fileName) => `/api/${s}/voice/play/${n}/${fileName}?t=${Date.now()}`,
      preview: (s, _n, fileName, age) => post(s, 'preview', fileName, age),
      commit: (s, _n, fileName, age) => post(s, 'commit', fileName, age),
      restore: (s, _n, fileName) => post(s, 'restore', fileName, 0),
      status: (s, _n, fileName) => post(s, 'status', fileName, 0),
    }
  }, [name])

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

      {/* AGE mode — 저장된 음원을 늙게/젊게 변형(원본 보관·되돌리기 가능) */}
      {expandMode === 'age' && (
        activeFile ? (
          <AgeModeContent series={series} name={name} file={activeFile} onRefresh={onRefresh} endpoints={ageEndpoints} />
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
          tracks={savedTracks}
          playUrl={f => `/api/${series}/voice/play/${name}/${f.name}${gen.reloadTick ? `?t=${gen.reloadTick}` : ''}`}
          trimStart={gen.trimStart}
          setTrimStart={gen.setTrimStart}
          trimEnd={gen.trimEnd}
          setTrimEnd={gen.setTrimEnd}
          trimSaving={gen.trimSaving}
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
          personVoice={spec.personVoice}
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
