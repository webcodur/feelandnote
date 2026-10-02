/*
  천도 v2 — 겹쳐 뜨는 것들: 대화상자, 알림 줄, 창 가장자리 서랍
  대화상자·서랍은 공간이 열리는 전환이라 애니메이션을 쓴다.
*/
'use client'

import { useContext, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { MODAL_MAX_HEIGHT } from '@/components/ui/modalLayout'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CheondoContext } from '../context'
import { Panel } from './Frame'
import { INK } from './theme'

interface ModalProps {
  open: boolean
  onClose?: () => void
  children: ReactNode
  width?: number
  className?: string
  /** 바깥을 눌러도 닫히지 않게 */
  locked?: boolean
  label?: string
}

export function Modal({ open, onClose, children, width = 560, className, locked, label }: ModalProps) {
  const boxRef = useRef<HTMLDivElement>(null)
  // 명부를 받기 전에도 그려질 수 있어 useCheondo()처럼 던지지 않는 쪽으로 읽는다
  const closeLabel = useContext(CheondoContext)?.T.close
  useEffect(() => {
    if (!open || locked || !onClose) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.stopPropagation(); onClose() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, locked, onClose])
  useEffect(() => {
    if (open) boxRef.current?.focus()
  }, [open])
  if (!open) return null
  // 열릴 때의 연출은 CSS 키프레임(cheondo-modal-dim/box)이 맡는다 — 상태로 두 번 그리지 않는다
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onMouseDown={(e) => { if (!locked && e.target === e.currentTarget) onClose?.() }}
      className="cheondo-modal-dim absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-6"
    >
      <div
        ref={boxRef}
        tabIndex={-1}
        className={cn('cheondo-modal-box max-h-full w-full outline-none', className)}
        style={{ maxWidth: width, '--modal-max-height': MODAL_MAX_HEIGHT } as CSSProperties}
      >
        {/* 대화상자는 뒤 화면 글씨가 비쳐 섞이지 않게 불투명 바탕을 쓴다 */}
        <Panel className="flex flex-col overflow-y-auto" style={{ background: INK.panelSolid, maxHeight: MODAL_MAX_HEIGHT }}>
          {onClose && !locked && (
            <button
              type="button"
              onClick={onClose}
              aria-label={closeLabel}
              className="absolute right-2 top-2 z-10 grid h-8 w-8 place-items-center text-[#a8a293] hover:bg-white/[0.06] hover:text-[#f3d57a]"
            >
              <X size={16} />
            </button>
          )}
          {children}
        </Panel>
      </div>
    </div>
  )
}

export interface Toast {
  id: number
  text: string
  tone: 'good' | 'bad' | 'info'
}

export function ToastStack({ toasts }: { toasts: Toast[] }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-16 z-50 flex w-[min(92vw,420px)] -translate-x-1/2 flex-col items-center gap-2" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="cheondo-toast flex items-center gap-2 border px-3 py-2 text-[13px] font-semibold shadow-lg"
          style={{
            background: 'rgba(12,13,17,0.95)',
            borderColor: t.tone === 'good' ? 'rgba(63,185,165,0.6)' : t.tone === 'bad' ? 'rgba(200,69,45,0.7)' : INK.lineStrong,
            color: t.tone === 'bad' ? '#ffd9cf' : INK.text,
          }}
        >
          <span aria-hidden className="h-1.5 w-1.5 rounded-full" style={{ background: t.tone === 'good' ? INK.jade : t.tone === 'bad' ? INK.seal : INK.gold }} />
          {t.text}
        </div>
      ))}
    </div>
  )
}

/** 알림 줄 관리 */
export function useToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(0)
  const push = (text: string, tone: Toast['tone'] = 'info') => {
    const id = ++seq.current
    setToasts((prev) => [...prev.slice(-3), { id, text, tone }])
    window.setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2600)
  }
  return { toasts, push }
}
