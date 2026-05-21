'use client'

import { useState, useCallback } from 'react'
import type { EpisodeData } from '../EpisodeEditor'
import type { VoiceSummary } from '../voice-utils'
import { resolveSegmentEngine } from '../voice-utils'
import {
  type EleSettings,
  type EleSendOpts,
  type VoiceSelect,
  DEFAULT_ELE_SETTINGS,
  ELE_EMOTIONS,
  buildEleText,
} from './types'

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
  eleSendOpts: EleSendOpts
  onEleSendOptsChange: (o: EleSendOpts) => void
  onRefresh: () => void
  post: (url: string, body: unknown) => Promise<void>
  speakerPanelNode?: React.ReactNode
}

export function VoiceToolbar({
  episode, series, name, voiceSummary, mode, hasELVoiceId,
  vs, onSaveVs, eleSettings, onEleSettingsChange, eleSendOpts, onEleSendOptsChange, onRefresh, post,
  speakerPanelNode,
}: VoiceToolbarProps) {
  const [engine, setEngine] = useState('gemini')
  const [role, setRole] = useState('')
  const [only, setOnly] = useState('')
  const [eleSettingsOpen, setEleSettingsOpen] = useState(false)
  const [eleBatchRunning, setEleBatchRunning] = useState(false)
  const [eleBatchStatus, setEleBatchStatus] = useState<string | null>(null)

  const toggleEmotion = useCallback((em: string) => {
    const has = eleSendOpts.emotions.includes(em)
    if (has) {
      onEleSendOptsChange({ ...eleSendOpts, emotions: eleSendOpts.emotions.filter(e => e !== em) })
    } else if (eleSendOpts.emotions.length >= 2) {
      onEleSendOptsChange({ ...eleSendOpts, emotions: [eleSendOpts.emotions[1], em] })
    } else {
      onEleSendOptsChange({ ...eleSendOpts, emotions: [...eleSendOpts.emotions, em] })
    }
  }, [eleSendOpts, onEleSendOptsChange])

  const [emotionDraft, setEmotionDraft] = useState('')
  const addCustomEmotion = useCallback(() => {
    const v = emotionDraft.trim()
    if (!v) return
    if (eleSendOpts.emotions.includes(v)) { setEmotionDraft(''); return }
    const next = eleSendOpts.emotions.length >= 2
      ? [eleSendOpts.emotions[1], v]
      : [...eleSendOpts.emotions, v]
    onEleSendOptsChange({ ...eleSendOpts, emotions: next })
    setEmotionDraft('')
  }, [emotionDraft, eleSendOpts, onEleSendOptsChange])

  // shorts 배열 정규화 (단일 객체 호환)
  const shortsArr: Array<{ segments: Array<{ id: string; role: string; text?: string }> }> =
    Array.isArray(episode.shorts) ? episode.shorts as any : (episode.shorts ? [episode.shorts as any] : [])
  const hasShorts = shortsArr.some(s => s?.segments?.length > 0)

  /** 옵션 2: 모든 쇼츠의 셀럽 구간을 (key, text) 페어로. 접두사 `shorts-{N}/` 필수 (1-based). */
  const collectShortsCelebKeys = (predicate: (seg: { role: string; text?: string }) => boolean) => {
    const out: { key: string; text: string }[] = []
    shortsArr.forEach((cfg, sIdx) => {
      const prefix = `shorts-${sIdx + 1}/`  // 1-based
      cfg?.segments?.forEach((s, i) => {
        if (!predicate(s)) return
        const idx = String(i + 1).padStart(2, '0')
        out.push({ key: `${prefix}S${idx}-${s.id}`, text: s.text ?? '' })
      })
    })
    return out
  }

  const [expanded, setExpanded] = useState(true)

  return (
    <div className={`bg-bg-card border border-border/50 rounded-lg mb-4 ${!expanded ? 'overflow-hidden h-[34px]' : ''}`}>
      <button 
        className="w-full flex items-center gap-2 px-3 py-2 text-left cursor-pointer select-none outline-none hover:bg-bg-hover"
        onClick={() => setExpanded(!expanded)}
      >
        <span className={`text-[10px] text-text-dim ${expanded ? 'rotate-90' : ''}`}>▶</span>
        <span className="font-bold text-[12px] text-text-secondary">음성 엔진 제어판 (VoiceToolbar)</span>
        
        <span className="ml-auto opacity-80 text-[10px] font-mono font-medium flex items-center gap-2">
          <span className="bg-bg-main px-2 py-0.5 rounded-full border border-border text-slate-800 font-bold">
            {voiceSummary.total}파일 · {(voiceSummary.totalSizeKB / 1024).toFixed(1)}MB
          </span>
        </span>
      </button>

      <div className="p-3 pt-1 space-y-1.5 border-t border-border/40">
      {/* 2. Generate tools */}
      <div className="space-y-2">
        <div className="text-[12px] text-slate-900 font-black">일괄 생성 도구</div>
        
        <div className="bg-bg-main border border-border/60 rounded p-2 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <select value={engine} onChange={e => setEngine(e.target.value)}
              className="bg-white border border-slate-300 text-slate-950 font-black rounded px-2.5 py-1 text-xs outline-none focus:border-accent transition-colors shadow-sm cursor-pointer">
              <option value="gemini">Gemini</option>
            </select>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="bg-white border border-slate-300 text-slate-950 font-black rounded px-2.5 py-1 text-xs outline-none focus:border-accent transition-colors shadow-sm cursor-pointer">
              <option value="">모든 화자</option>
              <option value="narrator">나레이터</option>
              <option value="summary">요약맨</option>
              <option value="celeb">셀럽</option>
            </select>
            <input placeholder="특정 대상 ID (예: book-0-title)" value={only} onChange={e => setOnly(e.target.value)}
              className="bg-white border border-slate-300 text-slate-950 font-bold rounded px-2.5 py-1 text-xs w-48 outline-none focus:border-accent placeholder:text-slate-400 transition-colors shadow-sm" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => post(`/api/${series}/voice/generate`, { episode: name, engine, role: role || undefined, only: only || undefined })}
              className="px-3 py-1.5 rounded text-xs font-black bg-accent text-white hover:bg-accent-hover transition-colors shadow-sm">
              전체 생성
            </button>
            <button
              onClick={() => post(`/api/${series}/voice/generate`, { episode: name, engine, role: role || undefined, only: only || undefined, force: false })}
              className="px-3 py-1.5 rounded text-xs font-black bg-white border border-slate-300 text-slate-900 hover:border-accent hover:text-accent hover:bg-slate-50 transition-colors shadow-sm">
              누락분만 생성
            </button>
            {hasShorts && (
              <button
                onClick={() => post(`/api/${series}/voice/generate`, { episode: name, engine, role: 'shorts', only: only || undefined })}
                className="px-3 py-1.5 rounded text-xs font-black bg-white border border-slate-300 text-slate-900 hover:border-accent hover:text-accent hover:bg-slate-50 transition-colors shadow-sm">
                쇼츠 음성
              </button>
            )}
          </div>
        </div>

        <p className="text-xs text-slate-600 font-bold leading-relaxed px-1">
          선택한 옵션에 따라 TTS 음성을 일괄 생성합니다. 셀럽의 고품질 음성은 각 행의 설정에서 ELE를 통해 개별 생성하는 것을 권장합니다.
        </p>
      </div>

      {/* 3. 화자 설정 (Host + 추가 화자 통합) */}
      {speakerPanelNode}

      {/* 4. ELE settings */}
      {hasELVoiceId && (
        <div>
          <button 
            type="button"
            className="w-full flex items-center gap-2 px-2 py-1.5 text-left cursor-pointer select-none outline-none hover:bg-bg-hover rounded border border-slate-200" 
            onClick={() => setEleSettingsOpen(!eleSettingsOpen)}
          >
            <span className={`text-[10px] text-text-dim shrink-0 ${eleSettingsOpen ? 'rotate-90' : ''}`}>▶</span>
            <span className="text-xs font-black text-purple-900 select-none">ELEVENLABS 설정</span>
            <span className="text-xs text-purple-700 font-black font-mono flex-1 truncate ml-1">{episode.host?.elevenlabsVoiceId}</span>
          </button>
          {eleSettingsOpen && (
            <div className="mt-2 space-y-2.5 bg-purple-50 rounded-lg p-3.5 border-2 border-purple-300 shadow-sm">
              {(['stability', 'similarity_boost', 'style', 'speed', 'volumeBoost'] as const).map(k => {
                const cfg: Record<string, { min: number; max: number; step: number; suffix?: string; def: number }> = {
                  stability: { min: 0, max: 1, step: 0.01, def: 0.75 },
                  similarity_boost: { min: 0, max: 1, step: 0.01, def: 0.75 },
                  style: { min: 0, max: 1, step: 0.01, def: 0.0 },
                  speed: { min: 0.5, max: 2, step: 0.1, def: 1.0 },
                  volumeBoost: { min: 0, max: 12, step: 1, suffix: 'dB', def: 0 },
                }
                const c = cfg[k]
                const val = eleSettings[k]
                const isChanged = val !== c.def
                return (
                  <div key={k} className="flex items-center gap-3">
                    <span className={`text-xs w-24 shrink-0 ${isChanged ? 'text-purple-900 font-extrabold' : 'text-slate-700 font-bold'}`}>
                      {k.replace('_', ' ')}
                    </span>
                    <input type="range" min={c.min} max={c.max} step={c.step} value={val}
                      onChange={e => onEleSettingsChange({ ...eleSettings, [k]: Number(e.target.value) })}
                      className="flex-1 h-2 rounded cursor-pointer accent-purple-600 bg-purple-200"
                    />
                    <span className={`text-xs w-14 text-right font-mono font-bold ${
                      isChanged 
                        ? 'text-purple-700 font-black bg-purple-100 px-1 py-0.5 rounded shadow-sm' 
                        : 'text-slate-600'
                    }`}>
                      {c.suffix ? `${val}${c.suffix}` : val.toFixed(2)}
                    </span>
                  </div>
                )
              })}
              {/* 페이지 기본 톤 — 구간별 톤이 비어 있는 모든 셀럽 구간에 적용된다 */}
              <div className="space-y-2 pt-2 border-t border-purple-300">
                <div className="text-[11px] text-slate-600 font-bold">
                  페이지 기본 톤 <span className="text-slate-800 font-extrabold">(구간별 톤 없는 모든 셀럽 구간에 적용)</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={eleSendOpts.emotionEnabled}
                    onChange={e => onEleSendOptsChange({ ...eleSendOpts, emotionEnabled: e.target.checked })}
                    className="w-4 h-4 accent-purple-600 cursor-pointer" />
                  <span className="text-xs text-slate-800 font-extrabold">감정 태그 활성화</span>
                  {eleSendOpts.emotionEnabled && eleSendOpts.emotions.length > 0 && (
                    <span className="text-[11px] font-mono text-purple-700 font-black">[{eleSendOpts.emotions.join(', ')}]</span>
                  )}
                </label>
                {eleSendOpts.emotionEnabled && (
                  <div className="flex flex-col gap-1.5 pl-5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      {ELE_EMOTIONS.map(em => {
                        const idx = eleSendOpts.emotions.indexOf(em)
                        const sel = idx >= 0
                        return (
                          <button key={em} onClick={() => toggleEmotion(em)}
                            className={`px-2 py-0.5 rounded text-[11px] border transition-colors ${
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
                        value={emotionDraft}
                        onChange={e => setEmotionDraft(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCustomEmotion() } }}
                        placeholder="직접 입력"
                        className="bg-white border border-slate-300 rounded px-2 py-0.5 text-xs w-[110px] text-slate-950 font-bold outline-none focus:border-purple-600"
                      />
                      <button
                        type="button"
                        onClick={addCustomEmotion}
                        disabled={!emotionDraft.trim()}
                        className="text-xs px-2 py-0.5 rounded border border-purple-500 text-purple-700 hover:bg-purple-100 font-black disabled:opacity-40 disabled:cursor-not-allowed"
                      >+</button>
                    </div>
                    {eleSendOpts.emotions.some(t => !ELE_EMOTIONS.includes(t)) && (
                      <div className="flex flex-wrap gap-1.5">
                        {eleSendOpts.emotions.filter(t => !ELE_EMOTIONS.includes(t)).map(t => (
                          <button
                            key={t}
                            onClick={() => onEleSendOptsChange({ ...eleSendOpts, emotions: eleSendOpts.emotions.filter(x => x !== t) })}
                            title="삭제"
                            className="text-[11px] px-2 py-0.5 rounded border bg-purple-600 text-white border-purple-600 font-extrabold flex items-center gap-1.5 shadow-sm"
                          >
                            <span>{t}</span>
                            <span className="opacity-80">×</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={eleSendOpts.trailEnabled}
                    onChange={e => onEleSendOptsChange({ ...eleSendOpts, trailEnabled: e.target.checked })}
                    className="w-4 h-4 accent-purple-600 cursor-pointer" />
                  <span className="text-xs text-slate-800 font-extrabold">끝 패딩 추가</span>
                  <span className="text-[11px] font-mono text-slate-500 font-extrabold">... ... ...</span>
                </label>
              </div>

              <div className="flex items-center gap-3 pt-2 border-t border-purple-300">
                <button
                  onClick={() => onEleSettingsChange({ ...DEFAULT_ELE_SETTINGS })}
                  className="text-[11px] text-slate-600 hover:text-purple-700 font-extrabold underline cursor-pointer"
                >기본값 복원</button>
                <button
                  onClick={async () => {
                    if (eleBatchRunning) return
                    setEleBatchRunning(true)
                    const ho = episode.host!
                    const targets: { key: string; text: string; voiceId: string }[] = []
                    if (ho.philosophy) targets.push({ key: 'B2-philosophy', text: ho.philosophy, voiceId: ho.elevenlabsVoiceId! })
                    if (ho.featuredQuote) targets.push({ key: 'A3-featured-quote', text: ho.featuredQuote, voiceId: ho.elevenlabsVoiceId! })
                    // 캐릭터 보이스(geminiVoice) 오버라이드 segment는 ELE 일괄 생성 대상에서 제외.
                    // segment·speaker 우선순위로 해소된 voiceId가 segment마다 다를 수 있다.
                    for (const t of collectShortsCelebKeys(s => s.role === 'celeb' && !!s.text)) {
                      const spec = resolveSegmentEngine(t.key, episode)
                      if (spec?.engine !== 'elevenlabs') continue
                      if (t.text) targets.push({ ...t, voiceId: spec.voiceParam })
                    }
                    let ok = 0, fail = 0
                    for (const t of targets) {
                      setEleBatchStatus(`${t.key} 생성 중...`)
                      try {
                        const res = await fetch(`/api/${series}/voice/elevenlabs/preview`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ voiceId: t.voiceId, text: buildEleText(t.text, eleSendOpts), settings: eleSettings }),
                        })
                        const d = await res.json()
                        if (!d.success) { fail++; continue }
                        const sr = await fetch(`/api/${series}/voice/save`, {
                          method: 'POST', headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ episode: name, fileName: `elevenlabs/${t.key}.wav`, base64: d.base64 }),
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
                  className="px-3 py-1.5 rounded text-xs font-black bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {eleBatchRunning ? '생성 중...' : 'ELE 전체 생성'}
                </button>
                {eleBatchStatus && <span className="text-xs text-purple-950 font-bold bg-purple-100 px-2 py-0.5 rounded shadow-sm">{eleBatchStatus}</span>}
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  )
}
