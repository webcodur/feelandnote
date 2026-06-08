'use client'

import type { EpisodeData } from '../../../EpisodeEditor'
import { type EleSettings, type EleSendOpts, DEFAULT_ELE_SETTINGS, ELE_EMOTIONS } from '../../types'
import { ELE_SLIDER_KEYS, ELE_SLIDER_CFG } from '../constants'

// ── ELEVENLABS 설정 ──

type EleSettingsSectionProps = {
  episode: EpisodeData
  eleSettingsOpen: boolean
  setEleSettingsOpen: (v: boolean) => void
  eleSettings: EleSettings
  onEleSettingsChange: (s: EleSettings) => void
  eleSendOpts: EleSendOpts
  onEleSendOptsChange: (o: EleSendOpts) => void
  emotionDraft: string
  setEmotionDraft: (v: string) => void
  toggleEmotion: (em: string) => void
  addCustomEmotion: () => void
  eleBatchRunning: boolean
  eleBatchStatus: string | null
  runEleBatch: () => void
}

export function EleSettingsSection({
  episode, eleSettingsOpen, setEleSettingsOpen, eleSettings, onEleSettingsChange,
  eleSendOpts, onEleSendOptsChange, emotionDraft, setEmotionDraft,
  toggleEmotion, addCustomEmotion, eleBatchRunning, eleBatchStatus, runEleBatch,
}: EleSettingsSectionProps) {
  return (
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
          {ELE_SLIDER_KEYS.map(k => {
            const c = ELE_SLIDER_CFG[k]
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
              onClick={runEleBatch}
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
  )
}
