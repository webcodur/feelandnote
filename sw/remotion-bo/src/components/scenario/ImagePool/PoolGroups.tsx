'use client'

import { POOL_STYLES, type Group, type ViewMode } from './constants'

/**
 * 책별 그룹 아코디언 — 각 책 또는 미분류 등에 속한 이미지들을 그리드/리스트로 펼친다.
 * 헤더 클릭으로 펼침과 접음, 펼친 상태에서 하단 "▲ 접기"로도 닫을 수 있다.
 */
export function PoolGroups({
  groups, opened, viewMode, renderImage, toggleOpen,
}: {
  groups: Group[]
  opened: Set<string>
  viewMode: ViewMode
  renderImage: (fn: string) => React.ReactNode
  toggleOpen: (key: string) => void
}) {
  return (
    <div className="space-y-2">
      {groups.map(group => {
        const isOpen = opened.has(group.key)
        return (
          <div key={group.key} className="border border-border/30 rounded overflow-hidden">
            <button
              onClick={() => toggleOpen(group.key)}
              className={POOL_STYLES.sectionHeader}
            >
              <span className={`text-text-secondary text-[11px] transition-transform ${isOpen ? 'rotate-90' : ''}`}>▶</span>
              <span className="text-[11px] font-semibold text-text-primary truncate flex-1">{group.label}</span>
            </button>
            {isOpen && (
              <div className="p-1.5 space-y-1.5">
                <div className={viewMode === 'grid' ? POOL_STYLES.gridBody : POOL_STYLES.listBody}>
                  {group.files.map(renderImage)}
                </div>
                <div className="flex justify-end">
                  <button
                    onClick={() => toggleOpen(group.key)}
                    className={`${POOL_STYLES.pill} ${POOL_STYLES.pillIdle}`}
                    title="이 섹션 접기"
                  >▲ 접기</button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
