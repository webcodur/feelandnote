'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { X, Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react'
import Button from '@/components/ui/Button'
import { searchExternalContent } from '@/actions/admin/external-search'
import type { ContentType } from '@feelandnote/content-search/types'

interface SearchResult {
  externalId: string
  externalSource: string
  title: string
  creator: string
  coverImageUrl: string | null
  metadata: Record<string, unknown>
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (result: SearchResult, query: string) => void
  contentType: ContentType
  initialQuery?: string
  initialCreator?: string
}

const ITEMS_PER_PAGE = 20

// #region 콘텐츠 타입별 테이블 헤더 및 데이터 추출
const TABLE_CONFIG: Record<ContentType, { headers: string[]; getRowData: (r: SearchResult) => string[] }> = {
  BOOK: {
    headers: ['제목', '저자', '출판사', '출판일', 'ISBN'],
    getRowData: (r) => [
      r.title,
      r.creator,
      (r.metadata.publisher as string) || '-',
      (r.metadata.publishDate as string) || '-',
      (r.metadata.isbn as string) || '-',
    ],
  },
  VIDEO: {
    headers: ['제목', '원제', '개봉/방영일', '평점', '장르'],
    getRowData: (r) => [
      r.title,
      (r.metadata.originalTitle as string) || '-',
      (r.metadata.releaseDate as string) || '-',
      r.metadata.voteAverage ? `${(r.metadata.voteAverage as number).toFixed(1)}` : '-',
      ((r.metadata.genres as string[]) || []).slice(0, 2).join(', ') || '-',
    ],
  },
  GAME: {
    headers: ['제목', '개발사', '출시일', '플랫폼', '평점'],
    getRowData: (r) => [
      r.title,
      (r.metadata.developer as string) || r.creator || '-',
      (r.metadata.releaseDate as string) || '-',
      ((r.metadata.platforms as string[]) || []).slice(0, 2).join(', ') || '-',
      r.metadata.rating ? `${r.metadata.rating}` : '-',
    ],
  },
  MUSIC: {
    headers: ['제목', '아티스트', '발매일', '앨범타입', '트랙수'],
    getRowData: (r) => [
      r.title,
      ((r.metadata.artists as string[]) || [r.creator]).join(', ') || '-',
      (r.metadata.releaseDate as string) || '-',
      (r.metadata.albumType as string) || '-',
      r.metadata.totalTracks ? `${r.metadata.totalTracks}곡` : '-',
    ],
  },
  CERTIFICATE: {
    headers: ['자격증명', '시행기관', '등급', '분야'],
    getRowData: (r) => [
      r.title,
      r.creator || '-',
      (r.metadata.grade as string) || '-',
      (r.metadata.field as string) || '-',
    ],
  },
}
// #endregion

// 저자 일치 여부로 정렬 (일치하는 항목 최상단)
function sortByCreatorMatch(results: SearchResult[], targetCreator?: string): SearchResult[] {
  if (!targetCreator?.trim()) return results

  const normalizedTarget = targetCreator.toLowerCase().trim()

  return [...results].sort((a, b) => {
    const aCreator = a.creator?.toLowerCase().trim() || ''
    const bCreator = b.creator?.toLowerCase().trim() || ''

    const aMatches = aCreator.includes(normalizedTarget) || normalizedTarget.includes(aCreator)
    const bMatches = bCreator.includes(normalizedTarget) || normalizedTarget.includes(bCreator)

    if (aMatches && !bMatches) return -1
    if (!aMatches && bMatches) return 1
    return 0
  })
}

type SearchApi = 'google' | 'naver'

export default function ManualSearchModal({ isOpen, onClose, onSelect, contentType, initialQuery = '', initialCreator = '' }: Props) {
  const [query, setQuery] = useState(initialQuery)
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [searched, setSearched] = useState(false)

  // 검색 API 선택 (BOOK만 해당, 기본 네이버)
  const [searchApi, setSearchApi] = useState<SearchApi>('naver')

  // 페이지네이션 상태
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [hasMore, setHasMore] = useState(false)

  // 이미지 팝업 상태
  const [popupImage, setPopupImage] = useState<string | null>(null)

  async function handleSearch(searchPage: number = 1) {
    if (!query.trim()) return

    setSearching(true)
    setSearched(true)

    try {
      const preferGoogle = contentType === 'BOOK' ? searchApi === 'google' : true
      const response = await searchExternalContent(contentType, query, searchPage, { preferGoogle })
      // ExternalSearchResult를 SearchResult 형식으로 변환
      const items: SearchResult[] = (response.items || []).map((item) => ({
        externalId: item.externalId,
        externalSource: item.externalSource,
        title: item.title,
        creator: item.creator,
        coverImageUrl: item.coverImageUrl,
        metadata: item.metadata as Record<string, unknown>,
      }))
      // 저자 일치 항목 최상단 정렬
      setResults(sortByCreatorMatch(items, initialCreator))
      setPage(searchPage)
      setTotal(response.total || 0)
      setHasMore(response.hasMore || false)
    } catch (err) {
      console.error('Search error:', err)
      setResults([])
    } finally {
      setSearching(false)
    }
  }

  function handleSelect(result: SearchResult) {
    onSelect(result, query)
    onClose()
  }

  function handleImageClick(e: React.MouseEvent, imageUrl: string | null) {
    e.stopPropagation()
    if (imageUrl) setPopupImage(imageUrl)
  }

  function handleClose() {
    onClose()
  }

  // ESC 키로 닫기
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (isOpen && e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const config = TABLE_CONFIG[contentType]
  const totalPages = Math.ceil(total / ITEMS_PER_PAGE)
  const startItem = (page - 1) * ITEMS_PER_PAGE + 1
  const endItem = Math.min(page * ITEMS_PER_PAGE, total)

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
      <div className="bg-bg-card border border-border rounded-xl w-full max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-base font-semibold text-text-primary">직접 검색</h3>
          <Button unstyled onClick={handleClose} className="p-1.5 text-text-secondary hover:text-text-primary rounded">
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-border space-y-3">
          {/* API 선택 탭 (BOOK만) */}
          {contentType === 'BOOK' && (
            <div className="flex rounded-lg border border-border overflow-hidden w-fit">
              <button
                type="button"
                onClick={() => setSearchApi('google')}
                className={`px-3 py-1.5 text-xs font-medium ${
                  searchApi === 'google'
                    ? 'bg-accent text-white'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                Google
              </button>
              <button
                type="button"
                onClick={() => setSearchApi('naver')}
                className={`px-3 py-1.5 text-xs font-medium ${
                  searchApi === 'naver'
                    ? 'bg-green-500 text-white'
                    : 'bg-bg-secondary text-text-secondary hover:text-text-primary'
                }`}
              >
                네이버
              </button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(1)}
              placeholder="검색어 입력..."
              className="flex-1 px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none"
              autoFocus
            />
            <Button onClick={() => handleSearch(1)} disabled={searching || !query.trim()} size="sm">
              {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-auto">
          {searching && (
            <div className="flex items-center justify-center py-8 text-text-secondary">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              검색 중...
            </div>
          )}

          {!searching && searched && results.length === 0 && (
            <div className="text-center py-8 text-text-secondary text-sm">
              검색 결과가 없습니다.
            </div>
          )}

          {!searching && results.length > 0 && (
            <table className="w-full text-sm">
              <thead className="bg-bg-secondary sticky top-0">
                <tr>
                  <th className="p-3 text-start text-text-secondary font-medium w-12" />
                  {config.headers.map((header) => (
                    <th key={header} className="p-3 text-start text-text-secondary font-medium whitespace-nowrap">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map((result, resultIdx) => {
                  const rowData = config.getRowData(result)
                  return (
                    <tr
                      key={`${result.externalSource}-${result.externalId}-${resultIdx}`}
                      onClick={() => handleSelect(result)}
                      className="border-t border-border hover:bg-white/5 cursor-pointer"
                    >
                      <td className="p-3">
                        <div
                          className="relative w-8 h-11 bg-bg-card rounded overflow-hidden shrink-0 cursor-zoom-in hover:ring-2 hover:ring-accent"
                          onClick={(e) => handleImageClick(e, result.coverImageUrl)}
                        >
                          {result.coverImageUrl && (
                            <Image src={result.coverImageUrl} alt="" fill unoptimized className="object-cover" />
                          )}
                        </div>
                      </td>
                      {rowData.map((data, idx) => (
                        <td
                          key={idx}
                          className={`p-3 text-text-primary ${idx === 0 ? 'font-medium max-w-[200px]' : 'max-w-[150px]'} truncate`}
                          title={data}
                        >
                          {data}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* 페이지네이션 */}
        {!searching && results.length > 0 && (
          <div className="flex items-center justify-between p-3 border-t border-border bg-bg-secondary">
            <span className="text-xs text-text-secondary">
              {total > 0 ? `${startItem}-${endItem} / 총 ${total}건` : `${results.length}건`}
            </span>
            <div className="flex items-center gap-2">
              <Button
                unstyled
                onClick={() => handleSearch(page - 1)}
                disabled={page <= 1 || searching}
                className="p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="text-xs text-text-primary min-w-[60px] text-center">
                {totalPages > 0 ? `${page} / ${totalPages}` : `${page}페이지`}
              </span>
              <Button
                unstyled
                onClick={() => handleSearch(page + 1)}
                disabled={!hasMore || searching}
                className="p-1.5 text-text-secondary hover:text-text-primary disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* 이미지 팝업 */}
      {popupImage && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/80"
          onClick={() => setPopupImage(null)}
        >
          <div className="relative max-w-[90vw] max-h-[90vh]">
            <Image
              src={popupImage}
              alt=""
              width={400}
              height={600}
              unoptimized
              className="object-contain max-h-[90vh] rounded-lg"
            />
            <Button
              unstyled
              onClick={() => setPopupImage(null)}
              className="absolute -top-3 -right-3 p-2 bg-bg-card border border-border rounded-full text-text-secondary hover:text-text-primary"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
