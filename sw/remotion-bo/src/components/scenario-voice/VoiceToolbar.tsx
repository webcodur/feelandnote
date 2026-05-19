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
import { EditorPanel } from '../scenario/EditorPanel'

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
          <span className="bg-bg-main px-2 py-0.5 rounded-full border border-border">
            {voiceSummary.total}파일 · {(voiceSummary.totalSizeKB / 1024).toFixed(1)}MB
          </span>
        </span>
      </button>

      <div className="p-3 pt-1 space-y-1.5 border-t border-border/40">
      {/* 2. Generate tools */}
      <div className="space-y-2">
        <div className="text-[11px] text-text-secondary font-bold">일괄 생성 도구</div>
        
        <div className="bg-bg-main border border-border/60 rounded p-2 flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <select value={engine} onChange={e => setEngine(e.target.value)}
              className="bg-bg-card border border-border/50 rounded px-2 py-1 text-[11px] outline-none focus:border-accent/60 transition-colors">
              <option value="gemini">Gemini</option>
            </select>
            <select value={role} onChange={e => setRole(e.target.value)}
              className="bg-bg-card border border-border/50 rounded px-2 py-1 text-[11px] outline-none focus:border-accent/60 transition-colors">
              <option value="">모든 화자</option>
              <option value="narrator">나레이터</option>
              <option value="summary">요약맨</option>
              <option value="celeb">셀럽</option>
            </select>
            <input placeholder="특정 대상 ID (예: book-0-title)" value={only} onChange={e => setOnly(e.target.value)}
              className="bg-bg-card border border-border/50 rounded px-2 py-1 text-[11px] w-48 outline-none focus:border-accent/60 text-text-primary placeholder:text-text-dim transition-colors" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => post(`/api/${series}/voice/generate`, { episode: name, engine, role: role || undefined, only: only || undefined })}
              className="px-3 py-1.5 rounded text-[11px] font-semibold bg-accent text-bg-main hover:bg-accent-hover transition-colors shadow-sm">
              전체 생성
            </button>
            <button
              onClick={() => post(`/api/${series}/voice/generate`, { episode: name, engine, role: role || undefined, only: only || undefined, force: false })}
              className="px-3 py-1.5 rounded text-[11px] font-semibold bg-bg-hover border border-border/60 hover:border-accent/50 hover:text-accent transition-colors">
              누락분만 생성
            </button>
            {hasShorts && (
              <button
                onClick={() => post(`/api/${series}/voice/generate`, { episode: name, engine, role: 'shorts', only: only || undefined })}
                className="px-3 py-1.5 rounded text-[11px] font-semibold bg-bg-hover border border-border/60 hover:border-accent/50 hover:text-accent transition-colors">
                쇼츠 음성
              </button>
            )}
          </div>
        </div>

        <p className="text-[10px] text-text-dim leading-relaxed px-1">
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
            className="w-full flex items-center gap-2 px-2 py-1.5 text-left cursor-pointer select-none outline-none hover:bg-bg-hover rounded" 
            onClick={() => setEleSettingsOpen(!eleSettingsOpen)}
          >
            <span className={`text-[10px] text-text-dim shrink-0 ${eleSettingsOpen ? 'rotate-90' : ''}`}>▶</span>
            <span className="text-[11px] font-bold text-text-secondary select-none">ELEVENLABS 설정</span>
            <span className="text-[10px] text-purple-300/80 font-mono flex-1 truncate ml-1">{episode.host?.elevenlabsVoiceId}</span>
          </button>
          {eleSettingsOpen && (
            <div className="mt-2 space-y-2 bg-black/20 rounded-lg p-3 border border-purple-500/20">
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
              {/* 페이지 기본 톤 — 구간별 톤이 비어 있는 모든 셀럽 구간에 적용된다 */}
              <div className="space-y-2 pt-2 border-t border-border/50">
                <div className="text-[10px] text-text-dim">
                  페이지 기본 톤 <span className="text-text-secondary">(구간별 톤 없는 모든 셀럽 구간에 적용)</span>
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={eleSendOpts.emotionEnabled}
                    onChange={e => onEleSendOptsChange({ ...eleSendOpts, emotionEnabled: e.target.checked })}
                    className="accent-purple-400" />
                  <span className="text-[11px] text-text-secondary">감정 태그</span>
                  {eleSendOpts.emotionEnabled && eleSendOpts.emotions.length > 0 && (
                    <span className="text-[10px] font-mono text-purple-300">[{eleSendOpts.emotions.join(', ')}]</span>
                  )}
                </label>
                {eleSendOpts.emotionEnabled && (
                  <div className="flex flex-col gap-1 pl-5">
                    <div className="flex flex-wrap items-center gap-1">
                      {ELE_EMOTIONS.map(em => {
                        const idx = eleSendOpts.emotions.indexOf(em)
                        const sel = idx >= 0
                        return (
                          <button key={em} onClick={() => toggleEmotion(em)}
                            className={`px-2 py-0.5 rounded text-[10px] border transition-colors ${
                              sel ? 'bg-purple-500/30 text-purple-200 border-purple-500/60 font-semibold'
                                  : 'bg-black/40 border-white/10 text-text-secondary hover:border-purple-500/40'
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
                        className="bg-black/40 border border-white/10 rounded px-1.5 py-0.5 text-[10px] w-[100px] text-text-primary outline-none focus:border-purple-500/40"
                      />
                      <button
                        type="button"
                        onClick={addCustomEmotion}
                        disabled={!emotionDraft.trim()}
                        className="text-[10px] px-1.5 py-0.5 rounded border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 disabled:opacity-40 disabled:cursor-not-allowed"
                      >+</button>
                    </div>
                    {eleSendOpts.emotions.some(t => !ELE_EMOTIONS.includes(t)) && (
                      <div className="flex flex-wrap gap-1">
                        {eleSendOpts.emotions.filter(t => !ELE_EMOTIONS.includes(t)).map(t => (
                          <button
                            key={t}
                            onClick={() => onEleSendOptsChange({ ...eleSendOpts, emotions: eleSendOpts.emotions.filter(x => x !== t) })}
                            title="삭제"
                            className="text-[10px] px-2 py-0.5 rounded border bg-purple-500/30 text-purple-200 border-purple-500/60 font-semibold flex items-center gap-1"
                          >
                            <span>{t}</span>
                            <span className="opacity-70">×</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={eleSendOpts.trailEnabled}
                    onChange={e => onEleSendOptsChange({ ...eleSendOpts, trailEnabled: e.target.checked })}
                    className="accent-purple-400" />
                  <span className="text-[11px] text-text-secondary">끝 패딩</span>
                  <span className="text-[10px] font-mono text-text-dim">... ... ...</span>
                </label>
              </div>

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
    </div>
  )
}
