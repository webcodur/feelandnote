'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { EpisodeData } from './EpisodeEditor'
import type { VoiceFile, VoiceSummary, VoiceSection } from './voice-utils'
import { encodeWAV, abToBase64, isEleSection, groupBySection } from './voice-utils'
import { AudioWavePlayer } from './AudioWavePlayer'
import { VoiceTimingEditor } from './VoiceTimingEditor'

// ── Types ──

export type EleSettings = { stability: number; similarity_boost: number; style: number; speed: number; volumeBoost: number }
export type VoiceSelect = { default: string; slots?: Record<string, string> } | null

// ── Constants ──

export const DEFAULT_ELE_SETTINGS: EleSettings = { stability: 0.5, similarity_boost: 0.75, style: 0.3, speed: 1.0, volumeBoost: 0 }

const BTN_SM = 'px-2 py-0.5 rounded text-[10px] font-semibold'
const BTN_ELE = `${BTN_SM} bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30`

// ── Hook: useVoiceSelect ──

export function useVoiceSelect(series: string, name: string) {
  const [vs, setVs] = useState<VoiceSelect>(undefined as unknown as VoiceSelect)
  const [loading, setLoading] = useState(true)
  const fetchVs = useCallback(() => {
    fetch(`/api/${series}/voice/voice-select/${name}`)
      .then(r => r.json())
      .then(d => { setVs(d); setLoading(false) })
      .catch(() => { setVs(null); setLoading(false) })
  }, [series, name])
  useEffect(() => { fetchVs() }, [fetchVs])
  const saveVs = useCallback(async (next: VoiceSelect) => {
    setVs(next)
    if (next) {
      await fetch(`/api/${series}/voice/voice-select/${name}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(next),
      })
    }
  }, [series, name])
  return { vs, loading, saveVs, refetch: fetchVs }
}

// ── Utility functions ──

export function detectMode(vs: VoiceSelect, hasELVoiceId: boolean): { label: string; color: string } {
  if (!vs) return { label: 'UNSET', color: 'text-danger-text' }
  if (vs.default === 'gemini') {
    const hasELSlots = vs.slots && Object.values(vs.slots).some(v => v === 'elevenlabs')
    if (hasELSlots || hasELVoiceId) return { label: 'PROD (GEM + ELE)', color: 'text-purple-400' }
    return { label: 'PROD (GEM)', color: 'text-blue-400' }
  }
  return { label: vs.default.toUpperCase(), color: 'text-text-secondary' }
}

export function prodFile(sec: VoiceSection): VoiceFile | undefined {
  return sec.elevenlabs ?? sec.gemini ?? sec.common
}

export function getTextsForSection(key: string, ep: EpisodeData): { original: string; tts: string } {
  const ttsData = (ep as Record<string, unknown>).tts as { narrator?: Record<string, string>; host?: Record<string, string>; books?: Array<Record<string, string>> } | undefined
  const nr = ep.narrator!
  const ho = ep.host!
  const bks = ep.books!

  const directMap: Record<string, () => { original: string; tts: string }> = {
    'A1-service-greeting': () => ({ original: nr.serviceGreeting ?? '', tts: ttsData?.narrator?.serviceGreeting ?? '' }),
    'A2-service-intro': () => ({ original: nr.serviceIntro ?? '', tts: ttsData?.narrator?.serviceIntro ?? '' }),
    'A3-featured-quote': () => ({ original: ho.featuredQuote ?? '', tts: '' }),
    'B1-celeb-intro': () => ({ original: nr.celebIntro ?? '', tts: ttsData?.narrator?.celebIntro ?? '' }),
    'B2-philosophy': () => ({ original: ho.philosophy ?? '', tts: ttsData?.host?.philosophy ?? '' }),
    'E1-outro': () => ({ original: nr.outro ?? '', tts: ttsData?.narrator?.outro ?? '' }),
    'E3-return-intro': () => ({ original: nr.returnIntro ?? '', tts: '' }),
    'E4-prev-recap': () => ({ original: nr.prevRecap ?? '', tts: '' }),
  }
  if (directMap[key]) return directMap[key]()

  const bookMatch = key.match(/^D(\d{2})([a-e])-/)
  if (bookMatch) {
    const idx = parseInt(bookMatch[1]) - 1
    const phase = bookMatch[2]
    const book = bks[idx]
    const ttsBook = ttsData?.books?.[idx]
    if (!book) return { original: '', tts: '' }
    const phaseMap: Record<string, () => { original: string; tts: string }> = {
      'a': () => ({ original: [book.title, book.creator, book.stats?.publishYear].filter(Boolean).join(', '), tts: ttsBook?.title ?? '' }),
      'b': () => ({ original: book.summary, tts: ttsBook?.summary ?? '' }),
      'c': () => ({ original: book.context, tts: ttsBook?.context ?? '' }),
      'd': () => ({ original: book.directQuote ?? '', tts: ttsBook?.directQuote ?? '' }),
      'e': () => ({ original: book.contextAfter ?? '', tts: ttsBook?.contextAfter ?? '' }),
    }
    return phaseMap[phase]?.() ?? { original: '', tts: '' }
  }

  const shortMatch = key.match(/^S\d{2}-(.+)$/)
  if (shortMatch && ep.shorts) {
    const seg = ep.shorts.segments.find(s => s.id === shortMatch[1])
    return { original: seg?.text ?? '', tts: (seg as any)?.ttsText ?? '' }
  }

  return { original: '', tts: '' }
}

export function setTextForSection(key: string, field: 'original' | 'tts', value: string, ep: EpisodeData): EpisodeData {
  const next = JSON.parse(JSON.stringify(ep)) as EpisodeData & { tts?: { narrator?: Record<string, string>; host?: Record<string, string>; books?: Array<Record<string, string>> } }

  const nr = next.narrator!, ho = next.host!, bks = next.books!
  const directOriginal: Record<string, (v: string) => void> = {
    'A1-service-greeting': v => { nr.serviceGreeting = v },
    'A2-service-intro': v => { nr.serviceIntro = v },
    'A3-featured-quote': v => { ho.featuredQuote = v },
    'B1-celeb-intro': v => { nr.celebIntro = v },
    'B2-philosophy': v => { ho.philosophy = v },
    'E1-outro': v => { nr.outro = v },
    'E3-return-intro': v => { nr.returnIntro = v },
    'E4-prev-recap': v => { nr.prevRecap = v },
  }
  const directTts: Record<string, (v: string) => void> = {
    'A1-service-greeting': v => { if (!next.tts) next.tts = {}; if (!next.tts.narrator) next.tts.narrator = {}; next.tts.narrator.serviceGreeting = v },
    'A2-service-intro': v => { if (!next.tts) next.tts = {}; if (!next.tts.narrator) next.tts.narrator = {}; next.tts.narrator.serviceIntro = v },
    'B1-celeb-intro': v => { if (!next.tts) next.tts = {}; if (!next.tts.narrator) next.tts.narrator = {}; next.tts.narrator.celebIntro = v },
    'B2-philosophy': v => { if (!next.tts) next.tts = {}; if (!next.tts.host) next.tts.host = {}; next.tts.host.philosophy = v },
    'E1-outro': v => { if (!next.tts) next.tts = {}; if (!next.tts.narrator) next.tts.narrator = {}; next.tts.narrator.outro = v },
  }

  if (field === 'original' && directOriginal[key]) { directOriginal[key](value); return next }
  if (field === 'tts' && directTts[key]) { directTts[key](value); return next }

  const bookMatch = key.match(/^D(\d{2})([a-e])-/)
  if (bookMatch) {
    const idx = parseInt(bookMatch[1]) - 1
    const phase = bookMatch[2]
    if (bks[idx]) {
      const phaseFieldOriginal: Record<string, string> = { b: 'summary', c: 'context', d: 'directQuote', e: 'contextAfter' }
      if (field === 'original' && phaseFieldOriginal[phase]) {
        (bks[idx] as Record<string, unknown>)[phaseFieldOriginal[phase]] = value
      }
      if (field === 'tts') {
        if (!next.tts) next.tts = {}
        if (!next.tts.books) next.tts.books = []
        while (next.tts.books.length <= idx) next.tts.books.push({})
        const ttsField: Record<string, string> = { a: 'title', b: 'summary', c: 'context', d: 'directQuote', e: 'contextAfter' }
        if (ttsField[phase]) next.tts.books[idx][ttsField[phase]] = value
      }
    }
    return next
  }

  const shortMatch = key.match(/^S\d{2}-(.+)$/)
  if (shortMatch && next.shorts) {
    const seg = next.shorts.segments.find((s: { id: string }) => s.id === shortMatch[1])
    if (seg) {
      if (field === 'original') seg.text = value
      if (field === 'tts') (seg as any).ttsText = value
    }
    return next
  }

  return next
}

// ── Internal components ──

/** ELE preview panel with playback and save */
function ElePreviewPanel({ blobUrl, duration, onSave, saving, onClose }: {
  blobUrl: string; duration: number
  onSave: (e: React.MouseEvent) => void; saving: boolean; onClose: () => void
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [playing, setPlaying] = useState(false)
  const [eleTrimStart, setEleTrimStart] = useState(0)
  const [eleTrimEnd, setEleTrimEnd] = useState(duration)

  const togglePlay = () => {
    if (playing && audioRef.current) { audioRef.current.pause(); audioRef.current = null; setPlaying(false); return }
    const a = new Audio(blobUrl)
    audioRef.current = a
    a.currentTime = eleTrimStart
    a.onended = () => setPlaying(false)
    a.ontimeupdate = () => { if (a.currentTime >= eleTrimEnd) { a.pause(); setPlaying(false) } }
    a.play().then(() => setPlaying(true)).catch(() => {})
  }

  return (
    <div className="space-y-1.5 p-2 rounded-lg bg-purple-500/5 border border-purple-500/20">
      <div className="text-[10px] text-purple-300 font-semibold">ELE preview</div>
      <AudioWavePlayer audioUrl={blobUrl} duration={duration} heightClass="h-12" showRuler={false} />
      <div className="flex items-center gap-2">
        <button onClick={onSave} disabled={saving}
          className="px-2 py-0.5 rounded bg-purple-500 text-white text-[10px] font-semibold hover:bg-purple-400 disabled:opacity-50">
          {saving ? '저장 중...' : '저장 (WAV)'}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onClose() }}
          className="text-[10px] text-text-dim hover:text-danger-text">
          닫기
        </button>
      </div>
    </div>
  )
}

/** SYNC mode panel */
function SyncModeContent({ secKey, episode, episodeData, series, name, onEpisodeChange, onSave, onRefresh }: {
  secKey: string; episode: EpisodeData; episodeData: EpisodeData; series: string; name: string
  onEpisodeChange: (ep: EpisodeData) => void
  onSave: (data: EpisodeData) => Promise<void>
  onRefresh: () => void
}) {
  const [saving, setSaving] = useState(false)
  const segmentsRef = useRef<string[]>([])
  const timings = (episodeData.voiceTimings as any)?.[secKey] as Array<{ start: number; end: number }> | undefined
  const txts = getTextsForSection(secKey, episodeData)
  const text = txts.original
  const sentences = text.split(/(?<=[.?!,])\s+/).filter(Boolean)
  const audioUrl = `/api/${series}/voice/play/${name}/${secKey}.wav`

  if (!timings || timings.length === 0) {
    return <div className="text-xs text-text-dim">voiceTimings 없음. Voice Sync를 먼저 실행하세요.</div>
  }

  const dur = timings[timings.length - 1]?.end ?? 0

  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const segs = segmentsRef.current
    let ep = JSON.parse(JSON.stringify(episodeData)) as EpisodeData
    if (timings.length === segs.length && segs.length > 0) {
      const withText = timings.map((t, i) => ({ ...t, text: segs[i] }))
      ;(ep as any).voiceTimings = { ...((ep as any).voiceTimings ?? {}), [secKey]: withText }
    }
    if (segs.length > 0) {
      ep = setTextForSection(secKey, 'original', segs.join(' '), ep)
    }
    setSaving(true)
    await onSave(ep)
    setSaving(false)
  }

  return (
    <div className="space-y-2">
      {txts.original && (
        <div className="space-y-1">
          <div className="text-[9px] text-text-dim">원문 텍스트</div>
          <textarea
            value={txts.original}
            onChange={e => onEpisodeChange(setTextForSection(secKey, 'original', e.target.value, episodeData))}
            onKeyDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
            rows={Math.min(3, Math.max(1, Math.ceil(txts.original.length / 70)))}
            className="w-full bg-bg-main border border-border rounded px-2 py-1 text-xs text-text-secondary resize-y focus:outline-none focus:border-accent select-text"
          />
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={handleSave} disabled={saving}
          className="px-2 py-0.5 rounded bg-green-600 text-white text-[10px] font-semibold hover:bg-green-500 disabled:opacity-50">
          {saving ? '저장 중...' : '타이밍 저장'}
        </button>
        <button
          onClick={async (e) => {
            e.stopPropagation()
            setSaving(true)
            try {
              const res = await fetch(`/api/${series}/voice/analyze`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ episode: name, only: secKey + '.wav' }),
              })
              const data = await res.json()
              if (data.ok) onRefresh()
              else alert('Voice Sync 실패: ' + (data.error ?? 'unknown'))
            } catch (err) { alert('Voice Sync 에러: ' + String(err)) }
            finally { setSaving(false) }
          }}
          disabled={saving}
          className="px-2 py-0.5 rounded text-[10px] bg-bg-card border border-border hover:bg-bg-hover text-text-secondary disabled:opacity-50"
        >
          {saving ? 'Sync 중...' : 'Voice Sync'}
        </button>
        {sentences.length !== timings.length && (
          <span className="text-[10px] text-amber-400">문장 {sentences.length}개 / 타이밍 {timings.length}개</span>
        )}
      </div>
      <VoiceTimingEditor
        audioUrl={audioUrl}
        duration={dur}
        sentences={sentences}
        timings={timings}
        segmentsRef={segmentsRef}
        onChange={(newTimings) => {
          const newEp = { ...episodeData, voiceTimings: { ...(episodeData.voiceTimings as any), [secKey]: newTimings } }
          onEpisodeChange(newEp)
        }}
      />
    </div>
  )
}

// ── EngineIndicator ──

/** Compact engine status row: CMN / GEM / ELE */
export function EngineIndicator({ section, activeEngine, onToggle }: {
  section: VoiceSection
  activeEngine: string
  onToggle: (sectionKey: string, engine: string) => void
}) {
  const engines: { label: string; color: string; slot: string; file?: VoiceFile }[] = [
    { label: 'CMN', color: 'text-teal-400', slot: 'common', file: section.common },
    { label: 'GEM', color: 'text-blue-400', slot: 'gemini', file: section.gemini },
    { label: 'ELE', color: 'text-purple-400', slot: 'elevenlabs', file: section.elevenlabs },
  ]
  return (
    <div className="flex items-center gap-1 text-[10px] font-mono">
      {engines.map((eng, i) => {
        const isActive = activeEngine === eng.slot
        if (!eng.file) {
          const needed = eng.slot === 'elevenlabs' && isEleSection(section.key)
          return (
            <React.Fragment key={eng.slot}>
              {i > 0 && <span className="text-text-dim mx-0.5">|</span>}
              <span className={`${eng.color} opacity-40`}>{eng.label}</span>
              <span className={needed ? 'text-amber-500' : 'text-text-dim'}>{needed ? '○' : '-'}</span>
            </React.Fragment>
          )
        }
        return (
          <React.Fragment key={eng.slot}>
            {i > 0 && <span className="text-text-dim mx-0.5">|</span>}
            <button
              onClick={(e) => { e.stopPropagation(); onToggle(section.key, eng.slot) }}
              className={`${eng.color} hover:opacity-80 ${isActive ? 'font-bold' : 'opacity-60'}`}
              title={isActive ? `${eng.label} 선택됨` : `${eng.label} 선택`}
            >
              {eng.label} {isActive ? '◉' : '●'}
            </button>
          </React.Fragment>
        )
      })}
    </div>
  )
}

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
  onRefresh: () => void
  post: (url: string, body: unknown) => Promise<void>
}

export function VoiceToolbar({
  episode, series, name, voiceSummary, mode, hasELVoiceId,
  vs, onSaveVs, eleSettings, onEleSettingsChange, onRefresh, post,
}: VoiceToolbarProps) {
  const [engine, setEngine] = useState('gemini')
  const [role, setRole] = useState('')
  const [only, setOnly] = useState('')
  const [eleSettingsOpen, setEleSettingsOpen] = useState(false)
  const [eleBatchRunning, setEleBatchRunning] = useState(false)
  const [eleBatchStatus, setEleBatchStatus] = useState<string | null>(null)
  const hasShorts = !!episode.shorts && episode.shorts.segments.length > 0

  return (
    <details className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
      <summary className="flex items-center gap-3 px-4 py-2 cursor-pointer select-none hover:bg-bg-hover">
        <span className="text-xs font-bold tracking-widest text-accent">VOICE</span>
        <span className={`text-[10px] font-bold ${mode.color}`}>{mode.label}</span>
        <span className="text-[10px] text-text-dim ml-auto">{voiceSummary.total}파일 · {(voiceSummary.totalSizeKB / 1024).toFixed(1)}MB</span>
      </summary>
      <div className="px-4 pb-4 space-y-4 border-t border-border">

        {/* 1. Mode switch */}
        <div className="flex items-center gap-3 flex-wrap pt-3">
          <span className="text-[11px] text-text-secondary">모드:</span>
          <span className={`text-xs font-bold ${mode.color}`}>{mode.label}</span>
          <div className="flex gap-1">
            <button
              onClick={() => onSaveVs({ default: 'gemini' })}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${vs?.default === 'gemini' && !hasELVoiceId ? 'bg-blue-400/20 text-blue-400 border border-blue-400/40' : 'bg-bg-card border border-border text-text-dim hover:text-text-secondary'}`}
            >PROD (GEM)</button>
            {hasELVoiceId && (
              <button
                onClick={() => {
                  const elSlots: Record<string, string> = {}
                  if (episode.host?.philosophy) elSlots['B2-philosophy.wav'] = 'elevenlabs'
                  if (episode.host?.featuredQuote) elSlots['A3-featured-quote.wav'] = 'elevenlabs'
                  if (episode.shorts) episode.shorts.segments.forEach((s, i) => {
                    if (s.role === 'celeb') {
                      const idx = String(i + 1).padStart(2, '0')
                      elSlots[`S${idx}-${s.id}.wav`] = 'elevenlabs'
                    }
                  })
                  episode.books?.forEach((b, i) => {
                    if (b.directQuote) {
                      const bn = String(i + 1).padStart(2, '0')
                      elSlots[`D${bn}d-quote.wav`] = 'elevenlabs'
                    }
                  })
                  onSaveVs({ default: 'gemini', slots: elSlots })
                }}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold ${vs?.default === 'gemini' && hasELVoiceId && vs?.slots ? 'bg-purple-400/20 text-purple-400 border border-purple-400/40' : 'bg-bg-card border border-border text-text-dim hover:text-text-secondary'}`}
              >PROD (GEM+ELE)</button>
            )}
          </div>
        </div>

        {/* 2. Generate tools */}
        <div>
          <div className="text-[11px] text-text-secondary font-medium mb-2">생성 도구</div>
          <div className="flex flex-wrap gap-2 mb-2">
            <select value={engine} onChange={e => setEngine(e.target.value)}
              className="bg-bg-card border border-border rounded px-2 py-1 text-sm">
              <option value="gemini">Gemini</option>
            </select>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="bg-bg-card border border-border rounded px-2 py-1 text-sm">
              <option value="">전체</option>
              <option value="narrator">나레이터</option>
              <option value="summary">요약맨</option>
              <option value="celeb">셀럽</option>
            </select>
            <input placeholder="대상 (e.g. book-0-title)" value={only} onChange={e => setOnly(e.target.value)}
              className="bg-bg-card border border-border rounded px-2 py-1 text-sm w-48" />
          </div>
          <div className="flex flex-wrap gap-2 mb-2">
            <button
              onClick={() => post(`/api/${series}/voice/generate`, { episode: name, engine, role: role || undefined, only: only || undefined })}
              className="px-3 py-1 rounded text-sm font-semibold bg-accent text-bg-main hover:bg-accent-hover">
              전체 생성
            </button>
            <button
              onClick={() => post(`/api/${series}/voice/generate`, { episode: name, engine, role: role || undefined, only: only || undefined, force: false })}
              className="px-3 py-1 rounded text-sm font-semibold bg-bg-card border border-border hover:bg-bg-hover">
              누락분만 생성
            </button>
            {hasShorts && (
              <button
                onClick={() => post(`/api/${series}/voice/generate`, { episode: name, engine, role: 'shorts', only: only || undefined })}
                className="px-3 py-1 rounded text-sm font-semibold bg-bg-card border border-border hover:bg-bg-hover">
                쇼츠 음성
              </button>
            )}
          </div>
          <p className="text-[11px] text-text-dim leading-relaxed">
            Gemini TTS로 나레이터/요약맨 음성을 생성합니다. 셀럽 음성은 테이블에서 ELE 생성으로 개별 생성합니다.
          </p>
        </div>

        {/* 3. ELE settings */}
        {hasELVoiceId && (
          <div>
            <div className="flex items-center gap-2 cursor-pointer select-none" onClick={() => setEleSettingsOpen(!eleSettingsOpen)}>
              <span className="text-[11px] text-purple-300 font-medium">ELEVENLABS 설정</span>
              <span className="text-[10px] text-text-dim font-mono">{episode.host?.elevenlabsVoiceId}</span>
              <span className="text-text-dim text-xs ml-auto">{eleSettingsOpen ? '▼' : '▶'}</span>
            </div>
            {eleSettingsOpen && (
              <div className="mt-2 space-y-2 bg-bg-card rounded-lg p-3 border border-purple-500/20">
                {(['stability', 'similarity_boost', 'style', 'speed', 'volumeBoost'] as const).map(k => {
                  const cfg: Record<string, { min: number; max: number; step: number; suffix?: string }> = {
                    stability: { min: 0, max: 1, step: 0.01 },
                    similarity_boost: { min: 0, max: 1, step: 0.01 },
                    style: { min: 0, max: 1, step: 0.01 },
                    speed: { min: 0.5, max: 2, step: 0.1 },
                    volumeBoost: { min: 0, max: 12, step: 1, suffix: 'dB' },
                  }
                  const c = cfg[k]
                  return (
                    <div key={k} className="flex items-center gap-3">
                      <span className="text-[11px] text-text-secondary w-24 shrink-0">{k.replace('_', ' ')}</span>
                      <input type="range" min={c.min} max={c.max} step={c.step} value={eleSettings[k]}
                        onChange={e => onEleSettingsChange({ ...eleSettings, [k]: Number(e.target.value) })}
                        className="flex-1 h-1 accent-purple-400"
                      />
                      <span className="text-xs text-text-dim w-10 text-right font-mono">
                        {c.suffix ? `${eleSettings[k]}${c.suffix}` : eleSettings[k].toFixed(2)}
                      </span>
                    </div>
                  )
                })}
                <div className="flex items-center gap-2 pt-1 border-t border-border/50">
                  <button
                    onClick={() => onEleSettingsChange({ ...DEFAULT_ELE_SETTINGS })}
                    className="text-[10px] text-text-dim hover:text-text-secondary"
                  >기본값 복원</button>
                  <button
                    onClick={async () => {
                      if (eleBatchRunning) return
                      setEleBatchRunning(true)
                      const ho = episode.host!
                      const voId = ho.elevenlabsVoiceId!
                      const lines: { key: string; text: string }[] = []
                      if (ho.philosophy) lines.push({ key: 'B2-philosophy', text: ho.philosophy })
                      if (ho.featuredQuote) lines.push({ key: 'A3-featured-quote', text: ho.featuredQuote })
                      if (episode.shorts) episode.shorts.segments.forEach((s, i) => {
                        if (s.role === 'celeb' && s.text) lines.push({ key: `S${String(i + 1).padStart(2, '0')}-${s.id}`, text: s.text })
                      })
                      let ok = 0, fail = 0
                      for (const ln of lines) {
                        setEleBatchStatus(`${ln.key} 생성 중...`)
                        try {
                          const res = await fetch(`/api/${series}/voice/elevenlabs/preview`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ voiceId: voId, text: ln.text, settings: eleSettings }),
                          })
                          const d = await res.json()
                          if (!d.success) { fail++; continue }
                          const sr = await fetch(`/api/${series}/voice/elevenlabs/save`, {
                            method: 'POST', headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ episode: name, fileName: `elevenlabs/${ln.key}.wav`, base64: d.base64 }),
                          })
                          const sd = await sr.json()
                          if (sd.success) ok++; else fail++
                        } catch { fail++ }
                        await new Promise(r => setTimeout(r, 500))
                      }
                      setEleBatchRunning(false)
                      setEleBatchStatus(`완료: 성공 ${ok}개, 실패 ${fail}개`)
                      if (ok > 0) onRefresh()
                      setTimeout(() => setEleBatchStatus(null), 3000)
                    }}
                    disabled={eleBatchRunning}
                    className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30 disabled:opacity-50"
                  >
                    {eleBatchRunning ? '생성 중...' : 'ELE 전체 생성'}
                  </button>
                  {eleBatchStatus && <span className="text-[10px] text-text-dim">{eleBatchStatus}</span>}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </details>
  )
}

// ── ExpandedVoicePanel ──

type ExpandedVoicePanelProps = {
  sectionKey: string
  section: VoiceSection
  episode: EpisodeData
  series: string
  name: string
  voiceId?: string
  eleSettings: EleSettings
  activeEngine: string
  onToggleSlot: (key: string, engine: string) => void
  onEpisodeChange: (ep: EpisodeData) => void
  onSave: (data: EpisodeData) => Promise<void>
  onRefresh: () => void
}

export function ExpandedVoicePanel({
  sectionKey: secKey, section, episode, series, name,
  voiceId, eleSettings, activeEngine,
  onToggleSlot, onEpisodeChange, onSave, onRefresh,
}: ExpandedVoicePanelProps) {
  const [expandMode, setExpandMode] = useState<'trim' | 'sync'>('trim')
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(() => prodFile(section)?.duration ?? 0)
  const [trimSaving, setTrimSaving] = useState(false)
  const [saving, setSaving] = useState(false)
  const [eleGenerating, setEleGenerating] = useState(false)
  const [eleError, setEleError] = useState<string | null>(null)
  const [eleTempPreview, setEleTempPreview] = useState<{ key: string; blobUrl: string; base64: string; duration: number } | null>(null)

  const isEle = isEleSection(secKey) && !!voiceId
  const hasTempPreview = eleTempPreview?.key === secKey

  const handleEleGenerate = async (key: string, text: string) => {
    if (!voiceId || !text.trim()) return
    setEleGenerating(true)
    setEleError(null)
    try {
      const res = await fetch(`/api/${series}/voice/elevenlabs/preview`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId, text, settings: eleSettings }),
      })
      const data = await res.json()
      if (!data.success) { setEleError(data.error ?? '생성 실패'); return }
      const rawBytes = Uint8Array.from(atob(data.base64), c => c.charCodeAt(0))
      const blob = new Blob([rawBytes], { type: 'audio/mpeg' })
      const blobUrl = URL.createObjectURL(blob)
      const duration = await new Promise<number>((resolve, reject) => {
        const a = new Audio(blobUrl)
        a.addEventListener('loadedmetadata', () => resolve(a.duration), { once: true })
        a.addEventListener('error', () => reject(new Error('audio load failed')), { once: true })
      })
      if (eleTempPreview) URL.revokeObjectURL(eleTempPreview.blobUrl)
      setEleTempPreview({ key, blobUrl, base64: data.base64, duration })
      setTrimStart(0)
      setTrimEnd(duration)
    } catch (e) {
      setEleError(String(e))
    } finally {
      setEleGenerating(false)
    }
  }

  const handleEleSave = async (key: string) => {
    if (!eleTempPreview || eleTempPreview.key !== key) return
    setTrimSaving(true)
    try {
      const isTrimmed = trimStart > 0.01 || trimEnd < eleTempPreview.duration - 0.01
      let saveBase64 = eleTempPreview.base64
      if (isTrimmed) {
        const resp = await fetch(eleTempPreview.blobUrl)
        const audioCtx = new AudioContext()
        const audioBuf = await audioCtx.decodeAudioData(await resp.arrayBuffer())
        const wavBuf = encodeWAV(audioBuf, trimStart, trimEnd)
        saveBase64 = abToBase64(wavBuf)
        await audioCtx.close()
      }
      const res = await fetch(`/api/${series}/voice/elevenlabs/save`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode: name, fileName: `elevenlabs/${key}.wav`, base64: saveBase64 }),
      })
      const data = await res.json()
      if (!data.success) { setEleError(data.error ?? '저장 실패'); return }
      URL.revokeObjectURL(eleTempPreview.blobUrl)
      setEleTempPreview(null)
      onRefresh()
    } catch (e) {
      setEleError(String(e))
    } finally {
      setTrimSaving(false)
    }
  }

  const saveTrimmed = async () => {
    const f = prodFile(section)
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
      await fetch(`/api/${series}/voice/elevenlabs/save`, {
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

  return (
    <div className="space-y-2" onClick={e => e.stopPropagation()}>
      {/* TRIM | SYNC tabs */}
      <div className="flex items-center gap-1 mb-2">
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
      <EngineIndicator section={section} activeEngine={activeEngine} onToggle={onToggleSlot} />

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
        {/* Text editing */}
        {(() => {
          const txts = getTextsForSection(secKey, episode)
          if (!txts.original) return null
          return (
            <div className="space-y-1.5">
              <div>
                <span className="text-[9px] text-accent">TTS 오버라이드</span>
                <textarea
                  value={txts.tts}
                  onChange={e => onEpisodeChange(setTextForSection(secKey, 'tts', e.target.value, episode))}
                  onKeyDown={e => e.stopPropagation()}
                  onClick={e => e.stopPropagation()}
                  rows={Math.min(3, Math.max(1, Math.ceil((txts.tts || '').length / 60)))}
                  placeholder="발음 변환 시만 입력 (예: 18년 → 십팔 년)"
                  className="w-full bg-bg-main border border-border rounded px-2 py-1 text-[11px] text-text-dim resize-y focus:outline-none focus:border-accent select-text"
                />
              </div>
              <button
                onClick={async (e) => { e.stopPropagation(); setSaving(true); await onSave(episode); setSaving(false) }}
                disabled={saving}
                className="px-2 py-0.5 rounded bg-accent text-bg-main text-[10px] font-semibold hover:bg-accent-hover disabled:opacity-50"
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          )
        })()}

        {/* Waveforms per engine */}
        {(() => {
          const engines: { label: string; color: string; slot: string; file?: VoiceFile }[] = [
            { label: 'GEM', color: 'text-blue-400', slot: 'gemini', file: section.gemini },
            { label: 'ELE', color: 'text-purple-400', slot: 'elevenlabs', file: section.elevenlabs },
            { label: 'CMN', color: 'text-green-400', slot: 'common', file: section.common },
          ].filter(e => e.file)
          if (engines.length === 0) return null
          return engines.map(eng => {
            const url = `/api/${series}/voice/play/${name}/${eng.file!.name}`
            const isActive = activeEngine === eng.slot
            const engDur = eng.file!.duration
            const engHasTrim = trimStart > 0.01 || (trimEnd > 0 && trimEnd < engDur - 0.01)
            return (
              <div key={eng.label} className={`${isActive ? 'bg-bg-main rounded p-1.5' : 'opacity-60 hover:opacity-100 p-1.5'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] font-bold ${eng.color}`}>{eng.label}</span>
                  <span className="text-[9px] text-text-dim font-mono">{engDur.toFixed(2)}s</span>
                  {isActive && <span className="text-[8px] text-accent">ACTIVE</span>}
                </div>
                <AudioWavePlayer
                  audioUrl={url}
                  duration={engDur}
                  heightClass="h-12"
                  showRuler={isActive}
                  onTrimEnd={(t) => setTrimEnd(t)}
                  trimStart={engHasTrim ? trimStart : undefined}
                  trimEnd={engHasTrim ? trimEnd : undefined}
                />
              </div>
            )
          })
        })()}

        {/* Trim controls */}
        {(() => {
          const f = prodFile(section)
          if (!f) return null
          const isTrimmed = trimStart > 0.01 || (trimEnd > 0 && trimEnd < f.duration - 0.01)
          if (!isTrimmed) return null
          return (
            <div className="flex items-center gap-3 py-1">
              <span className="text-[10px] text-amber-400 font-mono">
                {trimStart.toFixed(2)}s – {trimEnd.toFixed(2)}s
                <span className="text-text-dim ml-1">({(trimEnd - trimStart).toFixed(2)}s)</span>
              </span>
              <button
                onClick={saveTrimmed}
                disabled={trimSaving}
                className="px-2 py-0.5 rounded bg-amber-500 text-bg-main text-[10px] font-semibold hover:bg-amber-400 disabled:opacity-50"
              >
                {trimSaving ? '저장 중...' : '트림 저장'}
              </button>
              <button
                onClick={() => { setTrimStart(0); setTrimEnd(f.duration) }}
                className="text-[10px] text-text-dim hover:text-text-secondary"
              >
                초기화
              </button>
            </div>
          )
        })()}

        {/* ELE temp preview */}
        {hasTempPreview && (
          <ElePreviewPanel
            blobUrl={eleTempPreview.blobUrl}
            duration={eleTempPreview.duration}
            onSave={(e) => { e.stopPropagation(); handleEleSave(secKey) }}
            saving={trimSaving}
            onClose={() => { URL.revokeObjectURL(eleTempPreview.blobUrl); setEleTempPreview(null) }}
          />
        )}

        {/* ELE generate button */}
        {isEle && !hasTempPreview && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const txts = getTextsForSection(secKey, episode)
                handleEleGenerate(secKey, txts.tts || txts.original)
              }}
              disabled={eleGenerating}
              className={BTN_ELE}
            >
              {eleGenerating ? 'ELE 생성 중...' : 'ELE 생성'}
            </button>
          </div>
        )}

        {/* ELE error */}
        {eleError && <div className="text-xs text-danger-text">{eleError}</div>}
      </>)}
    </div>
  )
}
