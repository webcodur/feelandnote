'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import type { EpisodeData } from './EpisodeEditor'
import type { R2FileInfo, R2Summary } from './R2Status'
import { AudioWavePlayer } from './AudioWavePlayer'
import { VoiceTimingEditor } from './VoiceTimingEditor'
import { groupBySection, isEleSection, webR2UrlForSection, encodeWAV, abToBase64, applyGain, type VoiceSection } from './voice-utils'
import { CopyLabel } from './CopyLabel'

const BTN = 'px-3 py-1 rounded text-sm font-semibold'
const BTN_PRIMARY = `bg-accent text-bg-main ${BTN} hover:bg-accent-hover`
const BTN_SECONDARY = `bg-bg-card border border-border ${BTN} hover:bg-bg-hover`

/** ELE 프리뷰 패널 — 자체 재생/trim state */
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
      <div className="text-[10px] text-purple-300 font-semibold">ELE 프리뷰</div>
      <AudioWavePlayer
        audioUrl={blobUrl}
        duration={duration}
        heightClass="h-12"
        showRuler={false}
      />
      <div className="flex items-center gap-2">
        <button onClick={onSave} disabled={saving}
          className="px-2 py-0.5 rounded bg-purple-500 text-white text-[10px] font-semibold hover:bg-purple-400 disabled:opacity-50">
          {saving ? '저장 중...' : '저장 (WAV)'}
        </button>
        <button onClick={(e) => { e.stopPropagation(); onClose() }}
          className="text-[10px] text-text-dim hover:text-danger-text">
          ✕ 닫기
        </button>
      </div>
    </div>
  )
}

type VoicePanelProps = {
  episode: EpisodeData
  r2Files: R2FileInfo[]
  r2Summary: R2Summary
  series: string
  name: string
  playVoice: (fileName: string) => void
  onRefresh: () => void
  onEpisodeChange: (ep: EpisodeData) => void
  onSave: (data: EpisodeData) => Promise<void>
  post: (url: string, body: unknown) => Promise<void>
}

/** 엔진 셀 — 파일 있으면 ● 표시, 클릭으로 슬롯 토글. 파일 없고 needed면 ○ 표시 */
function EngineCell({ file, engine, sectionKey, isActive, onToggle, needed }: {
  file?: R2FileInfo
  engine: string
  sectionKey: string
  isActive: boolean
  onToggle: (sectionKey: string, engine: string) => void
  needed?: boolean
}) {
  if (!file) {
    if (needed) return <span className="text-amber-500 text-center block text-[10px]" title={`${engine} 미생성`}>○</span>
    return <span className="text-text-dim text-center block">-</span>
  }
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onToggle(sectionKey, engine) }}
      className={`block text-center w-full hover:text-accent-hover ${isActive ? 'text-accent font-bold' : 'text-text-dim'}`}
      title={isActive ? `${engine} 선택됨 (클릭하여 해제)` : `${engine} 선택`}
    >
      {isActive ? '◉' : '●'}
    </button>
  )
}

/** PROD 파일 결정: ELE > GEM > CMN > GCP */
function prodFile(sec: VoiceSection): R2FileInfo | undefined {
  return sec.elevenlabs ?? sec.gemini ?? sec.common ?? sec.cloud
}

/** TEST 파일 결정: GCP가 있으면 GCP, 없으면 없음 */
function testFile(sec: VoiceSection): R2FileInfo | undefined {
  return sec.cloud
}

/** 섹션 기반 음성 파일 테이블 */
/** 섹션 키 → { original, tts } 텍스트 매핑 */
function getTextsForSection(key: string, ep: EpisodeData): { original: string; tts: string } {
  const ttsData = (ep as Record<string, unknown>).tts as { narrator?: Record<string, string>; host?: Record<string, string>; books?: Array<Record<string, string>> } | undefined
  const nr = ep.narrator
  const ho = ep.host
  const bks = ep.books

  // Direct mappings
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

  // Book: D{NN}{phase}
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

  // Shorts: S{NN}-{id}
  const shortMatch = key.match(/^S\d{2}-(.+)$/)
  if (shortMatch && ep.shorts) {
    const seg = ep.shorts.segments.find(s => s.id === shortMatch[1])
    return { original: seg?.text ?? '', tts: (seg as any)?.ttsText ?? '' }
  }

  return { original: '', tts: '' }
}

/** 섹션 키에 해당하는 텍스트를 에피소드 데이터에 반영 */
function setTextForSection(key: string, field: 'original' | 'tts', value: string, ep: EpisodeData): EpisodeData {
  const next = JSON.parse(JSON.stringify(ep)) as EpisodeData & { tts?: { narrator?: Record<string, string>; host?: Record<string, string>; books?: Array<Record<string, string>> } }

  const directOriginal: Record<string, (v: string) => void> = {
    'A1-service-greeting': v => { next.narrator.serviceGreeting = v },
    'A2-service-intro': v => { next.narrator.serviceIntro = v },
    'A3-featured-quote': v => { next.host.featuredQuote = v },
    'B1-celeb-intro': v => { next.narrator.celebIntro = v },
    'B2-philosophy': v => { next.host.philosophy = v },
    'E1-outro': v => { next.narrator.outro = v },
    'E3-return-intro': v => { next.narrator.returnIntro = v },
    'E4-prev-recap': v => { next.narrator.prevRecap = v },
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

  // Book
  const bookMatch = key.match(/^D(\d{2})([a-e])-/)
  if (bookMatch) {
    const idx = parseInt(bookMatch[1]) - 1
    const phase = bookMatch[2]
    if (next.books[idx]) {
      const phaseFieldOriginal: Record<string, string> = { b: 'summary', c: 'context', d: 'directQuote', e: 'contextAfter' }
      if (field === 'original' && phaseFieldOriginal[phase]) {
        (next.books[idx] as Record<string, unknown>)[phaseFieldOriginal[phase]] = value
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

  // Shorts
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

type EleSettings = {
  stability: number
  similarity_boost: number
  style: number
  speed: number
  volumeBoost: number
}

/** SYNC 모드 패널 — 독립 컴포넌트로 추출하여 stale closure 문제 해결 */
function SyncModePanel({ secKey, episodeData, series, episode, getTextForKey, onEpisodeChange, onSave, onRefresh, saving, setSaving }: {
  secKey: string; episodeData: EpisodeData; series: string; episode: string
  getTextForKey: (key: string) => string
  onEpisodeChange: (ep: EpisodeData) => void
  onSave: (data: EpisodeData) => Promise<void>
  onRefresh: () => void
  saving: boolean; setSaving: (v: boolean) => void
}) {
  const segmentsRef = useRef<string[]>([])
  const timings = (episodeData.voiceTimings as any)?.[secKey] as Array<{ start: number; end: number }> | undefined
  const text = getTextForKey(secKey)
  const sentences = text.split(/(?<=[.?!,])\s+/).filter(Boolean)
  const audioUrl = `/api/${series}/voice/play/${episode}/${secKey}.wav`

  if (!timings || timings.length === 0) {
    return <div className="text-xs text-text-dim">voiceTimings 없음. Voice Sync를 먼저 실행하세요.</div>
  }

  const dur = timings[timings.length - 1]?.end ?? 0
  const txts = getTextsForSection(secKey, episodeData)

  /** 저장: ref에서 세그먼트를 직접 읽어 데이터 조립 → PUT */
  const handleSave = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const segs = segmentsRef.current
    let ep = JSON.parse(JSON.stringify(episodeData)) as EpisodeData
    // voiceTimings에 text 삽입
    if (timings.length === segs.length && segs.length > 0) {
      const withText = timings.map((t, i) => ({ ...t, text: segs[i] }))
      ;(ep as any).voiceTimings = { ...((ep as any).voiceTimings ?? {}), [secKey]: withText }
    }
    // 원문도 업데이트
    if (segs.length > 0) {
      ep = setTextForSection(secKey, 'original', segs.join(' '), ep)
    }
    setSaving(true)
    await onSave(ep)
    setSaving(false)
  }

  return (
    <div className="space-y-2">
      {/* 원문 텍스트 편집 */}
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
      {/* 타이밍 저장 + Voice Sync */}
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
                body: JSON.stringify({ episode, only: secKey + '.wav' }),
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
          <span className="text-[10px] text-amber-400">문장 {sentences.length}개 · 타이밍 {timings.length}개</span>
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

function VoiceSectionTable({ r2Files, r2Summary, series, episode, episodeData, onEpisodeChange, onSave, onRefresh, voiceId, eleSettings, celebId, locale, r2Base, activeEngine, toggleSlot }: {
  r2Files: R2FileInfo[]; r2Summary: R2Summary; series: string; episode: string; episodeData: EpisodeData; onEpisodeChange: (ep: EpisodeData) => void; onSave: (data: EpisodeData) => Promise<void>; onRefresh: () => void
  voiceId?: string; eleSettings: EleSettings; celebId?: string; locale: string; r2Base: string
  activeEngine: (sectionKey: string) => string; toggleSlot: (sectionKey: string, engine: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const sections = groupBySection(r2Files, episodeData as unknown as Parameters<typeof groupBySection>[1])
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [expandMode, setExpandMode] = useState<'trim' | 'sync'>('trim')

  /** 섹션키 → 원문 텍스트 */
  const getTextForKey = (key: string): string => {
    const ep = episodeData
    if (key === 'A1-service-greeting') return ep.narrator.serviceGreeting ?? ''
    if (key === 'A2-service-intro') return ep.narrator.serviceIntro ?? ''
    if (key === 'B1-celeb-intro') return ep.narrator.celebIntro ?? ''
    if (key === 'B2-philosophy') return ep.host.philosophy ?? ''
    if (key === 'E1-outro') return ep.narrator.outro ?? ''
    const bookMatch = key.match(/^D(\d{2})[a-e]-(.+)$/)
    if (bookMatch) {
      const idx = parseInt(bookMatch[1]) - 1
      const book = ep.books[idx]
      if (!book) return ''
      const f = bookMatch[2]
      if (f === 'title') return `${book.title}, ${book.creator}`
      if (f === 'summary') return book.summary
      if (f === 'context') return book.context
      if (f === 'quote') return book.directQuote ?? ''
      if (f === 'context-after') return book.contextAfter ?? ''
    }
    const shortMatch = key.match(/^S\d{2}-(.+)$/)
    if (shortMatch && ep.shorts?.segments) {
      const seg = ep.shorts.segments.find((s: { id: string }) => s.id === shortMatch[1])
      return seg?.text ?? ''
    }
    return ''
  }
  const [wfPlaying, setWfPlaying] = useState(false)
  const [wfCurrentTime, setWfCurrentTime] = useState(0)
  const [wfPlayingUrl, setWfPlayingUrl] = useState('')
  const wfAnimRef = useRef<number>(0)

  const playAudio = useCallback((url: string, startTime = 0) => {
    if (wfAudioRef.current) { wfAudioRef.current.pause(); cancelAnimationFrame(wfAnimRef.current) }
    setWfPlaying(false)
    const a = new Audio(url)
    wfAudioRef.current = a
    setWfPlayingUrl(url)
    a.onended = () => { setWfPlaying(false); setWfCurrentTime(0) }
    const start = () => {
      setWfPlaying(true)
      const tick = () => {
        if (a.paused) return
        setWfCurrentTime(a.currentTime)
        wfAnimRef.current = requestAnimationFrame(tick)
      }
      tick()
    }
    if (startTime > 0) {
      a.addEventListener('loadedmetadata', () => { a.currentTime = startTime; a.play().then(start).catch(() => {}) }, { once: true })
    } else {
      a.play().then(start).catch(() => {})
    }
  }, [])

  const stopAudio = useCallback(() => {
    if (wfAudioRef.current) { wfAudioRef.current.pause(); cancelAnimationFrame(wfAnimRef.current) }
    wfAudioRef.current = null
    setWfPlaying(false)
    setWfCurrentTime(0)
    setWfPlayingUrl('')
  }, [])
  const wfAudioRef = useRef<HTMLAudioElement | null>(null)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [trimSaving, setTrimSaving] = useState(false)
  const [eleGenerating, setEleGenerating] = useState(false)
  const [eleLoadingR2, setEleLoadingR2] = useState(false)
  const [eleError, setEleError] = useState<string | null>(null)
  // ELE 생성 후 임시 프리뷰 (아직 저장 안 한 상태)
  const [eleTempPreview, setEleTempPreview] = useState<{ key: string; blobUrl: string; base64: string; duration: number } | null>(null)

  const _hasGemini = true
  const _hasCloud = true
  const _hasEL = true
  const _hasCommon = true

  const toggleExpand = (key: string, sec: VoiceSection) => {
    if (wfAudioRef.current) { wfAudioRef.current.pause(); wfAudioRef.current = null }
    setWfPlaying(false)
    setEleError(null)
    if (expandedKey === key) {
      setExpandedKey(null)
      if (eleTempPreview?.key === key) { URL.revokeObjectURL(eleTempPreview.blobUrl); setEleTempPreview(null) }
    } else {
      const f = prodFile(sec)
      setExpandedKey(key)
      setTrimStart(0)
      setTrimEnd(f?.duration ?? 0)
      if (eleTempPreview && eleTempPreview.key !== key) { URL.revokeObjectURL(eleTempPreview.blobUrl); setEleTempPreview(null) }
    }
  }

  const playWaveform = (sec: VoiceSection) => {
    const f = prodFile(sec)
    if (!f) return
    if (wfPlaying && wfAudioRef.current) {
      wfAudioRef.current.pause()
      wfAudioRef.current = null
      setWfPlaying(false)
      return
    }
    const url = `/api/${series}/voice/play/${episode}/${f.name}`
    const a = new Audio(url)
    a.currentTime = trimStart
    wfAudioRef.current = a
    a.onended = () => setWfPlaying(false)
    a.ontimeupdate = () => {
      if (a.currentTime >= trimEnd && trimEnd > 0) { a.pause(); setWfPlaying(false) }
    }
    a.play().then(() => setWfPlaying(true)).catch(() => {})
  }

  const saveTrimmed = async (sec: VoiceSection) => {
    const f = prodFile(sec)
    if (!f) return
    const isTrimmed = trimStart > 0.01 || (trimEnd > 0 && trimEnd < f.duration - 0.01)
    if (!isTrimmed) return
    setTrimSaving(true)
    try {
      const url = `/api/${series}/voice/play/${episode}/${f.name}`
      const resp = await fetch(url)
      const audioCtx = new AudioContext()
      const audioBuf = await audioCtx.decodeAudioData(await resp.arrayBuffer())
      const wavBuf = encodeWAV(audioBuf, trimStart, trimEnd)
      const base64 = abToBase64(wavBuf)
      await audioCtx.close()
      await fetch(`/api/${series}/voice/elevenlabs/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode, fileName: f.name, base64 }),
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

  /** ELE 섹션의 파일명 결정 */
  const eleFileName = (key: string) => `elevenlabs/${key}.wav`

  /** ElevenLabs API로 음성 생성 → 임시 프리뷰에 로드 */
  const handleEleGenerate = async (key: string, text: string) => {
    if (!voiceId || !text.trim()) return
    setEleGenerating(true)
    setEleError(null)
    try {
      const res = await fetch(`/api/${series}/voice/elevenlabs/preview`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId, text, settings: eleSettings }),
      })
      const data = await res.json()
      if (!data.success) { setEleError(data.error ?? '생성 실패'); return }
      const mp3Bytes = Uint8Array.from(atob(data.base64), c => c.charCodeAt(0))
      const audioCtx = new AudioContext()
      const audioBuf = await audioCtx.decodeAudioData(mp3Bytes.buffer.slice(0) as ArrayBuffer)
      const boosted = await applyGain(audioBuf, eleSettings.volumeBoost)
      const wavBuf = encodeWAV(boosted)
      const wavBase64 = abToBase64(wavBuf)
      const blob = new Blob([wavBuf], { type: 'audio/wav' })
      const blobUrl = URL.createObjectURL(blob)
      await audioCtx.close()
      if (eleTempPreview) URL.revokeObjectURL(eleTempPreview.blobUrl)
      setEleTempPreview({ key, blobUrl, base64: wavBase64, duration: boosted.duration })
      setTrimStart(0)
      setTrimEnd(boosted.duration)
    } catch (e) {
      setEleError(String(e))
    } finally {
      setEleGenerating(false)
    }
  }

  /** web R2에서 음원 가져오기 → 임시 프리뷰에 로드 */
  const handleLoadWebR2 = async (key: string, webUrl: string) => {
    setEleLoadingR2(true)
    setEleError(null)
    try {
      const proxyRes = await fetch(`/api/${series}/voice/fetch-r2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: webUrl }),
      })
      const data = await proxyRes.json()
      if (!data.success) throw new Error(data.error ?? '가져오기 실패')
      const raw = Uint8Array.from(atob(data.base64), c => c.charCodeAt(0))
      const audioCtx = new AudioContext()
      const audioBuf = await audioCtx.decodeAudioData(raw.buffer.slice(0) as ArrayBuffer)
      const boosted = await applyGain(audioBuf, eleSettings.volumeBoost)
      const wavBuf = encodeWAV(boosted)
      const wavBase64 = abToBase64(wavBuf)
      const blob = new Blob([wavBuf], { type: 'audio/wav' })
      const blobUrl = URL.createObjectURL(blob)
      await audioCtx.close()
      if (eleTempPreview) URL.revokeObjectURL(eleTempPreview.blobUrl)
      setEleTempPreview({ key, blobUrl, base64: wavBase64, duration: boosted.duration })
      setTrimStart(0)
      setTrimEnd(boosted.duration)
    } catch (e) {
      setEleError(`web R2 로드 실패: ${String(e)}`)
    } finally {
      setEleLoadingR2(false)
    }
  }

  /** 임시 프리뷰를 WAV 파일로 저장 */
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
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ episode, fileName: eleFileName(key), base64: saveBase64 }),
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

  const BTN_SM = 'px-2 py-0.5 rounded text-[10px] font-semibold'
  const BTN_ELE = `${BTN_SM} bg-purple-500/20 text-purple-300 border border-purple-500/40 hover:bg-purple-500/30`
  const BTN_SAVE = `${BTN_SM} bg-accent text-bg-main hover:bg-accent-hover disabled:opacity-50`

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="text-[11px] text-text-secondary font-medium">파일 현황</div>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className="text-text-secondary"><span className="font-semibold text-text-primary">{r2Summary.total}</span> 파일</span>
          <span className="text-text-secondary"><span className="font-semibold text-text-primary">{(r2Summary.totalSizeKB / 1024).toFixed(1)}MB</span></span>
        </div>
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-x-3 mb-2 text-[10px] font-mono text-text-dim">
        <span><span className="text-text-secondary">A</span> 프리인트로</span>
        <span><span className="text-text-secondary">B</span> 인물소개</span>
        <span><span className="text-text-secondary">C</span> 공용라벨</span>
        <span><span className="text-text-secondary">D</span> 책(번호+위상)</span>
        <span><span className="text-text-secondary">E</span> 아웃트로</span>
        <span><span className="text-text-secondary">S</span> 쇼츠</span>
      </div>

      {sections.length > 0 ? (
        <div>
          <table className="w-full text-xs font-mono">
            <thead>
              <tr className="text-[10px] font-semibold text-text-dim border-b border-border [&>th]:py-1.5 [&>th]:align-middle">
                <th className="text-left w-[120px]">코드</th>
                <th className="text-left w-[80px]">설명</th>
                {_hasCommon && <th className="text-center w-7 text-teal-400">CMN</th>}
                {_hasCloud && <th className="text-center w-7 text-yellow-400">GCP</th>}
                {_hasGemini && <th className="text-center w-7 text-blue-400">GEM</th>}
                {_hasEL && <th className="text-center w-7 text-purple-400">ELE</th>}
                <th className="text-right w-11">길이</th>
                <th className="text-right w-12">크기</th>
                <th className="text-center w-5">R2</th>
              </tr>
            </thead>
            <tbody>
              {sections.map(sec => {
                const prod = prodFile(sec)
                const test = testFile(sec)
                const display = prod ?? test
                const isExpanded = expandedKey === sec.key
                const colCount = 7 + (_hasCommon?1:0) + (_hasCloud?1:0) + (_hasGemini?1:0) + (_hasEL?1:0)
                // voice-select 해소는 play API가 처리 — sectionKey.wav만 전달
                const prodUrl = `/api/${series}/voice/play/${episode}/${sec.key}.wav`
                const isEle = isEleSection(sec.key) && !!voiceId
                const webR2Url = webR2UrlForSection(sec.key, celebId, locale, r2Base)
                const hasTempPreview = eleTempPreview?.key === sec.key
                return (
                  <React.Fragment key={sec.key}>
                    <tr
                      className={`border-b border-bg-main hover:bg-bg-hover cursor-pointer [&>td]:py-1 [&>td]:align-middle ${isExpanded ? 'bg-bg-hover' : ''}`}
                      onClick={() => toggleExpand(sec.key, sec)}
                    >
                      <td className="text-text-secondary">{sec.key}</td>
                      <td className="text-text-dim">{sec.description}</td>
                      {_hasCommon && <td><EngineCell file={sec.common} engine="common" sectionKey={sec.key} isActive={activeEngine(sec.key) === 'common'} onToggle={toggleSlot} /></td>}
                      {_hasCloud && <td><EngineCell file={sec.cloud} engine="cloud" sectionKey={sec.key} isActive={activeEngine(sec.key) === 'cloud'} onToggle={toggleSlot} /></td>}
                      {_hasGemini && <td><EngineCell file={sec.gemini} engine="gemini" sectionKey={sec.key} isActive={activeEngine(sec.key) === 'gemini'} onToggle={toggleSlot} /></td>}
                      {_hasEL && <td><EngineCell file={sec.elevenlabs} engine="elevenlabs" sectionKey={sec.key} isActive={activeEngine(sec.key) === 'elevenlabs'} onToggle={toggleSlot} needed={isEleSection(sec.key) && !!voiceId} /></td>}
                      <td className="text-right text-success-text">{display?.duration ?? '-'}s</td>
                      <td className="text-right text-text-dim">{display ? `${display.sizeKB}KB` : '-'}</td>
                      <td className="text-center">
                        {prod?.status === 'synced' && <span className="text-success-text">●</span>}
                        {prod?.status === 'unsynced' && <span className="text-warning-text">▲</span>}
                        {prod?.status === 'local-only' && <span className="text-text-dim">○</span>}
                        {!prod && <span className="text-text-dim">-</span>}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="border-b border-bg-main bg-bg-card" onClick={e => e.stopPropagation()}>
                        <td colSpan={colCount} className="px-2 py-2 space-y-1.5">
                          {/* TRIM | SYNC 탭 */}
                          <div className="flex items-center gap-1 mb-2">
                            <button onClick={(e) => { e.stopPropagation(); setExpandMode('trim') }}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${expandMode === 'trim' ? 'bg-accent text-bg-main' : 'bg-bg-main border border-border text-text-secondary hover:bg-bg-hover'}`}>
                              TRIM
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setExpandMode('sync') }}
                              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${expandMode === 'sync' ? 'bg-accent text-bg-main' : 'bg-bg-main border border-border text-text-secondary hover:bg-bg-hover'}`}>
                              SYNC
                            </button>
                          </div>

                          {/* SYNC 모드 */}
                          {expandMode === 'sync' && <SyncModePanel
                            secKey={sec.key}
                            episodeData={episodeData}
                            series={series}
                            episode={episode}
                            getTextForKey={getTextForKey}
                            onEpisodeChange={onEpisodeChange}
                            onSave={onSave}
                            onRefresh={onRefresh}
                            saving={saving}
                            setSaving={setSaving}
                          />}

                          {/* TRIM 모드 */}
                          {expandMode === 'trim' && (<>
                          {/* 텍스트 — 인라인 편집 */}
                          {(() => {
                            const txts = getTextsForSection(sec.key, episodeData)
                            if (!txts.original && !txts.tts) return null
                            return (
                              <div className="pl-7 space-y-1.5">
                                <div>
                                  <span className="text-[9px] text-text-dim">원본 텍스트</span>
                                  <textarea
                                    value={txts.original}
                                    onChange={e => onEpisodeChange(setTextForSection(sec.key, 'original', e.target.value, episodeData))}
                                    onKeyDown={e => e.stopPropagation()}
                                    onClick={e => e.stopPropagation()}
                                    rows={Math.min(4, Math.max(1, Math.ceil(txts.original.length / 60)))}
                                    className="w-full bg-bg-main border border-border rounded px-2 py-1 text-xs text-text-secondary resize-y focus:outline-none focus:border-accent select-text"
                                  />
                                </div>
                                {(
                                <div>
                                  <span className="text-[9px] text-accent">TTS</span>
                                  <textarea
                                    value={txts.tts}
                                    onChange={e => onEpisodeChange(setTextForSection(sec.key, 'tts', e.target.value, episodeData))}
                                    onKeyDown={e => e.stopPropagation()}
                                    onClick={e => e.stopPropagation()}
                                    rows={Math.min(3, Math.max(1, Math.ceil((txts.tts || '').length / 60)))}
                                    placeholder="TTS 텍스트 (다를 때만 입력)"
                                    className="w-full bg-bg-main border border-border rounded px-2 py-1 text-[11px] text-text-dim resize-y focus:outline-none focus:border-accent select-text"
                                  />
                                </div>
                                )}
                                <button
                                  onClick={async (e) => { e.stopPropagation(); setSaving(true); await onSave(episodeData); setSaving(false) }}
                                  disabled={saving}
                                  className="px-2 py-0.5 rounded bg-accent text-bg-main text-[10px] font-semibold hover:bg-accent-hover disabled:opacity-50 self-end"
                                >
                                  {saving ? '저장 중...' : '텍스트 저장'}
                                </button>
                              </div>
                            )
                          })()}
                          {/* 엔진별 파형 */}
                          {(() => {
                            const engines: { label: string; color: string; file?: R2FileInfo }[] = [
                              { label: 'GEM', color: 'text-blue-400', file: sec.gemini },
                              { label: 'ELE', color: 'text-purple-400', file: sec.elevenlabs },
                              { label: 'CMN', color: 'text-green-400', file: sec.common },
                              { label: 'GCP', color: 'text-yellow-400', file: sec.cloud },
                            ].filter(e => e.file)

                            if (engines.length === 0) return null
                            const engineMap: Record<string, string> = { GEM: 'gemini', ELE: 'elevenlabs', CMN: 'common', GCP: 'cloud' }
                            return engines.map(eng => {
                              const url = `/api/${series}/voice/play/${episode}/${eng.file!.name}`
                              const isActive = activeEngine(sec.key) === engineMap[eng.label]
                              return (
                                <div key={eng.label} className={`${isActive ? 'bg-bg-main rounded p-1.5' : 'opacity-60 hover:opacity-100 p-1.5'}`}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={`text-[9px] font-bold ${eng.color}`}>{eng.label}</span>
                                    <span className="text-[9px] text-text-dim font-mono">{eng.file!.duration.toFixed(2)}s</span>
                                    {isActive && <span className="text-[8px] text-accent">ACTIVE</span>}
                                  </div>
                                  <AudioWavePlayer
                                    audioUrl={url}
                                    duration={eng.file!.duration}
                                    heightClass="h-12"
                                    showRuler={isActive}
                                  />
                                </div>
                              )
                            })
                          })()}
                          {/* ELE 임시 프리뷰 파형 (생성/R2 로드 결과) */}
                          {hasTempPreview && (
                            <ElePreviewPanel
                              blobUrl={eleTempPreview.blobUrl}
                              duration={eleTempPreview.duration}
                              onSave={(e) => { e.stopPropagation(); handleEleSave(sec.key) }}
                              saving={trimSaving}
                              onClose={() => { URL.revokeObjectURL(eleTempPreview.blobUrl); setEleTempPreview(null) }}
                            />
                          )}
                          {/* ELE 액션 버튼 */}
                          {isEle && !hasTempPreview && (
                            <div className="flex items-center gap-2 pl-7">
                              <button
                                onClick={e => {
                                  e.stopPropagation()
                                  const txts = getTextsForSection(sec.key, episodeData)
                                  handleEleGenerate(sec.key, txts.original)
                                }}
                                disabled={eleGenerating}
                                className={BTN_ELE}
                              >
                                {eleGenerating ? 'ELE 생성 중...' : 'ELE 생성'}
                              </button>
                              {webR2Url && (
                                <button
                                  onClick={e => { e.stopPropagation(); handleLoadWebR2(sec.key, webR2Url) }}
                                  disabled={eleLoadingR2}
                                  className={BTN_ELE}
                                >
                                  {eleLoadingR2 ? '로드 중...' : 'web R2 가져오기'}
                                </button>
                              )}
                            </div>
                          )}
                          {/* ELE 에러 */}
                          {eleError && isExpanded && (
                            <div className="text-xs text-danger-text pl-7">{eleError}</div>
                          )}
                          </>)}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-text-dim text-xs py-2">음성 파일 없음</div>
      )}
    </div>
  )
}

type VoiceSelect = { default: string; slots?: Record<string, string> } | null

function useVoiceSelect(series: string, name: string) {
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

/** 현재 프로덕션 모드 판별 */
function detectMode(vs: VoiceSelect, hasELVoiceId: boolean): { label: string; color: string } {
  if (!vs) return { label: 'UNSET', color: 'text-danger-text' }
  if (vs.default === 'cloud') return { label: 'TEST (GCP)', color: 'text-yellow-400' }
  if (vs.default === 'gemini') {
    const hasELSlots = vs.slots && Object.values(vs.slots).some(v => v === 'elevenlabs')
    if (hasELSlots || hasELVoiceId) return { label: 'PROD (GEM + ELE)', color: 'text-purple-400' }
    return { label: 'PROD (GEM)', color: 'text-blue-400' }
  }
  return { label: vs.default.toUpperCase(), color: 'text-text-secondary' }
}

const DEFAULT_ELE_SETTINGS: EleSettings = { stability: 0.5, similarity_boost: 0.75, style: 0.3, speed: 1.0, volumeBoost: 0 }

export function VoicePanel({ episode, r2Files, r2Summary, series, name, playVoice, onRefresh, onEpisodeChange, onSave, post }: VoicePanelProps) {
  const [engine, setEngine] = useState('gemini')
  const [role, setRole] = useState('')
  const [only, setOnly] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const { vs, saveVs } = useVoiceSelect(series, name)
  const hasELVoiceId = !!episode.host.elevenlabsVoiceId
  const mode = detectMode(vs, hasELVoiceId)
  // 슬롯 토글: 해당 파일의 엔진을 voice-select.json에 설정/해제
  const toggleSlot = useCallback(async (sectionKey: string, engine: string) => {
    if (!vs) return
    const fileName = `${sectionKey}.wav`
    const currentSlot = vs.slots?.[fileName]
    const newSlots = { ...(vs.slots ?? {}) }

    if (currentSlot === engine) {
      // 이미 선택된 엔진이면 해제 (default로 복귀)
      delete newSlots[fileName]
    } else {
      // 다른 엔진 선택
      newSlots[fileName] = engine
    }

    const newVs = { ...vs, slots: newSlots }
    await saveVs(newVs)
    onRefresh()
  }, [vs, saveVs, onRefresh])

  // 특정 파일의 현재 활성 엔진 판별
  const activeEngine = useCallback((sectionKey: string): string => {
    if (!vs) return ''
    const fileName = `${sectionKey}.wav`
    return vs.slots?.[fileName] ?? vs.default ?? ''
  }, [vs])

  const [eleSettings, setEleSettings] = useState<EleSettings>({ ...DEFAULT_ELE_SETTINGS })
  const [eleSettingsOpen, setEleSettingsOpen] = useState(false)
  const [eleBatchRunning, setEleBatchRunning] = useState(false)
  const [eleBatchStatus, setEleBatchStatus] = useState<string | null>(null)

  // celeb ID를 avatar_url에서 추출
  const celebIdMatch = episode.host.avatar_url?.match(/celebs\/([a-f0-9-]+)\//)
  const celebId = celebIdMatch?.[1]
  const r2Base = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || 'https://pub-048f29057fc54fa5b2927db8f167b305.r2.dev'
  const epLocale = (episode as Record<string, unknown>).locale === 'en' ? 'en' : 'ko'

  const postWithLoading = async (url: string, body: unknown, key: string) => {
    setLoading(key)
    try {
      await post(url, body)
    } finally {
      setLoading(null)
    }
  }

  const hasShorts = !!episode.shorts && episode.shorts.segments.length > 0
  const [voiceOpen, setVoiceOpen] = useState(false)

  return (
    <section className="bg-bg-secondary border border-border rounded-lg overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-2.5 cursor-pointer select-none hover:bg-bg-hover"
        onClick={() => setVoiceOpen(!voiceOpen)}
      >
        <div className="flex items-center gap-3">
          <h3 className="text-xs font-bold text-accent tracking-widest">VOICE & STORAGE</h3>
          <CopyLabel text="VOICE & STORAGE" />
          <span className={`text-[10px] font-bold ${mode.color}`}>{mode.label}</span>
        </div>
        <span className="text-text-dim text-xs">{voiceOpen ? '▼' : '▶'}</span>
      </div>
      {!voiceOpen ? null : <div className="px-4 pb-4 space-y-5">

      {/* 현재 모드 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-text-secondary">모드:</span>
          <span className={`text-xs font-bold ${mode.color}`}>{mode.label}</span>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => saveVs({ default: 'cloud' })}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${vs?.default === 'cloud' ? 'bg-yellow-400/20 text-yellow-400 border border-yellow-400/40' : 'bg-bg-card border border-border text-text-dim hover:text-text-secondary'}`}
          >TEST (GCP)</button>
          <button
            onClick={() => saveVs({ default: 'gemini' })}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${vs?.default === 'gemini' && !hasELVoiceId ? 'bg-blue-400/20 text-blue-400 border border-blue-400/40' : 'bg-bg-card border border-border text-text-dim hover:text-text-secondary'}`}
          >PROD (GEM)</button>
          {hasELVoiceId && (
            <button
              onClick={() => {
                const elSlots: Record<string, string> = {}
                // 셀럽 파일은 elevenlabs로 매핑
                if (episode.host.philosophy) elSlots['B2-philosophy.wav'] = 'elevenlabs'
                if (episode.host.featuredQuote) elSlots['A3-featured-quote.wav'] = 'elevenlabs'
                if (episode.shorts) episode.shorts.segments.forEach((s, i) => {
                  if (s.role === 'celeb') {
                    const idx = String(i + 1).padStart(2, '0')
                    elSlots[`S${idx}-${s.id}.wav`] = 'elevenlabs'
                  }
                })
                // book quotes
                episode.books.forEach((b, i) => {
                  if (b.directQuote) {
                    const bn = String(i + 1).padStart(2, '0')
                    elSlots[`D${bn}d-quote.wav`] = 'elevenlabs'
                  }
                })
                saveVs({ default: 'gemini', slots: elSlots })
              }}
              className={`px-2 py-0.5 rounded text-[10px] font-semibold ${vs?.default === 'gemini' && hasELVoiceId && vs?.slots ? 'bg-purple-400/20 text-purple-400 border border-purple-400/40' : 'bg-bg-card border border-border text-text-dim hover:text-text-secondary'}`}
            >PROD (GEM+ELE)</button>
          )}
        </div>
      </div>

      {/* 생성 도구 */}
      <div>
        <div className="text-[11px] text-text-secondary font-medium mb-2">생성 도구</div>
        <div className="flex flex-wrap gap-2 mb-2">
          <select value={engine} onChange={e => setEngine(e.target.value)}
            className="bg-bg-card border border-border rounded px-2 py-1 text-sm">
            <option value="gemini">Gemini</option>
            <option value="cloud">Cloud TTS</option>
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
            className={BTN_PRIMARY}>
            전체 생성
          </button>
          <button
            onClick={() => post(`/api/${series}/voice/generate`, { episode: name, engine, role: role || undefined, only: only || undefined, force: false })}
            className={BTN_SECONDARY}>
            누락분만 생성
          </button>
          {hasShorts && (
            <button
              onClick={() => post(`/api/${series}/voice/generate`, { episode: name, engine, role: 'shorts', only: only || undefined })}
              className={BTN_SECONDARY}>
              쇼츠 음성
            </button>
          )}
        </div>
        <p className="text-[11px] text-text-dim leading-relaxed">
          Gemini TTS로 나레이터/요약맨 음성을 생성합니다. 셀럽 음성은 테이블에서 ELE 생성으로 개별 생성합니다.
        </p>
      </div>

      {/* ElevenLabs 설정 — 접이식 */}
      {hasELVoiceId && (
        <div>
          <div
            className="flex items-center gap-2 cursor-pointer select-none"
            onClick={() => setEleSettingsOpen(!eleSettingsOpen)}
          >
            <span className="text-[11px] text-purple-300 font-medium">ELEVENLABS 설정</span>
            <span className="text-[10px] text-text-dim font-mono">{episode.host.elevenlabsVoiceId}</span>
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
                      onChange={e => setEleSettings(s => ({ ...s, [k]: Number(e.target.value) }))}
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
                  onClick={() => setEleSettings({ ...DEFAULT_ELE_SETTINGS })}
                  className="text-[10px] text-text-dim hover:text-text-secondary"
                >기본값 복원</button>
                <button
                  onClick={async () => {
                    if (eleBatchRunning) return
                    setEleBatchRunning(true)
                    const voId = episode.host.elevenlabsVoiceId!
                    const lines: { key: string; text: string }[] = []
                    if (episode.host.philosophy) lines.push({ key: 'B2-philosophy', text: episode.host.philosophy })
                    if (episode.host.featuredQuote) lines.push({ key: 'A3-featured-quote', text: episode.host.featuredQuote })
                    if (episode.shorts) episode.shorts.segments.forEach((s, i) => {
                      if (s.role === 'celeb' && s.text) lines.push({ key: `S${String(i+1).padStart(2,'0')}-${s.id}`, text: s.text })
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
                        const mp3 = Uint8Array.from(atob(d.base64), c => c.charCodeAt(0))
                        const ctx = new AudioContext()
                        const buf = await ctx.decodeAudioData(mp3.buffer.slice(0) as ArrayBuffer)
                        const boosted = await applyGain(buf, eleSettings.volumeBoost)
                        const wav = encodeWAV(boosted)
                        const b64 = abToBase64(wav)
                        await ctx.close()
                        const sr = await fetch(`/api/${series}/voice/elevenlabs/save`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ episode: name, fileName: `elevenlabs/${ln.key}.wav`, base64: b64 }),
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

      {/* 파일 현황 — 섹션 기반 테이블 */}
      <VoiceSectionTable
        r2Files={r2Files}
        r2Summary={r2Summary}
        series={series}
        episode={name}
        episodeData={episode}
        onEpisodeChange={onEpisodeChange}
        onSave={onSave}
        onRefresh={onRefresh}
        voiceId={episode.host.elevenlabsVoiceId}
        eleSettings={eleSettings}
        celebId={celebId}
        locale={epLocale}
        r2Base={r2Base}
        activeEngine={activeEngine}
        toggleSlot={toggleSlot}
      />

      {/* R2 동기화 */}
      <div>
        <div className="text-[11px] text-text-secondary font-medium mb-2">R2 동기화</div>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <button
              onClick={() => postWithLoading(`/api/${series}/voice/upload`, { episode: name }, 'upload')}
              disabled={loading === 'upload'}
              className={BTN_PRIMARY}>
              {loading === 'upload' ? '업로드 중...' : 'R2 전체 업로드'}
            </button>
            <span className="text-[11px] text-text-dim">로컬 → R2로 음성 파일을 업로드합니다</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => postWithLoading(`/api/${series}/voice/pull`, { episode: name }, 'pull')}
              disabled={loading === 'pull'}
              className={BTN_SECONDARY}>
              {loading === 'pull' ? '다운로드 중...' : 'R2 전체 다운로드'}
            </button>
            <span className="text-[11px] text-text-dim">R2 → 로컬로 음성 파일을 받습니다</span>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={onRefresh} className={BTN_SECONDARY}>
              동기화 체크
            </button>
            <span className="text-[11px] text-text-dim">로컬/R2 파일 상태를 재확인합니다</span>
          </div>
        </div>
      </div>
      </div>}
    </section>
  )
}
