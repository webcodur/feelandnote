'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FactionPerson } from '@/lib/faction-types'
import type { VoiceFile } from '../../voice-utils'
import { DEFAULT_ELE_SEND_OPTS } from '../../scenario-voice/types'
import { GenerateSection } from '../../scenario-voice/ExpandedVoicePanel/sections/GenerateSection'
import { BreathModeContent, type BreathEndpoints } from '../../scenario-voice/BreathModeContent'
import { UiLabel } from '@/components/ui-label'
import { useFactionVoiceSpec } from './useFactionVoiceSpec'
import { useFactionVoiceGeneration } from './useFactionVoiceGeneration'
import { FactionSavedVoiceSection } from './FactionSavedVoiceSection'

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

  const gen = useFactionVoiceGeneration({
    series, episodeName, voiceFile, activeFile,
    chosenEngine: spec.chosenEngine,
    styleEdit,
    eleOptions: spec.eleOptions,
    error, setError, onRefresh,
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
      />

      {/* ELE 보이스 ID + 감정/강도 — 북리커맨드는 상위 VOICE 패널에서 화자별로 보유하지만, 세력도는 그
          패널이 없으므로 인물 단위로 여기서 입력받는다(데이터 연결부). ELE 선택 시에만, 북리커맨드
          ENGINE 행 입력칸과 같은 슬레이트 인라인 박스 스타일로 노출한다. */}
      {spec.chosenEngine === 'elevenlabs' && (
        <div className="space-y-2">
          <div className="flex items-stretch rounded border border-border overflow-hidden">
            <span className="px-2 flex items-center text-sm text-text-secondary bg-slate-100 text-slate-800 font-extrabold border-r border-slate-300 shrink-0">ELE 보이스 ID</span>
            <input
              type="text"
              value={spec.eleVoiceId}
              onChange={e => spec.setEleVoiceId(e.target.value)}
              onClick={e => e.stopPropagation()}
              placeholder="ElevenLabs voiceId — 미리듣기·저장에 사용"
              className="h-8 flex-1 text-sm bg-white px-3 text-slate-950 font-bold focus:outline-none"
            />
          </div>

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
