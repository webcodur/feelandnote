'use client'

import type { ReactNode } from 'react'
import Modal from '@/components/ui/Modal'
import { Z_INDEX } from '@/constants/zIndex'

/** 도감 인물 창 안에서도 목록만 닫고 원래 책장으로 돌아온다. */
export default function BookShelfListModal({ title, subtitle, compact = false, isOpen = true, onClose, children }: {
  title: string; subtitle?: string; compact?: boolean; isOpen?: boolean; onClose: () => void; children: ReactNode
}) {
  return <Modal isOpen={isOpen} onClose={onClose} title={title} titleClassName="break-keep font-semibold leading-6 text-white/90 [text-wrap:pretty]" stickyHeader widthClassName={compact ? 'max-w-md' : 'max-w-2xl'} animateHeight={false}
    maxHeightClassName="max-h-[min(80dvh,48rem)]" frame="plain" boxClassName="overflow-hidden rounded-xl border border-white/15 bg-bg-card shadow-2xl [&>div]:[overflow-anchor:none]" escapeCapture zIndex={Z_INDEX.modal + 1}>
    <div className="space-y-4 p-4 [overflow-anchor:none] sm:space-y-5 sm:p-6" data-bookshelf-list-dialog>
      {subtitle && <p className="break-words text-center text-base font-semibold leading-6 text-white/90">{subtitle}</p>}
      {children}
    </div>
  </Modal>
}
