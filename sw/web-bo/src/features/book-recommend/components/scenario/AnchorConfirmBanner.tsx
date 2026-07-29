'use client'

import { useEffect } from 'react'
import type { AnchorPick } from './types'

/**
 * 이미지 텍스트 앵커를 잡는 도중 상단에 뜨는 확정 · 취소 배너.
 * 쇼츠 · 롱폼 두 화면에서 동일한 모양으로 사용한다.
 *
 * anchorPick.draft 가 비어 있으면 자체적으로 null 반환. 외부에서 추가 가드(picking 등)로
 * "이 화면이 활성 책인지" 같은 별도 조건만 사용한다.
 *
 * 배너가 떠 있는 동안 Enter 는 확정, Esc 는 취소. 다만 텍스트 입력 필드에 포커스가 있을 때는
 * 평소대로 본래 동작이 가로채지 않도록 무시한다(드래그 직후 텍스트 영역에 포커스 상태일 수 있음).
 */
export function AnchorConfirmBanner({
  anchorPick,
  onConfirm,
  onCancel,
  hint,
  className,
}: {
  anchorPick: AnchorPick
  onConfirm: () => void
  onCancel: () => void
  /** 우측에 곁들이는 안내 문구 (예: "또는 다시 드래그") */
  hint?: string
  /** 외곽 래퍼에 부모 레이아웃에 맞춰 추가 클래스 */
  className?: string
}) {
  const draft = anchorPick?.draft ?? null

  useEffect(() => {
    if (!draft) return
    const handler = (e: KeyboardEvent) => {
      const target = e.target as (HTMLElement & { isContentEditable?: boolean }) | null
      const tag = target?.tagName?.toLowerCase() ?? ''
      if (tag === 'input' || tag === 'textarea' || target?.isContentEditable) return
      if (e.key === 'Enter') {
        e.preventDefault()
        onConfirm()
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [draft, onConfirm, onCancel])

  if (!anchorPick?.draft) return null
  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded bg-amber-50 border-2 border-amber-500 shadow-sm text-slate-950 text-sm font-bold ${className ?? ''}`}>
      <span className="text-amber-900 font-black">#{anchorPick.imgIdx + 1}</span>
      <span className="text-amber-950 font-black truncate flex-1">&ldquo;{anchorPick.draft}&rdquo;</span>
      <button onClick={onConfirm} title="Enter" className="px-2 py-0.5 rounded bg-amber-500 text-black text-sm font-bold font-semibold hover:bg-amber-400 shrink-0">확정</button>
      {hint && <span className="text-amber-800 text-sm font-black">{hint}</span>}
      <button onClick={onCancel} title="Esc" className="text-amber-700 hover:text-red-600 text-sm font-black">취소</button>
    </div>
  )
}
