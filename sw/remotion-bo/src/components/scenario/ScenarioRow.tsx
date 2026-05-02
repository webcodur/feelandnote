'use client'

import React, { useState } from 'react'
import type { VoiceInfo } from './types'
import { ENGINE_COLORS, ENGINE_LABELS } from './types'
import { EditableText } from './EditableText'
import { VoiceBadge } from './AudioBar'

export function ScenarioRow({ label, role, value, voiceInfo, onCommit, pickMode, onPick, highlights,
  sectionKey, audioUrl, activeEngine, isPlaying, onTogglePlay,
  expanded, onToggleExpand, renderExpanded,
  images, onDrop, onAddAnchor, actions }: {
  label: string; role: string; value: string; voiceInfo?: VoiceInfo
  onCommit: (v: string) => void
  pickMode?: boolean; onPick?: (selected: string) => void
  highlights?: string[]
  sectionKey?: string; audioUrl?: string; activeEngine?: string
  isPlaying?: boolean; onTogglePlay?: () => void
  expanded?: boolean; onToggleExpand?: () => void
  renderExpanded?: () => React.ReactNode
  images?: React.ReactNode
  onDrop?: (fileName: string) => void
  onAddAnchor?: (text: string) => void
  /** 레이블 하단에 렌더되는 행별 액션 버튼(저장 등). */
  actions?: React.ReactNode
}) {
  const [over, setOver] = useState(false)
  return (
    <>
      <div
        id={sectionKey ? `row-${sectionKey}` : undefined}
        onDragOver={onDrop ? (e => { e.preventDefault(); setOver(true) }) : undefined}
        onDragLeave={onDrop ? (() => setOver(false)) : undefined}
        onDrop={onDrop ? (e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.getData('text/plain'); if (f) onDrop(f) }) : undefined}
        className={`grid grid-cols-[100px_1fr] gap-2 items-start py-1.5 border-b border-border/30 rounded transition-colors ${
          over ? 'bg-accent/8 ring-1 ring-accent/30' : ''
        }`}
      >
        <div className="flex flex-col gap-1">
          <VoiceBadge label={label} role={role} />
          {actions && <div className="pl-2">{actions}</div>}
        </div>
        <div className="min-w-0">
          {(images || onDrop) && (
            <div className={`mb-1 px-2 py-1.5 rounded border ${images ? 'bg-[#1a1a14] border-[#2e2a1a]' : 'bg-transparent border-dashed border-border/30'}`}>
              {images || <div className="text-[10px] text-text-secondary italic py-1">이미지를 드래그하여 추가</div>}
            </div>
          )}
          {onDrop && over && (
            <div className="text-[10px] text-accent py-0.5">여기에 놓으면 이 섹션에 이미지 추가</div>
          )}
          <EditableText value={value} onCommit={onCommit} pickMode={pickMode} onPick={onPick} highlights={highlights} onAddAnchor={onAddAnchor} />
          {voiceInfo && audioUrl && (
            <div className="mt-1 rounded bg-[#1a1f2a] border border-[#2a3040]">
              <div className="flex items-center gap-1.5 px-2 py-1">
                <button
                  onClick={onTogglePlay}
                  className="px-1.5 py-0.5 rounded bg-bg-card border border-border hover:bg-bg-hover text-text-secondary text-[10px]"
                  title="이 구간 재생/정지"
                >
                  {isPlaying ? '⏸' : '▶'}
                </button>
                <span className="text-[10px] text-text-secondary font-mono">{voiceInfo.sectionKey}</span>
                <span className="text-[10px] text-text-secondary">{(voiceInfo.duration ?? 0).toFixed(1)}s</span>
                {activeEngine && (
                  <span className={`text-[10px] font-mono ${ENGINE_COLORS[activeEngine] ?? 'text-text-secondary'}`}>
                    {ENGINE_LABELS[activeEngine] ?? ''}
                  </span>
                )}
                {!voiceInfo.exists && <span className="text-[10px] text-red-400">미생성</span>}
                <button
                  onClick={onToggleExpand}
                  className="ml-auto px-2 py-0.5 rounded bg-accent text-bg-primary text-[10px] font-semibold hover:opacity-90"
                  title="파형 편집 모달 열기"
                >
                  편집기 열기
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

export function AddFieldButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="py-1 border-b border-border/30">
      <button onClick={onClick} className="text-[11px] text-text-secondary hover:text-accent transition-colors">
        {label}
      </button>
    </div>
  )
}
