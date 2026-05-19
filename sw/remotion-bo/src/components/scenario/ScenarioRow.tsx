'use client'

import { useState, type ReactNode } from 'react'
import type { VoiceInfo } from './types'
import { ENGINE_COLORS, ENGINE_LABELS } from './types'
import { EditableText } from './EditableText'
import { VoiceBadge } from './AudioBar'
import { FieldAudioControls } from './FieldAudioControls'
import { useRowCollapseState } from './RowCollapseContext'

export function ScenarioRow({ label, role, value, voiceInfo, onCommit, pickMode, onPick, highlights,
  sectionKey, audioUrl, activeEngine, isPlaying, onTogglePlay,
  onToggleExpand,
  images, onDrop, onAddAnchor, actions, collapseKey }: {
  label: ReactNode; role: string; value: string; voiceInfo?: VoiceInfo
  onCommit: (v: string) => void
  pickMode?: boolean; onPick?: (selected: string) => void
  highlights?: string[]
  sectionKey?: string; audioUrl?: string; activeEngine?: string
  isPlaying?: boolean; onTogglePlay?: () => void
  onToggleExpand?: () => void
  images?: ReactNode
  onDrop?: (fileName: string) => void
  onAddAnchor?: (text: string) => void
  /** 레이블 하단에 렌더되는 행별 액션 버튼(저장 등). */
  actions?: ReactNode
  /** 접기/펼치기 식별자. 미지정 시 sectionKey 사용. 둘 다 없으면 토글 비활성. */
  collapseKey?: string
}) {
  const [over, setOver] = useState(false)
  const folderKey = collapseKey || sectionKey
  const { collapsed, toggle } = useRowCollapseState(folderKey)
  const previewText = (value ?? '').trim().replace(/\s+/g, ' ').slice(0, 60)
  return (
    <>
      <div
        id={sectionKey ? `row-${sectionKey}` : undefined}
        onDragOver={onDrop && !collapsed ? (e => { e.preventDefault(); setOver(true) }) : undefined}
        onDragLeave={onDrop && !collapsed ? (() => setOver(false)) : undefined}
        onDrop={onDrop && !collapsed ? (e => { e.preventDefault(); setOver(false); const f = e.dataTransfer.getData('text/plain'); if (f) onDrop(f) }) : undefined}
        className={`grid grid-cols-[100px_1fr] gap-2 items-start py-1.5 border-b border-border/30 rounded transition-colors ${
          over ? 'bg-accent/8 ring-1 ring-accent/30' : ''
        }`}
      >
        <div className="flex flex-col gap-1">
          <div className="flex items-start gap-1">
            {folderKey && (
              <button
                onClick={toggle}
                className="mt-1 text-text-secondary hover:text-accent text-[11px] w-4 flex-none"
                title={collapsed ? '펼치기' : '접기'}
                aria-label={collapsed ? '펼치기' : '접기'}
              >{collapsed ? '▶' : '▼'}</button>
            )}
            <VoiceBadge label={label} role={role} />
          </div>
          {!collapsed && actions && <div className="pl-2">{actions}</div>}
        </div>
        <div className="min-w-0">
          {collapsed ? (
            <button
              onClick={toggle}
              className="w-full text-left text-xs text-text-secondary hover:text-text-primary truncate py-1"
              title="펼치기"
            >
              {previewText || <span className="italic opacity-60">(비어 있음)</span>}
            </button>
          ) : (
            <>
              {images ? (
                <div className="mb-1 px-2 py-1.5 rounded border bg-[#1a1a14] border-[#2e2a1a]">
                  {images}
                </div>
              ) : onDrop ? (
                <div className="mb-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-dashed border-border/30 text-[11px] text-text-secondary/60 italic">
                  <span>🖼</span>
                  <span>드래그로 이미지 추가</span>
                </div>
              ) : null}
              {onDrop && over && (
                <div className="text-[11px] text-accent py-0.5">여기에 놓으면 이 섹션에 이미지 추가</div>
              )}
              <EditableText value={value} onCommit={onCommit} pickMode={pickMode} onPick={onPick} highlights={highlights} onAddAnchor={onAddAnchor} />
              {voiceInfo && audioUrl && (
                <div className="mt-1 rounded bg-bg-card/60 border border-border/40">
                  <div className="flex items-center gap-1.5 px-2 py-1">
                    <FieldAudioControls
                      sectionKey={voiceInfo.sectionKey}
                      fallbackDuration={voiceInfo.duration ?? 0}
                      isPlaying={!!isPlaying}
                      onTogglePlay={onTogglePlay ?? (() => {})}
                    />
                    <span className="text-[11px] text-text-secondary font-mono whitespace-nowrap">{voiceInfo.sectionKey}</span>
                    {activeEngine && (
                      <span className={`text-[11px] font-mono whitespace-nowrap ${ENGINE_COLORS[activeEngine] ?? 'text-text-secondary'}`}>
                        {ENGINE_LABELS[activeEngine] ?? ''}
                      </span>
                    )}
                    {!voiceInfo.exists && <span className="text-[11px] text-red-400 whitespace-nowrap">미생성</span>}
                    <button
                      onClick={onToggleExpand}
                      className="px-2 py-0.5 rounded bg-accent text-bg-primary text-[11px] font-semibold hover:opacity-90 flex-none"
                      title="파형 편집 모달 열기"
                    >
                      편집기 열기
                    </button>
                  </div>
                </div>
              )}
            </>
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
