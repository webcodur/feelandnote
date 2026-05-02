'use client'

import { useEffect, useMemo, useState } from 'react'
import type { EpisodeData } from '../EpisodeEditor'
import type { VoiceFile, VoiceSection, EngineKind, SegmentEngineSpec } from '../voice-utils'
import { encodeWAV, abToBase64, resolveSegmentEngine, engineSlotPrefix } from '../voice-utils'
import { AudioWavePlayer } from '../AudioWavePlayer'
import {
  type EleSettings,
  type EleSendOpts,
  type VoiceMeta,
  BTN_ELE,
  BTN_SM,
  GEMINI_VOICES_MALE,
  GEMINI_VOICES_FEMALE,
  buildEleText,
} from './types'
import { getTextsForSection, prodFile, sectionVoicePath, readSegmentVoiceMeta } from './utils'
import { ElePreviewPanel } from './ElePreviewPanel'
import { SyncModeContent } from './SyncModeContent'
import { EngineIndicator } from './EngineIndicator'
import { VoiceMetaEditor } from './VoiceMetaEditor'

const BTN_GEM = `${BTN_SM} bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30`

// ── ExpandedVoicePanel ──

type ExpandedVoicePanelProps = {
  sectionKey: string
  section: VoiceSection
  episode: EpisodeData
  series: string
  name: string
  voiceId?: string
  eleSettings: EleSettings
  eleSendOpts: EleSendOpts
  onEleSendOptsChange: (o: EleSendOpts) => void
  activeEngine: string
  onToggleSlot: (key: string, engine: string) => void
  onEpisodeChange: (ep: EpisodeData) => void
  onSave: (data: EpisodeData) => Promise<unknown>
  onRefresh: () => void
}

type TempPreview = {
  engine: EngineKind
  key: string
  blobUrl: string
  base64: string
  duration: number
  /** 'wav' | 'mp3' — Gemini는 wav, ElevenLabs preview는 mp3 */
  format: 'wav' | 'mp3'
}

export function ExpandedVoicePanel({
  sectionKey: secKey, section, episode, series, name,
  eleSettings, eleSendOpts, activeEngine,
  onToggleSlot, onEpisodeChange, onSave, onRefresh,
}: ExpandedVoicePanelProps) {
  const [expandMode, setExpandMode] = useState<'trim' | 'sync'>('trim')
  const [trimStart, setTrimStart] = useState(0)
  const engineFile: Record<string, VoiceFile | undefined> = { gemini: section.gemini, elevenlabs: section.elevenlabs, common: section.common }
  const activeFile = engineFile[activeEngine] ?? prodFile(section)
  const [trimEnd, setTrimEnd] = useState(() => activeFile?.duration ?? 0)
  const [trimSaving, setTrimSaving] = useState(false)
  const sectionTexts = useMemo(() => getTextsForSection(secKey, episode), [secKey, episode])
  const [ttsText, setTtsText] = useState(() => sectionTexts.tts || sectionTexts.original)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tempPreview, setTempPreview] = useState<TempPreview | null>(null)

  // ── 엔진 결정 ──
  const engineSpec = useMemo(() => resolveSegmentEngine(secKey, episode), [secKey, episode])
  const hasTempPreview = tempPreview?.key === secKey
  const previewEngine = tempPreview?.engine ?? null

  // ── segment별 voice 메타 (ELE 전용 — 감정 태그·trail) ──
  const segmentPath = useMemo(() => sectionVoicePath(secKey, episode), [secKey, episode])
  const segmentMeta = useMemo(() => readSegmentVoiceMeta(episode, segmentPath), [episode, segmentPath])
  const effectiveOpts: EleSendOpts = useMemo(() => ({
    emotionEnabled: (segmentMeta?.tags?.length ?? 0) > 0 ? true : eleSendOpts.emotionEnabled,
    emotions: segmentMeta?.tags && segmentMeta.tags.length > 0 ? segmentMeta.tags : eleSendOpts.emotions,
    trailEnabled: typeof segmentMeta?.trail === 'boolean' ? segmentMeta.trail : eleSendOpts.trailEnabled,
  }), [segmentMeta, eleSendOpts])
  const [metaSaving, setMetaSaving] = useState(false)
  const [metaError, setMetaError] = useState<string | null>(null)

  const handleSegmentMetaChange = async (next: VoiceMeta) => {
    if (!segmentPath) return
    // 낙관적 업데이트 — episode 객체 깊은 set
    const ep = JSON.parse(JSON.stringify(episode)) as typeof episode
    const segs: Array<string | number> = []
    let i = 0
    while (i < segmentPath.length) {
      if (segmentPath[i] === '.') { i++; continue }
      if (segmentPath[i] === '[') {
        const close = segmentPath.indexOf(']', i)
        segs.push(Number(segmentPath.slice(i + 1, close)))
        i = close + 1
        continue
      }
      let j = i
      while (j < segmentPath.length && segmentPath[j] !== '.' && segmentPath[j] !== '[') j++
      segs.push(segmentPath.slice(i, j))
      i = j
    }
    let cur: any = ep
    for (let k = 0; k < segs.length - 1; k++) {
      if (cur[segs[k]] === undefined || cur[segs[k]] === null) {
        cur[segs[k]] = typeof segs[k + 1] === 'number' ? [] : {}
      }
      cur = cur[segs[k]]
    }
    const last = segs[segs.length - 1]
    const isEmpty = !next.tags?.length && typeof next.trail !== 'boolean' && !next.emphasis?.length
    if (isEmpty) delete cur[last]
    else cur[last] = next
    onEpisodeChange(ep)

    setMetaSaving(true)
    setMetaError(null)
    try {
      const res = await fetch(`/api/${series}/voice/meta/${name}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: segmentPath, value: next, locale: 'both' }),
      })
      const data = await res.json()
      if (!data.success) setMetaError(data.error ?? 'voice 메타 저장 실패')
    } catch (e) {
      setMetaError(String(e))
    } finally {
      setMetaSaving(false)
    }
  }

  // ── shorts segment 식별 (geminiVoice·style 편집용) ──
  const segmentLocator = useMemo(() => {
    const m = secKey.match(/^shorts-(\d+)\/S\d{2}-(.+)$/)
    if (!m) return null
    return { shortsIndex: parseInt(m[1], 10), segmentId: m[2] }
  }, [secKey])

  // segment 필드 편집 (geminiVoice·style) — 낙관적 업데이트 + 디스크 PATCH
  const handleSegmentFieldChange = async (field: 'geminiVoice' | 'style', value: string | undefined) => {
    if (!segmentLocator) return
    const { shortsIndex, segmentId } = segmentLocator
    const ep = JSON.parse(JSON.stringify(episode)) as EpisodeData
    const arr = Array.isArray(ep.shorts) ? ep.shorts : []
    const target = arr[shortsIndex - 1]?.segments?.find((s: { id: string }) => s.id === segmentId)
    if (!target) return
    const t = target as Record<string, unknown>
    if (value === undefined || value === '') delete t[field]
    else t[field] = value
    onEpisodeChange(ep)
    try {
      await fetch(`/api/${series}/episodes/${name}/segment`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shortsIndex, segmentId, segment: target }),
      })
    } catch (e) {
      setError(`segment 저장 실패: ${String(e)}`)
    }
  }

  // 스타일 입력 — 로컬 state로 묶고 blur 시 저장 (매 키스트로크 디스크 쓰기 방지)
  const [styleEdit, setStyleEdit] = useState<string>(engineSpec?.stylePrefix ?? '')
  useEffect(() => { setStyleEdit(engineSpec?.stylePrefix ?? '') }, [engineSpec?.stylePrefix])

  // ── 송신 텍스트 (엔진별 prefix 결합) ──
  const sendText = useMemo(() => {
    if (!engineSpec) return ttsText
    if (engineSpec.engine === 'elevenlabs') return buildEleText(ttsText, effectiveOpts)
    return engineSpec.stylePrefix ? `${engineSpec.stylePrefix}: ${ttsText}` : ttsText
  }, [engineSpec, ttsText, effectiveOpts])

  // ── 미리듣기 생성 (엔진 분기) ──
  const handleGenerate = async (spec: SegmentEngineSpec, key: string, text: string) => {
    if (!text.trim()) return
    setGenerating(true)
    setError(null)
    try {
      let res: Response
      let format: 'wav' | 'mp3'
      if (spec.engine === 'elevenlabs') {
        res = await fetch(`/api/${series}/voice/elevenlabs/preview`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voiceId: spec.voiceParam, text: buildEleText(text, effectiveOpts), settings: eleSettings }),
        })
        format = 'mp3'
      } else {
        const styled = spec.stylePrefix ? `${spec.stylePrefix}: ${text}` : text
        res = await fetch(`/api/${series}/voice/gemini/preview`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voiceName: spec.voiceParam, text: styled }),
        })
        format = 'wav'
      }
      const data = await res.json()
      if (!data.success) { setError(data.error ?? '생성 실패'); return }
      const rawBytes = Uint8Array.from(atob(data.base64), c => c.charCodeAt(0))
      const mime = format === 'wav' ? 'audio/wav' : 'audio/mpeg'
      const blob = new Blob([rawBytes], { type: mime })
      const blobUrl = URL.createObjectURL(blob)
      const duration = await new Promise<number>((resolve, reject) => {
        const a = new Audio(blobUrl)
        a.addEventListener('loadedmetadata', () => resolve(a.duration), { once: true })
        a.addEventListener('error', () => reject(new Error('audio load failed')), { once: true })
      })
      if (tempPreview) URL.revokeObjectURL(tempPreview.blobUrl)
      setTempPreview({ engine: spec.engine, key, blobUrl, base64: data.base64, duration, format })
      setTrimStart(0)
      setTrimEnd(duration)
    } catch (e) {
      setError(String(e))
    } finally {
      setGenerating(false)
    }
  }

  // ── 미리듣기 저장 (엔진별 슬롯 폴더 분기) ──
  const handleSavePreview = async (key: string) => {
    if (!tempPreview || tempPreview.key !== key) return
    setTrimSaving(true)
    try {
      const isTrimmed = trimStart > 0.01 || trimEnd < tempPreview.duration - 0.01
      let saveBase64 = tempPreview.base64
      if (isTrimmed) {
        const resp = await fetch(tempPreview.blobUrl)
        const audioCtx = new AudioContext()
        const audioBuf = await audioCtx.decodeAudioData(await resp.arrayBuffer())
        const wavBuf = encodeWAV(audioBuf, trimStart, trimEnd)
        saveBase64 = abToBase64(wavBuf)
        await audioCtx.close()
      }
      const slot = engineSlotPrefix(tempPreview.engine)
      const res = await fetch(`/api/${series}/voice/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode: name, fileName: `${slot}/${key}.wav`, base64: saveBase64 }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error ?? '저장 실패'); return }
      URL.revokeObjectURL(tempPreview.blobUrl)
      setTempPreview(null)
      onRefresh()
    } catch (e) {
      setError(String(e))
    } finally {
      setTrimSaving(false)
    }
  }

  const saveTrimmed = async () => {
    const f = activeFile
    if (!f) return
    const isTrimmed = trimStart > 0.01 || (trimEnd > 0 && trimEnd < f.duration - 0.01)
    if (!isTrimmed) return
    setTrimSaving(true)
    try {
      const url = `/api/${series}/voice/play/${name}/${f.name}`
      const resp = await fetch(url)
      const audioCtx = new AudioContext()
      const audioBuf = await audioCtx.decodeAudioData(await resp.arrayBuffer())
      const wavBuf = encodeWAV(audioBuf, trimStart, trimEnd)
      const base64 = abToBase64(wavBuf)
      await audioCtx.close()
      await fetch(`/api/${series}/voice/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode: name, fileName: f.name, base64 }),
      })
      setTrimStart(0)
      setTrimEnd(trimEnd - trimStart)
      onRefresh()
    } catch (e) {
      alert('트림 저장 실패: ' + String(e))
    } finally {
      setTrimSaving(false)
    }
  }

  const engines: { label: string; color: string; borderActive: string; slot: string; file?: VoiceFile }[] = [
    { label: 'GEM', color: 'text-blue-400', borderActive: 'border-blue-400/40', slot: 'gemini', file: section.gemini },
    { label: 'ELE', color: 'text-purple-400', borderActive: 'border-purple-400/40', slot: 'elevenlabs', file: section.elevenlabs },
    { label: 'CMN', color: 'text-green-400', borderActive: 'border-green-400/40', slot: 'common', file: section.common },
  ].filter(e => e.file)
  const activeLabel = engines.find(e => e.slot === activeEngine)?.label ?? '—'
  const activeDur = activeFile?.duration ?? 0
  const trimmed = !!activeFile && (trimStart > 0.01 || (trimEnd > 0 && trimEnd < activeFile.duration - 0.01))

  return (
    <div className="space-y-3" onClick={e => e.stopPropagation()}>
      {/* TRIM | SYNC tabs */}
      <div className="flex items-center gap-1">
        <button onClick={() => setExpandMode('trim')}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${expandMode === 'trim' ? 'bg-accent text-bg-main' : 'bg-bg-main border border-border text-text-secondary hover:bg-bg-hover'}`}>
          TRIM
        </button>
        <button onClick={() => setExpandMode('sync')}
          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${expandMode === 'sync' ? 'bg-accent text-bg-main' : 'bg-bg-main border border-border text-text-secondary hover:bg-bg-hover'}`}>
          SYNC
        </button>
      </div>

      {/* Engine indicators */}
      <EngineIndicator section={section} episode={episode} activeEngine={activeEngine} onToggle={onToggleSlot} />

      {/* SYNC mode */}
      {expandMode === 'sync' && (
        <SyncModeContent
          secKey={secKey} episode={episode} episodeData={episode}
          series={series} name={name}
          onEpisodeChange={onEpisodeChange} onSave={onSave} onRefresh={onRefresh}
        />
      )}

      {/* TRIM mode */}
      {expandMode === 'trim' && (<>
        {/* 상태 표시줄 */}
        <div className="flex items-center gap-3 text-[11px] text-text-secondary">
          <span>엔진 {engines.length}개</span>
          <span className="text-text-dim">·</span>
          <span>활성 <span className="text-accent font-semibold">{activeLabel}</span> / {activeDur.toFixed(2)}초</span>
          {trimmed && <span className="text-amber-400">트림 {trimStart.toFixed(2)}s–{trimEnd.toFixed(2)}s ({(trimEnd - trimStart).toFixed(2)}s)</span>}
          {trimSaving && <span className="text-amber-400">저장 중...</span>}
          {generating && (
            <span className={engineSpec?.engine === 'gemini' ? 'text-blue-300' : 'text-purple-300'}>
              {engineSpec?.engine === 'gemini' ? 'GEM' : 'ELE'} 생성 중...
            </span>
          )}
        </div>

        {/* TTS 텍스트 (임시 — 음원 생성 전용, 저장되지 않음) */}
        {sectionTexts.original && (
          <div className="space-y-1">
            <div className="text-[11px] text-text-dim">TTS 입력 텍스트 <span className="text-accent">(임시)</span></div>
            <textarea
              value={ttsText}
              onChange={e => setTtsText(e.target.value)}
              onKeyDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              rows={Math.min(6, Math.max(2, Math.ceil((ttsText || '').length / 90)))}
              placeholder="tts.replace 자동 적용. 수동 편집 시 이 텍스트로 음원 생성"
              className="w-full bg-bg-main border border-border rounded px-3 py-2 text-sm text-text-secondary resize-y focus:outline-none focus:border-accent select-text"
            />
          </div>
        )}

        {/* 트림 액션 — trim 상태에 맞춰 상단 노출 */}
        {activeFile && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={saveTrimmed}
              disabled={trimSaving || !trimmed}
              className="px-3 py-1 rounded bg-amber-500 text-bg-main text-xs font-semibold hover:bg-amber-400 disabled:opacity-40"
            >
              {trimSaving ? '저장 중...' : trimmed ? '트림 저장' : '트림 저장 (구간 선택 필요)'}
            </button>
            <button
              onClick={() => { setTrimStart(0); setTrimEnd(activeFile.duration) }}
              disabled={!trimmed}
              className="px-3 py-1 rounded text-xs bg-bg-card border border-border hover:bg-bg-hover text-text-secondary disabled:opacity-40"
            >
              초기화
            </button>
            <span className="text-[11px] text-text-dim">파형 양끝을 드래그해 구간을 지정하세요.</span>
          </div>
        )}

        {/* Waveforms per engine */}
        {engines.length > 0 && (
          <div className="bg-bg-main rounded p-3 space-y-2">
            <div className="text-[11px] text-text-dim">엔진별 파형 ({engines.length}개)</div>
            {engines.map(eng => {
              const url = `/api/${series}/voice/play/${name}/${eng.file!.name}`
              const isActive = activeEngine === eng.slot
              const engDur = eng.file!.duration
              const engHasTrim = trimStart > 0.01 || (trimEnd > 0 && trimEnd < engDur - 0.01)
              return (
                <div
                  key={eng.label}
                  className={`rounded border p-2 transition-colors ${isActive ? `bg-bg-card ${eng.borderActive}` : 'bg-bg-card/40 border-border/40 opacity-70 hover:opacity-100'}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold ${eng.color}`}>{eng.label}</span>
                    <span className="text-[10px] text-text-dim font-mono">{engDur.toFixed(2)}s</span>
                    {isActive && <span className="text-[9px] text-accent font-semibold ml-auto">ACTIVE</span>}
                  </div>
                  <AudioWavePlayer
                    audioUrl={url}
                    duration={engDur}
                    heightClass="h-14"
                    showRuler={isActive}
                    onTrimEnd={(t) => setTrimEnd(t)}
                    trimStart={engHasTrim ? trimStart : undefined}
                    trimEnd={engHasTrim ? trimEnd : undefined}
                  />
                </div>
              )
            })}
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
          />
        )}

        {/* Generate area — ElevenLabs */}
        {engineSpec?.engine === 'elevenlabs' && !hasTempPreview && (
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

            {/* 합성 송신 텍스트 미리보기 */}
            <div className="text-[10px] text-text-dim font-mono break-all">
              송신: <span className="text-text-secondary">{sendText.slice(0, 200)}{sendText.length > 200 ? '…' : ''}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleGenerate(engineSpec, secKey, ttsText)}
                disabled={generating}
                className={BTN_ELE}
              >
                {generating ? 'ELE 생성 중...' : 'ELE 생성'}
              </button>
              <span className="text-[11px] text-text-dim">현재 TTS 텍스트로 ElevenLabs 음원을 미리 생성합니다.</span>
            </div>
          </div>
        )}

        {/* Generate area — Gemini 캐릭터 보이스 */}
        {engineSpec?.engine === 'gemini' && !hasTempPreview && segmentLocator && (
          <div className="space-y-2">
            {/* 캐릭터 보이스 선택 — segment.geminiVoice 즉시 저장 */}
            <div className="flex items-center gap-2 px-1 flex-wrap">
              <span className="text-[11px] text-text-secondary shrink-0">캐릭터 보이스</span>
              <select
                value={engineSpec.voiceParam}
                onChange={e => handleSegmentFieldChange('geminiVoice', e.target.value || undefined)}
                title="Gemini 보이스 선택 — segment.geminiVoice 즉시 저장"
                className="text-[11px] bg-bg-card border border-border/40 rounded px-2 py-0.5 cursor-pointer text-blue-300 font-mono"
              >
                <optgroup label="남성">
                  {GEMINI_VOICES_MALE.map(v => <option key={v} value={v}>{v}</option>)}
                </optgroup>
                <optgroup label="여성">
                  {GEMINI_VOICES_FEMALE.map(v => <option key={v} value={v}>{v}</option>)}
                </optgroup>
              </select>
            </div>

            {/* 스타일 prefix 편집 — blur 시 저장 */}
            <div className="flex items-center gap-2 px-1">
              <span className="text-[11px] text-text-secondary shrink-0">스타일</span>
              <input
                type="text"
                value={styleEdit}
                onChange={e => setStyleEdit(e.target.value)}
                onBlur={() => {
                  const cur = engineSpec.stylePrefix ?? ''
                  if (styleEdit !== cur) handleSegmentFieldChange('style', styleEdit || undefined)
                }}
                onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                placeholder="(예: 낮고 간절하게, 속삭이듯)"
                title="발화 스타일 — Gemini TTS 앞에 붙어 어조 지시. 입력 후 포커스 이탈 시 저장."
                className="text-[11px] bg-bg-card border border-border/40 rounded px-2 py-0.5 flex-1 text-text-secondary"
              />
            </div>

            {/* 합성 송신 텍스트 미리보기 */}
            <div className="text-[10px] text-text-dim font-mono break-all px-1">
              송신: <span className="text-text-secondary">{sendText.slice(0, 200)}{sendText.length > 200 ? '…' : ''}</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => handleGenerate(engineSpec, secKey, ttsText)}
                disabled={generating}
                className={BTN_GEM}
              >
                {generating ? 'GEM 생성 중...' : 'GEM 생성'}
              </button>
              <span className="text-[11px] text-text-dim">현재 TTS 텍스트로 Gemini 캐릭터 보이스 음원을 미리 생성합니다.</span>
            </div>
          </div>
        )}

        {/* 단일 생성 미지원 안내 — 나레이터/요약 등 도구막대 일괄 생성 대상 */}
        {!engineSpec && !hasTempPreview && (
          <div className="text-[11px] text-text-dim px-1">
            이 segment는 편집기 안에서 단일 생성을 지원하지 않습니다. 위쪽 도구막대에서 일괄 생성으로 갱신하세요.
          </div>
        )}

        {error && <div className="text-xs text-danger-text">{error}</div>}
      </>)}
    </div>
  )
}
