'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { addCelebContent } from '@/actions/admin/celebs'
import { searchExternalContent, createContentFromExternal, searchDbContent } from '@/actions/admin/external-search'
import { Plus, Search, Loader2, X, Database, Globe } from 'lucide-react'
import Button from '@/components/ui/Button'
import { CONTENT_TYPE_CONFIG, CONTENT_TYPES } from '@/constants/contentTypes'
import { STATUS_OPTIONS } from '@/constants/statuses'
import type { ExternalSearchResult } from '@feelandnote/content-search/unified-search'
import type { ContentType } from '@feelandnote/content-search/types'

interface Props {
  celebId: string
}

// CONTENT_TYPE_OPTIONS는 로컬 상수에서 생성
const CONTENT_TYPE_OPTIONS = CONTENT_TYPES.map((type) => ({
  value: type as ContentType,
  label: CONTENT_TYPE_CONFIG[type].label,
}))

type SearchMode = 'db' | 'external'
type SearchApi = 'google' | 'naver'

interface DbSearchResult {
  id: string
  title: string
  type: string
  creator: string | null
  thumbnail_url: string | null
}

type SelectedContent = { source: 'db'; data: DbSearchResult } | { source: 'external'; data: ExternalSearchResult }

export default function AddContentForm({ celebId }: Props) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchMode, setSearchMode] = useState<SearchMode>('external')
  const [searchApi, setSearchApi] = useState<SearchApi>('naver')
  const [contentType, setContentType] = useState<ContentType>('BOOK')
  const [dbResults, setDbResults] = useState<DbSearchResult[]>([])
  const [externalResults, setExternalResults] = useState<ExternalSearchResult[]>([])
  const [selectedContent, setSelectedContent] = useState<SelectedContent | null>(null)
  const [form, setForm] = useState({ status: 'FINISHED', rating: '', review: '', source_url: '' })

  async function handleSearch() {
    if (!searchQuery.trim()) return
    setSearchLoading(true)
    setError(null)
    setDbResults([])
    setExternalResults([])

    try {
      if (searchMode === 'db') {
        const result = await searchDbContent(searchQuery, contentType)
        if (!result.success) throw new Error(result.error)
        setDbResults(result.items || [])
      } else {
        const preferGoogle = contentType === 'BOOK' ? searchApi === 'google' : true
        const result = await searchExternalContent(contentType, searchQuery, 1, { preferGoogle })
        if (!result.success) throw new Error(result.error)
        setExternalResults(result.items || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '검색에 실패했습니다.')
    } finally {
      setSearchLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedContent) { setError('콘텐츠를 선택해주세요.'); return }

    setLoading(true)
    setError(null)

    try {
      let contentId: string
      if (selectedContent.source === 'db') {
        contentId = selectedContent.data.id
      } else {
        const extData = selectedContent.data
        const createResult = await createContentFromExternal({ externalId: extData.externalId, externalSource: extData.externalSource, title: extData.title, creator: extData.creator, coverImageUrl: extData.coverImageUrl, metadata: extData.metadata as Record<string, unknown> }, contentType)
        if (!createResult.success) throw new Error(createResult.error || '콘텐츠 생성에 실패했습니다.')
        contentId = createResult.contentId!
      }

      await addCelebContent({ celeb_id: celebId, content_id: contentId, status: form.status, rating: form.rating ? Number(form.rating) : undefined, review: form.review || undefined, source_url: form.source_url || undefined })
      handleClose()
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : '추가에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function handleClose() {
    setIsOpen(false)
    setSelectedContent(null)
    setSearchQuery('')
    setDbResults([])
    setExternalResults([])
    setError(null)
    setForm({ status: 'FINISHED', rating: '', review: '', source_url: '' })
  }

  return (
    <>
      <Button onClick={() => setIsOpen(true)}><Plus className="w-4 h-4" />콘텐츠 추가</Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-bg-card border border-border rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-text-primary">콘텐츠 추가</h2>
              <button onClick={handleClose} className="p-2 text-text-secondary hover:text-text-primary hover:bg-bg-secondary rounded"><X className="w-5 h-5" /></button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-auto p-4 space-y-4">
              {error && <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">{error}</div>}

              {!selectedContent ? (
                <div className="space-y-4">
                  <div className="flex gap-2 flex-wrap">
                    <select value={contentType} onChange={(e) => { setContentType(e.target.value as ContentType); setDbResults([]); setExternalResults([]) }} className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary text-sm focus:border-accent focus:outline-none">
                      {CONTENT_TYPE_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                    <div className="flex rounded-lg border border-border overflow-hidden">
                      <button type="button" onClick={() => { setSearchMode('external'); setDbResults([]); setExternalResults([]) }} className={`flex items-center gap-1.5 px-3 py-2 text-sm ${searchMode === 'external' ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}><Globe className="w-4 h-4" />외부</button>
                      <button type="button" onClick={() => { setSearchMode('db'); setDbResults([]); setExternalResults([]) }} className={`flex items-center gap-1.5 px-3 py-2 text-sm ${searchMode === 'db' ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}><Database className="w-4 h-4" />DB</button>
                    </div>
                    {/* API 선택 (외부 + BOOK만) */}
                    {searchMode === 'external' && contentType === 'BOOK' && (
                      <div className="flex rounded-lg border border-border overflow-hidden">
                        <button type="button" onClick={() => setSearchApi('google')} className={`px-3 py-2 text-sm ${searchApi === 'google' ? 'bg-accent text-white' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}>Google</button>
                        <button type="button" onClick={() => setSearchApi('naver')} className={`px-3 py-2 text-sm ${searchApi === 'naver' ? 'bg-green-500 text-white' : 'bg-bg-secondary text-text-secondary hover:text-text-primary'}`}>네이버</button>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
                      <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearch())} placeholder={searchMode === 'external' ? '외부 API에서 검색...' : 'DB에서 검색...'} className="w-full pl-10 pr-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none" />
                    </div>
                    <Button type="button" onClick={handleSearch} disabled={searchLoading}>{searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : '검색'}</Button>
                  </div>

                  {(dbResults.length > 0 || externalResults.length > 0) && (
                    <div className="border border-border rounded-lg divide-y divide-border max-h-60 overflow-auto">
                      {searchMode === 'db'
                        ? dbResults.map((c) => (
                            <button key={c.id} type="button" onClick={() => setSelectedContent({ source: 'db', data: c })} className="w-full flex items-center gap-3 p-3 text-left hover:bg-bg-secondary">
                              <div className="relative w-10 h-12 bg-bg-secondary rounded overflow-hidden shrink-0">{c.thumbnail_url && <Image src={c.thumbnail_url} alt="" fill unoptimized className="object-cover" />}</div>
                              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-text-primary truncate">{c.title}</p><p className="text-xs text-text-secondary">{c.creator} · {c.type}</p></div>
                              <span className="text-xs text-text-secondary bg-bg-secondary px-2 py-1 rounded">DB</span>
                            </button>
                          ))
                        : externalResults.map((c) => (
                            <button key={c.externalId} type="button" onClick={() => setSelectedContent({ source: 'external', data: c })} className="w-full flex items-center gap-3 p-3 text-left hover:bg-bg-secondary">
                              <div className="relative w-10 h-12 bg-bg-secondary rounded overflow-hidden shrink-0">{c.coverImageUrl && <Image src={c.coverImageUrl} alt="" fill unoptimized className="object-cover" />}</div>
                              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-text-primary truncate">{c.title}</p><p className="text-xs text-text-secondary">{c.creator}</p></div>
                              <span className="text-xs text-accent bg-accent/10 px-2 py-1 rounded">외부</span>
                            </button>
                          ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-bg-secondary rounded-lg">
                    <div className="relative w-10 h-12 bg-bg-card rounded overflow-hidden shrink-0">{(selectedContent.source === 'db' ? selectedContent.data.thumbnail_url : selectedContent.data.coverImageUrl) && <Image src={(selectedContent.source === 'db' ? selectedContent.data.thumbnail_url : selectedContent.data.coverImageUrl)!} alt="" fill unoptimized className="object-cover" />}</div>
                    <div className="flex-1 min-w-0"><p className="text-sm font-medium text-text-primary truncate">{selectedContent.data.title}</p><p className="text-xs text-text-secondary">{selectedContent.source === 'db' ? selectedContent.data.creator : selectedContent.data.creator}</p></div>
                    {selectedContent.source === 'external' && <span className="text-xs text-accent bg-accent/10 px-2 py-1 rounded shrink-0">새로 등록</span>}
                    <button type="button" onClick={() => setSelectedContent(null)} className="p-1 text-text-secondary hover:text-text-primary shrink-0"><X className="w-4 h-4" /></button>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-secondary">상태</label>
                    <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary focus:border-accent focus:outline-none">
                      {STATUS_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-secondary">평점 <span className="text-text-secondary/60">(선택)</span></label>
                    <input type="number" min="0" max="5" step="0.5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })} placeholder="입력 안 함" className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none" />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-secondary">리뷰 <span className="text-text-secondary/60">(선택)</span></label>
                    <textarea value={form.review} onChange={(e) => setForm({ ...form, review: e.target.value })} placeholder="리뷰 내용" rows={3} className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none resize-none" />
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-text-secondary">출처 URL <span className="text-text-secondary/60">(선택)</span></label>
                    <input type="url" value={form.source_url} onChange={(e) => setForm({ ...form, source_url: e.target.value })} placeholder="https://example.com/interview" className="w-full px-4 py-2 bg-bg-secondary border border-border rounded-lg text-text-primary placeholder-text-secondary focus:border-accent focus:outline-none" />
                  </div>
                </div>
              )}
            </form>

            <div className="flex items-center justify-end gap-3 p-4 border-t border-border">
              <Button type="button" variant="secondary" onClick={handleClose}>취소</Button>
              <Button type="submit" disabled={loading || !selectedContent} onClick={handleSubmit}>
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" />추가 중...</> : '추가'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
