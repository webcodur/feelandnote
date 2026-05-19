'use client'

import React, { useEffect } from 'react'

/**
 * 음성 편집 전역 모달.
 * openKey 가 null 이면 안 보임. 켜져 있을 때 ESC / 배경 클릭으로 닫힌다.
 * 모달이 열려 있는 동안 body 스크롤 잠김.
 */
export function VoiceEditorModal({ openKey, onClose, renderExpanded }: {
  openKey: string | null
  onClose: () => void
  renderExpanded: (key: string) => React.ReactNode
}) {
  useEffect(() => {
    if (!openKey) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey) }
  }, [openKey, onClose])
  if (!openKey) return null
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-border rounded-lg flex flex-col"
        style={{ width: 'min(96vw, 1800px)', height: 'min(94vh, 1100px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-3 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold">VoiceTimingEditor</span>
            <span className="text-[11px] text-text-secondary">{openKey}</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded text-xs bg-bg-main border border-border hover:bg-bg-hover text-text-secondary"
          >
            닫기 (ESC)
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          {renderExpanded(openKey)}
        </div>
      </div>
    </div>
  )
}
