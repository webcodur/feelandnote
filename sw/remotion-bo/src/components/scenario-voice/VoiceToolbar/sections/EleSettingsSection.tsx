'use client'

import type { EpisodeData } from '../../../EpisodeEditor'
import { type EleSettings, type EleSendOpts, DEFAULT_ELE_SETTINGS } from '../../types'
import { EleEmotionPicker } from '@/components/voice'
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
  eleBatchRunning: boolean
  eleBatchStatus: string | null
  runEleBatch: () => void
}

export function EleSettingsSection({
  episode, eleSettingsOpen, setEleSettingsOpen, eleSettings, onEleSettingsChange,
  eleSendOpts, onEleSendOptsChange, eleBatchRunning, eleBatchStatus, runEleBatch,
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
              <EleEmotionPicker
                className="pl-5"
                value={eleSendOpts.emotions}
                onChange={next => onEleSendOptsChange({ ...eleSendOpts, emotions: next })}
              />
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
