'use client'

import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import SharedSourceLink, { SourceList, type SourceLinkProps, type SourceListProps } from '@feelandnote/shared/ui/source-link'
import { MODAL_MAX_HEIGHT } from '@feelandnote/shared/lib/modal-layout'

export default function SourceLink(props: SourceLinkProps) {
  return <SharedSourceLink {...props} baseLayer={600} renderSources={list => <SourcesDialog {...list} />} />
}

function SourcesDialog({ sources, onClose }: SourceListProps) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const previousOverflow = document.body.style.overflow
    dialog?.showModal()
    document.body.style.overflow = 'hidden'
    return () => {
      dialog?.close()
      document.body.style.overflow = previousOverflow
      previousFocus?.focus({ preventScroll: true })
    }
  }, [])
  return createPortal(<dialog ref={ref} role="dialog" aria-modal="true" aria-label="출처 목록"
    style={{ maxHeight: MODAL_MAX_HEIGHT }}
    className="m-auto w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-xl border border-border bg-bg-card p-4 text-text-primary backdrop:bg-black/60 backdrop:backdrop-blur-md"
    onCancel={event => { event.preventDefault(); onClose() }}
    onKeyDownCapture={event => { if (event.key === 'Escape') event.stopPropagation() }}
    onClick={event => { event.stopPropagation(); if (event.target === event.currentTarget) onClose() }}>
    <div className="mb-4 flex items-center justify-between gap-4">
      <h2 className="font-semibold">출처 목록</h2>
      <button type="button" aria-label="닫기" onClick={onClose}
        className="flex size-11 items-center justify-center rounded text-xl text-text-secondary hover:bg-white/5 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">×</button>
    </div>
    <SourceList sources={sources} />
  </dialog>, document.body)
}
