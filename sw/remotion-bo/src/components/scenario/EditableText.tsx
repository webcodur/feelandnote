'use client'

import React, { useState, useRef, useEffect } from 'react'
import { splitHighlights } from './utils'

/**
 * 인용·강조 부호 부분을 글자 색·배경 띠로 강조하는 오버레이 분할.
 *
 * 본 서비스(`sw/web` FormattedText) 규칙:
 *   "…"                    → accent 톤(쌍따옴표 강조)
 *   『…』 《…》             → 굵게(작품·매체 큰 단위)
 *   「…」 〈…〉 <…> '…'    → accent + 본문체(소단위 강조)
 *
 * 이 오버레이는 텍스트 자체를 100% 투명(text-transparent)하게 그리며,
 * 오직 강조 부호 영역의 '배경 띠'와 '테두리 뱃지'만 렌더링하여 textarea 글씨 위에 비춰 줍니다.
 * 이를 통해 클릭 시(포커스 전환 시) 글자색이 투명<->불투명으로 교차하며 발생하던 깜빡임(Flicker) 버그를 원천 차단합니다.
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
      return (
        <mark
          key={i}
          className="rounded px-1 py-0.5 mx-0.5 bg-amber-500/15 border border-amber-400/40 font-bold text-[14.5px] text-transparent"
        >{part}</mark>
      )
    }
    if (isBig) {
      return (
        <mark
          key={i}
          className="rounded px-1 py-0.5 mx-0.5 font-bold bg-amber-500/20 border border-amber-400/50 text-[14.5px] text-transparent"
        >{part}</mark>
      )
    }
    if (isSmall) {
      return (
        <mark
          key={i}
          className="rounded px-1 py-0.5 mx-0.5 font-serif bg-amber-500/10 border border-amber-400/30 text-[14.5px] text-transparent"
        >{part}</mark>
      )
    }
    
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
  const [focused, setFocused] = useState(false)
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
      {/* 오버레이 — 글자 자체는 100% 투명하며, 오직 둥근 배경 뱃지와 테두리만 textarea 뒤에 비쳐 정밀 강조합니다. */}
      <div
        aria-hidden
        className="absolute inset-0 py-1 text-[15px] leading-7 tracking-[-0.005em] pointer-events-none whitespace-pre-wrap break-words"
      >
        {hasHighlights
          ? splitHighlights(display, activeHighlights).map((seg, j) =>
              seg.highlight
                ? <mark key={j} className="bg-amber-500/15 rounded border border-amber-400/40 text-transparent">{renderEmphasisOverlay(seg.text)}</mark>
                : <React.Fragment key={j}>{renderEmphasisOverlay(seg.text)}</React.Fragment>
            )
          : renderEmphasisOverlay(display)}
      </div>
      <textarea
        ref={ref}
        value={display}
        onChange={e => { if (!pickMode) setDraft(e.target.value) }}
        onFocus={() => setFocused(true)}
        onBlur={() => { setFocused(false); commit(); setTimeout(() => setSelectedText(''), 200) }}
        onMouseUp={handleMouseUp}
        readOnly={pickMode}
        rows={1}
        className={`relative w-full text-[15px] font-medium leading-7 tracking-[-0.005em] whitespace-pre-wrap break-words bg-transparent border-0 border-b rounded-none px-0 resize-none outline-none [field-sizing:content] transition-colors caret-text-primary selection:bg-accent/20 selection:text-text-primary text-text-primary ${
          pickMode
            ? 'border-amber-400 cursor-text select-text bg-amber-50/50'
            : 'border-transparent hover:border-border/70 focus:border-accent/80 focus:border-b-2'
        } py-1`}
      />
      {onAddAnchor && selectedText && (
        <button
          onMouseDown={e => { e.preventDefault(); onAddAnchor(selectedText); setSelectedText('') }}
          className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 text-xs font-bold rounded bg-amber-50 border border-amber-300 text-amber-800 hover:bg-amber-100 transition-colors"
        >
          <span>+</span> 앵커 &ldquo;{selectedText.length > 20 ? selectedText.slice(0, 20) + '…' : selectedText}&rdquo;
        </button>
      )}
    </div>
  )
}
