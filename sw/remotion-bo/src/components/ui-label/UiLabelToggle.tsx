'use client'

import { useUiLabel } from './UiLabelContext'

/** 화면 우하단에 떠 있는 이름표 토글 버튼. 평소 흐릿, 켜지면 강조된다. F2로도 토글. */
export function UiLabelToggle() {
  const { enabled, toggle } = useUiLabel()
  return (
    <button
      type="button"
      onClick={toggle}
      title="UI 이름표 켜기/끄기 (F2)"
      className={`fixed bottom-3 right-3 z-[200] flex items-center gap-1 rounded-full px-2.5 py-1.5 text-xs font-bold shadow-lg border transition-colors ${
        enabled
          ? 'bg-indigo-600 text-white border-indigo-400'
          : 'bg-bg-card/80 text-text-secondary border-border hover:text-text-primary hover:bg-bg-card'
      }`}
    >
      <span>🏷️</span>
      <span>{enabled ? '이름표 ON' : '이름표'}</span>
    </button>
  )
}
