import { useState } from 'react'
import Button from '@/components/ui/Button'
import { Check, Loader2, Search, Database, ChevronDown, ChevronUp } from 'lucide-react'
import type { ExtractedContent } from '@feelandnote/ai-services/content-extractor'
import type { ProcessedItem } from '../lib/types'
import ExtractedItemCard from './ExtractedItemCard'


interface ExtractedListProps {
  extractedItems: ExtractedContent[]
  sortedIndices: number[]
  selectedIndices: Set<number>
  excludedIndices: Set<number>
  collapsedIndices: Set<number>
  processedItems: Map<number, ProcessedItem>
  processing: boolean
  activeIndex: number | null
  onToggleSelectAll: () => void
  onHandleSearch: () => void
  onToggleCollapse: (index: number) => void
  onToggleCollapseAll: () => void
  onToggleSelect: (index: number) => void
  onToggleExclude: (index: number) => void
  onOpenManualSearch: (index: number) => void
  onUpdateExtractedItem: (index: number, updates: Partial<ExtractedContent>) => void
  onHandleSearchResultChange: (
    index: number,
    source: 'ko' | 'original',
    resultIndex: number
  ) => void
  onHandleStatusChange: (index: number, status: string) => void
  onSetImagePopupUrl: (url: string | null) => void
  onSetActiveIndex: (index: number | null) => void
}

export default function ExtractedList({
  extractedItems,
  sortedIndices,
  selectedIndices,
  excludedIndices,
  collapsedIndices,
  processedItems,
  processing,
  activeIndex,
  onToggleSelectAll,
  onHandleSearch,
  onToggleCollapse,
  onToggleCollapseAll,
  onToggleSelect,
  onToggleExclude,
  onOpenManualSearch,
  onUpdateExtractedItem,
  onHandleSearchResultChange,
  onHandleStatusChange,
  onSetImagePopupUrl,
  onSetActiveIndex,
}: ExtractedListProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  return (
    <div className="space-y-2">
      <h2
        className="text-xl font-bold text-text-primary flex items-center justify-center gap-2 cursor-pointer py-2 hover:bg-bg-secondary/50 rounded-lg transition-colors select-none"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <Database className="w-6 h-6 text-accent" />
        추출된 콘텐츠
        <span className="text-text-secondary text-lg font-normal">({extractedItems.length})</span>
        {isCollapsed ? (
          <ChevronDown className="w-5 h-5 text-text-tertiary" />
        ) : (
          <ChevronUp className="w-5 h-5 text-text-tertiary" />
        )}
      </h2>

      {!isCollapsed && (
        <div className="bg-bg-card border border-border rounded-xl p-4 space-y-4">
          {extractedItems.length === 0 ? (
            <div className="text-center py-8 text-text-tertiary">
              추출된 콘텐츠가 없습니다.
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Button
                    unstyled
                    onClick={onToggleSelectAll}
                    className={`w-5 h-5 rounded border flex items-center justify-center ${
                      selectedIndices.size === extractedItems.length
                        ? 'bg-accent border-accent text-white'
                        : 'border-border hover:border-accent'
                    }`}
                  >
                    {selectedIndices.size === extractedItems.length && (
                      <Check className="w-3 h-3" />
                    )}
                  </Button>
                  <span className="text-sm font-medium text-text-secondary">전체 선택</span>
                  
                  <div className="flex items-center gap-2 text-xs text-text-secondary ml-3 pl-3 border-l-2 border-border/50">
                    <span className="font-semibold text-text-primary">단축키:</span>
                    <span
                      className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border text-text-primary cursor-pointer hover:bg-bg-secondary/80 hover:border-accent/50 transition-colors"
                      onClick={onToggleCollapseAll}
                      title="Ctrl+Shift+A"
                    >
                      <kbd className="font-sans">Ctrl+Shift+A</kbd> 전체 여닫기
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border text-text-primary">
                      <kbd className="font-sans">Ctrl+Shift+D</kbd> 아이템 여닫기
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border text-text-primary">
                      <kbd className="font-sans">Ctrl+Shift+F</kbd> 검색
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-bg-secondary border border-border text-text-primary">
                      <kbd className="font-sans">Ctrl+Shift+C</kbd> 검색용 복사
                    </span>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={onHandleSearch}
                  disabled={processing || selectedIndices.size === 0}
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      검색 중...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4" />
                      선택 항목 검색 ({selectedIndices.size}개)
                    </>
                  )}
                </Button>
              </div>

              <div className="space-y-2">
                {sortedIndices.map((index, sortedIdx) => {
                  const item = extractedItems[index]
                  const isSelected = selectedIndices.has(index)
                  const isExcluded = excludedIndices.has(index)
                  const isCollapsed = collapsedIndices.has(index)
                  const processed = processedItems.get(index)

                  // 배제 구분선 위치 계산
                  const isFirstExcluded =
                    isExcluded &&
                    (sortedIdx === 0 || !excludedIndices.has(sortedIndices[sortedIdx - 1]))

                  return (
                    <div key={index}>
                      {/* 배제 구분선 */}
                      {isFirstExcluded && (
                        <div className="flex items-center gap-2 pb-2 pt-4">
                          <div className="flex-1 h-px bg-red-500/30" />
                          <span className="text-xs text-red-400 px-2">
                            배제됨 ({excludedIndices.size})
                          </span>
                          <div className="flex-1 h-px bg-red-500/30" />
                        </div>
                      )}

                      <ExtractedItemCard
                        index={index}
                        item={item}
                        processed={processed}
                        isSelected={isSelected}
                        isExcluded={isExcluded}
                        isCollapsed={isCollapsed}
                        isActive={activeIndex === index}
                        totalCount={extractedItems.length}
                        onToggleCollapse={onToggleCollapse}
                        onToggleSelect={onToggleSelect}
                        onToggleExclude={onToggleExclude}
                        onOpenManualSearch={onOpenManualSearch}
                        onUpdateExtractedItem={onUpdateExtractedItem}
                        onHandleSearchResultChange={onHandleSearchResultChange}
                        onHandleStatusChange={onHandleStatusChange}
                        onSetImagePopupUrl={onSetImagePopupUrl}
                        onActivate={onSetActiveIndex}
                      />
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
