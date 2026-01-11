'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { extractContentsFromUrl, extractContentsFromTextInput, saveCollectedContents, type ExtractedContentWithSearch } from '@/actions/admin/ai-collect'
import { Sparkles, Loader2, X, Check, ExternalLink, BookOpen, Film, Gamepad2, Music, ChevronDown, Link2, FileText } from 'lucide-react'
import Button from '@/components/ui/Button'
import type { ContentType } from '@feelnnote/api-clients'

type InputMode = 'url' | 'text'

interface Props {
  celebId: string
  celebName: string
}

const STATUS_OPTIONS = [
  { value: 'WANT', label: '보고 싶음' },
  { value: 'WATCHING', label: '보는 중' },
  { value: 'FINISHED', label: '완료' },
  { value: 'DROPPED', label: '중단' },
]

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

interface SelectedItem {
  index: number
  searchResultIndex: number
  status: string
}

export default function AICollectForm({ celebId, celebName }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [inputMode, setInputMode] = useState<InputMode>('text')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [extracting, setExtracting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sourceUrl, setSourceUrl] = useState<string | null>(null)
  const [extractedItems, setExtractedItems] = useState<ExtractedContentWithSearch[]>([])
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])

  async function handleExtract() {
    if (inputMode === 'url' && !url.trim()) return
    if (inputMode === 'text' && !text.trim()) return

    setExtracting(true)
    setError(null)
    setExtractedItems([])
    setSelectedItems([])

    try {
      const result = inputMode === 'url'
        ? await extractContentsFromUrl({ url, celebId, celebName })
        : await extractContentsFromTextInput({ text, celebId, celebName })

      if (!result.success) {
        throw new Error(result.error)
      }

      setSourceUrl(result.sourceUrl || null)
      setExtractedItems(result.items || [])

      // 검색 결과가 있는 항목 자동 선택
      const autoSelected: SelectedItem[] = (result.items || [])
        .map((item, index) => ({
          index,
          searchResultIndex: item.searchResults.length > 0 ? 0 : -1,
          status: 'FINISHED',
        }))
        .filter((s) => s.searchResultIndex >= 0)

      setSelectedItems(autoSelected)

      if ((result.items || []).length === 0) {
        setError('텍스트에서 콘텐츠를 찾지 못했습니다.')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '추출에 실패했습니다.')
    } finally {
      setExtracting(false)
    }
  }

  async function handleSave() {
    if (selectedItems.length === 0) return

    setSaving(true)
    setError(null)

    try {
      const itemsToSave = selectedItems
        .filter((s) => s.searchResultIndex >= 0)
        .map((s) => {
          const item = extractedItems[s.index]
          const searchResult = item.searchResults[s.searchResultIndex]
          return {
            searchResult,
            contentType: item.extracted.type,
            status: s.status,
            itemSourceUrl: item.itemSourceUrl,
            itemReview: item.itemReview,
          }
        })

      const result = await saveCollectedContents({
        celebId,
        sourceUrl: sourceUrl || url,
        items: itemsToSave,
      })

      if (!result.success) {
        throw new Error(result.error)
      }

      handleClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  function handleClose() {
    setIsOpen(false)
    setUrl('')
    setText('')
    setExtractedItems([])
    setSelectedItems([])
    setSourceUrl(null)
    setError(null)
  }

  function toggleSelect(index: number) {
    const existing = selectedItems.find((s) => s.index === index)
    if (existing) {
      setSelectedItems(selectedItems.filter((s) => s.index !== index))
    } else {
      const item = extractedItems[index]
      if (item.searchResults.length > 0) {
        setSelectedItems([...selectedItems, { index, searchResultIndex: 0, status: 'FINISHED' }])
      }
    }
  }

  function updateSelection(index: number, updates: Partial<SelectedItem>) {
    setSelectedItems(
      selectedItems.map((s) => (s.index === index ? { ...s, ...updates } : s))
    )
  }

  const selectedCount = selectedItems.filter((s) => s.searchResultIndex >= 0).length

  return (
    <>
      <Button variant="secondary" onClick={() => setIsOpen(true)}>
        <Sparkles className="w-4 h-4" />
        AI 수집
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-bg-card border border-border rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-accent" />
                <h2 className="text-lg font-semibold text-text-primary">AI 콘텐츠 수집</h2>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Mode Toggle */}
              <div className="flex rounded-lg border border-border overflow-hidden w-fit">
                <button
                  type="button"
                  onClick={() => setInputMode('text')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm ${
                    inputMode === 'text'
                      ? 'bg-accent text-white'
                      : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  텍스트
                </button>
                <button
                  type="button"
                  onClick={() => setInputMode('url')}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm ${
                    inputMode === 'url'
                      ? 'bg-accent text-white'
                      : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                  }`}
                >
                  <Link2 className="w-4 h-4" />
                  URL
                </button>
              </div>

              {/* Text Input */}
              {inputMode === 'text' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-secondary">기사/인터뷰 내용</label>
                  <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="기사나 인터뷰 내용을 복사해서 붙여넣으세요..."
                    rows={8}
                    className="w-full px-4 py-3 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none"
                    disabled={extracting}
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-text-secondary">
                      셀럽이 언급한 책, 영화, 게임, 음악 등을 AI가 자동으로 추출합니다.
                    </p>
                    <Button onClick={handleExtract} disabled={extracting || !text.trim()}>
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
              )}

              {/* URL Input */}
              {inputMode === 'url' && (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-text-secondary">기사/인터뷰 URL</label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      value={url}
                      onChange={(e) => setUrl(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleExtract())}
                      placeholder="https://example.com/interview/celeb-name"
                      className="flex-1 px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
                      disabled={extracting}
                    />
                    <Button onClick={handleExtract} disabled={extracting || !url.trim()}>
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
                  <p className="text-xs text-text-secondary">
                    일부 사이트는 크롤링이 차단될 수 있습니다. 차단 시 텍스트 모드를 사용하세요.
                  </p>
                </div>
              )}

              {/* Extracted Items */}
              {extractedItems.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-medium text-text-primary">
                      추출된 콘텐츠 ({extractedItems.length}개)
                    </h3>
                    {selectedCount > 0 && (
                      <span className="text-xs text-accent">{selectedCount}개 선택됨</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    {extractedItems.map((item, index) => {
                      const Icon = CONTENT_TYPE_ICONS[item.extracted.type] || BookOpen
                      const selection = selectedItems.find((s) => s.index === index)
                      const isSelected = !!selection
                      const hasResults = item.searchResults.length > 0

                      return (
                        <div
                          key={index}
                          className={`border rounded-lg overflow-hidden ${
                            isSelected ? 'border-accent bg-accent/5' : 'border-border'
                          }`}
                        >
                          {/* Item Header */}
                          <div
                            className={`flex items-center gap-3 p-3 cursor-pointer ${
                              hasResults ? 'hover:bg-bg-secondary' : 'opacity-60'
                            }`}
                            onClick={() => hasResults && toggleSelect(index)}
                          >
                            <div
                              className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'bg-accent border-accent text-white'
                                  : hasResults
                                    ? 'border-border'
                                    : 'border-border/50'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3" />}
                            </div>

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
                                  {item.extracted.title}
                                </span>
                                <span className="text-xs text-text-secondary shrink-0">
                                  {CONTENT_TYPE_LABELS[item.extracted.type]}
                                </span>
                              </div>
                              {item.extracted.titleKo && (
                                <p className="text-xs text-accent truncate">→ {item.extracted.titleKo}</p>
                              )}
                              {item.itemReview && (
                                <p className="text-xs text-text-secondary line-clamp-2">{item.itemReview}</p>
                              )}
                              {item.itemSourceUrl && (
                                <a
                                  href={item.itemSourceUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-400 hover:underline truncate block"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  출처: {item.itemSourceUrl}
                                </a>
                              )}
                            </div>

                            {!hasResults && (
                              <span className="text-xs text-red-400 shrink-0">검색 결과 없음</span>
                            )}
                          </div>

                          {/* Selection Details */}
                          {isSelected && selection && hasResults && (
                            <div className="px-3 pb-3 space-y-2 border-t border-border/50 pt-2">
                              {/* Search Result Selector */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-text-secondary shrink-0">검색 결과:</span>
                                <div className="relative flex-1">
                                  <select
                                    value={selection.searchResultIndex}
                                    onChange={(e) =>
                                      updateSelection(index, { searchResultIndex: Number(e.target.value) })
                                    }
                                    className="w-full pl-3 pr-8 py-1.5 bg-bg-secondary border border-border rounded text-sm text-text-primary appearance-none focus:border-accent focus:outline-none"
                                  >
                                    {item.searchResults.map((result, rIndex) => (
                                      <option key={rIndex} value={rIndex}>
                                        {result.title} {result.creator && `- ${result.creator}`}
                                      </option>
                                    ))}
                                  </select>
                                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                                </div>
                              </div>

                              {/* Selected Result Preview */}
                              {item.searchResults[selection.searchResultIndex] && (
                                <div className="flex items-center gap-2 p-2 bg-bg-secondary rounded">
                                  <div className="w-8 h-10 bg-bg-card rounded overflow-hidden shrink-0">
                                    {item.searchResults[selection.searchResultIndex].coverImageUrl && (
                                      <img
                                        src={item.searchResults[selection.searchResultIndex].coverImageUrl!}
                                        alt=""
                                        className="w-full h-full object-cover"
                                      />
                                    )}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-text-primary truncate">
                                      {item.searchResults[selection.searchResultIndex].title}
                                    </p>
                                    <p className="text-xs text-text-secondary truncate">
                                      {item.searchResults[selection.searchResultIndex].creator}
                                    </p>
                                  </div>
                                </div>
                              )}

                              {/* Status Selector */}
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-text-secondary shrink-0">상태:</span>
                                <select
                                  value={selection.status}
                                  onChange={(e) => updateSelection(index, { status: e.target.value })}
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
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Source URL Display */}
              {sourceUrl && (
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  <ExternalLink className="w-3 h-3" />
                  <span>출처:</span>
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline truncate"
                  >
                    {sourceUrl}
                  </a>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-border">
              <p className="text-xs text-text-secondary">
                {extractedItems.length > 0
                  ? `${selectedCount}개 콘텐츠가 저장됩니다. 출처 URL이 자동으로 기록됩니다.`
                  : 'URL을 입력하고 AI 추출 버튼을 클릭하세요.'}
              </p>
              <div className="flex items-center gap-3">
                <Button type="button" variant="secondary" onClick={handleClose}>
                  취소
                </Button>
                <Button onClick={handleSave} disabled={saving || selectedCount === 0}>
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      저장 중...
                    </>
                  ) : (
                    `${selectedCount}개 저장`
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
