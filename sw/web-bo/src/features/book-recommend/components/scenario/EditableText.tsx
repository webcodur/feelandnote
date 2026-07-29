'use client'

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { splitHighlights } from './utils'
import { remapAnchor } from './anchorSync'

export function EditableText({
  value, onCommit, pickMode, onPick, highlights, onAddAnchor, onSplitAt, live,
}: {
  value: string | undefined
  /** 본문 커밋. prev 는 커밋 직전 본문(앵커 동기화용) — 상위가 옛/새 본문 차이로 이미지 앵커를 이전한다. */
  onCommit: (v: string, prev: string) => void
  pickMode?: boolean
  onPick?: (selected: string) => void
  highlights?: string[]
  onAddAnchor?: (text: string) => void
  /** 커서 위치에서 본문을 두 토막으로 나눈다. offset은 현재 입력 중 텍스트 기준 글자 위치. */
  onSplitAt?: (offset: number, text: string) => void
  /** 실시간 반영 — 타이핑마다 상위 화면 상태(이미지 앵커·섬네일 라벨)를 갱신한다.
   *  디스크 저장이 아니라 메모리 상태만 바꾸며, 실제 저장은 저장 버튼이 따로 한다. */
  live?: boolean
}) {
  const safeValue = value ?? ''
  const [draft, setDraft] = useState(safeValue)
  const [focused, setFocused] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const [selectedText, setSelectedText] = useState('')
  const [caret, setCaret] = useState<number | null>(null)

  useEffect(() => { setDraft(safeValue) }, [safeValue])

  // 입력 반영 — live면 타이핑마다 상위 상태를 갱신(작은 1글자 변경이라 앵커 이전이 정확하다).
  const handleChange = (v: string) => {
    if (pickMode) return
    setDraft(v)
    if (live && v !== safeValue) onCommit(v, safeValue)
  }

  const commit = () => {
    if (pickMode) return
    const trimmed = (draft ?? '').trim()
    if (trimmed && trimmed !== safeValue) onCommit(trimmed, safeValue)
    else if (!live) setDraft(safeValue)
  }

  const handleMouseUp = () => {
    if (!ref.current) return
    const { selectionStart, selectionEnd } = ref.current
    if (selectionStart === selectionEnd) {
      setSelectedText('')
      setCaret(selectionStart)
      return
    }
    setCaret(null)
    const selected = ref.current.value.substring(selectionStart, selectionEnd).trim()
    if (selected.length >= 2) {
      if (pickMode && onPick) onPick(selected)
      if (onAddAnchor) setSelectedText(selected)
    }
  }

  const handleKeyUp = () => {
    if (!ref.current || !onSplitAt) return
    const { selectionStart, selectionEnd } = ref.current
    setCaret(selectionStart === selectionEnd ? selectionStart : null)
  }

  // 커서가 본문 중간에 있을 때만 나누기 버튼 노출 — 양 끝에서는 토막이 비어 무의미
  const canSplit = !!onSplitAt && !pickMode && focused && !selectedText
    && caret != null && (draft ?? '').slice(0, caret).trim().length > 0 && (draft ?? '').slice(caret).trim().length > 0

  // 형광 실시간 추적 — 타이핑 중에도 앵커 구절을 입력 중 텍스트(draft) 기준으로 따라 옮겨 표시한다.
  // 데이터(img.text)는 칸 밖 클릭 확정 시 상위 remap이 갱신하고, 여기서는 표시만 미리 맞춘다.
  const activeHighlights = useMemo(() => {
    const d = draft ?? ''
    if (!highlights?.length) return []
    return highlights
      .map(h => {
        if (!h) return null
        if (d.includes(h)) return h
        if (d === safeValue) return null
        const r = remapAnchor(safeValue, d, h)
        return r.kind === 'lost' ? null : r.text
      })
      .filter((h): h is string => !!h && d.includes(h))
  }, [highlights, draft, safeValue])
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
        className={`relative rounded-md border shadow-sm ${
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
          onChange={e => handleChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => { setFocused(false); commit(); setSelectedText(''); setCaret(null) }}
          onMouseUp={handleMouseUp}
          onKeyUp={handleKeyUp}
          readOnly={pickMode}
          rows={1}
          spellCheck={false}
          className={`relative w-full font-semibold text-[14.5px] leading-7 tracking-[-0.005em] whitespace-pre-wrap break-words bg-transparent border border-transparent rounded-md px-2.5 py-1.5 resize-none outline-none [field-sizing:content] caret-text-primary selection:bg-amber-300/40 selection:text-text-primary text-text-primary ${
            pickMode ? 'cursor-text select-text' : ''
          }`}
        />
      </div>
      {canSplit && (
        <button
          onMouseDown={e => { e.preventDefault(); onSplitAt!(caret!, draft ?? ''); setCaret(null) }}
          className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 text-[12px] font-bold rounded-md bg-sky-100 border border-sky-400 text-sky-900 hover:bg-sky-200 hover:border-sky-500 shadow-sm"
          title="커서 위치를 기준으로 본문을 두 토막으로 나눈다. 토막마다 음원을 따로 생성할 수 있다."
        >
          <span className="text-base leading-none">✂</span>
          <span>여기서 나누기</span>
        </button>
      )}
      {onAddAnchor && selectedText && focused && (
        <button
          onMouseDown={e => { e.preventDefault(); onAddAnchor(selectedText); setSelectedText('') }}
          className="inline-flex items-center gap-1.5 mt-1 px-2.5 py-1 text-[12px] font-bold rounded-md bg-amber-100 border border-amber-400 text-amber-900 hover:bg-amber-200 hover:border-amber-500 shadow-sm"
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
