'use client'

/**
 * 대사 한 자리의 음성 편집 창 — 세력도감 인물 편집 창을 인물 상세·작업실로 옮긴 것.
 *
 * 화면 구성·부품은 세력도감과 같다.
 *  · 창 껍데기·모드 탭·자판 규약  → 공용 VoiceEditorShell
 *  · 저장된 음원 파형·앞뒤 자르기 → 공용 SavedVoiceSection
 *  · 보이스 고르기·감정 표식      → 공용 EleVoicePicker · EleEmotionPicker
 *  · 들숨 제거                    → 공용 BreathModeContent
 *
 * 다른 것은 음원이 놓인 자리뿐이다. 세력도감은 편 폴더의 wav 파일이고 이쪽은 R2에 올려 둔
 * 인물별 음원이라, 읽고 쓰는 창구만 갈아끼웠다.
 *
 * 세력도감에 있는 「싱크 보정」은 자막 점등 시각을 다루는 기능이라 대사에는 붙일 자리가 없고,
 * 「연령 변형」은 서버 변환 창구가 편 폴더 전용이라 여기서는 뺐다.
 */

import { useCallback, useMemo, useState } from 'react'
import {
  VoiceEditorShell, SavedVoiceSection, EleEmotionPicker, useVoiceGeneration,
  type VoiceGenEndpoints,
} from '@feelandnote/shared/bo/voice'
import type { SegmentEngineSpec } from '@feelandnote/shared/bo/voice-utils'
import { buildEleText } from '@/components/scenario-voice/types'
import { GeminiVoiceSelect } from '@/components/scenario-voice/GeminiVoiceSelect'
import {
  SpeakerEngineToggle,
  type SpeakerEngine,
} from '@/components/scenario-voice/SpeakerEngineToggle'
import { BreathModeContent, type BreathEndpoints } from '@/components/scenario-voice/BreathModeContent'
import {
  EleVoicePicker, useEleVoiceCatalog, useEleVoiceNotes, useEleVoiceHistory,
} from '@/components/voice/ele-voice-picker'
import {
  uploadVoiceFromPreview, bumpVoiceVersion, enableHasVoice, saveVoiceId, type VoiceGenCeleb,
} from '@/actions/admin/voice-gen'
import { TYPE_LABELS } from '@/lib/voice-path'
import { buildCelebVoiceRecommendations } from './recommendations'
import { useCelebVoiceAsset } from './useCelebVoiceAsset'
import { LOCALE_BADGE, type Locale, type VoiceSettings } from '../constants'
import { celebVoicePreviewUrl } from '../voice-preview'
import { audioContentTypeOfBase64 } from '../audio'

type EditorMode = 'gen' | 'breath'

const MODES = [
  { id: 'gen' as const, label: '만들기' },
  { id: 'breath' as const, label: '들숨' },
]

export interface CelebVoiceEditorTarget {
  locale: Locale
  type: string
  variant?: number
  /** 읽어줄 문장 */
  text: string
}

interface Props {
  celeb: VoiceGenCeleb
  target: CelebVoiceEditorTarget
  engine: SpeakerEngine
  onEngineChange: (engine: SpeakerEngine) => void
  /** 그 언어의 목소리 번호 */
  voiceId: string
  onVoiceIdChange: (voiceId: string) => void
  /** R2에 이미 음원이 있는지 */
  hasFile: boolean
  settings: VoiceSettings
  onSettingsChange: (next: VoiceSettings) => void
  emotions: string[]
  onEmotionsChange: (next: string[]) => void
  trail: boolean
  onTrailChange: (next: boolean) => void
  playbackRate: number
  /** 음원을 새로 저장했을 때 — 바깥 목록의 보유 표시를 갱신한다 */
  onSaved: () => void
  onClose: () => void
}

export default function CelebVoiceEditorModal({
  celeb, target, engine, onEngineChange, voiceId, onVoiceIdChange, hasFile,
  settings, onSettingsChange, emotions, onEmotionsChange, trail, onTrailChange,
  playbackRate, onSaved, onClose,
}: Props) {
  const { locale, type, variant, text } = target
  const celebKey = celeb.slug || celeb.id
  const [error, setError] = useState<string | null>(null)
  const [reloadTick, setReloadTick] = useState(0)
  const [savedHere, setSavedHere] = useState(false)

  const asset = useCelebVoiceAsset({
    celebKey, locale, type, variant,
    exists: hasFile || savedHere,
    reloadTick,
  })

  // ── 보이스 목록·메모·이미 쓴 곳 ──
  const catalog = useEleVoiceCatalog()
  const voices = catalog.voices
  const notes = useEleVoiceNotes()
  const history = useEleVoiceHistory()

  const recommendations = useMemo(
    () => buildCelebVoiceRecommendations({
      celeb, voices, currentVoiceId: voiceId, emotions,
      dialogueTexts: [text],
      voiceNotes: notes.notes,
      blockedVoiceIds: notes.blockedVoiceIds,
    }),
    [celeb, voices, voiceId, emotions, text, notes.notes, notes.blockedVoiceIds],
  )

  const eleAccountId = voices.find(v => v.voice_id === voiceId)?.account?.id ?? null

  // ── 만들기·저장 절차 (세력도감과 같은 훅) ──
  const endpoints: VoiceGenEndpoints = useMemo(() => ({
    previewUrl: route => celebVoicePreviewUrl(celebKey, route),
    save: async (_fileName, base64) => {
      // ELE 보이스가 없던 인물도 음원 저장 한 번으로 다음 진입부터 같은 배역을 쓴다.
      // Gemini 보이스·모델은 생성 세션 값이므로 프로필에 저장하지 않는다.
      if (engine === 'elevenlabs' && voiceId.trim()) {
        const voiceSave = await saveVoiceId(celeb.id, locale, voiceId.trim())
        if (!voiceSave.success) return { success: false, error: voiceSave.error ?? 'Voice ID 저장 실패' }
      }
      const result = await uploadVoiceFromPreview({
        celebId: celeb.id, base64, locale,
        dialogueType: type, variant,
        contentType: audioContentTypeOfBase64(base64),
      })
      if (!result.success) return { success: false, error: result.error }
      await bumpVoiceVersion(celeb.id)
      if (!celeb.has_voice) await enableHasVoice(celeb.id)
      return { success: true }
    },
    sourceUrl: () => asset.fileUrl,
    // 자막 점등 시각을 다시 잡는 기능은 대사에 해당 사항이 없다 — 화면에도 내놓지 않는다
    analyze: async () => new Response(null, { status: 501 }),
  }), [celebKey, celeb.id, celeb.has_voice, locale, type, variant, asset.fileUrl, engine, voiceId])

  const gen = useVoiceGeneration({
    endpoints,
    activeFile: asset.file,
    chosenEngine: engine,
    styleEdit: '',
    buildText: t => buildEleText(t, {
      emotionEnabled: emotions.length > 0,
      emotions,
      trailEnabled: trail,
    }),
    eleSettings: { stability: settings.stability, style: settings.style },
    eleAccountId,
    targetFile: () => `${locale}/${type}${variant ?? ''}`,
    error,
    setError,
    onRefresh: () => {
      setSavedHere(true)
      setReloadTick(Date.now())
      onSaved()
    },
  })

  const slotKey = `${locale}/${type}${variant ?? ''}`
  const spec: SegmentEngineSpec = { engine, voiceParam: voiceId }

  const runGenerate = useCallback((saveImmediately: boolean) => {
    if (!voiceId.trim()) { setError('목소리 번호를 먼저 고른다'); return }
    if (!text.trim()) { setError('읽어줄 문장이 비어 있다'); return }
    void gen.handleGenerate(spec, slotKey, text, saveImmediately ? { saveImmediately: true } : undefined)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gen, voiceId, text, slotKey])

  // ── 들숨 편집 — R2 음원을 브라우저에서 wav 로 바꿔 넘기고, 결과는 같은 자리에 덮는다 ──
  const breathEndpoints: BreathEndpoints = useMemo(() => ({
    loadUrl: () => asset.wavUrl ?? '',
    save: async (_s, _n, _f, base64) => {
      const result = await uploadVoiceFromPreview({
        celebId: celeb.id, base64, locale,
        dialogueType: type, variant,
        contentType: 'audio/wav',
      })
      if (!result.success) throw new Error(result.error ?? '저장 실패')
      await bumpVoiceVersion(celeb.id)
    },
  }), [asset.wavUrl, celeb.id, locale, type, variant])

  const slotLabel = type === 'quote'
    ? '명언'
    : `${TYPE_LABELS[type] ?? type} ${variant}`

  const previewHere = gen.tempPreview?.key === slotKey

  return (
    <VoiceEditorShell<EditorMode>
      title="음성 편집"
      subtitle={
        <>
          {celeb.nickname} · {slotLabel}
          <span className={`ml-2 rounded border px-1.5 py-0.5 text-[10px] font-medium ${LOCALE_BADGE[locale].className}`}>
            {LOCALE_BADGE[locale].label}
          </span>
        </>
      }
      modes={MODES}
      onClose={onClose}
    >
      {(mode) => (
        <div className="space-y-3">
          {mode === 'gen' && (
            <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
              {/* 왼쪽 — 이미 저장된 음원 */}
              <div className="min-w-0 space-y-3">
                <h3 className="border-b border-border pb-1.5 text-sm font-bold text-text-primary">해당 음원 설정</h3>
                <SavedVoiceSection
                  tracks={asset.file ? [{ label: engine === 'elevenlabs' ? 'ELE' : 'GEM', file: asset.file, active: true }] : []}
                  playUrl={() => asset.fileUrl}
                  trimStart={gen.trimStart}
                  setTrimStart={gen.setTrimStart}
                  trimEnd={gen.trimEnd}
                  setTrimEnd={gen.setTrimEnd}
                  trimSaving={gen.trimSaving}
                  saveTrimmed={gen.saveTrimmed}
                  playbackRate={playbackRate}
                  resetTrimOnFileChange
                />
                {asset.loading && <p className="text-xs text-text-secondary">음원을 읽는 중…</p>}
                {asset.error && <p className="text-xs text-danger-text">{asset.error}</p>}
              </div>

              {/* 오른쪽 — 새로 만들기 */}
              <div className="min-w-0 space-y-3">
                <h3 className="border-b border-border pb-1.5 text-sm font-bold text-text-primary">음원 만들기 설정</h3>

                <div className="flex items-start gap-2">
                  <SpeakerEngineToggle engine={engine} onChange={onEngineChange} />
                  <div className="min-w-0 flex-1">
                    {engine === 'gemini' ? (
                      <GeminiVoiceSelect
                        value={voiceId}
                        onChange={onVoiceIdChange}
                        placeholderLabel="Gemini 보이스 선택"
                        className="h-8 w-full border-border bg-bg-card px-2 py-1 text-text-primary"
                      />
                    ) : (
                      <EleVoicePicker
                        voices={voices}
                        value={voiceId}
                        onChange={onVoiceIdChange}
                        loading={catalog.loading}
                        error={catalog.error}
                        recommendations={recommendations}
                        voiceNotes={notes.notes}
                        notesLoading={notes.loading}
                        notesError={notes.error}
                        savingVoiceId={notes.savingVoiceId}
                        onUpdateVoiceNote={notes.updateVoiceNote}
                        voiceHistory={history.history}
                        historyLoading={history.loading}
                        historyError={history.error}
                        historyUsageCount={history.usageCount}
                      />
                    )}
                  </div>
                </div>

                {engine === 'elevenlabs' && (
                  <>
                {/* 감정·강도 */}
                <div className="flex items-stretch overflow-hidden rounded border border-border">
                  <span className="flex shrink-0 items-center border-r border-slate-300 bg-slate-100 px-2 text-sm font-extrabold text-slate-800">감정·강도</span>
                  <div className="flex flex-1 items-center gap-4 bg-white px-3 py-1.5">
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700" title="낮을수록 표현이 강하고 변화가 크다 (기본 0.5)">
                      안정성
                      <input type="range" min={0} max={1} step={0.05}
                        value={settings.stability}
                        onChange={e => onSettingsChange({ ...settings, stability: Number(e.target.value) })}
                        className="w-24 accent-slate-700" />
                      <span className="w-8 text-right font-mono text-slate-900">{settings.stability.toFixed(2)}</span>
                    </label>
                    <label className="flex items-center gap-2 text-xs font-semibold text-slate-700" title="높을수록 감정·억양이 강조된다 (기본 0.3)">
                      스타일
                      <input type="range" min={0} max={1} step={0.05}
                        value={settings.style}
                        onChange={e => onSettingsChange({ ...settings, style: Number(e.target.value) })}
                        className="w-24 accent-slate-700" />
                      <span className="w-8 text-right font-mono text-slate-900">{settings.style.toFixed(2)}</span>
                    </label>
                  </div>
                </div>

                {/* 감정 표식 */}
                <div className="overflow-hidden rounded border border-border">
                  <div className="flex items-center gap-2 border-b border-slate-300 bg-slate-100 px-2 py-1.5">
                    <span className="text-sm font-extrabold text-slate-800">감정 태그</span>
                    {emotions.length > 0 && (
                      <span className="font-mono text-[11px] font-black text-purple-700">[{emotions.join(', ')}]</span>
                    )}
                    <span className="ml-auto text-[10px] font-bold text-slate-500">최대 2개</span>
                    <button type="button" onClick={() => onTrailChange(!trail)}
                      title="문장 끝에 ' ... ... ...' 을 붙여 끝 음절이 잘리는 것을 줄인다"
                      className={`rounded border px-2 py-0.5 text-[11px] font-extrabold ${
                        trail
                          ? 'border-purple-600 bg-purple-600 text-white shadow-sm'
                          : 'border-slate-300 bg-white text-slate-500 hover:border-purple-500 hover:bg-purple-50'
                      }`}>끝 패딩</button>
                  </div>
                  <div className="bg-white px-3 py-2">
                    <EleEmotionPicker value={emotions} onChange={onEmotionsChange} />
                  </div>
                </div>
                  </>
                )}

                {/* 읽어줄 문장 */}
                <div className="rounded border border-border bg-bg-main/40 p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-text-secondary">읽어줄 문장</span>
                    <span className="ml-auto font-mono text-[10px] text-text-tertiary">{text.length}자</span>
                  </div>
                  <p className="whitespace-pre-wrap rounded bg-bg-card px-2 py-1.5 font-mono text-sm text-text-primary">{text || '—'}</p>
                  <p className="text-[11px] text-text-dim">
                    실제 보내는 문장: {engine === 'elevenlabs'
                      ? buildEleText(text, { emotionEnabled: emotions.length > 0, emotions, trailEnabled: trail })
                      : text}
                  </p>

                  <div className="flex items-center gap-2">
                    {gen.generating ? (
                      <button type="button" onClick={gen.handleCancelGenerate}
                        className="rounded border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover">
                        만드는 중… 취소
                      </button>
                    ) : (
                      <>
                        <button type="button" onClick={() => runGenerate(false)}
                          disabled={!voiceId.trim() || !text.trim()}
                          className="rounded bg-accent px-3 py-1.5 text-sm font-semibold text-bg-primary hover:opacity-90 disabled:bg-bg-card disabled:text-text-secondary disabled:opacity-40">
                          생성 (들어보고 저장)
                        </button>
                        <button type="button" onClick={() => runGenerate(true)}
                          disabled={!voiceId.trim() || !text.trim()}
                          className="rounded border border-border px-3 py-1.5 text-sm text-text-secondary hover:bg-bg-hover disabled:opacity-40">
                          생성·바로 저장
                        </button>
                      </>
                    )}
                  </div>

                  {/* 아직 저장하지 않은 음원 */}
                  {previewHere && gen.tempPreview && (
                    <div className="space-y-2 rounded border border-indigo-500/30 bg-indigo-500/5 p-2">
                      <div className="flex items-center gap-2">
                        <audio src={gen.tempPreview.blobUrl} controls className="h-8 flex-1" />
                        <button type="button" onClick={() => gen.handleSavePreview()}
                          disabled={gen.trimSaving}
                          className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50">
                          {gen.trimSaving ? '저장 중…' : '저장'}
                        </button>
                        <button type="button"
                          onClick={() => {
                            URL.revokeObjectURL(gen.tempPreview!.blobUrl)
                            gen.setTempPreview(null)
                          }}
                          className="rounded border border-border px-2 py-1.5 text-xs text-text-secondary hover:bg-bg-hover">
                          버리기
                        </button>
                      </div>
                      <p className="font-mono text-[10px] text-text-tertiary">
                        {gen.tempPreview.duration.toFixed(2)}초 · {(gen.tempPreview.base64.length * 0.75 / 1024).toFixed(0)}KB
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {mode === 'breath' && (
            asset.file && asset.wavUrl
              ? (
                <BreathModeContent
                  series="celebs"
                  name={celebKey}
                  file={asset.file}
                  onRefresh={() => { setReloadTick(Date.now()); onSaved() }}
                  endpoints={breathEndpoints}
                />
              )
              : (
                <div className="px-1 py-2 text-xs text-text-dim">
                  {asset.loading ? '음원을 읽는 중…' : '저장된 음원이 없다. 「만들기」에서 먼저 음원을 만든다.'}
                </div>
              )
          )}

          {error && <div className="text-xs text-danger-text">{error}</div>}
        </div>
      )}
    </VoiceEditorShell>
  )
}
