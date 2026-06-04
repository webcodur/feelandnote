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
  onCommit: (v: string, prev: string) => void
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
  // 발화 속도 — 본문 글자수(공백·줄바꿈 제외) ÷ 오디오 길이(초). 파일이 있을 때만.
  const charCount = (value ?? '').replace(/\s/g, '').length
  const cps = voiceInfo?.exists && voiceInfo.duration ? charCount / voiceInfo.duration : null
  const simpleRole = normalizeRole(role)
  const roleLabel = ROLE_LABELS[simpleRole]
  const roleColor = ROLE_COLORS[simpleRole]

  const dragging = dragHandle?.isDragging
  const dropOver = dragHandle?.isOver

  // 세련된 역할별 뱃지 스타일 적용 (프리미엄 라이트 테마 대응)
  const badgeStyle = simpleRole === 'line'
    ? 'bg-accent/10 border border-accent/40 text-accent font-black text-xs font-bold px-1.5 py-0.5 rounded leading-none shrink-0'
    : 'bg-bg-secondary border border-slate-400 text-text-primary font-bold text-xs font-bold px-1.5 py-0.5 rounded leading-none shrink-0'

  return (
    <div
      id={sectionKey ? `row-${sectionKey}` : undefined}
      style={leadStyle}
      className={`mb-2 rounded-lg border overflow-hidden transition-all duration-200 ${
        dropOver ? 'border-accent ring-2 ring-accent/60 bg-accent/10' : 'border-slate-400 bg-bg-card shadow-sm'
      } ${dragging ? 'opacity-40 scale-[0.99]' : 'hover:border-border-active/60 hover:shadow-md'}`}
    >
      {/* ── 타이틀바 ── 손잡이/액션 외 영역 클릭 시 전체 토글 */}
      <div
        className={`flex items-stretch text-sm font-bold bg-bg-secondary border-b border-slate-400 select-none transition-colors duration-150 ${folderKey ? 'cursor-pointer hover:bg-bg-hover' : ''}`}
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
          <div className="flex items-center justify-center px-2">
            <span className={`text-xs font-black text-text-primary transition-transform duration-200 ${!collapsed ? 'rotate-90' : ''}`}>
              ▶
            </span>
          </div>
        ) : (
          <div className="w-2 shrink-0" />
        )}

        {/* 손잡이 — drag 전용. 클릭은 무시(부모 토글 차단). */}
        {dragHandle ? (
          <div
            draggable={dragHandle.draggable}
            onDragStart={dragHandle.onDragStart}
            onDragEnd={dragHandle.onDragEnd}
            onClick={e => e.preventDefault()}
            onMouseDown={e => e.stopPropagation()}
            className="flex items-center justify-center pl-0.5 pr-2 cursor-grab active:cursor-grabbing text-text-primary hover:text-accent transition-colors font-bold"
            title="끌어서 책 순서 바꾸기"
          >
            <span className="text-sm font-bold leading-none">⋮⋮</span>
          </div>
        ) : (
          <div className="w-1 shrink-0" />
        )}

        {/* 좌: 역할 뱃지 + 라벨 */}
        <div className="flex items-center gap-2 px-1 py-1.5 shrink-0">
          <span className={badgeStyle}>{roleLabel}</span>
          <span className="font-extrabold text-text-primary leading-none">{label}</span>
        </div>

        {/* 중: 빈 공간(클릭 → 토글) */}
        <div className="flex-1" />

        {/* 우: 액션 버튼 묶음 — 클릭 위임 중단. 손잡이 drag 도 중단(액션 영역에서 drag 시작 방지). */}
        {actions && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 shrink-0"
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
        className={`px-3.5 transition-all duration-200 ${over ? 'bg-accent/5 ring-1 ring-accent/25 ring-inset' : ''} ${collapsed ? 'py-1.5' : 'py-3 space-y-2'}`}
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
          <div className="mb-2 inline-flex items-center gap-1.5 px-2 py-1 rounded border border-dashed border-slate-500 bg-slate-50 text-xs font-bold text-text-primary font-semibold italic select-none">
            <span>🖼</span>
            <span>드래그로 이미지 추가</span>
          </div>
        ) : null}

        {!collapsed && onDrop && over && (
          <div className="text-sm font-bold text-accent py-0.5 font-bold">여기에 놓으면 이 섹션에 이미지 추가</div>
        )}

        {/* 텍스트 영역은 접힘 상태에서도 항상 일관된 EditorPanel 로 표시됨 */}
        <EditorPanel
          title="스크립트 (ScriptEditor)"
          icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
          className={collapsed ? '!mb-0' : 'mb-2 shadow-xs'}
          contentClassName={`px-3 ${collapsed ? 'py-1.5' : 'py-2.5'}`}
        >
          <EditableText value={value} onCommit={onCommit} pickMode={pickMode} onPick={onPick} highlights={highlights} onAddAnchor={onAddAnchor} />
        </EditorPanel>

        {!collapsed && voiceInfo && audioUrl && (
          <EditorPanel
            title="음성 제어판 (VoicePanel)"
            icon={<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" /></svg>}
            className="mt-2"
            contentClassName="flex items-center gap-2 px-3 py-2"
          >
            <FieldAudioControls
              sectionKey={voiceInfo.sectionKey}
              fallbackDuration={voiceInfo.duration ?? 0}
              isPlaying={!!isPlaying}
              onTogglePlay={onTogglePlay ?? (() => {})}
            />
            <span className="text-sm font-bold text-text-secondary font-mono font-bold whitespace-nowrap ml-2">{voiceInfo.sectionKey}</span>
            {activeEngine && (
              <span className={`text-xs font-bold font-mono font-extrabold whitespace-nowrap px-2 py-0.5 rounded border border-slate-400 bg-bg-secondary ${ENGINE_COLORS[activeEngine] ?? 'text-text-secondary'}`}>
                {ENGINE_LABELS[activeEngine] ?? ''}
              </span>
            )}
            {!voiceInfo.exists && <span className="text-xs font-bold text-red-700 font-extrabold whitespace-nowrap px-1.5 py-0.5 bg-red-100 border border-red-400 rounded">미생성</span>}
            {cps != null && (
              <span
                className="text-xs font-bold font-mono font-extrabold whitespace-nowrap px-2 py-0.5 rounded border border-slate-400 bg-bg-secondary text-text-secondary"
                title={`본문 ${charCount}자 ÷ ${voiceInfo.duration?.toFixed(1)}초`}
              >
                {cps.toFixed(1)}자/초
              </span>
            )}
            <button
              onClick={onToggleExpand}
              className="px-2.5 py-1 rounded bg-purple-600 hover:bg-purple-700 text-white border border-purple-700 text-xs font-black shadow-sm transition-all duration-150 active:scale-[0.98] flex-none"
              title="파형 편집 모달 열기"
            >
              편집기 열기
            </button>
          </EditorPanel>
        )}
      </div>

      {!collapsed && footer && (
        <div className="px-3.5 py-2.5 border-t border-slate-300 bg-slate-50">
          {footer}
        </div>
      )}
    </div>
  )
}

export function AddFieldButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <div className="py-1.5 border-b border-slate-300">
      <button onClick={onClick} className="text-sm font-bold text-text-secondary hover:text-accent font-extrabold active:scale-[0.98] transition-all duration-150">
        {label}
      </button>
    </div>
  )
}
