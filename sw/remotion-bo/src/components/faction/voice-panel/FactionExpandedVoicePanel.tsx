'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FactionPerson } from '@/lib/faction-types'
import type { VoiceFile } from '../../voice-utils'
import type { GenEngine } from '../../scenario-voice/ExpandedVoicePanel/types'
import { DEFAULT_ELE_SEND_OPTS, ELE_EMOTIONS } from '../../scenario-voice/types'
import { GenerateSection } from '../../scenario-voice/ExpandedVoicePanel/sections/GenerateSection'
import { BreathModeContent, type BreathEndpoints } from '../../scenario-voice/BreathModeContent'
import { UiLabel } from '@/components/ui-label'
import { useFactionVoiceSpec } from './useFactionVoiceSpec'
import { useFactionVoiceGeneration } from './useFactionVoiceGeneration'
import { FactionSavedVoiceSection } from './FactionSavedVoiceSection'
import { FactionRateGainControls } from './FactionRateGainControls'
import { EleVoiceCombobox } from './EleVoiceCombobox'

/**
 * 북리커맨드 ExpandedVoicePanel 통째 복제 — 세력도 인물 1명용.
 *
 * 화면(레이아웃·섹션 구성·버튼·드롭다운·라벨·슬레이트 톤·여백)은 북리커맨드와 동일하다:
 *  - 저장된 음원 섹션(FactionSavedVoiceSection = SavedVoiceSection 복제) + 트림.
 *  - 새 음원 생성 섹션(GenerateSection 을 그대로 재사용) — 엔진 토글·캐릭터 보이스·스타일·
 *    입력 텍스트·미리듣기·생성/생성 및 저장 버튼까지 북리커맨드와 픽셀 동일.
 *
 * 세력도는 단일 대사라 북리커맨드의 SYNC/BREATH 모드(쇼츠 세그먼트 타이밍·들숨 처리)는 없다.
 * 따라서 TRIM 모드 화면만 둔다(북리커맨드도 기본이 TRIM).
 *
 * 데이터만 인물에 맞춰 교체했다:
 *  - 구간 spec → 인물 quote 음성 spec(useFactionVoiceSpec).
 *  - 저장/재생/생성 라우트 → 세력도 음원 경로(useFactionVoiceGeneration).
 *
 * 발화 스타일은 인물 quoteStyle 에 영속한다 — 입력칸 blur 시 저장되고, 미리듣기·일괄 생성·렌더가
 * 같은 스타일을 쓴다. ELE 인물은 감정/강도(quoteEleOptions)도 입력받아 미리듣기에 반영한다.
 */

type FactionExpandedVoicePanelProps = {
  person: FactionPerson
  onChange: (next: FactionPerson) => void
  series: string
  episodeName: string
  /** 이 인물 음원 파일명 (예 F01P01-quote.wav) */
  voiceFile: string
  /** 저장된 음원 메타(존재·길이) — 없으면 미저장 */
  activeFile: VoiceFile | undefined
  /** 미리듣기/트림 저장 후 음성 목록 재조회 */
  onRefresh: () => void
}

// 인물 대사는 한 줄이라 구간키가 따로 없다 — 미리듣기 캐시 키로 인물 파일명을 쓴다.
export function FactionExpandedVoicePanel({
  person, onChange, series, episodeName, voiceFile, activeFile, onRefresh,
}: FactionExpandedVoicePanelProps) {
  const secKey = voiceFile

  // error 는 양쪽 hook(spec·생성)이 공유하므로 orchestrator 가 소유한다.
  const [error, setError] = useState<string | null>(null)

  // 들숨 제거 패널 펼침 — 저장된 음원이 있을 때만 의미. 공간 절약 위해 기본 접힘.
  const [breathOpen, setBreathOpen] = useState(false)

  // ElevenLabs 워크스페이스 보이스 목록 — 북리커맨드 화자 선택처럼 드롭다운으로 고른다.
  const [eleVoices, setEleVoices] = useState<{ voice_id: string; name: string; category?: string | null }[]>([])
  const [eleVoicesLoading, setEleVoicesLoading] = useState(false)
  const [eleVoicesError, setEleVoicesError] = useState<string | null>(null)

  // BreathModeContent 의 로드·저장 라우트를 세력도 경로로 갈아끼우는 어댑터.
  // (북리커맨드는 /voice/play·/voice/save, 세력도는 /faction-voice/{episode}/...)
  const breathEndpoints: BreathEndpoints = useMemo(() => ({
    loadUrl: (s, _name, fileName) =>
      `/api/${s}/faction-voice/${encodeURIComponent(episodeName)}/${encodeURIComponent(fileName)}?t=${Date.now()}`,
    save: async (s, _name, fileName, base64) => {
      const res = await fetch(`/api/${s}/faction-voice/${encodeURIComponent(episodeName)}/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: fileName, base64 }),
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error ?? '저장 실패')
    },
  }), [episodeName])

  const spec = useFactionVoiceSpec({ person, onPersonChange: onChange })

  // Gemini 발화 스타일 — 인물 quoteStyle(spec.stylePrefix)을 초기값으로 받아 입력칸과 묶는다.
  // 매 키스트로크는 로컬 state 만 갱신하고, blur 시 GenerateSection 이 saveQuoteStyle 로 영속한다.
  const [styleEdit, setStyleEdit] = useState(spec.stylePrefix)
  // 다른 인물로 패널이 바뀌거나 저장값이 갱신되면 입력칸을 인물 quoteStyle 로 동기화.
  useEffect(() => { setStyleEdit(spec.stylePrefix) }, [spec.stylePrefix])

  // ELE 선택 시 보이스 목록을 한 번 불러온다(워크스페이스 등록 보이스 전체).
  useEffect(() => {
    if (spec.chosenEngine !== 'elevenlabs' || eleVoices.length || eleVoicesLoading) return
    setEleVoicesLoading(true)
    setEleVoicesError(null)
    fetch('/api/elevenlabs/voices')
      .then(r => r.json())
      .then(d => { if (Array.isArray(d.voices)) setEleVoices(d.voices); else setEleVoicesError(d.error ?? '목록 로드 실패') })
      .catch(e => setEleVoicesError(String(e)))
      .finally(() => setEleVoicesLoading(false))
  }, [spec.chosenEngine, eleVoices.length, eleVoicesLoading])

  const gen = useFactionVoiceGeneration({
    series, episodeName, voiceFile, activeFile,
    chosenEngine: spec.chosenEngine,
    styleEdit,
    eleOptions: spec.eleOptions,
    eleEmotions: spec.eleEmotions,
    eleTrail: spec.eleTrail,
    error, setError, onRefresh,
    // 저장된 음원 실측 길이를 인물 quoteDuration 에 기록 → 렌더가 컷 길이·음성 재생을 이 음원에 맞춘다.
    // (이 한 줄이 없으면 BO 에서 만든 음원은 길이가 비어 렌더에서 재생되지 않고 컷이 그냥 넘어간다.)
    onSaved: dur => onChange({ ...person, quoteDuration: dur }),
  })

  const hasTempPreview = gen.tempPreview?.key === secKey
  const previewEngine = gen.tempPreview?.engine ?? null

  const engineLabel = spec.chosenEngine === 'elevenlabs'
    ? 'ELE' : spec.chosenEngine === 'gemini-v3' ? 'GEM 3.1' : 'GEM 2.5'

  return (
    <div className="relative space-y-3" onClick={e => e.stopPropagation()}>
      <UiLabel ko="음성 편집 패널" code="FactionExpandedVoicePanel" />

      {/* 저장된 음원 — 디스크 wav + 트림 */}
      <FactionSavedVoiceSection
        series={series}
        episodeName={episodeName}
        activeFile={activeFile}
        engineLabel={engineLabel}
        trimStart={gen.trimStart}
        setTrimStart={gen.setTrimStart}
        trimEnd={gen.trimEnd}
        setTrimEnd={gen.setTrimEnd}
        trimSaving={gen.trimSaving}
        reloadTick={gen.reloadTick}
        saveTrimmed={gen.saveTrimmed}
        playbackRate={spec.playbackRate}
        gainDb={spec.gainDb}
      />

      {/* 배속·게인 — 엔진(GEM/ELE) 공통. 렌더(Faction audioEl)에 그대로 적용되는 값이라 항상 노출한다.
          여기서 바꾼 값은 인물 quotePlaybackRate / quoteGainDb 에 저장되고, 위 저장 음원·아래 미리듣기
          재생에도 즉시 반영된다(배속·게인을 귀로 확인 후 렌더로 넘긴다). */}
      <FactionRateGainControls
        playbackRate={spec.playbackRate}
        setPlaybackRate={spec.setPlaybackRate}
        gainDb={spec.gainDb}
        setGainDb={spec.setGainDb}
      />

      {/* 엔진 선택 — 이 값이 아래 ELE 보이스 설정·생성 동작을 좌우하므로 맨 위(설정의 기준)에 둔다.
          아래 「새 음원 생성」 섹션의 엔진 드롭다운은 hideEngineSelect 로 숨겨 중복을 없앤다. */}
      <div className="flex items-stretch rounded border border-border overflow-hidden">
        <span className="px-2 flex items-center text-sm text-text-secondary bg-slate-100 text-slate-800 font-extrabold border-r border-slate-300 shrink-0">엔진</span>
        <select
          value={spec.chosenEngine}
          onChange={e => spec.setChosenEngine(e.target.value as GenEngine)}
          onClick={e => e.stopPropagation()}
          title="음성 합성 엔진. GEM=Gemini, ELE=ElevenLabs. 이 선택에 따라 아래 보이스·옵션이 달라진다"
          className="h-8 flex-1 text-sm bg-white px-3 cursor-pointer text-slate-950 font-bold focus:outline-none"
        >
          <option value="gemini">GEM 2.5</option>
          <option value="gemini-v3">GEM 3.1</option>
          <option value="elevenlabs">ELE</option>
        </select>
      </div>

      {/* ELE 보이스 ID + 감정/강도 — 북리커맨드는 상위 VOICE 패널에서 화자별로 보유하지만, 세력도는 그
          패널이 없으므로 인물 단위로 여기서 입력받는다(데이터 연결부). ELE 선택 시에만, 북리커맨드
          ENGINE 행 입력칸과 같은 슬레이트 인라인 박스 스타일로 노출한다. */}
      {spec.chosenEngine === 'elevenlabs' && (
        <div className="space-y-2">
          {/* 보이스 콤보박스 — 드롭다운(전체 목록 + 이름 검색) + voiceId 직접 지정을 한 위젯에. */}
          <EleVoiceCombobox
            voices={eleVoices}
            value={spec.eleVoiceId}
            onChange={spec.setEleVoiceId}
            loading={eleVoicesLoading}
            error={eleVoicesError}
          />

          {/* 인물 감정/강도(quoteEleOptions) — 미리듣기·생성 호출에 settings 로 전달. 비우면 라우트 기본값. */}
          <div className="flex items-stretch rounded border border-border overflow-hidden">
            <span className="px-2 flex items-center text-sm text-text-secondary bg-slate-100 text-slate-800 font-extrabold border-r border-slate-300 shrink-0">감정·강도</span>
            <div className="flex flex-1 items-center gap-4 bg-white px-3 py-1.5">
              <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold" title="안정성. 낮을수록 표현이 강하고 변화가 크다(기본 0.5)">
                안정성
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={spec.eleOptions?.stability ?? 0.5}
                  onChange={e => spec.setEleOptions({ ...spec.eleOptions, stability: Number(e.target.value) })}
                  onClick={e => e.stopPropagation()}
                  className="w-24 accent-slate-700"
                />
                <span className="w-8 text-right font-mono text-slate-900">{(spec.eleOptions?.stability ?? 0.5).toFixed(2)}</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-slate-700 font-semibold" title="스타일 과장. 높을수록 감정·억양이 강조된다(기본 0.3)">
                스타일
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={spec.eleOptions?.style ?? 0.3}
                  onChange={e => spec.setEleOptions({ ...spec.eleOptions, style: Number(e.target.value) })}
                  onClick={e => e.stopPropagation()}
                  className="w-24 accent-slate-700"
                />
                <span className="w-8 text-right font-mono text-slate-900">{(spec.eleOptions?.style ?? 0.3).toFixed(2)}</span>
              </label>
            </div>
          </div>

          {/* 감정 태그 — 북리커맨드 EleSettingsSection 의 감정 선택 UI 이식. 태그 토글(최대 2개)·직접 입력·끝 패딩.
              본문에 "[tag1, tag2] 대사 ... ... ..." 형태로 삽입돼 미리듣기·생성에 반영된다. */}
          <div className="rounded border border-border overflow-hidden">
            <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-100 border-b border-slate-300">
              <span className="text-sm text-slate-800 font-extrabold">감정 태그</span>
              {spec.eleEmotions.length > 0 && (
                <span className="text-[11px] font-mono text-purple-700 font-black">[{spec.eleEmotions.join(', ')}]</span>
              )}
              <span className="ml-auto text-[10px] text-slate-500 font-bold">최대 2개</span>
            </div>
            <div className="flex flex-col gap-1.5 bg-white px-3 py-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {ELE_EMOTIONS.map(em => {
                  const idx = spec.eleEmotions.indexOf(em)
                  const sel = idx >= 0
                  return (
                    <button
                      key={em}
                      type="button"
                      onClick={e => { e.stopPropagation(); spec.toggleEmotion(em) }}
                      className={`px-2 py-0.5 rounded text-[11px] border ${
                        sel ? 'bg-purple-600 text-white border-purple-600 font-extrabold shadow-sm'
                            : 'bg-white border-slate-300 text-slate-900 font-bold hover:border-purple-500 hover:bg-purple-50'
                      }`}
                    >
                      {sel ? `${idx + 1}. ` : ''}{em}
                    </button>
                  )
                })}
                <input
                  type="text"
                  value={spec.emotionDraft}
                  onChange={e => spec.setEmotionDraft(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); spec.addCustomEmotion() } }}
                  placeholder="직접 입력"
                  className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs w-[110px] text-slate-950 font-bold outline-none focus:border-purple-600"
                />
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); spec.addCustomEmotion() }}
                  disabled={!spec.emotionDraft.trim()}
                  className="text-xs px-2 py-0.5 rounded border border-purple-500 text-purple-700 hover:bg-purple-100 font-black disabled:opacity-40 disabled:cursor-not-allowed"
                >+</button>
              </div>
              {/* 직접 입력으로 추가된(목록에 없는) 감정 — 칩으로 별도 표시, 클릭 시 제거 */}
              {spec.eleEmotions.some(t => !ELE_EMOTIONS.includes(t)) && (
                <div className="flex flex-wrap gap-1.5">
                  {spec.eleEmotions.filter(t => !ELE_EMOTIONS.includes(t)).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={e => { e.stopPropagation(); spec.toggleEmotion(t) }}
                      title="삭제"
                      className="text-[11px] px-2 py-0.5 rounded border bg-purple-600 text-white border-purple-600 font-extrabold flex items-center gap-1.5 shadow-sm"
                    >
                      <span>{t}</span>
                      <span className="opacity-80">×</span>
                    </button>
                  ))}
                </div>
              )}
              {/* 끝 패딩 — 기본 켜짐. 끝 음절이 잘리는 현상을 줄인다. */}
              <label className="flex items-center gap-2 cursor-pointer select-none pt-1">
                <input
                  type="checkbox"
                  checked={spec.eleTrail}
                  onChange={e => spec.setEleTrail(e.target.checked)}
                  onClick={e => e.stopPropagation()}
                  className="w-4 h-4 accent-purple-600 cursor-pointer"
                />
                <span className="text-xs text-slate-800 font-extrabold">끝 패딩 추가</span>
                <span className="text-[11px] font-mono text-slate-500 font-extrabold">... ... ...</span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* 새 음원 생성 — 북리커맨드 GenerateSection 그대로 재사용 (화면 동일) */}
      <GenerateSection
        secKey={secKey}
        sectionTexts={spec.sectionTexts}
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
        voiceOverride={spec.voiceOverride}
        // 인물은 쇼츠 세그먼트가 아니다 — 캐릭터 보이스는 voiceOverride 로 인물에 저장된다.
        segmentLocator={null}
        handleSegmentFieldChange={() => {}}
        // 스타일은 인물 quoteStyle 에 영속 — segmentLocator 가 null 이라 blur 시 longform 경로로 들어오므로
        // 그 콜백(handleLongformStyleChange)을 saveQuoteStyle 에 연결해 인물 데이터에 저장한다.
        styleEdit={styleEdit}
        setStyleEdit={setStyleEdit}
        handleLongformStyleChange={spec.saveQuoteStyle}
        hasTempPreview={hasTempPreview}
        tempPreview={gen.tempPreview}
        previewEngine={previewEngine}
        handleSavePreview={() => gen.handleSavePreview()}
        trimSaving={gen.trimSaving}
        setTempPreview={gen.setTempPreview}
        handleGenerate={gen.handleGenerate}
        // 인물은 ELE 구간 톤 JSON 경로가 없다 — 톤 에디터는 숨고, 페이지 기본 톤 요약만 표시(북리커맨드와 동일 분기).
        segmentPath={null}
        segmentMeta={undefined}
        metaSaving={false}
        metaError={null}
        handleSegmentMetaChange={() => {}}
        eleSendOpts={DEFAULT_ELE_SEND_OPTS}
        // 미리듣기 재생에도 인물 배속·게인을 반영 — 저장 음원과 같은 청취 조건으로 들어본다.
        previewPlaybackRate={spec.playbackRate}
        previewGainDb={spec.gainDb}
        // 엔진 선택은 위쪽에 따로 두었으므로 이 섹션의 엔진 드롭다운은 숨긴다(중복 제거).
        hideEngineSelect
      />

      {/* 들숨 제거 — 저장된 음원이 있을 때만. 펼침 토글로 공간 절약. 라우트만 세력도 경로로 갈아끼운다. */}
      {activeFile && (
        <div className="rounded-md border border-border bg-bg-main/40">
          <button
            type="button"
            onClick={() => setBreathOpen(v => !v)}
            className="flex w-full items-center gap-2 px-3 py-2 text-left"
            title="저장된 음원에서 들숨·잡소리 구간을 무음 처리한다 (길이·자막 타이밍 유지)"
          >
            <span className="text-xs font-semibold text-text-secondary">들숨 제거</span>
            <span className="text-[10px] text-text-dim">저장된 음원에서 숨소리를 비운다</span>
            <span className="ml-auto text-[10px] text-text-dim">{breathOpen ? '접기 ▲' : '펼치기 ▼'}</span>
          </button>
          {breathOpen && (
            <div className="border-t border-border p-2">
              <BreathModeContent
                series={series}
                name={episodeName}
                file={activeFile}
                onRefresh={onRefresh}
                endpoints={breathEndpoints}
              />
            </div>
          )}
        </div>
      )}

      {error && <div className="text-xs text-danger-text">{error}</div>}
    </div>
  )
}
