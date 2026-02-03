
import Image from 'next/image'
import Button from '@/components/ui/Button'
import {
  Check,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Pencil,
  RotateCcw,
  Search,
  Star,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { CONTENT_TYPE_CONFIG, type ContentType } from '@/constants/contentTypes'
import { STATUS_OPTIONS } from '@/constants/statuses'
import type { ExtractedContent } from '@feelandnote/ai-services/content-extractor'
import type { ProcessedItem } from '../lib/types'
import { CONTENT_TYPE_OPTIONS, getMetadataSummary } from '../lib/utils'

interface ExtractedItemCardProps {
  index: number
  totalCount: number
  item: ExtractedContent
  processed?: ProcessedItem
  isSelected: boolean
  isExcluded: boolean
  isCollapsed: boolean
  isActive: boolean
  onToggleCollapse: (index: number) => void
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
  onActivate: (index: number) => void
}

export default function ExtractedItemCard({
  index,
  totalCount,
  item,
  processed,
  isSelected,
  isExcluded,
  isCollapsed,
  isActive,
  onToggleCollapse,
  onToggleSelect,
  onToggleExclude,
  onOpenManualSearch,
  onUpdateExtractedItem,
  onHandleSearchResultChange,
  onHandleStatusChange,
  onSetImagePopupUrl,
  onActivate,
}: ExtractedItemCardProps) {
  const typeConfig = CONTENT_TYPE_CONFIG[item.type as ContentType]
  const Icon = typeConfig?.icon || Star

  const [reviewCopied, setReviewCopied] = useState(false)
  const [titleCopied, setTitleCopied] = useState(false)
  const [titleTransCopied, setTitleTransCopied] = useState(false)
  const [isUrlEditing, setIsUrlEditing] = useState(false)

  // 제목 - 저자 복사
  const handleCopyTitle = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const text = item.creator ? `${item.title} - ${item.creator}` : item.title
    try {
      await navigator.clipboard.writeText(text)
      setTitleCopied(true)
      setTimeout(() => setTitleCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  // 제목 - 저자 번역본 복사
  const handleCopyTitleTrans = async (e: React.MouseEvent) => {
    e.stopPropagation()
    const text = `${item.title} - ${item.creator || ''} 번역본`
    try {
      await navigator.clipboard.writeText(text)
      setTitleTransCopied(true)
      setTimeout(() => setTitleTransCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  const handleCopyReview = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!item.review) return
    try {
      await navigator.clipboard.writeText(item.review)
      setReviewCopied(true)
      setTimeout(() => setReviewCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy text: ', err)
    }
  }

  return (
    <div
      onClick={() => onActivate(index)}
      className={`border rounded-lg overflow-hidden transition-all ${
        isExcluded
          ? 'border-red-500/30 bg-red-500/5 opacity-60'
          : isActive
            ? 'border-accent ring-1 ring-accent bg-accent/5 shadow-lg shadow-accent/10'
            : isSelected
              ? 'border-accent bg-accent/5'
              : 'border-border hover:border-accent/50'
      }`}
    >
      {/* Item Header */}
      <div className="flex items-center gap-3 p-3 transition-colors hover:bg-white/5">
        {/* 인덱스 표시 (n/m) - 여닫기 트리거 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleCollapse(index)
          }}
          className="shrink-0 flex items-center justify-center w-14 h-14 rounded-full bg-bg-secondary border-2 border-accent hover:bg-accent hover:text-white transition-all group"
        >
          <span className="text-lg font-bold text-accent group-hover:text-white font-mono">
            {index + 1}
          </span>
          <span className="text-xs text-text-tertiary group-hover:text-white/80 ml-0.5 font-medium mt-1">
            /{totalCount}
          </span>
        </button>

        {/* 선택 체크박스 (배제 안 된 경우만) */}
        {!isExcluded && (
          <Button
            unstyled
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelect(index)
            }}
            className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
              isSelected
                ? 'bg-accent border-accent text-white'
                : 'border-border hover:border-accent'
            }`}
          >
            {isSelected && <Check className="w-3 h-3" />}
          </Button>
        )}

        <div className="flex-1 min-w-0 flex items-center gap-2 text-sm text-text-secondary">
          {/* Content Info Line: [Type] Title | Creator | Review | Source */}
          <span className="text-accent font-medium shrink-0 w-[60px]">
            [{typeConfig?.label || item.type}]
          </span>
          <span
            className={`font-medium truncate flex-1 min-w-[150px] ${
              isExcluded ? 'text-text-secondary line-through' : 'text-text-primary'
            }`}
            title={item.title}
          >
            {item.title}
          </span>
          
          <div className="flex items-center gap-2 shrink-0">
            {item.creator && (
              <>
                <span className="text-border">|</span>
                <span className="text-text-secondary truncate w-[100px]" title={item.creator}>
                  {item.creator}
                </span>
              </>
            )}
            {item.review && (
              <>
                <span className="text-border">|</span>
                <span className="text-text-tertiary truncate w-[120px]" title={item.review}>
                  {item.review.slice(0, 10)}{item.review.length > 10 ? '...' : ''}
                </span>
              </>
            )}
            {item.sourceUrl && (
              <>
                <span className="text-border">|</span>
                <span className="text-blue-400/70 truncate w-[180px]" title={item.sourceUrl}>
                  {item.sourceUrl.slice(0, 20)}{item.sourceUrl.length > 20 ? '...' : ''}
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* 배제/복원 버튼 */}
          <Button
            unstyled
            onClick={() => onToggleExclude(index)}
            className={`p-1.5 rounded shrink-0 ${
              isExcluded
                ? 'text-green-400 hover:bg-green-500/10'
                : 'text-text-secondary hover:text-red-400 hover:bg-red-500/10'
            }`}
            title={isExcluded ? '복원' : '배제'}
          >
            {isExcluded ? <RotateCcw className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </Button>

          {!isExcluded && (
            <>
              <Button
                unstyled
                onClick={handleCopyTitle}
                className={`p-1.5 rounded shrink-0 ${
                  titleCopied
                    ? 'text-green-400'
                    : 'text-text-secondary hover:text-accent'
                }`}
                title="복사 (제목 - 저자)"
              >
                {titleCopied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </Button>
              <Button
                unstyled
                onClick={handleCopyTitleTrans}
                className={`p-1.5 rounded shrink-0 ${
                  titleTransCopied
                    ? 'text-green-400'
                    : 'text-text-secondary hover:text-blue-400'
                }`}
                title="복사 (제목 - 저자 번역본)"
              >
                {titleTransCopied ? <Check className="w-4 h-4" /> : <span className="text-xs font-bold">번</span>}
              </Button>
              <Button
                unstyled
                onClick={() => onOpenManualSearch(index)}
                className="p-1.5 text-text-secondary hover:text-accent rounded shrink-0"
                title="직접 검색"
              >
                <Search className="w-4 h-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Expanded Content (Details + Editing) */}
      {!isCollapsed && !isExcluded && (
        <div className="px-3 pb-3 pt-2 border-t border-border/50 space-y-3 bg-bg-secondary/30">
          {/* Main Info Inputs */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <label className="text-xs text-text-secondary w-16 shrink-0">
                한국어 제목
              </label>
              <input
                type="text"
                value={item.titleKo || ''}
                onChange={(e) => onUpdateExtractedItem(index, { titleKo: e.target.value })}
                className="flex-1 px-2 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:border-accent focus:outline-none"
                placeholder="한국어 제목"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-text-secondary w-16 shrink-0">
                콘텐츠 타입
              </label>
              <div className="flex flex-wrap gap-1 flex-1">
                {CONTENT_TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={(e) => {
                      e.stopPropagation()
                      onUpdateExtractedItem(index, { type: opt.value as ContentType })
                    }}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      item.type === opt.value
                        ? 'bg-accent text-white border-accent'
                        : 'bg-bg-secondary text-text-secondary border-border hover:bg-bg-secondary/80'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-text-secondary w-16 shrink-0">
                저자/감독
              </label>
              <input
                type="text"
                value={item.creator || ''}
                onChange={(e) => onUpdateExtractedItem(index, { creator: e.target.value })}
                className="flex-1 px-2 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:border-accent focus:outline-none"
                placeholder="저자/감독 이름"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
            {/* 평점 및 감상 상태 */}
            <div className="flex items-center gap-3">
              <label className="text-xs text-text-secondary w-16 shrink-0">
                평점/상태
              </label>
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="number"
                  min="0"
                  max="5"
                  step="0.5"
                  value={item.rating || ''}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value)
                    onUpdateExtractedItem(index, { rating: isNaN(val) ? undefined : val })
                  }}
                  className="w-20 px-2 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:border-accent focus:outline-none"
                  placeholder="0.0"
                  onClick={(e) => e.stopPropagation()}
                />
                <select
                  value={processed?.status || 'FINISHED'}
                  onChange={(e) => onHandleStatusChange(index, e.target.value)}
                  className="flex-1 px-2 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:border-accent focus:outline-none"
                  onClick={(e) => e.stopPropagation()}
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Review Section */}
          <ReviewSection
            review={item.review}
            onCopy={handleCopyReview}
            reviewCopied={reviewCopied}
            onChange={(val) => onUpdateExtractedItem(index, { review: val })}
          />

          {/* Source URL Section */}
          <div className="flex items-start gap-3">
             <div className="w-16 shrink-0 pt-2 flex flex-col gap-1">
                <label className="text-xs text-text-secondary">출처 URL</label>
                <Button
                   unstyled
                   onClick={() => setIsUrlEditing(!isUrlEditing)}
                   className="flex items-center gap-1 text-[10px] text-text-secondary hover:text-accent w-fit"
                >
                   <Pencil className="w-3 h-3" />
                   {isUrlEditing ? '완료' : '수정'}
                </Button>
             </div>
             <div className="flex-1">
                {isUrlEditing ? (
                   <input
                      type="text"
                      value={item.sourceUrl || ''}
                      onChange={(e) => onUpdateExtractedItem(index, { sourceUrl: e.target.value })}
                      className="w-full px-2 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:border-accent focus:outline-none"
                      placeholder="출처 URL"
                      onClick={(e) => e.stopPropagation()}
                   />
                ) : (
                   item.sourceUrl && (
                      <a
                         href={item.sourceUrl}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="block w-full px-2 py-1.5 bg-bg-secondary/50 border border-border rounded text-xs text-blue-400 hover:text-blue-300 hover:underline truncate"
                         onClick={(e) => e.stopPropagation()}
                         title="원본 링크 열기"
                      >
                         <ExternalLink className="w-3 h-3 inline mr-1" />
                         {item.sourceUrl}
                      </a>
                   )
                )}
             </div>
          </div>
        </div>
      )}

      {/* Search Result (접히지 않고, 배제되지 않은 경우만) */}
      {!isCollapsed &&
        !isExcluded &&
        processed &&
        (processed.searchResultsKo.length > 0 ||
          processed.searchResultsOriginal.length > 0 ||
          processed.selectedSearchResult) && (
          <div className="px-3 pb-3 pt-2 border-t border-border/50 space-y-2">
            {processed.lastSearchQuery && (
              <div className="text-xs text-text-secondary mb-1">
                검색어: <span className="font-medium text-text-primary">{processed.lastSearchQuery}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary shrink-0 w-16">
                검색 결과:
              </span>
              <div className="relative flex-1">
                <select
                  value={
                    processed.searchSource === 'manual'
                      ? 'manual'
                      : `${processed.searchSource}:${
                          processed.searchSource === 'ko'
                            ? processed.searchResultsKo.findIndex(
                                (r) =>
                                  r.externalId ===
                                  processed.selectedSearchResult?.externalId
                              )
                            : processed.searchResultsOriginal.findIndex(
                                (r) =>
                                  r.externalId ===
                                  processed.selectedSearchResult?.externalId
                              )
                        }`
                  }
                  onChange={(e) => {
                    if (e.target.value === 'manual') return
                    const [source, idx] = e.target.value.split(':')
                    onHandleSearchResultChange(
                      index,
                      source as 'ko' | 'original',
                      Number(idx)
                    )
                  }}
                  className="w-full pl-3 pr-8 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary appearance-none focus:border-accent focus:outline-none"
                >
                  {processed.searchSource === 'manual' && processed.selectedSearchResult && (
                    <option value="manual">
                      🔍 {processed.selectedSearchResult.title}
                    </option>
                  )}
                  {processed.searchResultsKo.length > 0 && (
                    <optgroup label="🇰🇷 한국어 검색">
                      {processed.searchResultsKo.map((result, rIndex) => (
                        <option key={`ko:${rIndex}`} value={`ko:${rIndex}`}>
                          {result.title} {result.creator && `- ${result.creator}`}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {processed.searchResultsOriginal.length > 0 && (
                    <optgroup label="🌐 원본 검색">
                      {processed.searchResultsOriginal.map((result, rIndex) => (
                        <option key={`original:${rIndex}`} value={`original:${rIndex}`}>
                          {result.title} {result.creator && `- ${result.creator}`}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
              </div>
            </div>

            {processed.selectedSearchResult && (
              <div className="p-2 bg-bg-secondary rounded space-y-1.5">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      processed.selectedSearchResult?.coverImageUrl &&
                      onSetImagePopupUrl(processed.selectedSearchResult.coverImageUrl)
                    }
                    className={`relative w-16 h-24 bg-bg-card rounded overflow-hidden shrink-0 ${
                      processed.selectedSearchResult?.coverImageUrl
                        ? 'cursor-pointer hover:ring-2 hover:ring-accent'
                        : ''
                    }`}
                    disabled={!processed.selectedSearchResult?.coverImageUrl}
                  >
                    {processed.selectedSearchResult.coverImageUrl && (
                      <Image
                        src={processed.selectedSearchResult.coverImageUrl}
                        alt=""
                        fill
                        unoptimized
                        className="object-cover"
                      />
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent shrink-0"
                        title={
                          processed.searchSource === 'ko'
                            ? '한국어 제목으로 검색한 결과'
                            : processed.searchSource === 'original'
                            ? '원본 제목으로 검색한 결과'
                            : '직접 검색한 결과'
                        }
                      >
                        {processed.searchSource === 'ko'
                          ? '한국어 검색'
                          : processed.searchSource === 'original'
                            ? '원본 검색'
                            : '직접 검색'}
                      </span>
                      <p className="text-xs font-medium text-text-primary truncate">
                        {processed.selectedSearchResult.title}
                      </p>
                    </div>
                    {processed.selectedSearchResult.creator && (
                      <p className="text-xs text-text-secondary truncate mt-0.5">
                        {processed.selectedSearchResult.creator}
                      </p>
                    )}
                    {(() => {
                      const meta = getMetadataSummary(
                        processed.selectedSearchResult,
                        item.type as ContentType
                      )
                      return (
                        meta && (
                          <p className="text-[10px] text-text-secondary/70 truncate mt-0.5">
                            {meta}
                          </p>
                        )
                      )
                    })()}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <span className="text-xs text-text-secondary shrink-0 w-16">상태:</span>
              <select
                value={processed.status}
                onChange={(e) => onHandleStatusChange(index, e.target.value)}
                className="px-2 py-1 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      {/* No results yet - show search CTA if processed but empty (접히지 않고, 배제되지 않은 경우만) */}
      {!isCollapsed &&
        !isExcluded &&
        processed &&
        !processed.selectedSearchResult &&
        processed.searchResultsKo.length === 0 &&
        processed.searchResultsOriginal.length === 0 && (
          <div className="px-3 pb-3 pt-2 border-t border-border/50">
            <Button
              unstyled
              onClick={() => onOpenManualSearch(index)}
              className="flex items-center gap-2 text-sm text-accent hover:underline"
            >
              <Search className="w-4 h-4" />
              검색 결과가 없습니다. 직접 검색하기
            </Button>
          </div>
        )}
    </div>
  )
}

function ReviewSection({
  review,
  onCopy,
  reviewCopied,
  onChange,
}: {
  review?: string
  onCopy: (e: React.MouseEvent) => void
  reviewCopied: boolean
  onChange: (val: string) => void
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="flex items-start gap-3 transition-all">
      <div className="w-16 shrink-0 pt-2 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
        <label className="text-xs text-text-secondary mb-1 flex items-center gap-1 hover:text-text-primary">
            리뷰/경위
            {isOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </label>
        {review && (
          <Button
            unstyled
            onClick={(e) => {
              e.stopPropagation()
              onCopy(e)
            }}
            className="flex items-center gap-1 text-[10px] text-green-400 hover:text-green-300 mt-1"
          >
            {reviewCopied ? <Check className="w-3 h-3" /> : '💬'}
            {reviewCopied ? '복사됨' : '복사'}
          </Button>
        )}
      </div>
      
      {isOpen ? (
        <textarea
            ref={(el) => {
              if (el) {
                el.style.height = 'auto'
                el.style.height = el.scrollHeight + 'px'
              }
            }}
            value={review || ''}
            onChange={(e) => onChange(e.target.value)}
            className="flex-1 px-2 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:border-accent focus:outline-none resize-none overflow-hidden"
            placeholder="셀럽의 리뷰나 감상"
            onClick={(e) => e.stopPropagation()}
        />
      ) : (
          <div 
             className="flex-1 min-h-[36px] flex items-center px-2 rounded hover:bg-bg-secondary/50 cursor-pointer transition-colors"
             onClick={() => setIsOpen(true)}
          >
             {review ? (
                 <p className="text-xs text-text-secondary truncate w-full">
                     {review}
                 </p>
             ) : (
                 <span className="text-xs text-text-tertiary">
                     리뷰/경위 입력 (클릭하여 펼치기)
                 </span>
             )}
          </div>
      )}
    </div>
  )
}
