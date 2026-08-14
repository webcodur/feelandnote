import { useEffect } from 'react'
import type { SegmentEngineSpec } from '@feelandnote/shared/bo/voice-utils'
import {
  type EleSendOpts,
  type VoiceMeta,
  BTN_ELE,
  BTN_SM,
  GEMINI_VOICES_MALE,
  GEMINI_VOICES_FEMALE,
} from '../../types'
import { ElePreviewPanel } from '../../ElePreviewPanel'
import { VoiceMetaEditor } from '../../VoiceMetaEditor'
import type { GenEngine, TempPreview } from '@feelandnote/shared/bo/voice-utils'
import { BTN_GEM } from '../types'
import type { EngineKind } from '@feelandnote/shared/bo/voice-utils'

type SegmentLocator = { shortsIndex: number; segmentId: string } | null

type GenerateSectionProps = {
  secKey: string
  sectionTexts: { original: string; tts: string }
  overrideText?: string
  ttsText: string
  setTtsText: (v: string) => void
  chosenEngine: GenEngine
  setChosenEngine: (e: GenEngine) => void
  generating: boolean
  handleCancelGenerate: () => void
  engineSpec: SegmentEngineSpec | null
  /** 서재탐방 실제 인물 대사일 때 ELE만 허용. 다른 시리즈는 기존 선택을 유지한다. */
  personVoice?: boolean
  eleSpec: SegmentEngineSpec | null
  geminiSpec: SegmentEngineSpec
  activeSpec: SegmentEngineSpec | null
  voiceOverride?: { value: string; onChange: (v: string) => void } | null
  segmentLocator: SegmentLocator
  handleSegmentFieldChange: (field: 'geminiVoice' | 'style', value: string | undefined) => void
  styleEdit: string
  setStyleEdit: (v: string) => void
  handleLongformStyleChange: (value: string) => void
  hasTempPreview: boolean
  tempPreview: TempPreview | null
  previewEngine: EngineKind | null
  handleSavePreview: (key: string) => void
  trimSaving: boolean
  setTempPreview: (p: TempPreview | null) => void
  handleGenerate: (spec: SegmentEngineSpec, key: string, text: string, opts?: { saveImmediately?: boolean }) => void
  /** 저장된 음원이 마음에 들 때 눌러 발화시각 정렬을 실행 (on-demand). 미지정이면 정렬 버튼 숨김. */
  onAlign?: () => void
  /** 정렬 실행 중 여부 — 버튼 로딩 표시 */
  aligning?: boolean
  /** 정렬 가능 여부 — 저장된 음원이 있을 때만 활성 */
  canAlign?: boolean
  segmentPath: string | null
  segmentMeta: VoiceMeta | undefined
  metaSaving: boolean
  metaError: string | null
  handleSegmentMetaChange: (next: VoiceMeta) => void
  eleSendOpts: EleSendOpts
  /** 미리듣기 재생 배속 (선택) — 세력도감 인물 배속을 미리듣기에 반영. 미지정이면 1배속. */
  previewPlaybackRate?: number
  /** 미리듣기 음량 dB 게인 (선택) — 세력도감 인물 게인을 미리듣기에 반영. 미지정이면 0dB. */
  previewGainDb?: number
  /** 엔진 선택 드롭다운을 이 섹션에서 숨긴다 (선택) — 호출 측이 엔진 선택을 상단에 따로 둘 때. 미지정이면 표시(기존 동작). */
  hideEngineSelect?: boolean
  /** 즉시 저장 결과가 나타나는 위치. 지정하면 미리듣기와 저장 버튼의 차이를 버튼 문구에 드러낸다. */
  saveTargetLabel?: string
}

export function GenerateSection({
  secKey, sectionTexts, overrideText, ttsText, setTtsText,
  chosenEngine, setChosenEngine, generating, handleCancelGenerate,
  engineSpec, personVoice = false, eleSpec, geminiSpec, activeSpec,
  voiceOverride, segmentLocator, handleSegmentFieldChange,
  styleEdit, setStyleEdit, handleLongformStyleChange,
  hasTempPreview, tempPreview, previewEngine, handleSavePreview, trimSaving, setTempPreview,
  handleGenerate, segmentPath, segmentMeta, metaSaving, metaError,
  handleSegmentMetaChange, eleSendOpts,
  previewPlaybackRate, previewGainDb, hideEngineSelect, saveTargetLabel,
  onAlign, aligning, canAlign,
}: GenerateSectionProps) {
  // Alt+1 = 생성(미리듣기) / Alt+2 = 생성 및 저장 — 입력칸에 포커스가 있어도 동작한다(Alt 조합이라 타이핑과 안 겹침).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return
      if (e.code !== 'Digit1' && e.code !== 'Digit2') return
      if (generating || hasTempPreview) return
      const spec = chosenEngine === 'elevenlabs' ? eleSpec : geminiSpec
      if (!spec) return
      e.preventDefault()
      handleGenerate(spec, secKey, ttsText, e.code === 'Digit2' ? { saveImmediately: true } : undefined)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [generating, hasTempPreview, chosenEngine, eleSpec, geminiSpec, handleGenerate, secKey, ttsText])

  return (
    <section className="rounded-md border border-border bg-bg-main/40 p-4 space-y-3">
      {/* 생성 엔진 토글(세그먼티드 컨트롤) + GEM 선택 시 캐릭터 보이스 · 스타일 인라인.
          hideEngineSelect 면 엔진 드롭다운만 숨긴다(호출 측이 상단에 따로 둘 때). */}
      <div className="flex items-center gap-3 flex-wrap">
        {!hideEngineSelect && (
          <div className="inline-flex items-stretch rounded border border-border overflow-hidden shrink-0">
            <span className="px-2 flex items-center text-sm text-text-secondary bg-slate-100 text-slate-800 font-extrabold border-r border-slate-300">엔진</span>
            <select
              value={chosenEngine}
              onChange={e => setChosenEngine(e.target.value as GenEngine)}
              title="새 음원 합성에 쓸 엔진·모델. GEM 3.1은 audio tag 지원·단가 2배(GEM 슬롯 공유). ELE는 보이스 매핑 필요"
              className="h-8 text-sm bg-white border-l border-slate-300 px-3 cursor-pointer text-slate-950 font-bold focus:outline-none"
            >
              <option value="gemini" disabled={personVoice}>GEM 2.5</option>
              <option value="gemini-v3" disabled={personVoice}>GEM 3.1</option>
              <option value="elevenlabs" disabled={!eleSpec}>ELE</option>
            </select>
          </div>
        )}

        {!personVoice && chosenEngine !== 'elevenlabs' && (
          <>
            <div className="inline-flex items-stretch rounded border border-border overflow-hidden shrink-0">
              <span className="px-2 flex items-center text-sm text-text-secondary bg-slate-100 text-slate-800 font-extrabold border-r border-slate-300">캐릭터 보이스</span>
              <select
                value={geminiSpec.voiceParam}
                onChange={e => {
                  if (voiceOverride) voiceOverride.onChange(e.target.value)
                  else if (segmentLocator) handleSegmentFieldChange('geminiVoice', e.target.value || undefined)
                }}
                disabled={!segmentLocator && !voiceOverride}
                title={(segmentLocator || voiceOverride) ? '보이스 선택 적용 (솔로는 저장 버튼으로 확정)' : '쇼츠 segment 가 아니라 저장 대상이 없음'}
                className="h-8 text-sm bg-white border-l border-slate-300 px-3 cursor-pointer text-slate-950 font-bold disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none"
              >
                <optgroup label="남성">
                  {GEMINI_VOICES_MALE.map(v => <option key={v} value={v}>{v}</option>)}
                </optgroup>
                <optgroup label="여성">
                  {GEMINI_VOICES_FEMALE.map(v => <option key={v} value={v}>{v}</option>)}
                </optgroup>
              </select>
            </div>
            <div className="inline-flex items-stretch rounded border border-border overflow-hidden flex-1 min-w-[200px]">
              <span className="px-2 flex items-center text-sm text-text-secondary bg-slate-100 text-slate-800 font-extrabold border-r border-slate-300 shrink-0">스타일</span>
              <input
                type="text"
                value={styleEdit}
                onChange={e => setStyleEdit(e.target.value)}
                onBlur={() => {
                  // 쇼츠 segment는 segment.style, 롱폼 구간은 episode.voiceStyles[구간키]에 각각 저장한다.
                  const cur = geminiSpec.stylePrefix ?? ''
                  if (styleEdit === cur) return
                  if (segmentLocator) handleSegmentFieldChange('style', styleEdit || undefined)
                  else handleLongformStyleChange(styleEdit)
                }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                placeholder="예: 낮고 간절하게, 속삭이듯"
                title="발화 스타일 — 입력 후 포커스 이탈 시 저장. 비우면 기본 말투로 돌아간다."
                className="h-8 flex-1 text-sm bg-white px-3 text-slate-950 font-bold focus:outline-none border-l border-slate-300"
              />
            </div>
          </>
        )}

        {engineSpec?.engine && engineSpec.engine !== chosenEngine && (
          <span className="text-xs text-amber-300 shrink-0">
            기본 매핑({engineSpec.engine === 'gemini' ? 'Gemini' : 'ElevenLabs'})과 다름
          </span>
        )}
        {personVoice && !eleSpec && (
          <span className="text-xs text-amber-300 shrink-0">인물의 ELE 음성 ID를 먼저 설정해야 합니다.</span>
        )}
      </div>

      {/* TTS 입력 텍스트 — 라벨 + 입력란 한 박스 묶음 */}
      {(sectionTexts.original || overrideText) && (
        <div className="space-y-1">
          <div className="flex items-stretch rounded border border-border overflow-hidden">
            <span className="px-3 py-2 text-sm text-text-secondary bg-slate-100 text-slate-800 font-extrabold border-r border-slate-300 shrink-0">입력 텍스트</span>
            <textarea
              value={ttsText}
              onChange={e => setTtsText(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              rows={1}
              placeholder="tts.replace 자동 적용. 수동 편집 시 이 텍스트로 음원 생성"
              className="flex-1 bg-bg-card px-3 py-2 text-sm text-text-primary resize-y focus:outline-none select-text [field-sizing:content]"
            />
          </div>
          <div className="text-xs text-text-secondary pl-1">이 입력은 음원 생성에만 쓰이고 본문에는 저장되지 않는다.</div>
        </div>
      )}

      {/* 생성 중 — 결과 파형 자리를 미리 확보(skeleton). 완료되면 아래 미리듣기로 교체된다. */}
      {generating && !hasTempPreview && (
        <div className="rounded-md border border-border bg-bg-card/40 p-3 space-y-2">
          <div className="flex items-center gap-2 text-xs">
            <span className="font-semibold animate-pulse text-amber-300">
              {chosenEngine === 'elevenlabs' ? 'ELE' : chosenEngine === 'gemini-v3' ? 'GEM 3.1' : 'GEM 2.5'} 생성 중…
            </span>
            <button
              type="button"
              onClick={handleCancelGenerate}
              className="ml-auto px-2 py-0.5 rounded border border-red-400/50 text-red-300 hover:bg-red-500/20 font-semibold"
            >취소</button>
          </div>
          <div className="w-full h-14 rounded bg-bg-main/60 animate-pulse" />
          <div className="flex items-center gap-2">
            <button disabled className="px-2 py-0.5 rounded text-xs bg-bg-card border border-border opacity-40 cursor-not-allowed">▶ 재생</button>
            <span className="text-[10px] text-text-secondary font-mono">0.00s / 0.00s</span>
          </div>
        </div>
      )}

      {/* Temp preview (engine-aware) */}
      {hasTempPreview && tempPreview && (
        <ElePreviewPanel
          blobUrl={tempPreview.blobUrl}
          duration={tempPreview.duration}
          onSave={(e) => { e.stopPropagation(); handleSavePreview(secKey) }}
          saving={trimSaving}
          onClose={() => { URL.revokeObjectURL(tempPreview.blobUrl); setTempPreview(null) }}
          label={previewEngine === 'gemini' ? 'GEM preview' : 'ELE preview'}
          tone={previewEngine === 'gemini' ? 'blue' : 'purple'}
          autoPlay
          onRegenerate={() => { if (activeSpec) handleGenerate(activeSpec, secKey, ttsText) }}
          regenerating={generating}
          playbackRate={previewPlaybackRate}
          gainDb={previewGainDb}
        />
      )}

      {/* Generate area — ElevenLabs */}
      {chosenEngine === 'elevenlabs' && eleSpec && !hasTempPreview && (
        <div className="space-y-2">
          {/* 이 구간 전용 톤 에디터 — path가 매핑되는 셀럽 구간 한정 */}
          {segmentPath && (
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-text-secondary font-semibold">이 구간 톤</span>
                <span className="text-[10px] text-text-dim">(이 구간에만 적용 · JSON 저장)</span>
                {segmentMeta && (segmentMeta.tags?.length || typeof segmentMeta.trail === 'boolean') && (
                  <span className="text-[10px] font-mono text-purple-300">
                    [{segmentMeta.tags?.join(', ') ?? ''}{typeof segmentMeta.trail === 'boolean' ? `${segmentMeta.tags?.length ? ', ' : ''}trail=${segmentMeta.trail ? 'on' : 'off'}` : ''}] ✓
                  </span>
                )}
                {metaSaving && <span className="text-[10px] text-amber-400">저장 중...</span>}
              </div>
              <VoiceMetaEditor
                value={segmentMeta}
                onChange={handleSegmentMetaChange}
                defaults={{
                  defaultTags: eleSendOpts.emotionEnabled ? eleSendOpts.emotions : [],
                  defaultTrail: eleSendOpts.trailEnabled,
                }}
                compact
              />
              {metaError && <div className="text-[11px] text-danger-text">{metaError}</div>}
            </div>
          )}

          {/* 페이지 기본 톤 — 읽기 전용 요약. 편집은 상단 VOICE → ELEVENLABS 설정 */}
          <div className="text-[10px] text-text-dim flex items-center gap-2 px-1">
            <span>페이지 기본 톤:</span>
            <span className="font-mono text-text-secondary">
              {eleSendOpts.emotionEnabled && eleSendOpts.emotions.length > 0
                ? `[${eleSendOpts.emotions.join(', ')}]`
                : '[감정 태그 없음]'}
              {' · '}
              {eleSendOpts.trailEnabled ? 'trail=on' : 'trail=off'}
            </span>
            <span className="text-text-dim">— 이 구간 톤이 비어 있을 때 적용. 변경은 상단 VOICE 패널에서.</span>
          </div>

          <div className="flex items-stretch gap-2">
            <button
              onClick={() => eleSpec && handleGenerate(eleSpec, secKey, ttsText)}
              disabled={generating || !eleSpec}
              className={`${BTN_ELE} flex-1 disabled:opacity-50 disabled:cursor-not-allowed`}
              title="생성 후 미리듣기"
            >
              {generating ? 'ELE 생성 중…' : saveTargetLabel ? 'ELE 미리듣기 생성' : 'ELE 생성'}
              <span className="ml-2 text-[10px] font-mono opacity-70">Alt+1</span>
            </button>
            <button
              onClick={() => eleSpec && handleGenerate(eleSpec, secKey, ttsText, { saveImmediately: true })}
              disabled={generating || !eleSpec}
              className={`${BTN_SM} flex-1 bg-emerald-600 text-white border border-emerald-500/50 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed`}
              title={saveTargetLabel ? `생성 후 저장하여 ${saveTargetLabel}에 반영` : '생성 후 미리듣기 없이 바로 슬롯에 저장'}
            >
              {generating ? '처리 중…' : saveTargetLabel ? `ELE 생성·저장 → ${saveTargetLabel}` : '생성 및 저장'}
              <span className="ml-2 text-[10px] font-mono opacity-70">Alt+2</span>
            </button>
          </div>
        </div>
      )}

      {/* Generate area — Gemini(2.5/3.1). 캐릭터 보이스·스타일은 위 ENGINE 행에 인라인. */}
      {!personVoice && chosenEngine !== 'elevenlabs' && !hasTempPreview && (
        <div className="flex items-stretch gap-2">
          <button
            onClick={() => handleGenerate(geminiSpec, secKey, ttsText)}
            disabled={generating}
            className={`${BTN_GEM} flex-1`}
            title="생성 후 미리듣기"
          >
            {generating ? 'GEM 생성 중…' : saveTargetLabel ? 'GEM 미리듣기 생성' : chosenEngine === 'gemini-v3' ? 'GEM 3.1 생성' : 'GEM 2.5 생성'}
            <span className="ml-2 text-[10px] font-mono opacity-70">Alt+1</span>
          </button>
          <button
            onClick={() => handleGenerate(geminiSpec, secKey, ttsText, { saveImmediately: true })}
            disabled={generating}
            className={`${BTN_SM} flex-1 bg-emerald-600 text-white border border-emerald-500/50 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed`}
            title={saveTargetLabel ? `생성 후 저장하여 ${saveTargetLabel}에 반영` : '생성 후 미리듣기 없이 바로 슬롯에 저장'}
          >
            {generating ? '처리 중…' : saveTargetLabel ? `GEM 생성·저장 → ${saveTargetLabel}` : '생성 및 저장'}
            <span className="ml-2 text-[10px] font-mono opacity-70">Alt+2</span>
          </button>
        </div>
      )}

      {/* 발화시각 정렬 (on-demand) — 저장된 음원이 마음에 들 때 눌러 자막 타이밍을 이 음원에 맞춘다.
          매 생성마다 자동으로 돌리지 않는다(여러 번 다시 만들어보고 확정된 음원에만 적용). 분할은 유지된다. */}
      {onAlign && !hasTempPreview && (
        <div className="flex items-center gap-2 pt-1 border-t border-border/40">
          <button
            onClick={() => onAlign()}
            disabled={aligning || !canAlign}
            title={canAlign
              ? '저장된 이 음원에 맞춰 받아쓰기·발화시각 정렬을 실행합니다. 자막 분할은 그대로 유지됩니다. whisper 처리라 잠시 걸립니다.'
              : '저장된 음원이 없습니다. 먼저 「생성 및 저장」으로 음원을 만드세요.'}
            className={`${BTN_SM} bg-white border border-slate-300 text-slate-900 hover:border-accent hover:text-accent disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {aligning ? '정렬 중…' : '발화시각 정렬'}
          </button>
          <span className="text-[11px] text-text-dim">음원이 확정되면 눌러 자막 타이밍을 맞춘다 (분할 유지).</span>
        </div>
      )}

      {/* 단일 생성 미지원 안내 — 나레이터/요약 등 도구막대 일괄 생성 대상. 솔로는 GEM 단일 생성이 정상이므로 제외 */}
      {!engineSpec && !hasTempPreview && !secKey.startsWith('solo-B') && (
        <div className="text-[11px] text-text-dim px-1">
          이 행은 편집기 안에서 단일 생성을 지원하지 않는다. 위쪽 VoiceToolbar 의 일괄 생성으로 갱신하라.
        </div>
      )}
    </section>
  )
}
