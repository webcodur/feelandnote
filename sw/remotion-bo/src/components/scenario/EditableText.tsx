'use client'

import { useState, useRef, useEffect } from 'react'
import { splitHighlights } from './utils'

export function EditableText({
  value, onCommit, pickMode, onPick, highlights, onAddAnchor,
}: {
  value: string
  onCommit: (v: string) => void
  pickMode?: boolean
  onPick?: (selected: string) => void
  highlights?: string[]
  onAddAnchor?: (text: string) => void
}) {
  const [draft, setDraft] = useState(value)
  const ref = useRef<HTMLTextAreaElement>(null)
  const [selectedText, setSelectedText] = useState('')

  useEffect(() => { setDraft(value) }, [value])

  const commit = () => {
    if (pickMode) return
    const trimmed = draft.trim()
    if (trimmed && trimmed !== value) onCommit(trimmed)
    else setDraft(value)
  }

  const handleMouseUp = () => {
    if (!ref.current) return
    const { selectionStart, selectionEnd } = ref.current
    if (selectionStart === selectionEnd) { setSelectedText(''); return }
    const selected = ref.current.value.substring(selectionStart, selectionEnd).trim()
    if (selected.length >= 2) {
      if (pickMode && onPick) onPick(selected)
      if (onAddAnchor) setSelectedText(selected)
    }
  }

  const activeHighlights = highlights?.filter(h => h && draft.includes(h)) ?? []
  const hasHighlights = activeHighlights.length > 0

  return (
    <div className="relative">
      {hasHighlights && (
        <div aria-hidden className="absolute inset-0 text-sm leading-relaxed pointer-events-none whitespace-pre-wrap break-words text-transparent">
          {splitHighlights(draft, activeHighlights).map((seg, j) =>
            seg.highlight
              ? <mark key={j} className="bg-amber-500/25 text-transparent rounded-sm">{seg.text}</mark>
              : <span key={j}>{seg.text}</span>
          )}
        </div>
      )}
      <textarea
        ref={ref}
        value={draft}
        onChange={e => { if (!pickMode) setDraft(e.target.value) }}
        onBlur={() => { commit(); setTimeout(() => setSelectedText(''), 200) }}
        onMouseUp={handleMouseUp}
        readOnly={pickMode}
        rows={1}
        className={`relative w-full text-sm leading-relaxed bg-transparent border-0 border-b rounded-none px-0 resize-none outline-none [field-sizing:content] transition-colors ${
          pickMode
            ? 'border-amber-500/60 cursor-text select-text bg-amber-500/5'
            : 'border-transparent hover:border-border focus:border-accent'
        }`}
      />
      {onAddAnchor && selectedText && (
        <button
          onMouseDown={e => { e.preventDefault(); onAddAnchor(selectedText); setSelectedText('') }}
          className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 text-[10px] rounded bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25 transition-colors"
        >
          <span>+</span> 앵커 &ldquo;{selectedText.length > 20 ? selectedText.slice(0, 20) + '…' : selectedText}&rdquo;
        </button>
      )}
    </div>
  )
}
