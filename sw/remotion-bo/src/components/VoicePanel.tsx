'use client'

import React, { useState, useRef, useCallback } from 'react'
import type { EpisodeData } from './EpisodeEditor'
import type { VoiceFile, VoiceSummary } from './voice-utils'
import { AudioWavePlayer } from './AudioWavePlayer'
import { VoiceTimingEditor } from './VoiceTimingEditor'
import { groupBySection, isEleSection, encodeWAV, abToBase64, prepareAudioPreview, type VoiceSection } from './voice-utils'
import { CopyLabel } from './CopyLabel'
import { useVoiceSelect, detectMode, prodFile, getTextsForSection, setTextForSection, type VoiceSelect, type EleSettings, DEFAULT_ELE_SETTINGS } from './ScenarioVoice'

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
  voiceFiles: VoiceFile[]
  voiceSummary: VoiceSummary
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
  file?: VoiceFile
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



/** 섹션 기반 음성 파일 테이블 */

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
      ep = setTextForSection(secKey, segs.join(' '), ep)
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
            onChange={e => onEpisodeChange(setTextForSection(secKey, e.target.value, episodeData))}
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

function VoiceSectionTable({ voiceFiles, voiceSummary, series, episode, episodeData, onEpisodeChange, onSave, onRefresh, voiceId, eleSettings, celebId, locale, activeEngine, toggleSlot }: {
  voiceFiles: VoiceFile[]; voiceSummary: VoiceSummary; series: string; episode: string; episodeData: EpisodeData; onEpisodeChange: (ep: EpisodeData) => void; onSave: (data: EpisodeData) => Promise<void>; onRefresh: () => void
  voiceId?: string; eleSettings: EleSettings; celebId?: string; locale: string
  activeEngine: (sectionKey: string) => string; toggleSlot: (sectionKey: string, engine: string) => void
}) {
  const [saving, setSaving] = useState(false)
  const sections = groupBySection(voiceFiles, episodeData as unknown as Parameters<typeof groupBySection>[1])
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
    const bookMatch = key.match(/^D(\d{2})[a-c]-(.+)$/)
    if (bookMatch) {
      const idx = parseInt(bookMatch[1]) - 1
      const book = ep.books[idx]
      if (!book) return ''
      const f = bookMatch[2]
      if (f === 'title') return `${book.title}, ${book.creator}`
      if (f === 'summary') return book.summary
      if (f === 'context') return book.contextMain
    }
    // quotePairs: D{nn}d{N}-quote / D{nn}d{N}-after
    const pairMatch = key.match(/^D(\d{2})d(\d+)-(quote|after)$/)
    if (pairMatch) {
      const idx = parseInt(pairMatch[1]) - 1
      const dn = parseInt(pairMatch[2])
      const pi = Math.floor((dn - 1) / 2)
      const book = ep.books[idx] as any
      if (!book) return ''
      const pair = book.quotePairs?.[pi]
      if (!pair) return ''
      return pairMatch[3] === 'quote' ? (pair.quote ?? '') : (pair.after ?? '')
    }
    // 옵션 2: shorts-{N}/S{NN}-{id} 필수 (N은 1-based)
    const shortMatch = key.match(/^shorts-(\d+)\/S\d{2}-(.+)$/)
    if (shortMatch && ep.shorts) {
      const sIdx = parseInt(shortMatch[1], 10) - 1
      const arr: any[] = Array.isArray(ep.shorts) ? ep.shorts : [ep.shorts]
      const seg = arr[sIdx]?.segments?.find((s: { id: string }) => s.id === shortMatch[2])
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
  const [eleError, setEleError] = useState<string | null>(null)
  // ELE 생성 후 임시 프리뷰 (아직 저장 안 한 상태)
  const [eleTempPreview, setEleTempPreview] = useState<{ key: string; blobUrl: string; base64: string; duration: number } | null>(null)

  const _hasGemini = true
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

  /** ElevenLabs API로 음성 생성 → 임시 프리뷰에 로드
   *  날것 그대로: MP3 → Blob → Audio element duration. decodeAudioData 없음. */
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
          <span className="text-text-secondary"><span className="font-semibold text-text-primary">{voiceSummary.total}</span> 파일</span>
          <span className="text-text-secondary"><span className="font-semibold text-text-primary">{(voiceSummary.totalSizeKB / 1024).toFixed(1)}MB</span></span>
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
                {_hasGemini && <th className="text-center w-7 text-blue-400">GEM</th>}
                {_hasEL && <th className="text-center w-7 text-purple-400">ELE</th>}
                <th className="text-right w-11">길이</th>
                <th className="text-right w-12">크기</th>
              </tr>
            </thead>
            <tbody>
              {sections.map(sec => {
                const prod = prodFile(sec)
                const display = prod
                const isExpanded = expandedKey === sec.key
                const colCount = 7 + (_hasCommon?1:0) + (_hasGemini?1:0) + (_hasEL?1:0)
                // voice-select 해소는 play API가 처리 — sectionKey.wav만 전달
                const prodUrl = `/api/${series}/voice/play/${episode}/${sec.key}.wav`
                const isEle = isEleSection(sec.key) && !!voiceId
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
                      {_hasGemini && <td><EngineCell file={sec.gemini} engine="gemini" sectionKey={sec.key} isActive={activeEngine(sec.key) === 'gemini'} onToggle={toggleSlot} /></td>}
                      {_hasEL && <td><EngineCell file={sec.elevenlabs} engine="elevenlabs" sectionKey={sec.key} isActive={activeEngine(sec.key) === 'elevenlabs'} onToggle={toggleSlot} needed={isEleSection(sec.key) && !!voiceId} /></td>}
                      <td className="text-right text-success-text">{display?.duration ?? '-'}s</td>
                      <td className="text-right text-text-dim">{display ? `${display.sizeKB}KB` : '-'}</td>
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
                            if (!txts.original || !txts.tts || txts.tts === txts.original) return null
                            return (
                              <div className="pl-7">
                                <span className="text-[9px] text-text-dim">TTS 적용 텍스트</span>
                                <div className="text-[10px] text-text-dim bg-bg-main border border-border rounded px-2 py-1 whitespace-pre-wrap">{txts.tts}</div>
                              </div>
                            )
                          })()}
                          {/* 엔진별 파형 */}
                          {(() => {
                            const engines: { label: string; color: string; file?: VoiceFile }[] = [
                              { label: 'GEM', color: 'text-blue-400', file: sec.gemini },
                              { label: 'ELE', color: 'text-purple-400', file: sec.elevenlabs },
                              { label: 'CMN', color: 'text-green-400', file: sec.common },
                            ].filter(e => e.file)

                            if (engines.length === 0) return null
                            const engineMap: Record<string, string> = { GEM: 'gemini', ELE: 'elevenlabs', CMN: 'common' }
                            return engines.map(eng => {
                              const url = `/api/${series}/voice/play/${episode}/${eng.file!.name}`
                              const isActive = activeEngine(sec.key) === engineMap[eng.label]
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
                          {/* Trim 컨트롤 */}
                          {(() => {
                            const f = prodFile(sec)
                            if (!f) return null
                            const isTrimmed = trimStart > 0.01 || (trimEnd > 0 && trimEnd < f.duration - 0.01)
                            if (!isTrimmed) return null
                            return (
                              <div className="flex items-center gap-3 pl-7 py-1">
                                <span className="text-[10px] text-amber-400 font-mono">
                                  {trimStart.toFixed(2)}s – {trimEnd.toFixed(2)}s
                                  <span className="text-text-dim ml-1">({(trimEnd - trimStart).toFixed(2)}s)</span>
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); saveTrimmed(sec) }}
                                  disabled={trimSaving}
                                  className="px-2 py-0.5 rounded bg-amber-500 text-bg-main text-[10px] font-semibold hover:bg-amber-400 disabled:opacity-50"
                                >
                                  {trimSaving ? '저장 중...' : '트림 저장'}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setTrimStart(0); setTrimEnd(f.duration) }}
                                  className="text-[10px] text-text-dim hover:text-text-secondary"
                                >
                                  초기화
                                </button>
                              </div>
                            )
                          })()}
                          {/* ELE 임시 프리뷰 파형 */}
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
                                  handleEleGenerate(sec.key, txts.tts || txts.original)
                                }}
                                disabled={eleGenerating}
                                className={BTN_ELE}
                              >
                                {eleGenerating ? 'ELE 생성 중...' : 'ELE 생성'}
                              </button>
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

export function VoicePanel({ episode, voiceFiles, voiceSummary, series, name, playVoice, onRefresh, onEpisodeChange, onSave, post }: VoicePanelProps) {
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
  const epLocale = (episode as Record<string, unknown>).locale === 'en' ? 'en' : 'ko'

  const postWithLoading = async (url: string, body: unknown, key: string) => {
    setLoading(key)
    try {
      await post(url, body)
    } finally {
      setLoading(null)
    }
  }

  // shorts 배열 정규화 (단일 객체 호환)
  const shortsArr: Array<{ segments: Array<{ id: string; role: string; text?: string }> }> =
    Array.isArray(episode.shorts) ? episode.shorts as any : (episode.shorts ? [episode.shorts as any] : [])
  const hasShorts = shortsArr.some(s => s?.segments?.length > 0)
  const collectShortsCelebKeys = (predicate: (seg: { role: string; text?: string }) => boolean) => {
    const out: { key: string; text: string }[] = []
    // 옵션 2: 접두사 `shorts-{N}/` 필수 (1-based)
    shortsArr.forEach((cfg, sIdx) => {
      const prefix = `shorts-${sIdx + 1}/`
      cfg?.segments?.forEach((s, i) => {
        if (!predicate(s)) return
        const idx = String(i + 1).padStart(2, '0')
        out.push({ key: `${prefix}S${idx}-${s.id}`, text: s.text ?? '' })
      })
    })
    return out
  }
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
                for (const ln of collectShortsCelebKeys(s => s.role === 'celeb')) {
                  elSlots[`${ln.key}.wav`] = 'elevenlabs'
                }
                // book quotes (quotePairs)
                episode.books.forEach((b: any, i: number) => {
                  const bn = String(i + 1).padStart(2, '0')
                  for (let pi = 0; pi < (b.quotePairs?.length ?? 0); pi++) {
                    if (b.quotePairs[pi].quote) {
                      elSlots[`D${bn}d${pi * 2 + 1}-quote.wav`] = 'elevenlabs'
                    }
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
                    for (const ln of collectShortsCelebKeys(s => s.role === 'celeb' && !!s.text)) {
                      if (ln.text) lines.push(ln)
                    }
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
                        // 날것 MP3 그대로 저장 (boost/trim은 저장 후 별도 처리)
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

      {/* 파일 현황 — 섹션 기반 테이블 */}
      <VoiceSectionTable
        voiceFiles={voiceFiles}
        voiceSummary={voiceSummary}
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
        activeEngine={activeEngine}
        toggleSlot={toggleSlot}
      />

      </div>}
    </section>
  )
}
