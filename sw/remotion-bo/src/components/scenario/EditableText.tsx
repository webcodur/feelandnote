'use client'

import React, { useState, useRef, useEffect } from 'react'
import { splitHighlights } from './utils'

export function EditableText({
  value, onCommit, pickMode, onPick, highlights, onAddAnchor,
}: {
  value: string | undefined
  /** 본문 커밋. prev 는 커밋 직전 본문(앵커 동기화용) — 상위가 옛/새 본문 차이로 이미지 앵커를 이전한다. */
  onCommit: (v: string, prev: string) => void
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
    if (trimmed && trimmed !== safeValue) onCommit(trimmed, safeValue)
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

  // 오버레이 분할 — 앵커로 등록된 텍스트(activeHighlights)만 mark 로 감싼다.
  // mark 는 padding·margin 없이 글자 폭만 차지하므로 textarea 글자와 1:1 로 겹친다.
  const overlaySegments: { text: string; highlight: boolean }[] = hasHighlights
    ? splitHighlights(display, activeHighlights)
    : [{ text: display, highlight: false }]

  return (
    <div className="relative">
      {/* 입력 카드 — 흰 배경·테두리·포커스 링. 안에서 띠 오버레이(뒤)와 글자(textarea, 앞)를 겹친다. */}
      <div
        className={`relative rounded-md border shadow-sm transition-colors ${
          pickMode
            ? 'border-amber-400 bg-amber-50/70'
            : 'border-border/40 bg-white hover:border-border/70 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20'
        }`}
      >
        {/* 띠 오버레이 — 글자는 투명, 앵커 구간 배경 띠만 깔린다(테두리 없음).
            투명 배경의 textarea가 위에서 글자를 또렷이 그리므로 글자에 막이 끼지 않는다.
            textarea와 동일한 padding·font·border 로 글자 위치를 1:1 로 맞춘다. */}
        <div
          aria-hidden
          className="absolute inset-0 px-2.5 py-1.5 border border-transparent font-semibold text-[14.5px] leading-7 tracking-[-0.005em] pointer-events-none whitespace-pre-wrap break-words text-transparent"
        >
          {overlaySegments.map((seg, j) =>
            seg.highlight
              ? <mark key={j} className="bg-amber-400/30 rounded-sm text-transparent">{seg.text}</mark>
              : <React.Fragment key={j}>{seg.text}</React.Fragment>
          )}
        </div>
        <textarea
          ref={ref}
          value={display}
          onChange={e => { if (!pickMode) setDraft(e.target.value) }}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); commit(); setSelectedText('') }}
          onMouseUp={handleMouseUp}
          readOnly={pickMode}
          rows={1}
          spellCheck={false}
          className={`relative w-full font-semibold text-[14.5px] leading-7 tracking-[-0.005em] whitespace-pre-wrap break-words bg-transparent border border-transparent rounded-md px-2.5 py-1.5 resize-none outline-none [field-sizing:content] caret-text-primary selection:bg-amber-300/40 selection:text-text-primary text-text-primary ${
            pickMode ? 'cursor-text select-text' : ''
          }`}
        />
      </div>
      {onAddAnchor && selectedText && focused && (
        <button
          onMouseDown={e => { e.preventDefault(); onAddAnchor(selectedText); setSelectedText('') }}
          className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 text-[12px] font-bold rounded-md bg-amber-100 border border-amber-400 text-amber-900 hover:bg-amber-200 hover:border-amber-500 shadow-sm transition-colors"
          title="선택한 구절을 이미지 앵커로 등록"
        >
          <span className="text-base leading-none">＋</span>
          <span>선택 구절을 이미지 앵커로 등록</span>
          <span className="text-amber-700 font-mono">&ldquo;{selectedText.length > 16 ? selectedText.slice(0, 16) + '…' : selectedText}&rdquo;</span>
        </button>
      )}
    </div>
  )
}
