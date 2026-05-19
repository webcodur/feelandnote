'use client'

import React, { useState, useRef, useEffect } from 'react'
import { splitHighlights } from './utils'

/**
 * 텍스트 안 인용·강조 부호 부분에 배경색으로 강조 띠를 칠하는 오버레이용 분할.
 *
 * 본 서비스(`sw/web` FormattedText) 규칙을 그대로 따른다 — 다만 textarea 글자 위에 겹치는
 * 오버레이라 글자색 변경은 두 번 겹쳐 흐려지므로 색 강조는 「배경 띠」 형태로만 적용한다.
 *
 *   "…"                    → 강조 배경 (accent 톤, 약하게)
 *   『…』 《…》             → 굵은 배경 강조 (작품·매체 큰 단위)
 *   「…」 〈…〉 <…> '…'   → 강조 배경 (소단위)
 */
function renderEmphasisOverlay(text: string): React.ReactNode[] {
  if (!text) return []
  const parts = text.split(/(".*?"|(?<!\w)'[^'\n]*'(?!\w)|『.*?』|《.*?》|「.*?」|〈.*?〉|<.*?>)/g)
  return parts.map((part, i) => {
    if (!part) return null
    const isDouble = part.startsWith('"') && part.endsWith('"') && part.length >= 2
    const isBig =
      (part.startsWith('『') && part.endsWith('』')) ||
      (part.startsWith('《') && part.endsWith('》'))
    const isSmall =
      (part.startsWith('「') && part.endsWith('」')) ||
      (part.startsWith('〈') && part.endsWith('〉')) ||
      (part.startsWith('<') && part.endsWith('>')) ||
      (part.startsWith("'") && part.endsWith("'") && part.length >= 2)
    if (isDouble) {
      return <mark key={i} className="bg-accent/15 rounded-sm text-transparent">{part}</mark>
    }
    if (isBig) {
      return <mark key={i} className="bg-text-primary/15 rounded-sm text-transparent">{part}</mark>
    }
    if (isSmall) {
      return <mark key={i} className="bg-accent/10 rounded-sm text-transparent">{part}</mark>
    }
    // 일반 텍스트는 오버레이에서 투명 — textarea 본문이 그대로 보이게.
    return (
      <span key={i} className="text-transparent">
        {part.split('\n').map((line, j, arr) => (
          <React.Fragment key={j}>{line}{j < arr.length - 1 && <br />}</React.Fragment>
        ))}
      </span>
    )
  })
}

export function EditableText({
  value, onCommit, pickMode, onPick, highlights, onAddAnchor,
}: {
  value: string | undefined
  onCommit: (v: string) => void
  pickMode?: boolean
  onPick?: (selected: string) => void
  highlights?: string[]
  onAddAnchor?: (text: string) => void
}) {
  const safeValue = value ?? ''
  const [draft, setDraft] = useState(safeValue)
  const ref = useRef<HTMLTextAreaElement>(null)
  const [selectedText, setSelectedText] = useState('')

  useEffect(() => { setDraft(safeValue) }, [safeValue])

  const commit = () => {
    if (pickMode) return
    const trimmed = (draft ?? '').trim()
    if (trimmed && trimmed !== safeValue) onCommit(trimmed)
    else setDraft(safeValue)
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

  const activeHighlights = highlights?.filter(h => h && (draft ?? '').includes(h)) ?? []
  const hasHighlights = activeHighlights.length > 0
  const display = draft ?? ''

  return (
    <div className="relative">
      {/* 오버레이 — textarea 본문 위에 강조 띠(부호 / 앵커) 만 칠한다. 일반 글자는 textarea 가 그대로 표시. */}
      <div
        aria-hidden
        className="absolute inset-0 text-sm leading-relaxed pointer-events-none whitespace-pre-wrap break-words"
      >
        {hasHighlights
          ? splitHighlights(display, activeHighlights).map((seg, j) =>
              seg.highlight
                ? <mark key={j} className="bg-amber-500/25 rounded-sm text-transparent">{renderEmphasisOverlay(seg.text)}</mark>
                : <React.Fragment key={j}>{renderEmphasisOverlay(seg.text)}</React.Fragment>
            )
          : renderEmphasisOverlay(display)}
      </div>
      <textarea
        ref={ref}
        value={display}
        onChange={e => { if (!pickMode) setDraft(e.target.value) }}
        onBlur={() => { commit(); setTimeout(() => setSelectedText(''), 200) }}
        onMouseUp={handleMouseUp}
        readOnly={pickMode}
        rows={1}
        className={`relative w-full text-sm leading-relaxed whitespace-pre-wrap break-words bg-transparent border-0 border-b rounded-none px-0 resize-none outline-none [field-sizing:content] transition-colors ${
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
