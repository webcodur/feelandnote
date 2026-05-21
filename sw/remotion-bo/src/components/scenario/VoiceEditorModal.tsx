'use client'

import React, { useEffect, useState } from 'react'

export type ExpandMode = 'trim' | 'sync'

/** 헤더 엔진 토글 상태 — 모달이 직접 받아 헤더에 그린다. */
export type ModalEngineState = {
  active: string
  default: string
  hasOverride: boolean
  hasFile: { gemini: boolean; elevenlabs: boolean }
  onToggle: (engine: 'gemini' | 'elevenlabs') => void
}

const ENG_LABEL: Record<string, string> = { gemini: 'Gemini', elevenlabs: 'ElevenLabs' }

/** 음성 편집 전역 모달. 기본 카드 스타일 — 장식 최소화. */
export function VoiceEditorModal({ openKey, onClose, renderExpanded, engineState }: {
  openKey: string | null
  onClose: () => void
  renderExpanded: (key: string, mode: ExpandMode, onModeChange: (m: ExpandMode) => void) => React.ReactNode
  engineState?: ModalEngineState | null
}) {
  const [mode, setMode] = useState<ExpandMode>('trim')
  // 배경에서 시작된 클릭만 닫기로 인정한다. 노란선 등 패널 내부에서 시작된 드래그가
  // 우연히 배경 위에서 끝나도 모달이 닫히지 않도록 한다.
  const downOnBackdropRef = React.useRef(false)
  // onClose 는 부모가 인라인 함수로 넘기므로 매 렌더마다 새 참조다. 이 참조를 effect 의존성에 넣으면
  // 부모 리렌더(예: 노란선 드래그 중 매 pointermove 마다 발생) 때마다 effect 가 재실행되어 setMode('trim')
  // 이 SYNC 모드를 TRIM 으로 되돌린다 — 사용자 입장에선 편집기가 갑자기 닫혀 보이는 증상. ref 로 우회.
  const onCloseRef = React.useRef(onClose)
  React.useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!openKey) return
    setMode('trim')
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [openKey])

  if (!openKey) return null

  // 세그먼티드 컨트롤 한 칸 — 묶음 안에 들어가는 버튼 모양.
  const segBtn = (key: string, active: boolean, onClick: () => void, label: string, opts?: { disabled?: boolean; title?: string }) => (
    <button
      key={key}
      type="button"
      disabled={opts?.disabled}
      onClick={onClick}
      title={opts?.title}
      className={`px-3 py-1 text-sm rounded transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
        active
          ? 'bg-bg-card text-text-primary shadow-sm'
          : 'text-text-secondary hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  )

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
      onMouseDown={(e) => { downOnBackdropRef.current = e.target === e.currentTarget }}
      onClick={(e) => {
        if (downOnBackdropRef.current && e.target === e.currentTarget) onClose()
        downOnBackdropRef.current = false
      }}
    >
      <div
        className="bg-bg-card border border-border rounded-md flex flex-col shadow-xl overflow-hidden"
        style={{ width: 'min(96vw, 1800px)', height: 'min(94vh, 1100px)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-4 px-5 py-3 border-b border-border bg-bg-main">
          {/* 제목 + key */}
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-base font-semibold text-text-primary shrink-0">음성 편집</span>
            <span className="text-sm text-text-secondary truncate">{openKey}</span>
          </div>

          {/* 엔진 토글 — 세그먼티드 컨트롤(한 박스 안에 두 버튼) */}
          {engineState && (
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-text-secondary">엔진</span>
              <div
                role="group"
                className={`inline-flex items-center gap-0.5 p-0.5 rounded border bg-bg-main ${
                  engineState.hasOverride ? 'border-amber-500/50' : 'border-border'
                }`}
              >
                {(['gemini', 'elevenlabs'] as const).map(slot =>
                  segBtn(
                    slot,
                    engineState.active === slot,
                    () => engineState.onToggle(slot),
                    ENG_LABEL[slot],
                    {
                      disabled: !engineState.hasFile[slot],
                      title: !engineState.hasFile[slot]
                        ? `${ENG_LABEL[slot]} 음원 없음 — 먼저 생성 필요`
                        : engineState.active === slot
                          ? (engineState.hasOverride
                              ? `${ENG_LABEL[slot]} 사용 중 (기본과 다름). 다시 누르면 기본으로 회귀.`
                              : `${ENG_LABEL[slot]} 사용 중 (기본값 따름)`)
                          : `이 행만 ${ENG_LABEL[slot]} 로 설정`,
                    },
                  ),
                )}
              </div>
              {engineState.hasOverride && (
                <span
                  className="text-xs px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30"
                  title={`기본 엔진(${ENG_LABEL[engineState.default] ?? engineState.default}) 과 다르게 이 행만 별도로 설정됨.`}
                >
                  기본과 다름
                </span>
              )}
            </div>
          )}

          {/* 우측 — 모드 탭 + 닫기 */}
          <div className="ml-auto flex items-center gap-2">
            <div
              role="group"
              className="inline-flex items-center gap-0.5 p-0.5 rounded border border-border bg-bg-main"
              title="편집 모드 전환"
            >
              {segBtn('trim', mode === 'trim', () => setMode('trim'), '트림')}
              {segBtn('sync', mode === 'sync', () => setMode('sync'), '싱크')}
            </div>
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-hover rounded border border-border transition-colors"
              title="닫기 (ESC)"
            >
              닫기
            </button>
          </div>
        </div>

        {/* 본문 */}
        <div className="flex-1 overflow-auto p-5 bg-bg-card">
          {renderExpanded(openKey, mode, setMode)}
        </div>
      </div>
    </div>
  )
}
