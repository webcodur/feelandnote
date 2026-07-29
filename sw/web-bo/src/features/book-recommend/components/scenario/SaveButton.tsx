'use client'

import { useState } from 'react'

/**
 * 필드·구간 단위 부분 저장 버튼.
 * 쇼츠 구간과 롱폼 필드 모두에서 공용.
 * onSave는 비동기 네트워크 호출. 성공 시 "저장됨" 1.5초 표시, 실패 시 alert.
 */
export function SaveButton({ onSave, title, className }: {
  onSave: () => Promise<void>
  title?: string
  className?: string
}) {
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const handleClick = async () => {
    if (state === 'saving') return
    setState('saving')
    try {
      await onSave()
      setState('saved')
      setTimeout(() => setState('idle'), 1500)
    } catch (e) {
      setState('idle')
      alert(`저장 실패: ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  const label = state === 'saved' ? '저장됨' : state === 'saving' ? '저장 중' : '저장'
  const tone =
    state === 'saved'
      ? 'border-emerald-400/70 text-emerald-300 bg-emerald-500/10'
      : state === 'saving'
        ? 'border-emerald-600/40 text-emerald-400/60 bg-transparent cursor-wait'
        : 'border-emerald-600/50 text-emerald-400/90 bg-transparent hover:bg-emerald-500/10 hover:border-emerald-400 hover:text-emerald-200 cursor-pointer'
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={state === 'saving'}
      title={title ?? '이 항목만 저장 (디스크 최신 상태와 머지)'}
      data-save-button="true"
      className={`inline-flex items-center px-2 py-0.5 rounded border text-sm font-bold font-medium leading-none ${tone} ${className ?? ''}`}
    >{label}</button>
  )
}
