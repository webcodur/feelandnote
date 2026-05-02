'use client'

import React from 'react'
import type { EpisodeData } from '../EpisodeEditor'
import type { VoiceFile, VoiceSection } from '../voice-utils'
import { resolveSegmentEngine } from '../voice-utils'

// ── EngineIndicator ──

/** Compact engine status row: CMN / GEM / ELE
 *
 * 기대 엔진(resolveSegmentEngine 결과)과 슬롯이 일치하는데 파일이 없을 때만 ○ 표시.
 * 캐릭터 보이스(shorts segment.geminiVoice) 적용 segment는 GEM 누락이 강조되고,
 * 일반 셀럽 segment는 ELE 누락이 강조된다.
 */
export function EngineIndicator({ section, episode, activeEngine, onToggle }: {
  section: VoiceSection
  episode: EpisodeData
  activeEngine: string
  onToggle: (sectionKey: string, engine: string) => void
}) {
  const expected = resolveSegmentEngine(section.key, episode)?.engine ?? null
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
          const needed = expected === eng.slot
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
