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
  onEpisodeChange: (ep: EpisodeData) => void
  onSave: (data: EpisodeData) => Promise<unknown>
  onRefresh: () => void
  /** 외부에서 제어되는 TRIM/SYNC 모드. 모달 헤더의 탭 버튼이 이 상태를 가짐. */
  expandMode?: 'trim' | 'sync'
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
  onEpisodeChange, onSave, onRefresh,
  expandMode = 'trim',
}: ExpandedVoicePanelProps) {
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
  // 자동 매핑은 default 추천일 뿐. 사용자가 chosenEngine 토글로 GEM/ELE 중 자유 선택.
  const engineSpec = useMemo(() => resolveSegmentEngine(secKey, episode), [secKey, episode])
  const [chosenEngine, setChosenEngine] = useState<EngineKind>(() => engineSpec?.engine ?? 'gemini')
  // secKey 가 바뀌면 자동 매핑 기본값으로 리셋
  useEffect(() => {
    if (engineSpec?.engine) setChosenEngine(engineSpec.engine)
  }, [secKey, engineSpec?.engine])
  const hasTempPreview = tempPreview?.key === secKey
  const previewEngine = tempPreview?.engine ?? null

  // chosenEngine 별로 필요한 spec 매핑 (자동 매핑이 다른 엔진이면 폴백 매핑 시도)
  const eleSpec: SegmentEngineSpec | null = useMemo(() => {
    if (engineSpec?.engine === 'elevenlabs') return engineSpec
    // 셀럽 segment 가 GEM 매핑이라 engineSpec 이 elevenlabs 가 아닌 경우, 사용자가 ELE 로 임시
    // 전환할 때의 폴백. segment.speaker → 화자 풀에서 ELE 보이스 찾기 우선, 없으면 host.
    type SpeakerLite = { id: string; engine?: 'gemini' | 'elevenlabs'; voiceId?: string; elevenlabsVoiceId?: string }
    const m = secKey.match(/^shorts-(\d+)\/S\d{2}-(.+)$/)
    const seg = m ? (() => {
      const arr = Array.isArray(episode.shorts) ? episode.shorts : []
      return arr[parseInt(m[1], 10) - 1]?.segments?.find((s: { id: string }) => s.id === m[2]) as { speaker?: string; elevenlabsVoiceId?: string } | undefined
    })() : undefined
    const speakers: SpeakerLite[] = Array.isArray((episode as { speakers?: unknown }).speakers)
      ? (episode as { speakers: SpeakerLite[] }).speakers : []
    const speakerObj = seg?.speaker ? speakers.find(sp => sp.id === seg.speaker) : undefined
    const speakerVoice = speakerObj
      ? (speakerObj.engine === 'elevenlabs' && speakerObj.voiceId ? speakerObj.voiceId : speakerObj.elevenlabsVoiceId)
      : undefined
    const fallbackId = seg?.elevenlabsVoiceId ?? speakerVoice ?? episode.host?.elevenlabsVoiceId
    if (!fallbackId) return null
    return { engine: 'elevenlabs', voiceParam: fallbackId }
  }, [engineSpec, episode, secKey])
  const geminiSpec: SegmentEngineSpec = useMemo(() => {
    if (engineSpec?.engine === 'gemini') return engineSpec
    // 사용자가 GEM 으로 임시 전환할 때의 폴백.
    // segment.geminiVoice > 화자 풀(gemini 엔진)의 voiceId > host.geminiVoice > 기본 'Kore'
    type SpeakerLite = { id: string; engine?: 'gemini' | 'elevenlabs'; voiceId?: string }
    const m = secKey.match(/^shorts-(\d+)\/S\d{2}-(.+)$/)
    const seg = m ? (() => {
      const arr = Array.isArray(episode.shorts) ? episode.shorts : []
      return arr[parseInt(m[1], 10) - 1]?.segments?.find((s: { id: string }) => s.id === m[2]) as { geminiVoice?: string; style?: string; speaker?: string } | undefined
    })() : undefined
    const speakers: SpeakerLite[] = Array.isArray((episode as { speakers?: unknown }).speakers)
      ? (episode as { speakers: SpeakerLite[] }).speakers : []
    const speakerObj = seg?.speaker ? speakers.find(sp => sp.id === seg.speaker) : undefined
    const speakerGeminiVoice = speakerObj?.engine === 'gemini' ? speakerObj.voiceId : undefined
    const voiceName = seg?.geminiVoice ?? speakerGeminiVoice ?? (episode.host as { geminiVoice?: string })?.geminiVoice ?? 'Kore'
    const stylePrefix = seg?.style ?? undefined
    return { engine: 'gemini', voiceParam: voiceName, stylePrefix }
  }, [engineSpec, episode, secKey])

  const activeSpec: SegmentEngineSpec | null = chosenEngine === 'elevenlabs' ? eleSpec : geminiSpec

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
  const [styleEdit, setStyleEdit] = useState<string>(geminiSpec.stylePrefix ?? '')
  useEffect(() => { setStyleEdit(geminiSpec.stylePrefix ?? '') }, [geminiSpec.stylePrefix])

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
  ].filter(e => e.file)
  const activeLabel = engines.find(e => e.slot === activeEngine)?.label ?? '—'
  const activeDur = activeFile?.duration ?? 0
  const trimmed = !!activeFile && (trimStart > 0.01 || (trimEnd > 0 && trimEnd < activeFile.duration - 0.01))

  return (
    <div className="space-y-3" onClick={e => e.stopPropagation()}>
      {/* TRIM | SYNC 탭은 모달 헤더로 이동. ENGINE 토글(default/override 시각화)도 헤더로 이동. */}

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
        {/* 저장된 음원 — 디스크 wav + 트림 */}
        <section className="rounded-md border border-border bg-bg-main/40 p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-sm font-semibold text-text-primary">저장된 음원</h3>
            <span className="text-xs text-text-secondary">양끝 드래그로 구간 선택</span>
            <div className="ml-auto flex items-center gap-3 text-xs text-text-secondary">
              <span>슬롯 {engines.length}</span>
              <span className="text-border">·</span>
              <span>현재 <span className="text-text-primary font-semibold">{activeLabel}</span></span>
              <span className="text-border">·</span>
              <span>길이 {activeDur.toFixed(2)}초</span>
              {trimmed && (
                <>
                  <span className="text-border">·</span>
                  <span className="text-amber-300">선택 {trimStart.toFixed(2)}–{trimEnd.toFixed(2)} ({(trimEnd - trimStart).toFixed(2)}초)</span>
                </>
              )}
              {trimSaving && <span className="text-amber-400 animate-pulse">저장 중…</span>}
            </div>
          </div>

          {/* 트림 액션 — 한 묶음(저장 + 초기화) */}
          {activeFile && (
            <div
              role="group"
              className="inline-flex items-stretch rounded border border-border overflow-hidden"
            >
              <button
                onClick={saveTrimmed}
                disabled={trimSaving || !trimmed}
                className="px-3 py-1.5 bg-accent text-bg-primary text-sm font-semibold hover:opacity-90 disabled:opacity-40 disabled:bg-bg-card disabled:text-text-secondary"
              >
                {trimSaving ? '저장 중…' : trimmed ? '트림 저장' : '트림 저장 (구간 선택 필요)'}
              </button>
              <button
                onClick={() => { setTrimStart(0); setTrimEnd(activeFile.duration) }}
                disabled={!trimmed}
                className="px-3 py-1.5 text-sm bg-bg-card hover:bg-bg-hover text-text-secondary border-l border-border disabled:opacity-40"
              >
                초기화
              </button>
            </div>
          )}

          {/* Waveforms per engine */}
          {engines.length === 0 ? (
            <div className="text-sm text-text-secondary italic px-1 py-2">아직 저장된 음원이 없다. 아래 「새 음원 생성」 에서 만든다.</div>
          ) : (
            <div className="space-y-2">
              {engines.map(eng => {
              const url = `/api/${series}/voice/play/${name}/${eng.file!.name}`
              const isActive = activeEngine === eng.slot
              const engDur = eng.file!.duration
              const engHasTrim = trimStart > 0.01 || (trimEnd > 0 && trimEnd < engDur - 0.01)
              return (
                <div
                  key={eng.label}
                  className={`rounded border p-2 ${isActive ? 'bg-bg-card border-border' : 'bg-bg-card/40 border-border/40 opacity-70 hover:opacity-100'}`}
                >
                  <div className="flex items-center gap-2 mb-1 text-xs">
                    <span className="font-semibold text-text-primary">{eng.label}</span>
                    <span className="text-text-secondary">{engDur.toFixed(2)}초</span>
                    {isActive && <span className="ml-auto text-accent font-semibold">사용 중</span>}
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
        </section>

        {/* 새 음원 생성 — TTS 미리듣기 → 저장 */}
        <section className="rounded-md border border-border bg-bg-main/40 p-4 space-y-3">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-sm font-semibold text-text-primary">새 음원 생성</h3>
            <span className="text-xs text-text-secondary">텍스트로 음원 합성 후 슬롯에 저장</span>
            {generating && (
              <span className="ml-auto text-xs text-amber-300 animate-pulse">
                {chosenEngine === 'gemini' ? 'Gemini' : 'ElevenLabs'} 생성 중…
              </span>
            )}
          </div>

          {/* 생성 엔진 토글(세그먼티드 컨트롤) + GEM 선택 시 캐릭터 보이스 · 스타일 인라인 */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-sm text-text-secondary w-16 shrink-0">엔진</span>
            <div
              role="group"
              className="inline-flex items-center gap-0.5 p-0.5 rounded border border-border bg-bg-main shrink-0"
              title="새 음원 합성에 쓸 엔진"
            >
              <button
                type="button"
                onClick={() => setChosenEngine('gemini')}
                className={`px-3 py-1 text-sm rounded transition-colors ${
                  chosenEngine === 'gemini'
                    ? 'bg-bg-card text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >Gemini</button>
              <button
                type="button"
                onClick={() => setChosenEngine('elevenlabs')}
                disabled={!eleSpec}
                className={`px-3 py-1 text-sm rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  chosenEngine === 'elevenlabs'
                    ? 'bg-bg-card text-text-primary shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
                title={eleSpec ? 'ElevenLabs — host/Speaker 의 voiceId 사용' : 'ElevenLabs 보이스가 매핑되지 않음 (SpeakerPanel 에서 voiceId 등록 필요)'}
              >ElevenLabs</button>
            </div>

            {chosenEngine === 'gemini' && (
              <>
                <div className="inline-flex items-stretch rounded border border-border overflow-hidden shrink-0">
                  <span className="px-2 flex items-center text-sm text-text-secondary bg-bg-main border-r border-border">캐릭터 보이스</span>
                  <select
                    value={geminiSpec.voiceParam}
                    onChange={e => { if (segmentLocator) handleSegmentFieldChange('geminiVoice', e.target.value || undefined) }}
                    disabled={!segmentLocator}
                    title={segmentLocator ? '보이스 선택 즉시 저장' : '쇼츠 segment 가 아니라 저장 대상이 없음'}
                    className="h-8 text-sm bg-bg-card px-2 cursor-pointer text-text-primary disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none"
                  >
                    <optgroup label="남성">
                      {GEMINI_VOICES_MALE.map(v => <option key={v} value={v}>{v}</option>)}
                    </optgroup>
                    <optgroup label="여성">
                      {GEMINI_VOICES_FEMALE.map(v => <option key={v} value={v}>{v}</option>)}
                    </optgroup>
                  </select>
                </div>
                {segmentLocator && (
                  <div className="inline-flex items-stretch rounded border border-border overflow-hidden flex-1 min-w-[200px]">
                    <span className="px-2 flex items-center text-sm text-text-secondary bg-bg-main border-r border-border shrink-0">스타일</span>
                    <input
                      type="text"
                      value={styleEdit}
                      onChange={e => setStyleEdit(e.target.value)}
                      onBlur={() => {
                        const cur = geminiSpec.stylePrefix ?? ''
                        if (styleEdit !== cur) handleSegmentFieldChange('style', styleEdit || undefined)
                      }}
                      onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur() }}
                      placeholder="예: 낮고 간절하게, 속삭이듯"
                      title="발화 스타일 — 입력 후 포커스 이탈 시 저장"
                      className="h-8 flex-1 text-sm bg-bg-card px-2 text-text-primary focus:outline-none"
                    />
                  </div>
                )}
              </>
            )}

            {engineSpec?.engine && engineSpec.engine !== chosenEngine && (
              <span className="text-xs text-amber-300 shrink-0">
                기본 매핑({engineSpec.engine === 'gemini' ? 'Gemini' : 'ElevenLabs'})과 다름
              </span>
            )}
          </div>

          {/* TTS 입력 텍스트 — 라벨 + 입력란 한 박스 묶음 */}
          {sectionTexts.original && (
            <div className="space-y-1">
              <div className="flex items-stretch rounded border border-border overflow-hidden">
                <span className="px-3 py-2 text-sm text-text-secondary bg-bg-main border-r border-border shrink-0">입력 텍스트</span>
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

            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => eleSpec && handleGenerate(eleSpec, secKey, ttsText)}
                disabled={generating || !eleSpec}
                className={BTN_ELE}
              >
                {generating ? 'ELE 생성 중…' : 'ELE 생성'}
              </button>
              <span className="text-[11px] text-text-dim">클릭 → 미리듣기 wav 생성. 저장은 미리듣기 패널에서.</span>
            </div>
          </div>
        )}

        {/* Generate area — Gemini. 캐릭터 보이스·스타일은 위 ENGINE 행에 인라인. */}
        {chosenEngine === 'gemini' && !hasTempPreview && (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => handleGenerate(geminiSpec, secKey, ttsText)}
              disabled={generating}
              className={BTN_GEM}
            >
              {generating ? 'GEM 생성 중…' : 'GEM 생성'}
            </button>
            <span className="text-[11px] text-text-dim">클릭 → 미리듣기 wav 생성. 저장은 미리듣기 패널에서.</span>
          </div>
        )}

          {/* 단일 생성 미지원 안내 — 나레이터/요약 등 도구막대 일괄 생성 대상 */}
          {!engineSpec && !hasTempPreview && (
            <div className="text-[11px] text-text-dim px-1">
              이 행은 편집기 안에서 단일 생성을 지원하지 않는다. 위쪽 VoiceToolbar 의 일괄 생성으로 갱신하라.
            </div>
          )}
        </section>

        {error && <div className="text-xs text-danger-text">{error}</div>}
      </>)}
    </div>
  )
}
