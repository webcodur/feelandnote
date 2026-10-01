/*
  천도 v2 — 창 안에 보이는 칸만 그리는 격자. 5천 명 넘는 명부를 한꺼번에 그리지 않는다.
*/
'use client'

import { useEffect, useRef, useState, type ReactNode } from 'react'

interface VirtualGridProps<T> {
  items: T[]
  /** 칸 최소 너비 */
  minWidth: number
  /** 칸 높이 */
  rowHeight: number
  gap?: number
  render: (item: T, index: number) => ReactNode
  getKey: (item: T) => string
  className?: string
  /** 위쪽으로 되감을 때 바뀌는 값 */
  resetKey?: string
}

export function VirtualGrid<T>({ items, minWidth, rowHeight, gap = 8, render, getKey, className, resetKey }: VirtualGridProps<T>) {
  const ref = useRef<HTMLDivElement>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const [scrollTop, setScrollTop] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // clientWidth는 안쪽 여백까지 잰다 — 칸은 여백 안쪽에 서므로 여백을 뺀다
    const measure = () => {
      const style = getComputedStyle(el)
      const padX = parseFloat(style.paddingLeft) + parseFloat(style.paddingRight)
      setSize({ width: Math.max(0, el.clientWidth - padX), height: el.clientHeight })
    }
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    measure()
    return () => observer.disconnect()
  }, [])

  // 거르기가 바뀌면 맨 위로 — 상태는 그리는 도중에 맞추고, 실제 스크롤만 효과에서 옮긴다
  const [seenKey, setSeenKey] = useState(resetKey)
  if (seenKey !== resetKey) {
    setSeenKey(resetKey)
    setScrollTop(0)
  }
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = 0
  }, [resetKey])

  const columns = Math.max(1, Math.floor((size.width + gap) / (minWidth + gap)))
  const cellWidth = columns > 0 ? (size.width - gap * (columns - 1)) / columns : minWidth
  const rows = Math.ceil(items.length / columns)
  const stride = rowHeight + gap
  const first = Math.max(0, Math.floor(scrollTop / stride) - 2)
  const last = Math.min(rows, Math.ceil((scrollTop + size.height) / stride) + 2)
  const visible: ReactNode[] = []
  for (let r = first; r < last; r++) {
    for (let c = 0; c < columns; c++) {
      const i = r * columns + c
      if (i >= items.length) break
      const item = items[i]
      visible.push(
        <div key={getKey(item)} style={{ position: 'absolute', top: r * stride, left: c * (cellWidth + gap), width: cellWidth, height: rowHeight }}>
          {render(item, i)}
        </div>,
      )
    }
  }
  return (
    <div ref={ref} className={className} style={{ overflowY: 'auto', position: 'relative' }} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
      <div style={{ position: 'relative', height: Math.max(0, rows * stride - gap) }}>{visible}</div>
    </div>
  )
}
