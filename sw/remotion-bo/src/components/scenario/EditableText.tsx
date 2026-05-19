'use client'

import React, { useState, useRef, useEffect } from 'react'
import { splitHighlights } from './utils'

/**
 * 인용·강조 부호 부분을 글자 색·배경 띠로 강조하는 오버레이 분할.
 *
 * 본 서비스(`sw/web` FormattedText) 규칙:
 *   "…"                    → accent 톤(쌍따옴표 강조)
 *   『…』 《…》             → 흰색 굵게(작품·매체 큰 단위)
 *   「…」 〈…〉 <…> '…'    → accent + 본문체(소단위 강조)
 *
 * 두 모드:
 *   - viewMode (편집기 비포커스): 부호 부분 글자 색·배경을 모두 칠해 강조. 일반 글자는 본 색 그대로.
 *   - editMode (편집기 포커스): 오버레이는 부호 부분에 배경 띠만 약하게. 글자는 textarea 가 담당해 IME 안전.
 */
function renderEmphasisOverlay(text: string, viewMode: boolean): React.ReactNode[] {
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
          className={`rounded-sm px-0.5 bg-amber-500/15 ${viewMode ? 'text-amber-300' : 'text-transparent'}`}
        >{part}</mark>
      )
    }
    if (isBig) {
      return (
        <mark
          key={i}
          className={`rounded-sm px-0.5 font-bold bg-amber-500/20 ${viewMode ? 'text-amber-200' : 'text-transparent'}`}
        >{part}</mark>
      )
    }
    if (isSmall) {
      return (
        <mark
          key={i}
          className={`rounded-sm px-0.5 font-serif bg-amber-500/12 ${viewMode ? 'text-amber-300' : 'text-transparent'}`}
        >{part}</mark>
      )
    }
    // 일반 텍스트 — 오버레이에서 항상 투명. textarea 본문이 그대로 노출.
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
  // 비포커스 상태에서만 부호 부분의 글자 색·배경을 모두 강조. 포커스 시는 textarea 글자가 우선이라 색 충돌 방지.
  const viewMode = !focused && !pickMode

  return (
    <div className="relative">
      {/* 오버레이 — 부호 부분에 강조 색/배경. 일반 글자는 투명이라 textarea 본문이 그대로 노출. */}
      <div
        aria-hidden
        className="absolute inset-0 text-sm leading-relaxed pointer-events-none whitespace-pre-wrap break-words"
      >
        {hasHighlights
          ? splitHighlights(display, activeHighlights).map((seg, j) =>
              seg.highlight
                ? <mark key={j} className="bg-amber-500/25 rounded-sm text-transparent">{renderEmphasisOverlay(seg.text, viewMode)}</mark>
                : <React.Fragment key={j}>{renderEmphasisOverlay(seg.text, viewMode)}</React.Fragment>
            )
          : renderEmphasisOverlay(display, viewMode)}
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
