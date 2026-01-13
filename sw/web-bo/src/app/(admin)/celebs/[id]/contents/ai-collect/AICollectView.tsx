'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import {
  ArrowLeft,
  Star,
  Sparkles,
  Loader2,
  FileText,
  Link2,
  Check,
  Search,
  ChevronDown,
  BookOpen,
  Film,
  Gamepad2,
  Music,
  Pencil,
} from 'lucide-react'
import Button from '@/components/ui/Button'
import ManualSearchModal from '../ManualSearchModal'
import {
  extractOnlyFromUrl,
  extractOnlyFromText,
  processExtractedItems,
  saveCollectedContents,
  type ExtractedContentWithSearch,
} from '@/actions/admin/ai-collect'
import type { ExtractedContent, ContentType } from '@feelnnote/api-clients'

const SELECTED_KEY_STORAGE = 'feelnnote_selected_api_key'

// #region Constants
const CONTENT_TYPE_ICONS: Record<string, React.ElementType> = {
  BOOK: BookOpen,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
}

const CONTENT_TYPE_LABELS: Record<string, string> = {
  BOOK: '도서',
  VIDEO: '영상',
  GAME: '게임',
  MUSIC: '음악',
}

const STATUS_OPTIONS = [
  { value: 'WANT', label: '보고 싶음' },
  { value: 'WATCHING', label: '보는 중' },
  { value: 'FINISHED', label: '완료' },
  { value: 'DROPPED', label: '중단' },
]

const CONTENT_TYPE_OPTIONS: Array<{ value: ContentType; label: string }> = [
  { value: 'BOOK', label: '도서' },
  { value: 'VIDEO', label: '영상' },
  { value: 'GAME', label: '게임' },
  { value: 'MUSIC', label: '음악' },
]
// #endregion

// #region Types
interface Props {
  celebId: string
  celebName: string
}

type InputMode = 'url' | 'text'

interface SearchResultItem {
  externalId: string
  externalSource: string
  title: string
  creator: string
  coverImageUrl: string | null
  metadata: Record<string, unknown>
}

interface ProcessedItem extends ExtractedContentWithSearch {
  selectedSearchResult: SearchResultItem | null
  searchSource: 'ko' | 'original' | 'manual'
  status: string
}
// #endregion

export default function AICollectView({ celebId, celebName }: Props) {
  const router = useRouter()

  // 입력 상태
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')

  // 추출 결과
  const [extractedItems, setExtractedItems] = useState<ExtractedContent[]>([])
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set())
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)

  // 검색 결과 (index → ProcessedItem)
  const [processedItems, setProcessedItems] = useState<Map<number, ProcessedItem>>(new Map())

  // UI 상태
  const [extracting, setExtracting] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 직접 검색 모달
  const [searchModalOpen, setSearchModalOpen] = useState(false)
  const [searchModalIndex, setSearchModalIndex] = useState<number | null>(null)

  // 편집 상태
  const [editingIndex, setEditingIndex] = useState<number | null>(null)

  function getSelectedKeyId(): string | undefined {
    return localStorage.getItem(SELECTED_KEY_STORAGE) || undefined
  }

  // #region Handlers
  async function handleExtract() {
    if (inputMode === 'url' && !url.trim()) return
    if (inputMode === 'text' && !text.trim()) return

    setExtracting(true)
    setError(null)
    setExtractedItems([])
    setSelectedIndices(new Set())
    setProcessedItems(new Map())

    try {
      const selectedKeyId = getSelectedKeyId()
      const result =
        inputMode === 'url'
          ? await extractOnlyFromUrl({ url, celebName, selectedKeyId })
          : await extractOnlyFromText({ text, celebName, selectedKeyId })

      if (!result.success) throw new Error(result.error)

      setSourceUrl(result.sourceUrl || null)
      setExtractedItems(result.extractedItems || [])

      // 전체 선택
      if (result.extractedItems?.length) {
        setSelectedIndices(new Set(result.extractedItems.map((_, i) => i)))
      }

      if (!result.extractedItems?.length) {
        setError('콘텐츠를 찾지 못했습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '추출에 실패했습니다.')
    } finally {
      setExtracting(false)
    }
  }

  async function handleSearch() {
    if (selectedIndices.size === 0) return

    setProcessing(true)
    setError(null)

    try {
      const selectedKeyId = getSelectedKeyId()
      const itemsToProcess = [...selectedIndices].map((i) => extractedItems[i])

      const result = await processExtractedItems({
        extractedItems: itemsToProcess,
        startIndex: 0,
        batchSize: itemsToProcess.length,
        selectedKeyId,
      })

      if (!result.success) throw new Error(result.error)

      // 결과를 Map에 저장
      const newProcessed = new Map(processedItems)
      const indices = [...selectedIndices]
      result.items.forEach((item, i) => {
        const originalIndex = indices[i]
        const hasKo = item.searchResultsKo.length > 0
        const hasOrig = item.searchResultsOriginal.length > 0
        newProcessed.set(originalIndex, {
          ...item,
          selectedSearchResult: hasKo
            ? item.searchResultsKo[0]
            : hasOrig
              ? item.searchResultsOriginal[0]
              : null,
          searchSource: hasKo ? 'ko' : hasOrig ? 'original' : 'manual',
          status: 'FINISHED',
        })
      })
      setProcessedItems(newProcessed)
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색에 실패했습니다.')
    } finally {
      setProcessing(false)
    }
  }

  async function handleSave() {
    const itemsToSave = [...processedItems.entries()]
      .filter(([idx]) => selectedIndices.has(idx))
      .filter(([, item]) => item.selectedSearchResult)
      .map(([idx, item]) => {
        const original = extractedItems[idx]
        return {
          searchResult: item.selectedSearchResult!,
          contentType: original.type,
          status: item.status,
          itemSourceUrl: original.sourceUrl,
          itemReview: original.review,
          titleOriginal:
            original.title !== item.selectedSearchResult!.title ? original.title : undefined,
        }
      })

    if (itemsToSave.length === 0) return

    setSaving(true)
    setError(null)

    try {
      const result = await saveCollectedContents({
        celebId,
        sourceUrl: sourceUrl || url,
        items: itemsToSave,
      })

      if (!result.success) throw new Error(result.error)

      router.push(`/celebs/${celebId}/contents`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  function toggleSelect(index: number) {
    const newSet = new Set(selectedIndices)
    if (newSet.has(index)) {
      newSet.delete(index)
    } else {
      newSet.add(index)
    }
    setSelectedIndices(newSet)
  }

  function toggleSelectAll() {
    if (selectedIndices.size === extractedItems.length) {
      setSelectedIndices(new Set())
    } else {
      setSelectedIndices(new Set(extractedItems.map((_, i) => i)))
    }
  }

  function handleSearchResultChange(
    index: number,
    source: 'ko' | 'original',
    resultIndex: number
  ) {
    const item = processedItems.get(index)
    if (!item) return

    const results = source === 'ko' ? item.searchResultsKo : item.searchResultsOriginal
    const result = results[resultIndex]
    if (!result) return

    setProcessedItems(
      new Map(processedItems).set(index, {
        ...item,
        selectedSearchResult: result,
        searchSource: source,
      })
    )

    // 검색 결과 제목으로 titleKo 동기화
    updateExtractedItem(index, { titleKo: result.title })
  }

  function handleStatusChange(index: number, status: string) {
    const item = processedItems.get(index)
    if (!item) return

    setProcessedItems(new Map(processedItems).set(index, { ...item, status }))
  }

  function openManualSearch(index: number) {
    setSearchModalIndex(index)
    setSearchModalOpen(true)
  }

  function updateExtractedItem(index: number, updates: Partial<ExtractedContent>) {
    setExtractedItems((items) =>
      items.map((item, i) => (i === index ? { ...item, ...updates } : item))
    )
  }

  function handleManualSearchSelect(result: SearchResultItem) {
    if (searchModalIndex === null) return

    const item = processedItems.get(searchModalIndex)
    if (item) {
      setProcessedItems(
        new Map(processedItems).set(searchModalIndex, {
          ...item,
          selectedSearchResult: result,
          searchSource: 'manual',
        })
      )
    } else {
      // 아직 검색 안 된 항목에 직접 결과 설정
      const extracted = extractedItems[searchModalIndex]
      setProcessedItems(
        new Map(processedItems).set(searchModalIndex, {
          extracted,
          searchResultsKo: [],
          searchResultsOriginal: [],
          selectedSearchResult: result,
          searchSource: 'manual',
          status: 'FINISHED',
        })
      )
    }

    // 검색 결과 제목으로 titleKo 동기화
    updateExtractedItem(searchModalIndex, { titleKo: result.title })

    setSearchModalOpen(false)
    setSearchModalIndex(null)
  }
  // #endregion

  const savableCount = [...processedItems.entries()].filter(
    ([idx, item]) => selectedIndices.has(idx) && item.selectedSearchResult
  ).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/celebs/${celebId}/contents`}
          className="text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center">
            <Star className="w-5 h-5 text-yellow-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">{celebName}</h1>
            <p className="text-text-secondary text-sm flex items-center gap-1">
              <Sparkles className="w-4 h-4 text-accent" />
              AI 콘텐츠 수집
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Input Section */}
      <div className="bg-bg-card border border-border rounded-xl p-4 space-y-4">
        <div className="flex rounded-lg border border-border overflow-hidden w-fit">
          <Button
            unstyled
            onClick={() => setInputMode('text')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm ${
              inputMode === 'text'
                ? 'bg-accent text-white'
                : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
            }`}
          >
            <FileText className="w-4 h-4" />
            텍스트
          </Button>
          <Button
            unstyled
            onClick={() => setInputMode('url')}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm ${
              inputMode === 'url'
                ? 'bg-accent text-white'
                : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
            }`}
          >
            <Link2 className="w-4 h-4" />
            URL
          </Button>
        </div>

        {inputMode === 'text' ? (
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="기사나 인터뷰 내용을 붙여넣으세요..."
            rows={6}
            className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none"
            disabled={extracting}
          />
        ) : (
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleExtract()}
            placeholder="https://example.com/interview/..."
            className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
            disabled={extracting}
          />
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleExtract}
            disabled={extracting || (inputMode === 'url' ? !url.trim() : !text.trim())}
          >
            {extracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                추출 중...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                AI 추출
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Extracted Items */}
      {extractedItems.length > 0 && (
        <div className="bg-bg-card border border-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                unstyled
                onClick={toggleSelectAll}
                className={`w-5 h-5 rounded border flex items-center justify-center ${
                  selectedIndices.size === extractedItems.length
                    ? 'bg-accent border-accent text-white'
                    : 'border-border hover:border-accent'
                }`}
              >
                {selectedIndices.size === extractedItems.length && <Check className="w-3 h-3" />}
              </Button>
              <h3 className="text-sm font-medium text-text-primary">
                추출된 콘텐츠 ({extractedItems.length}개)
              </h3>
            </div>
            <Button
              size="sm"
              onClick={handleSearch}
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
            {extractedItems.map((item, index) => {
              const Icon = CONTENT_TYPE_ICONS[item.type] || BookOpen
              const isSelected = selectedIndices.has(index)
              const processed = processedItems.get(index)

              return (
                <div
                  key={index}
                  className={`border rounded-lg overflow-hidden ${
                    isSelected ? 'border-accent bg-accent/5' : 'border-border'
                  }`}
                >
                  {/* Item Header */}
                  <div className="flex items-center gap-3 p-3">
                    <Button
                      unstyled
                      onClick={() => toggleSelect(index)}
                      className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-accent border-accent text-white'
                          : 'border-border hover:border-accent'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3" />}
                    </Button>

                    <div
                      className={`w-8 h-8 rounded flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-accent/20 text-accent' : 'bg-bg-secondary text-text-secondary'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-text-primary truncate">
                          {item.title}
                        </span>
                        <span className="text-xs text-text-secondary shrink-0">
                          {CONTENT_TYPE_LABELS[item.type]}
                        </span>
                      </div>
                      {item.titleKo && item.titleKo !== item.title && (
                        <p className="text-xs text-accent truncate">→ {item.titleKo}</p>
                      )}
                      {(item.creator || item.creatorKo) && (
                        <p className="text-xs text-text-secondary truncate">
                          {item.creatorKo || item.creator}
                        </p>
                      )}
                      {item.review && (
                        <p className="text-xs text-green-400 line-clamp-1 mt-0.5">
                          💬 {item.review}
                        </p>
                      )}
                    </div>

                    <Button
                      unstyled
                      onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                      className={`p-1.5 rounded shrink-0 ${
                        editingIndex === index
                          ? 'text-accent bg-accent/10'
                          : 'text-text-secondary hover:text-accent'
                      }`}
                      title="편집"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      unstyled
                      onClick={() => openManualSearch(index)}
                      className="p-1.5 text-text-secondary hover:text-accent rounded shrink-0"
                      title="직접 검색"
                    >
                      <Search className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Edit Panel */}
                  {editingIndex === index && (
                    <div className="px-3 pb-3 pt-2 border-t border-border/50 space-y-3 bg-bg-secondary/30">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">
                            한국어 제목 (검색용)
                          </label>
                          <input
                            type="text"
                            value={item.titleKo || ''}
                            onChange={(e) => updateExtractedItem(index, { titleKo: e.target.value })}
                            className="w-full px-2 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:border-accent focus:outline-none"
                            placeholder="한국어 제목"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">콘텐츠 타입</label>
                          <select
                            value={item.type}
                            onChange={(e) =>
                              updateExtractedItem(index, { type: e.target.value as ContentType })
                            }
                            className="w-full px-2 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:border-accent focus:outline-none"
                          >
                            {CONTENT_TYPE_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">저자/감독 (원본)</label>
                          <input
                            type="text"
                            value={item.creator || ''}
                            onChange={(e) => updateExtractedItem(index, { creator: e.target.value })}
                            className="w-full px-2 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:border-accent focus:outline-none"
                            placeholder="원본 이름"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-text-secondary mb-1">저자/감독 (한국어)</label>
                          <input
                            type="text"
                            value={item.creatorKo || ''}
                            onChange={(e) => updateExtractedItem(index, { creatorKo: e.target.value })}
                            className="w-full px-2 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:border-accent focus:outline-none"
                            placeholder="한국어 이름"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs text-text-secondary mb-1">리뷰/독서 경위</label>
                        <textarea
                          value={item.review || ''}
                          onChange={(e) => updateExtractedItem(index, { review: e.target.value })}
                          rows={2}
                          className="w-full px-2 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary focus:border-accent focus:outline-none resize-none"
                          placeholder="셀럽의 리뷰나 감상"
                        />
                      </div>
                    </div>
                  )}

                  {/* Search Result (if processed) */}
                  {processed && (processed.searchResultsKo.length > 0 || processed.searchResultsOriginal.length > 0 || processed.selectedSearchResult) && (
                    <div className="px-3 pb-3 pt-2 border-t border-border/50 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary shrink-0 w-16">검색 결과:</span>
                        <div className="relative flex-1">
                          <select
                            value={
                              processed.searchSource === 'manual'
                                ? 'manual'
                                : `${processed.searchSource}:${
                                    processed.searchSource === 'ko'
                                      ? processed.searchResultsKo.findIndex(
                                          (r) => r.externalId === processed.selectedSearchResult?.externalId
                                        )
                                      : processed.searchResultsOriginal.findIndex(
                                          (r) => r.externalId === processed.selectedSearchResult?.externalId
                                        )
                                  }`
                            }
                            onChange={(e) => {
                              if (e.target.value === 'manual') return
                              const [source, idx] = e.target.value.split(':')
                              handleSearchResultChange(index, source as 'ko' | 'original', Number(idx))
                            }}
                            className="w-full pl-3 pr-8 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary appearance-none focus:border-accent focus:outline-none"
                          >
                            {processed.searchSource === 'manual' && processed.selectedSearchResult && (
                              <option value="manual">🔍 {processed.selectedSearchResult.title}</option>
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
                        <div className="flex items-center gap-2 p-2 bg-bg-secondary rounded">
                          <div className="relative w-8 h-10 bg-bg-card rounded overflow-hidden shrink-0">
                            {processed.selectedSearchResult.coverImageUrl && (
                              <Image
                                src={processed.selectedSearchResult.coverImageUrl}
                                alt=""
                                fill
                                unoptimized
                                className="object-cover"
                              />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] px-1 rounded bg-accent/20 text-accent">
                                {processed.searchSource === 'ko'
                                  ? '한국어'
                                  : processed.searchSource === 'original'
                                    ? '원본'
                                    : '직접'}
                              </span>
                              <p className="text-xs font-medium text-text-primary truncate">
                                {processed.selectedSearchResult.title}
                              </p>
                            </div>
                            <p className="text-xs text-text-secondary truncate">
                              {processed.selectedSearchResult.creator}
                            </p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-text-secondary shrink-0 w-16">상태:</span>
                        <select
                          value={processed.status}
                          onChange={(e) => handleStatusChange(index, e.target.value)}
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

                  {/* No results yet - show search CTA if processed but empty */}
                  {processed && !processed.selectedSearchResult && processed.searchResultsKo.length === 0 && processed.searchResultsOriginal.length === 0 && (
                    <div className="px-3 pb-3 pt-2 border-t border-border/50">
                      <Button
                        unstyled
                        onClick={() => openManualSearch(index)}
                        className="flex items-center gap-2 text-sm text-accent hover:underline"
                      >
                        <Search className="w-4 h-4" />
                        검색 결과가 없습니다. 직접 검색하기
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Action Bar */}
      {extractedItems.length > 0 && (
        <div className="flex items-center justify-between bg-bg-card border border-border rounded-xl p-4">
          <p className="text-sm text-text-secondary">
            {savableCount > 0
              ? `${savableCount}개 콘텐츠가 저장됩니다.`
              : '검색 결과를 선택하세요.'}
          </p>
          <Button onClick={handleSave} disabled={saving || savableCount === 0}>
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                저장 중...
              </>
            ) : (
              `${savableCount}개 저장`
            )}
          </Button>
        </div>
      )}

      {/* Manual Search Modal */}
      {searchModalIndex !== null && (
        <ManualSearchModal
          isOpen={searchModalOpen}
          onClose={() => {
            setSearchModalOpen(false)
            setSearchModalIndex(null)
          }}
          onSelect={handleManualSearchSelect}
          contentType={extractedItems[searchModalIndex]?.type || 'BOOK'}
          initialQuery={
            extractedItems[searchModalIndex]?.titleKo ||
            extractedItems[searchModalIndex]?.title ||
            ''
          }
        />
      )}
    </div>
  )
}
