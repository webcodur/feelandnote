'use client'

import React from 'react'
import type { EpisodeData } from '../EpisodeEditor'
import type { VoiceFile, VoiceSection } from '../voice-utils'
import { resolveSegmentEngine } from '../voice-utils'

// ── EngineIndicator ──

const SLOT_LABEL: Record<string, string> = { gemini: 'GEM', elevenlabs: 'ELE' }

/** voice-select.json 의 default + slots 매핑을 한눈에 보여주는 행.
 *
 *   default GEM   · 이 행은 ELE override   [GEM ●] [ELE ◉]
 *                                              ↑ 클릭 → slots 에 박힘
 *
 * - GEM/ELE 버튼: 클릭 시 그 엔진을 이 행의 override 로 박는다(같은 엔진 재클릭 시 override 해제 → default 로 회귀).
 * - default 표시: 전역 기본 엔진(보통 GEM). 상단 VoiceToolbar 의 PROD 토글에서 변경.
 * - override 배지: 이 행이 slots 에 박혀 default 와 다른 엔진을 쓰는 경우.
 */
export function EngineIndicator({ section, episode, activeEngine, defaultEngine, hasOverride, onToggle }: {
  section: VoiceSection
  episode: EpisodeData
  activeEngine: string
  /** voice-select.json 의 default — 전역 기본 엔진. */
  defaultEngine?: string
  /** 현재 행이 slots 에 박혀 default 와 다른 엔진을 쓰는지. */
  hasOverride?: boolean
  onToggle: (sectionKey: string, engine: string) => void
}) {
  const expected = resolveSegmentEngine(section.key, episode)?.engine ?? null
  const engines: { label: string; color: string; slot: string; file?: VoiceFile }[] = [
    { label: 'GEM', color: 'text-blue-400', slot: 'gemini', file: section.gemini },
    { label: 'ELE', color: 'text-purple-400', slot: 'elevenlabs', file: section.elevenlabs },
  ]
  const defaultLabel = defaultEngine ? (SLOT_LABEL[defaultEngine] ?? defaultEngine.toUpperCase()) : '—'
  const activeLabel = SLOT_LABEL[activeEngine] ?? activeEngine.toUpperCase()

  // 카드 한 칸 — 모든 칩이 같은 폭 · 같은 높이.
  const CHIP = 'w-20 h-12 flex flex-col items-center justify-center gap-0.5 rounded border font-mono shrink-0'
  const CHIP_LABEL = 'text-[9px] tracking-[0.2em] text-text-dim leading-none'
  const CHIP_VALUE = 'text-[13px] font-semibold leading-none'

  return (
    <section className="relative rounded-md border border-emerald-500/15 bg-[#0d1614]/60 p-4 space-y-3">
      <span aria-hidden className="absolute top-0 left-0 w-8 h-px bg-emerald-400/50" />
      <span aria-hidden className="absolute top-0 left-0 w-px h-8 bg-emerald-400/50" />

      {/* 헤더 — §00 ROUTE */}
      <div className="flex items-center gap-3 text-[11px]">
        <span className="text-[9px] font-mono tracking-[0.28em] text-emerald-400/70">§00</span>
        <span className="font-semibold text-text-primary tracking-tight">ROUTE</span>
        <span className="text-text-dim font-mono text-[10px]">렌더가 사용할 엔진 매핑 · voice-select.json</span>
        <span className="ml-auto font-mono text-[9px] tracking-[0.2em]">
          {hasOverride ? (
            <span className="px-1.5 py-px rounded border border-amber-500/50 text-amber-300" title="이 행은 slots 에 박혀 기본 엔진과 다른 엔진을 사용 중. 활성 엔진 재클릭 시 override 해제.">
              OVERRIDE
            </span>
          ) : (
            <span className="px-1.5 py-px rounded border border-text-dim/30 text-text-dim" title="별도 매핑 없이 기본 엔진을 따른다.">
              FOLLOW DEFAULT
            </span>
          )}
        </span>
      </div>

      {/* 본문 — 한 줄에 같은 폭 칩 정렬 */}
      <div className="flex items-center gap-3">
        {/* default */}
        <div className={`${CHIP} border-text-dim/30 bg-bg-card/40`}>
          <span className={CHIP_LABEL}>DEFAULT</span>
          <span className={`${CHIP_VALUE} text-text-primary`}>{defaultLabel}</span>
        </div>

        {/* 화살표 */}
        <span aria-hidden className="text-emerald-400/60 text-[18px] leading-none select-none">→</span>

        {/* 이 행 */}
        <div className={`${CHIP} ${hasOverride ? 'border-amber-500/50 bg-amber-500/5' : 'border-text-dim/30 bg-bg-card/40'}`}>
          <span className={CHIP_LABEL}>THIS ROW</span>
          <span className={`${CHIP_VALUE} ${hasOverride ? 'text-amber-300' : 'text-text-primary'}`}>{activeLabel}</span>
        </div>

        {/* 우측 — 엔진 토글 (같은 폭·같은 높이 칩) */}
        <div
          className="ml-auto flex items-center gap-2"
          title="버튼 클릭 → 이 행을 그 엔진으로 override. 활성 버튼 재클릭 → 기본으로 회귀."
        >
          {engines.map(eng => {
            const isActive = activeEngine === eng.slot
            if (!eng.file) {
              const needed = expected === eng.slot
              return (
                <span
                  key={eng.slot}
                  className={`${CHIP} ${eng.color} border-text-dim/20 bg-bg-card/20 opacity-50`}
                  title="이 엔진 wav 파일 없음 · 먼저 생성 필요"
                >
                  <span className={CHIP_LABEL}>{needed ? 'MISSING' : 'EMPTY'}</span>
                  <span className={CHIP_VALUE}>{eng.label}</span>
                </span>
              )
            }
            return (
              <button
                key={eng.slot}
                onClick={(e) => { e.stopPropagation(); onToggle(section.key, eng.slot) }}
                className={`${CHIP} ${
                  isActive
                    ? `${eng.color} border-current bg-current/10`
                    : `${eng.color} border-text-dim/20 opacity-70 hover:opacity-100 hover:border-current`
                }`}
                title={
                  isActive
                    ? (hasOverride && eng.slot !== defaultEngine
                        ? `${eng.label} 사용 중 (override). 다시 누르면 기본으로 회귀.`
                        : `${eng.label} 사용 중 (기본 따름)`)
                    : `클릭 → 이 행을 ${eng.label} 로 override`
                }
              >
                <span className={CHIP_LABEL}>{isActive ? 'ACTIVE' : 'SET'}</span>
                <span className={`${CHIP_VALUE} ${isActive ? 'font-bold' : ''}`}>{eng.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
