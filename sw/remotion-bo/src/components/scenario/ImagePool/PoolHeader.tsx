'use client'

import { POOL_STYLES, type ViewMode } from './constants'

/** ImagePool 상단 헤더 — 카운트, 폴더 열기, 새로고침, 그리드/리스트 토글, 접기 버튼 */
export function PoolHeader({
  scopedCount, imageCount, videoCount, usedCount,
  viewMode, onViewMode,
  onCollapse, onOpenFolder, onRefresh,
}: {
  scopedCount: number
  imageCount: number
  videoCount: number
  usedCount: number
  viewMode: ViewMode
  onViewMode: (m: ViewMode) => void
  onCollapse: () => void
  onOpenFolder?: () => void
  onRefresh?: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm font-bold text-text-secondary font-semibold uppercase tracking-wide">
      <span className="flex items-center gap-1">
        <button
          onClick={onCollapse}
          title="이미지 풀 접기 · Ctrl+Q"
          className="text-sm font-black text-text-secondary hover:text-accent mr-1"
        >▶</button>
        <span className="text-text-primary">ImagePool</span>
        <span className="text-text-secondary normal-case font-normal ml-1">미디어 {scopedCount}개</span>
        <span className="text-text-secondary/60 normal-case font-normal">
          · 이미지 {imageCount} / 영상 {videoCount}
          · used {usedCount} / unused {scopedCount - usedCount}
        </span>
        {onOpenFolder && (
          <button onClick={onOpenFolder} className="text-sm font-bold text-accent hover:text-accent-hover normal-case font-normal ml-1" title="이미지 폴더 열기">
            📂
          </button>
        )}
        {onRefresh && (
          <button onClick={onRefresh} className="text-sm font-bold text-accent hover:text-accent-hover normal-case font-normal ml-1" title="디스크에서 다시 불러오기">
            ↻
          </button>
        )}
      </span>
      <div className={POOL_STYLES.toggleGroup}>
        <button
          onClick={() => onViewMode('grid')}
          className={`${POOL_STYLES.toggleBtn} normal-case font-normal ${viewMode === 'grid' ? POOL_STYLES.toggleActive : POOL_STYLES.toggleIdle}`}
          title="그리드 보기"
        >▦</button>
        <button
          onClick={() => onViewMode('list')}
          className={`${POOL_STYLES.toggleBtn} normal-case font-normal ${viewMode === 'list' ? POOL_STYLES.toggleActive : POOL_STYLES.toggleIdle}`}
          title="리스트 보기"
        >☰</button>
      </div>
    </div>
  )
}

/** 접힘 상태의 사이드바 — 펼침 토글 + 카운트 세로 표기 */
export function CollapsedPool({ count, onExpand }: { count: number; onExpand: () => void }) {
  return (
    <div className={POOL_STYLES.sidebarCollapsed}>
      <button
        onClick={onExpand}
        title="이미지 풀 펼치기 · Ctrl+Q"
        className="w-full h-full flex flex-col items-center justify-start gap-2 py-2 text-text-secondary hover:text-accent hover:bg-bg-hover transition-colors"
      >
        <span className="text-[14px]">◀</span>
        <span className="[writing-mode:vertical-rl] text-sm font-bold tracking-widest">미디어 {count}개</span>
      </button>
    </div>
  )
}
