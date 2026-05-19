'use client'

import { useState, type ReactNode } from 'react'
import type { VoiceInfo } from './types'
import { ENGINE_COLORS, ENGINE_LABELS, ROLE_COLORS, ROLE_LABELS, normalizeRole } from './types'
import { EditableText } from './EditableText'
import { FieldAudioControls } from './FieldAudioControls'
import { useRowCollapseState } from './RowCollapseContext'
import { EditorPanel } from './EditorPanel'

/** ScenarioRow 의 행 단위 DND 손잡이 묶음. 타이틀바 빈 공간이 그대로 손잡이 역할. */
export type RowDragHandle = {
  draggable: boolean
  onDragStart: (e: React.DragEvent) => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onDragEnd: (e: React.DragEvent) => void
  isDragging: boolean
  isOver: boolean
}

/**
 * 한 필드/구간 행. 윈도우 프로그램 타이틀바 패턴.
 *
 *   ┌───────────────────────────────────────────────────────────┐
 *   │ ▼  라벨 [역할]   ⋮⋮ (drag handle = 빈 영역)   [저장][삭제] │  ← 타이틀바
 *   ├───────────────────────────────────────────────────────────┤
 *   │ (이미지 영역)                                              │
 *   │ (편집 가능 텍스트)                                         │
 *   │ (음성 정보 표시줄)                                         │
 *   └───────────────────────────────────────────────────────────┘
 *
 * 타이틀바 양 끝 영역(토글·라벨·액션 버튼)은 그대로 클릭 가능. 가운데 빈 공간은 draggable 영역 — 끌면 행 단위 reorder.
 * dragHandle prop 미전달 시 손잡이 자리는 단순 spacer.
 */
export function ScenarioRow({ label, role, value, voiceInfo, onCommit, pickMode, onPick, highlights,
  sectionKey, audioUrl, activeEngine, isPlaying, onTogglePlay,
  onToggleExpand,
  images, onDrop, onAddAnchor, actions, collapseKey, dragHandle, leadStyle, footer }: {
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
  /** 타이틀바 우측에 들어가는 행별 액션 버튼(저장·삭제 등). */
  actions?: ReactNode
  /** 접기/펼치기 식별자. 미지정 시 sectionKey 사용. 둘 다 없으면 토글 비활성. */
  collapseKey?: string
  /** 행 단위 DND 손잡이 — 타이틀바 빈 공간이 손잡이로 사용된다. */
  dragHandle?: RowDragHandle
  /** 화자 색띠 등 외부 강조 스타일을 외곽에 입힐 때 사용. */
  leadStyle?: React.CSSProperties
  /** 본문 아래에 같은 외곽선 안에 들어가는 부속 영역(옵션바/SFX/음량 등). 펼침 상태에서만 표시. */
  footer?: ReactNode
}) {
  const [over, setOver] = useState(false)
  const folderKey = collapseKey || sectionKey
  const { collapsed, toggle } = useRowCollapseState(folderKey)
  const previewText = (value ?? '').trim().replace(/\s+/g, ' ').slice(0, 80)
  const simpleRole = normalizeRole(role)
  const roleLabel = ROLE_LABELS[simpleRole]
  const roleColor = ROLE_COLORS[simpleRole]

  const dragging = dragHandle?.isDragging
  const dropOver = dragHandle?.isOver

  return (
    <div
      id={sectionKey ? `row-${sectionKey}` : undefined}
      style={leadStyle}
      className={`mb-1 rounded border overflow-hidden transition-opacity ${
        dropOver ? 'border-accent ring-1 ring-accent/40' : 'border-border/40'
      } ${dragging ? 'opacity-50' : ''}`}
    >
      {/* ── 타이틀바 ── 손잡이/액션 외 영역 클릭 시 전체 토글 */}
      <div
        className={`flex items-stretch text-[11px] bg-bg-hover/80 border-b border-border/60 select-none ${folderKey ? 'cursor-pointer hover:bg-bg-hover transition-colors' : ''}`}
        onClick={folderKey ? (e => {
          // 손잡이/액션 클릭은 위임 중단(stopPropagation) 해야 토글 안 됨
          if (e.defaultPrevented) return
          toggle()
        }) : undefined}
        // drop은 본문 영역과 분리 — 타이틀바에서도 DND 행 reorder 받기 위해 dragHandle 위임
        onDragOver={dragHandle?.onDragOver}
        onDragLeave={dragHandle?.onDragLeave}
        onDrop={dragHandle?.onDrop}
      >
        {/* 토글 삼각형 (맨 좌측) */}
        {folderKey ? (
          <div className="flex items-center justify-center px-1">
            <span className={`text-[10px] text-text-secondary transition-transform duration-200 ${!collapsed ? 'rotate-90' : ''}`}>
              ▶
            </span>
          </div>
        ) : (
          <div className="w-1 shrink-0" />
        )}

        {/* 손잡이 — drag 전용. 클릭은 무시(부모 토글 차단). */}
        {dragHandle ? (
          <div
            draggable={dragHandle.draggable}
            onDragStart={dragHandle.onDragStart}
            onDragEnd={dragHandle.onDragEnd}
            onClick={e => e.preventDefault()}
            onMouseDown={e => e.stopPropagation()}
            className="flex items-center justify-center pl-0.5 pr-1.5 cursor-grab active:cursor-grabbing text-text-secondary/50 hover:text-text-secondary"
            title="끌어서 행 순서 바꾸기"
          >
            <span className="text-[11px] leading-none">⋮⋮</span>
          </div>
        ) : (
          <div className="w-1 shrink-0" />
        )}

        {/* 좌: 역할 + 라벨 (역할이 앞) */}
        <div className="flex items-center gap-1.5 px-1 py-1 shrink-0">
          <span className={`text-[11px] leading-none ${roleColor}`}>[{roleLabel}]</span>
          <span className="font-semibold text-text-primary leading-none">{label}</span>
        </div>

        {/* 중: 빈 공간(클릭 → 토글) */}
        <div className="flex-1" />

        {/* 우: 액션 버튼 묶음 — 클릭 위임 중단. 손잡이 drag 도 중단(액션 영역에서 drag 시작 방지). */}
        {actions && (
          <div
            className="flex items-center gap-1 px-2 py-1 shrink-0"
            onClick={e => { e.stopPropagation(); e.preventDefault() }}
            onMouseDown={e => e.stopPropagation()}
            onDragStart={e => e.preventDefault()}
          >
            {actions}
          </div>
        )}
      </div>

      {/* ── 본문 ── */}
      <div
        className={`px-3 transition-colors ${over ? 'bg-accent/10 ring-1 ring-accent/40 ring-inset' : ''} ${collapsed ? 'py-1' : 'py-2 space-y-1.5'}`}
        onDragOver={onDrop ? (e => {
          // 행 단위 reorder 페이로드(seg:/book:)는 본문 영역에 떨어뜨려도 무시.
          const data = e.dataTransfer.types.includes('text/plain') ? '' : ''
          if (data) return
          e.preventDefault()
          setOver(true)
        }) : undefined}
        onDragLeave={onDrop ? (() => setOver(false)) : undefined}
        onDrop={onDrop ? (e => {
          e.preventDefault()
          setOver(false)
          const f = e.dataTransfer.getData('text/plain')
          if (!f || f.startsWith('seg:') || f.startsWith('book:')) return
          onDrop(f)
        }) : undefined}
      >
        {!collapsed && images ? (
          <EditorPanel
            title="비주얼 트랙 (VisualTrack)"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>}
            contentClassName="p-2"
          >
            {images}
          </EditorPanel>
        ) : !collapsed && onDrop ? (
          <div className="mb-2 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-dashed border-border/30 text-[11px] text-text-secondary/70 italic">
            <span>🖼</span>
            <span>드래그로 이미지 추가</span>
          </div>
        ) : null}

        {!collapsed && onDrop && over && (
          <div className="text-[11px] text-accent py-0.5">여기에 놓으면 이 섹션에 이미지 추가</div>
        )}

        {/* 텍스트 영역은 접힘 상태에서도 항상 일관된 EditorPanel 로 표시됨 */}
        <EditorPanel
          title="스크립트 (ScriptEditor)"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
          className={collapsed ? '!mb-0 border-border/60' : 'mb-1.5'}
          contentClassName={`px-3 ${collapsed ? 'py-1.5' : 'py-2'}`}
        >
          <EditableText value={value} onCommit={onCommit} pickMode={pickMode} onPick={onPick} highlights={highlights} onAddAnchor={onAddAnchor} />
        </EditorPanel>

        {!collapsed && voiceInfo && audioUrl && (
          <EditorPanel
            title="음성 제어판 (VoicePanel)"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>}
            className="mt-1.5"
            contentClassName="flex items-center gap-1.5 px-3 py-2"
          >
            <FieldAudioControls
              sectionKey={voiceInfo.sectionKey}
              fallbackDuration={voiceInfo.duration ?? 0}
              isPlaying={!!isPlaying}
              onTogglePlay={onTogglePlay ?? (() => {})}
            />
            <span className="text-[11px] text-text-secondary font-mono whitespace-nowrap ml-2">{voiceInfo.sectionKey}</span>
            {activeEngine && (
              <span className={`text-[11px] font-mono whitespace-nowrap px-1.5 py-0.5 rounded border border-border/30 bg-bg-main ${ENGINE_COLORS[activeEngine] ?? 'text-text-secondary'}`}>
                {ENGINE_LABELS[activeEngine] ?? ''}
              </span>
            )}
            {!voiceInfo.exists && <span className="text-[11px] text-red-400 whitespace-nowrap">미생성</span>}
            <div className="flex-1"></div>
            <button
              onClick={onToggleExpand}
              className="px-2 py-1 rounded bg-accent text-bg-primary text-[11px] font-bold hover:opacity-90 flex-none shadow-sm transition-opacity"
              title="파형 편집 모달 열기"
            >
              편집기 열기
            </button>
          </EditorPanel>
        )}
      </div>

      {!collapsed && footer && (
        <div className="px-3 py-2">
          {footer}
        </div>
      )}
    </div>
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
