'use client'

import { useState } from 'react'
import { VIEW_META } from './viewHelpers'

/**
 * 시나리오 페이지 상단 탭 바.
 *
 * - 첫 카드: "기본/기타"(메타 탭).
 * - 책 카드: 위 칸 책 제목(클릭 → 롱폼), 아래 칸 롱/숏 토글. 쇼츠 없는 책은 숏 비활성.
 * - 활성 시각 강조는 view + subTab 조합으로 결정한다.
 * - 책 카드 좌상단 ⋮⋮ 핸들을 끌어서 책 순서를 바꾼다. onReorder 제공 시 활성.
 */
export function BookTabsBar({
  view, subTab, books, bookToShortsIndex, onSelect, onReorder,
}: {
  view: string
  subTab: 'long' | 'short'
  books: Array<{ title?: string }>
  bookToShortsIndex: Map<number, number>
  onSelect: (nextView: string, nextSub: 'long' | 'short') => void
  /** 책 순서 변경 — fromIdx 책을 toIdx 자리로. 음성 파일도 함께 rename. */
  onReorder?: (fromIdx: number, toIdx: number) => void
}) {
  const [dragFrom, setDragFrom] = useState<number | null>(null)
  const [dragOver, setDragOver] = useState<number | null>(null)
  return (
    <div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        <button
          onClick={() => onSelect(VIEW_META, 'long')}
          className={`shrink-0 inline-flex items-center justify-center px-4 rounded-md border text-sm font-semibold whitespace-nowrap ${
            view === VIEW_META
              ? 'border-accent text-accent bg-accent/5'
              : 'border-border/40 text-text-primary hover:border-border hover:bg-bg-hover'
          }`}
          style={{ minHeight: '52px' }}
        >
          기본/기타
        </button>

        {books.map((book, i) => {
          const v = `book-${i + 1}`
          const isActive = view === v
          const hasShorts = bookToShortsIndex.has(i)
          const isLong = isActive && subTab === 'long'
          const isShort = isActive && subTab === 'short'
          const rawTitle = book?.title ?? ''
          const shortTitle = rawTitle.length > 10 ? rawTitle.slice(0, 10) + '…' : rawTitle
          const isDragging = dragFrom === i
          const isOver = dragOver === i && dragFrom !== null && dragFrom !== i
          const cardBorder = isOver
            ? 'border-accent ring-2 ring-accent/50'
            : isActive
              ? 'border-accent'
              : 'border-border/40 hover:border-border'
          return (
            <div
              key={v}
              onDragOver={onReorder ? (e => {
                if (dragFrom === null) return
                if (!Array.from(e.dataTransfer.types).includes('text/plain')) return
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                setDragOver(i)
              }) : undefined}
              onDragLeave={onReorder ? (() => { if (dragOver === i) setDragOver(null) }) : undefined}
              onDrop={onReorder ? (e => {
                const data = e.dataTransfer.getData('text/plain')
                if (!data.startsWith('book:')) return
                e.preventDefault()
                const from = parseInt(data.slice(5), 10)
                if (Number.isFinite(from) && from !== i) onReorder(from, i)
                setDragFrom(null); setDragOver(null)
              }) : undefined}
              className={`shrink-0 inline-flex flex-col rounded-md border overflow-hidden transition-opacity ${cardBorder} ${isDragging ? 'opacity-50' : ''}`}
              title={hasShorts ? `${rawTitle} (쇼츠 있음)` : `${rawTitle} (쇼츠 없음)`}
            >
              <div className="flex items-center">
                {onReorder && (
                  <span
                    draggable
                    onDragStart={e => {
                      setDragFrom(i)
                      e.dataTransfer.effectAllowed = 'move'
                      e.dataTransfer.setData('text/plain', `book:${i}`)
                    }}
                    onDragEnd={() => { setDragFrom(null); setDragOver(null) }}
                    className="cursor-grab active:cursor-grabbing px-1 py-1 text-text-secondary/60 hover:text-accent select-none"
                    title="끌어서 책 순서 바꾸기"
                  >⋮⋮</span>
                )}
                <button
                  onClick={() => onSelect(v, 'long')}
                  className={`flex-1 px-3 pt-1.5 pb-0.5 text-sm font-semibold whitespace-nowrap text-center cursor-pointer ${
                    isActive
                      ? 'text-accent bg-accent/5'
                      : 'text-text-primary hover:bg-bg-hover'
                  }`}
                >
                  <span className="font-mono text-[11px] mr-1 opacity-60">{String(i + 1).padStart(2, '0')}</span>
                  {shortTitle}
                </button>
              </div>
              <div className={`flex border-t ${isActive ? 'border-accent/30' : 'border-border/30'}`}>
                <button
                  onClick={() => onSelect(v, 'long')}
                  className={`flex-1 py-0.5 text-[11px] font-bold cursor-pointer ${
                    isLong
                      ? 'text-accent bg-accent/10'
                      : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                  }`}
                >롱</button>
                <div className={`w-px ${isActive ? 'bg-accent/30' : 'bg-border/30'}`} />
                <button
                  onClick={() => { if (hasShorts) onSelect(v, 'short') }}
                  disabled={!hasShorts}
                  className={`flex-1 py-0.5 text-[11px] font-bold ${
                    !hasShorts
                      ? 'text-text-secondary/30 cursor-not-allowed bg-bg-card/30'
                      : isShort
                        ? 'text-accent bg-accent/10 cursor-pointer'
                        : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary cursor-pointer'
                  }`}
                >숏</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
