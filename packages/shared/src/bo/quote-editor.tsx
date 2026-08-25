'use client'

/**
 * 대사 입력칸 — 엔터로 덩어리를 나누고, 줄 위 점선으로 사진이 넘어가는 자리를 건다.
 *
 * 글자 하이라이팅이 아니라 **줄 사이 가로선**으로 전환 시점을 보여준다. 사진이 걸린 줄부터
 * 다음 자리 전까지 배경이 그 사진 카드와 같은 색으로 칠해져, 오른쪽 카드와 눈으로 대조된다.
 *
 * 팩션 인물 대사와 담화 발언이 같은 부품을 쓴다(원래 팩션 전용 `FactionQuoteEditor` 였다).
 * 투명 오버레이 3겹 구조 — 색칠(뒤) · 입력창(가운데) · 표식과 단추(앞).
 */

import { useRef, useState } from 'react'
import type { AnchorTheme } from './media'

/** 어느 줄에 사진이 걸렸는가 — 색이 없으면 자리만 잡고 사진은 아직 안 고른 상태다 */
export type QuoteAnchor = { hasImage: boolean; theme?: AnchorTheme }

/**
 * 줄을 넣거나 지웠을 때 사진이 걸린 자리를 따라 옮긴다.
 *
 * 앞뒤로 그대로인 부분을 잘라내 실제로 달라진 구간만 셈해, 그 뒤에 있던 자리들을 늘어난/줄어든
 * 만큼 민다. 이게 없으면 중간에 한 줄 넣는 순간 모든 사진이 한 칸씩 어긋난다.
 * 같은 줄로 몰린 자리는 하나만 남긴다.
 */
export function adjustImageChanges<T extends { chunk: number }>(
  oldValue: string, newValue: string, imageChanges: T[],
): T[] {
  if (!imageChanges?.length) return imageChanges

  const oldChunks = oldValue.split('\n')
  const newChunks = newValue.split('\n')
  const diff = newChunks.length - oldChunks.length
  if (diff === 0) return imageChanges

  let startDiff = 0
  while (startDiff < oldChunks.length && startDiff < newChunks.length && oldChunks[startDiff] === newChunks[startDiff]) {
    startDiff++
  }

  let oldEnd = oldChunks.length - 1
  let newEnd = newChunks.length - 1
  while (oldEnd >= startDiff && newEnd >= startDiff && oldChunks[oldEnd] === newChunks[newEnd]) {
    oldEnd--
    newEnd--
  }

  const suffixStart = oldEnd + 1

  const adjusted = imageChanges.map(ic => {
    let next = ic.chunk
    if (ic.chunk >= suffixStart) {
      next = ic.chunk + diff
    } else if (ic.chunk >= startDiff && ic.chunk <= oldEnd) {
      if (diff > 0 && newChunks[ic.chunk] === '') next = ic.chunk + diff
      else if (diff < 0) next = startDiff
    }
    next = Math.max(0, Math.min(next, newChunks.length - 1))
    return { ...ic, chunk: next }
  })

  const seen = new Set<number>()
  return adjusted.filter(ic => {
    if (seen.has(ic.chunk)) return false
    seen.add(ic.chunk)
    return true
  })
}

export function QuoteEditor({
  value,
  onChange,
  onAddAnchor,
  onRemoveAnchor,
  onMoveAnchor,
  onOpenAnchor,
  onCursorChunk,
  placeholder,
  ariaLabel,
  anchors,
  className = '',
  minHeight,
  labelText = '이미지 전환',
  emptyLabelText = '사진 미지정',
}: {
  value: string
  onChange: (val: string) => void
  onAddAnchor?: (chunkIndex: number) => void
  onRemoveAnchor?: (chunkIndex: number) => void
  onMoveAnchor?: (fromIndex: number, toIndex: number) => void
  /** 걸어 둔 자리의 표식을 눌렀을 때 — 사진 고르는 창을 띄운다 */
  onOpenAnchor?: (chunkIndex: number) => void
  /** 글자 커서가 놓인 줄 */
  onCursorChunk?: (chunkIndex: number | null) => void
  placeholder?: string
  ariaLabel?: string
  anchors?: Map<number, QuoteAnchor>
  className?: string
  minHeight?: number
  labelText?: string
  emptyLabelText?: string
}) {
  const [focused, setFocused] = useState(false)
  const [cursorChunkIndex, setCursorChunkIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const ref = useRef<HTMLTextAreaElement>(null)
  const chunks = value ? value.split('\n') : ['']

  /** 줄마다 칠할 색 — 사진이 걸린 줄부터 다음 자리 전까지 이어진다 */
  const chunkBgs: string[] = []
  let currentBg = 'bg-transparent'
  for (let i = 0; i < chunks.length; i++) {
    const anchor = anchors?.get(i)
    if (anchor) {
      currentBg = anchor.hasImage && anchor.theme ? anchor.theme.bg : 'bg-slate-400/25'
    } else if (i === 0) {
      currentBg = 'bg-transparent'
    }
    chunkBgs.push(currentBg)
  }

  const updateCursor = () => {
    const el = ref.current
    if (!el) return
    const idx = el.value.slice(0, el.selectionStart).split('\n').length - 1
    setCursorChunkIndex(idx)
    onCursorChunk?.(idx)
  }

  const TYPO = 'font-semibold text-[14.5px] leading-7 tracking-[-0.005em] whitespace-pre-wrap break-words'

  return (
    <div className="relative h-full">
      {/* 1. 색칠 — 글자 뒤 */}
      <div aria-hidden className={`pointer-events-none absolute inset-0 z-0 px-2.5 py-1.5 ${TYPO} ${className}`}>
        {chunks.map((chunk, i) => (
          <div key={`bg-${i}`} className={`relative -mx-2.5 px-2.5 transition-colors duration-200 ${chunkBgs[i]}`}>
            <span className="text-transparent">{chunk || ' '}</span>
            {i < chunks.length - 1 ? '\n' : ''}
          </div>
        ))}
      </div>

      {/* 2. 실제 입력창 — 오른쪽은 표식 자리(pr-16) */}
      <textarea
        ref={ref}
        value={value}
        onChange={e => { onChange(e.target.value); updateCursor() }}
        onFocus={() => { setFocused(true); updateCursor() }}
        onBlur={() => { setFocused(false); setCursorChunkIndex(null) }}
        onKeyUp={updateCursor}
        onMouseUp={updateCursor}
        placeholder={placeholder}
        aria-label={ariaLabel}
        rows={1}
        spellCheck={false}
        style={minHeight ? { minHeight } : undefined}
        className={`relative z-10 w-full resize-none rounded-md border border-transparent bg-transparent py-1.5 pe-16 ps-2.5 outline-none [caret-color:currentColor] [field-sizing:content] focus:ring-2 focus:ring-accent/20 ${TYPO} ${className}`}
      />

      {/* 3. 표식과 단추 — 글자 앞 */}
      <div
        aria-hidden
        className={`absolute inset-0 z-20 px-2.5 py-1.5 ${TYPO} ${isDragging ? 'pointer-events-auto' : 'pointer-events-none'} ${className}`}
        onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverIndex(null) }}
        onDrop={() => { setDragOverIndex(null); setIsDragging(false) }}
      >
        {chunks.map((chunk, i) => {
          const anchor = anchors?.get(i)
          const hasAnchor = !!anchor
          const theme = anchor?.hasImage ? anchor.theme : undefined
          const isCursorHere = focused && cursorChunkIndex === i
          const isDragOver = dragOverIndex === i

          return (
            <div
              key={i}
              className="relative"
              onDragOver={e => {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (dragOverIndex !== i) setDragOverIndex(i)
              }}
              onDrop={e => {
                e.preventDefault()
                setDragOverIndex(null)
                const fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10)
                if (!Number.isNaN(fromIdx) && fromIdx !== i && onMoveAnchor) onMoveAnchor(fromIdx, i)
              }}
            >
              {isDragOver && (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-20 border-t-2 border-accent shadow-[0_0_8px_rgba(59,130,246,0.6)]" />
              )}

              {/* 사진이 걸린 줄 — 위에 점선과 표식 */}
              {hasAnchor && i > 0 && (
                <div className={`pointer-events-auto absolute start-0 end-14 top-0 border-t-2 border-dashed transition-colors ${theme ? theme.border : 'border-slate-400'}`}>
                  <div
                    draggable
                    onDragStart={e => {
                      e.dataTransfer.setData('text/plain', String(i))
                      e.dataTransfer.effectAllowed = 'move'
                      setIsDragging(true)
                    }}
                    onDragEnd={() => { setDragOverIndex(null); setIsDragging(false) }}
                    onClick={() => onOpenAnchor?.(i)}
                    className={`absolute -top-2.5 end-0 flex cursor-grab items-center gap-1 rounded-sm py-0.5 pe-1 ps-1.5 text-[10px] font-bold leading-tight shadow-sm transition-colors active:cursor-grabbing hover:opacity-80 ${
                      theme ? `${theme.badgeText} ${theme.badgeBg}` : 'bg-slate-200 text-slate-600'
                    }`}
                    title="눌러서 사진 고르기 · 끌어서 다른 줄로 옮기기 · ✕로 없애기"
                  >
                    <span>🖼 {theme ? labelText : emptyLabelText}</span>
                    {onRemoveAnchor && (
                      <button
                        type="button"
                        onMouseDown={e => { e.preventDefault(); e.stopPropagation(); onRemoveAnchor(i) }}
                        className={`ms-1 flex h-3 w-3 items-center justify-center rounded-full transition-colors hover:bg-white/50 hover:text-red-500 ${theme ? theme.text : 'text-slate-500'}`}
                        title="이 자리를 없앱니다"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* 커서가 놓인 줄 — 자리 걸기 단추 */}
              {!hasAnchor && isCursorHere && onAddAnchor && i > 0 && (
                <div className="group pointer-events-none absolute inset-x-0 top-0">
                  <div className="absolute start-0 end-14 top-0 border-t-2 border-dashed border-border/50 transition-colors group-hover:border-amber-400" />
                  <div className="pointer-events-auto absolute end-0 top-0">
                    <button
                      type="button"
                      onMouseDown={e => { e.preventDefault(); onAddAnchor(i) }}
                      className="-mt-1 flex items-center gap-1 rounded-md border border-border bg-bg-secondary px-1.5 py-0.5 text-[10px] font-bold text-text-secondary shadow-sm transition-colors hover:border-amber-400 hover:bg-amber-100 hover:text-amber-800"
                      title="이 줄이 시작될 때 새 사진으로 넘어갑니다"
                    >
                      ＋ 전환
                    </button>
                  </div>
                </div>
              )}

              <span className="text-transparent">{chunk || ' '}</span>
              {i < chunks.length - 1 ? '\n' : ''}
            </div>
          )
        })}
      </div>
    </div>
  )
}
