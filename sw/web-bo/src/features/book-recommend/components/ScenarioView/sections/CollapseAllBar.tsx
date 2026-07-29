'use client'

import { useRowCollapse } from '../../scenario/RowCollapseContext'

/** 페이지 상단 — 모든 행 펼치기/접기 일괄 토글. */
export function CollapseAllBar() {
  const ctx = useRowCollapse()
  const total = ctx.totalCount
  const open = total - ctx.collapsedCount
  return (
    <div className="flex items-center gap-2 text-[11px] text-text-secondary">
      <button
        onClick={ctx.expandAll}
        className="px-2 py-0.5 text-[11px] border border-border/60 rounded hover:border-accent/40 hover:text-accent"
        title="모든 행을 펼친다"
      >▼ 전부 펼치기</button>
      <button
        onClick={ctx.collapseAll}
        className="px-2 py-0.5 text-[11px] border border-border/60 rounded hover:border-accent/40 hover:text-accent"
        title="모든 행을 접는다"
      >▶ 전부 접기</button>
    </div>
  )
}
