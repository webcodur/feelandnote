
import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { ExtractedContent } from '@feelandnote/ai-services/content-extractor'
import type { ContentType } from '@feelandnote/content-search/types'
import {
  extractOnlyFromUrl,
  extractOnlyFromText,
  processExtractedItems,
  saveCollectedContents,
} from '@/actions/admin/ai-collect'
import { parseJsonInput } from './utils'
import type { InputMode, ProcessedItem, SearchResultItem } from './types'

const SELECTED_KEY_STORAGE = 'feelandnote_selected_api_key'

// 저자 일치 여부로 최적 결과 선택
function findBestMatchByCreator(
  results: SearchResultItem[],
  targetCreator?: string
): SearchResultItem | null {
  if (results.length === 0) return null
  if (!targetCreator?.trim()) return results[0]

  const normalizedTarget = targetCreator.toLowerCase().trim()

  const match = results.find((r) => {
    const creator = r.creator?.toLowerCase().trim() || ''
    return creator.includes(normalizedTarget) || normalizedTarget.includes(creator)
  })

  return match || results[0]
}

interface UseCollectProps {
  celebId: string
  celebName: string
}

export function useCollect({ celebId, celebName }: UseCollectProps) {
  const router = useRouter()

  // 입력 상태
  const [inputMode, setInputMode] = useState<InputMode>('json')
  const [url, setUrl] = useState('')
  const [text, setText] = useState('')
  const [jsonText, setJsonText] = useState('')
  const [promptCopied, setPromptCopied] = useState(false)

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

  // 이미지 팝업
  const [imagePopupUrl, setImagePopupUrl] = useState<string | null>(null)

  // 편집 상태 (제거됨 - 펼치면 바로 편집)

  // 배제/접힘 상태
  const [excludedIndices, setExcludedIndices] = useState<Set<number>>(new Set())
  const [collapsedIndices, setCollapsedIndices] = useState<Set<number>>(new Set())

  // 활성(Active) 상태 (키보드 내비게이션용)
  const [activeIndex, setActiveIndex] = useState<number | null>(null)

  // 이탈 방지 - 저장 완료 후 허용
  const [isSaved, setIsSaved] = useState(false)

  // isDirty - 입력창에 내용이 있거나, 추출 중이거나, 추출된 아이템이 있으면 변경된 것으로 간주
  const isDirty = useCallback(() => {
    if (isSaved) return false
    const hasInput = text.trim() || url.trim() || jsonText.trim()
    const hasExtracted = extractedItems.length > 0
    return hasInput || extracting || processing || hasExtracted
  }, [text, url, jsonText, extracting, processing, extractedItems.length, isSaved])

  // beforeunload 이벤트 - 브라우저 이탈 방지
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (isDirty()) {
        e.preventDefault()
        return ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  // 뒤로가기 클릭 핸들러
  function handleBackClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (isDirty()) {
      e.preventDefault()
      if (confirm('저장하지 않은 변경 사항이 있습니다. 정말 나가시겠습니까?')) {
        router.push(`/members/${celebId}/contents`)
      }
    }
  }

  function getSelectedKeyId(): string | undefined {
    return localStorage.getItem(SELECTED_KEY_STORAGE) || undefined
  }

  // #region Handlers
  async function handleExtract() {
    if (inputMode === 'url' && !url.trim()) return
    if (inputMode === 'text' && !text.trim()) return
    if (inputMode === 'json' && !jsonText.trim()) return

    setExtracting(true)
    setError(null)
    setExtractedItems([])
    setSelectedIndices(new Set())
    setProcessedItems(new Map())

    try {
      // JSON 모드: 직접 파싱 (API 호출 없음)
      if (inputMode === 'json') {
        const items = parseJsonInput(jsonText)
        if (items.length === 0) {
          throw new Error('파싱된 콘텐츠가 없습니다.')
        }
        setSourceUrl(null)
        setExtractedItems(items)
        setSelectedIndices(new Set(items.map((_, i) => i)))
        setExtracting(false)
        return
      }

      // URL/텍스트 모드: AI 추출
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

      // 결과를 Map에 저장 (저자 일치 항목 우선 선택)
      const newProcessed = new Map(processedItems)
      const indices = [...selectedIndices]
      result.items.forEach((item, i) => {
        const originalIndex = indices[i]
        const extracted = extractedItems[originalIndex]
        const targetCreator = extracted.creator

        // 저자 일치 항목 우선 선택
        const bestKo = findBestMatchByCreator(item.searchResultsKo, targetCreator)
        const bestOrig = findBestMatchByCreator(item.searchResultsOriginal, targetCreator)

        const hasKo = item.searchResultsKo.length > 0
        const hasOrig = item.searchResultsOriginal.length > 0

        newProcessed.set(originalIndex, {
          ...item,
          selectedSearchResult: hasKo ? bestKo : hasOrig ? bestOrig : null,
          searchSource: hasKo ? 'ko' : hasOrig ? 'original' : 'manual',
          status: 'FINISHED',
          lastSearchQuery: hasKo
            ? extracted.titleKo || extracted.title
            : extracted.title,
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
    // 1. 저장할 아이템 선별 (Index 포함)
    const itemsToSaveWithIndex = [...processedItems.entries()]
      .filter(([idx]) => selectedIndices.has(idx))
      .filter(([, item]) => item.selectedSearchResult)
      .map(([idx, item]) => {
        const original = extractedItems[idx]
        // 사용자가 수정한 제목/저자가 있으면 그것을 우선 사용 (검색 결과의 메타데이터는 유지)
        const finalSearchResult = {
          ...item.selectedSearchResult!,
          title: original.titleKo || original.title, // 한국어 제목(수정본) 우선
          creator: original.creator || item.selectedSearchResult!.creator,
        }

        return {
          originalIndex: idx,
          data: {
            searchResult: finalSearchResult,
            contentType: original.type,
            status: item.status,
            itemSourceUrl: original.sourceUrl,
            itemReview: original.review,
            itemRating: original.rating,
            titleOriginal:
              original.title !== finalSearchResult.title ? original.title : undefined,
          }
        }
      })

    if (itemsToSaveWithIndex.length === 0) return

    setSaving(true)
    setError(null)

    try {
      const result = await saveCollectedContents({
        celebId,
        sourceUrl: sourceUrl || url,
        items: itemsToSaveWithIndex.map((x) => x.data),
      })

      if (!result.success) throw new Error(result.error)

      // 저장 성공 시 처리
      // 2. 저장된 아이템 제거 및 인덱스 재구성
      const savedIndicesSet = new Set(itemsToSaveWithIndex.map((x) => x.originalIndex))
      
      const newExtractedItems: ExtractedContent[] = []
      const newProcessedItems = new Map<number, ProcessedItem>()
      const newExcludedIndices = new Set<number>()
      const newCollapsedIndices = new Set<number>()

      let newIndex = 0
      extractedItems.forEach((item, oldIndex) => {
        if (!savedIndicesSet.has(oldIndex)) {
          // 저장되지 않은 아이템만 유지
          newExtractedItems.push(item)

          // 맵/셋 상태 이관
          if (processedItems.has(oldIndex)) {
            newProcessedItems.set(newIndex, processedItems.get(oldIndex)!)
          }
          if (excludedIndices.has(oldIndex)) {
            newExcludedIndices.add(newIndex)
          }
          if (collapsedIndices.has(oldIndex)) {
            newCollapsedIndices.add(newIndex)
          }
          newIndex++
        }
      })

      // 3. 상태 업데이트
      setExtractedItems(newExtractedItems)
      setProcessedItems(newProcessedItems)
      setExcludedIndices(newExcludedIndices)
      setCollapsedIndices(newCollapsedIndices)
      setSelectedIndices(new Set()) // 선택 초기화
      setActiveIndex(null)

      if (newExtractedItems.length === 0) {
        setIsSaved(true) // 모두 저장됨 (이탈 방지 해제)
        alert('모든 콘텐츠가 저장되었습니다.')
      } else {
        // 남은 항목이 있으면 isSaved False 유지 (이탈 방지)
        alert(`${result.savedCount}개 콘텐츠가 저장되었습니다.`)
      }

      router.refresh() // 서버 데이터(카운터 등) 갱신
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
        lastSearchQuery:
          source === 'ko'
            ? extractedItems[index].titleKo || extractedItems[index].title
            : extractedItems[index].title,
      })
    )

    // 검색 결과 제목으로 titleKo, 저자로 creator 동기화 (creatorKo 제거 및 통합)
    updateExtractedItem(index, {
      titleKo: result.title,
      creator: result.creator,
      creatorKo: undefined, // UI 혼동 방지용 초기화
    })
  }

  function handleStatusChange(index: number, status: string) {
    const item = processedItems.get(index)
    if (!item) return

    setProcessedItems(new Map(processedItems).set(index, { ...item, status }))
  }

  const openManualSearch = useCallback((index: number) => {
    setSearchModalIndex(index)
    setSearchModalOpen(true)
  }, [])

  function updateExtractedItem(index: number, updates: Partial<ExtractedContent>) {
    setExtractedItems((items) =>
      items.map((item, i) => (i === index ? { ...item, ...updates } : item))
    )
  }

  function handleManualSearchSelect(result: SearchResultItem, query: string) {
    if (searchModalIndex === null) return

    const item = processedItems.get(searchModalIndex)
    if (item) {
      setProcessedItems(
        new Map(processedItems).set(searchModalIndex, {
          ...item,
          selectedSearchResult: result,
          searchSource: 'manual',
          lastSearchQuery: query,
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
          lastSearchQuery: query,
        })
      )
    }

    // 검색 결과 제목으로 titleKo, 저자로 creator 동기화
    updateExtractedItem(searchModalIndex, {
      titleKo: result.title,
      creator: result.creator,
      creatorKo: undefined,
    })

    setSearchModalOpen(false)
    setSearchModalIndex(null)
  }

  function toggleExclude(index: number) {
    const newExcluded = new Set(excludedIndices)
    const newCollapsed = new Set(collapsedIndices)

    if (newExcluded.has(index)) {
      // 배제 해제
      newExcluded.delete(index)
    } else {
      // 배제 + 자동 접힘
      newExcluded.add(index)
      newCollapsed.add(index)
      // 선택 해제
      const newSelected = new Set(selectedIndices)
      newSelected.delete(index)
      setSelectedIndices(newSelected)
    }

    setExcludedIndices(newExcluded)
    setCollapsedIndices(newCollapsed)
  }

  const toggleCollapse = useCallback((index: number) => {
    setCollapsedIndices((prev) => {
      const newCollapsed = new Set(prev)
      if (newCollapsed.has(index)) {
        newCollapsed.delete(index)
      } else {
        newCollapsed.add(index)
      }
      return newCollapsed
    })
  }, [])

  const toggleCollapseAll = useCallback(() => {
    setCollapsedIndices((prev) => {
      // 모든 아이템이 접혀있는지(하나라도 펼쳐진게 없거나 배제된 것만 접혀있는 경우 등은 고려하지 않고 단순하게)
      // 또는 단순하게: 하나라도 펼쳐져 있으면 -> 모두 접기, 모두 접혀있으면 -> 모두 펼치기
      // 하지만 extractedItems가 필요함.
      const allIndices = extractedItems.map((_, i) => i)
      const isAllCollapsed = allIndices.every((i) => prev.has(i))
      
      if (isAllCollapsed) {
        // 모두 펼치기
        return new Set()
      } else {
        // 모두 접기
        return new Set(allIndices)
      }
    })
  }, [extractedItems])

  // 키보드 단축키
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // 반복 입력 방지
      if (e.repeat) return

      // 입력 요소에서는 무시
      if (
        document.activeElement?.tagName === 'INPUT' ||
        document.activeElement?.tagName === 'TEXTAREA' ||
        document.activeElement?.tagName === 'SELECT'
      ) {
        return
      }

      if (activeIndex === null) return

      // Ctrl(Cmd) + Shift + Key 조합
      if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
        switch (e.key.toLowerCase()) {
          case 'd': // 접기/펼치기
            e.preventDefault()
            toggleCollapse(activeIndex)
            break
          case 'e': // 편집 (이제 펼치기와 동일)
            e.preventDefault()
            toggleCollapse(activeIndex)
            break
          case 'f': // 검색
            e.preventDefault()
            // 배제된 항목은 검색 불가
            if (!excludedIndices.has(activeIndex)) {
              openManualSearch(activeIndex)
            }
            break
          case 'a': // 전체 접기/펼치기
            e.preventDefault()
            toggleCollapseAll()
            break
          case 'c': // 제목 - 저자 복사
            e.preventDefault()
            if (!excludedIndices.has(activeIndex)) {
              const item = extractedItems[activeIndex]
              const text = item.creator ? `${item.title} - ${item.creator}` : item.title
              navigator.clipboard.writeText(text)
            }
            break
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeIndex, excludedIndices, toggleCollapse, openManualSearch])

  // 정렬된 인덱스 (배제되지 않은 것 → 배제된 것)
  const sortedIndices = [...extractedItems.keys()].sort((a, b) => {
    const aExcluded = excludedIndices.has(a)
    const bExcluded = excludedIndices.has(b)
    if (aExcluded === bExcluded) return a - b
    return aExcluded ? 1 : -1
  })

  const savableCount = [...processedItems.entries()].filter(
    ([idx, item]) => selectedIndices.has(idx) && item.selectedSearchResult
  ).length

  return {
    inputMode,
    setInputMode,
    url,
    setUrl,
    text,
    setText,
    jsonText,
    setJsonText,
    promptCopied,
    setPromptCopied,
    extractedItems,
    selectedIndices,
    processedItems,
    extracting,
    processing,
    saving,
    error,
    searchModalOpen,
    searchModalIndex,
    imagePopupUrl,
    setImagePopupUrl,
    excludedIndices,
    collapsedIndices,
    activeIndex,
    setActiveIndex,
    handleBackClick,
    handleExtract,
    handleSearch,
    handleSave,
    toggleSelect,
    toggleSelectAll,
    handleSearchResultChange,
    handleStatusChange,
    openManualSearch,
    updateExtractedItem,
    handleManualSearchSelect,
    toggleExclude,
    toggleCollapse,
    sortedIndices,
    savableCount,
    setSearchModalOpen,
    setSearchModalIndex,
    toggleCollapseAll,
  }
}
