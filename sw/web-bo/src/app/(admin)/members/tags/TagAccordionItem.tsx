'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronDown,
  GripVertical,
  Users,
  Sparkles,
  Trash2,
  Search,
  Plus,
  X,
  Pencil,
  Check,
  User,
} from 'lucide-react'
import {
  type CelebTag,
  type CelebTagAssignment,
  type CelebForTag,
  updateTag,
  deleteTag,
  getTagCelebs,
  searchCelebsForTag,
  addCelebToTag,
  removeCelebFromTag,
  updateTagAssignmentDesc,
  updateTagCelebOrder,
} from '@/actions/admin/tags'

const PRESET_COLORS = [
  '#7c4dff', '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280',
]

interface Props {
  tag: CelebTag
  index: number
  isExpanded: boolean
  isDragging: boolean
  onToggle: () => void
  onUpdate: (tag: CelebTag) => void
  onDelete: (tagId: string) => void
  onDragStart: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragEnd: () => void
}

export default function TagAccordionItem(props: Props) {
  const { tag, isExpanded, isDragging, onToggle, onUpdate, onDelete, onDragStart, onDragOver, onDragEnd } = props
  // #region 태그 폼 상태
  const [form, setForm] = useState({
    name: tag.name,
    description: tag.description ?? '',
    color: tag.color,
    is_featured: tag.is_featured,
    start_date: tag.start_date ?? '',
    end_date: tag.end_date ?? '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const hasChanges =
    form.name !== tag.name ||
    form.description !== (tag.description ?? '') ||
    form.color !== tag.color ||
    form.is_featured !== tag.is_featured ||
    form.start_date !== (tag.start_date ?? '') ||
    form.end_date !== (tag.end_date ?? '')
  // #endregion

  // #region 셀럽 관리 상태
  const [celebs, setCelebs] = useState<CelebTagAssignment[]>([])
  const [isLoadingCelebs, setIsLoadingCelebs] = useState(false)
  const [isCelebsExpanded, setIsCelebsExpanded] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CelebForTag[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [editingDescId, setEditingDescId] = useState<string | null>(null)
  const [editingShortDesc, setEditingShortDesc] = useState('')
  const [editingLongDesc, setEditingLongDesc] = useState('')
  const [celebDraggedIndex, setCelebDraggedIndex] = useState<number | null>(null)
  // #endregion

  // #region 셀럽 로드
  const loadCelebs = useCallback(async () => {
    setIsLoadingCelebs(true)
    const data = await getTagCelebs(tag.id)
    setCelebs(data)
    setIsLoadingCelebs(false)
  }, [tag.id])

  useEffect(() => {
    if (isExpanded && isCelebsExpanded && celebs.length === 0) {
      loadCelebs()
    }
  }, [isExpanded, isCelebsExpanded, celebs.length, loadCelebs])
  // #endregion

  // #region 셀럽 검색
  useEffect(() => {
    if (!showSearch || !searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      const results = await searchCelebsForTag(searchQuery, tag.id)
      setSearchResults(results)
      setIsSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, showSearch, tag.id])
  // #endregion

  // #region 핸들러
  const handleSave = async () => {
    if (!form.name.trim()) return
    setIsSaving(true)
    const result = await updateTag({
      id: tag.id,
      name: form.name,
      description: form.description,
      color: form.color,
      is_featured: form.is_featured,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    })
    setIsSaving(false)
    if (result.success) {
      onUpdate({
        ...tag,
        ...form,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        celeb_count: celebs.length,
        updated_at: new Date().toISOString(),
      })
    } else {
      alert(result.error ?? '수정 실패')
    }
  }

  const handleDelete = async () => {
    if (!confirm('이 태그를 삭제하면 모든 셀럽에서 해제된다. 계속하겠는가?')) return
    setIsDeleting(true)
    const result = await deleteTag(tag.id)
    setIsDeleting(false)
    if (result.success) onDelete(tag.id)
    else alert(result.error ?? '삭제 실패')
  }

  const handleAddCeleb = async (celeb: CelebForTag) => {
    const result = await addCelebToTag(celeb.id, tag.id)
    if (result.success) {
      setCelebs(prev => [...prev, {
        celeb_id: celeb.id,
        tag_id: tag.id,
        short_desc: null,
        long_desc: null,
        sort_order: result.sort_order ?? prev.length,
        celeb: { id: celeb.id, nickname: celeb.nickname, avatar_url: celeb.avatar_url, title: celeb.title },
      }])
      setSearchResults(prev => prev.filter(c => c.id !== celeb.id))
    }
  }

  // #region 셀럽 드래그 핸들러
  const handleCelebDragStart = (index: number) => {
    setCelebDraggedIndex(index)
  }

  const handleCelebDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (celebDraggedIndex === null || celebDraggedIndex === index) return
    const newCelebs = [...celebs]
    const [dragged] = newCelebs.splice(celebDraggedIndex, 1)
    newCelebs.splice(index, 0, dragged)
    setCelebs(newCelebs)
    setCelebDraggedIndex(index)
  }

  const handleCelebDragEnd = async () => {
    if (celebDraggedIndex === null) return
    setCelebDraggedIndex(null)
    await updateTagCelebOrder(tag.id, celebs.map(c => c.celeb_id))
  }
  // #endregion

  const handleRemoveCeleb = async (celebId: string) => {
    const result = await removeCelebFromTag(celebId, tag.id)
    if (result.success) setCelebs(prev => prev.filter(c => c.celeb_id !== celebId))
  }

  const handleSaveDesc = async (celebId: string) => {
    const shortVal = editingShortDesc.trim() || null
    const longVal = editingLongDesc.trim() || null
    console.log('[handleSaveDesc] Saving:', { celebId, tagId: tag.id, shortVal, longVal })

    const result = await updateTagAssignmentDesc(celebId, tag.id, shortVal, longVal)
    console.log('[handleSaveDesc] Result:', result)

    if (result.success) {
      setCelebs(prev => prev.map(c =>
        c.celeb_id === celebId
          ? { ...c, short_desc: shortVal, long_desc: longVal }
          : c
      ))
      setEditingDescId(null)
    } else {
      alert(result.error ?? '설명 저장 실패')
    }
  }
  // #endregion

  return (
    <div
      draggable={!isExpanded}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
      className={`border border-border rounded-xl overflow-hidden bg-bg-card ${isDragging ? 'opacity-50' : ''}`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-bg-secondary/50" onClick={onToggle}>
        <GripVertical className="w-4 h-4 text-text-tertiary cursor-grab shrink-0" />
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium"
          style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
        >
          {tag.name}
        </span>
        <span className="text-sm text-text-secondary flex-1 truncate">{tag.description || ''}</span>
        {tag.is_featured && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-accent/20 text-accent shrink-0">
            <Sparkles className="w-3 h-3" />
          </span>
        )}
        <span className="inline-flex items-center gap-1 text-sm text-text-secondary shrink-0">
          <Users className="w-3.5 h-3.5" />
          {celebs.length || tag.celeb_count || 0}
        </span>
        <ChevronDown className={`w-4 h-4 text-text-tertiary shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* 태그 정보 수정 */}
          <div className="p-4 space-y-3">
            <FormRow label="태그 이름">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="flex-1 px-3 py-1.5 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
            </FormRow>
            <FormRow label="설명">
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex-1 px-3 py-1.5 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
            </FormRow>
            <FormRow label="색상">
              <div className="flex flex-wrap gap-1.5">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-6 h-6 rounded-full border-2 ${form.color === c ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-6 h-6 rounded-full cursor-pointer"
                />
              </div>
            </FormRow>
            <FormRow label="기획전">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                  className="w-4 h-4 rounded border-border bg-bg-secondary accent-accent"
                />
                {form.is_featured && (
                  <>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="px-2 py-1 bg-bg-secondary border border-border rounded text-xs text-text-primary"
                    />
                    <span className="text-text-tertiary text-xs">~</span>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      className="px-2 py-1 bg-bg-secondary border border-border rounded text-xs text-text-primary"
                    />
                  </>
                )}
              </div>
            </FormRow>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center justify-center w-10 h-10 text-red-500 hover:bg-red-500/10 rounded-lg disabled:opacity-50 transition-colors"
                title="태그 삭제"
              >
                <Trash2 className="w-5 h-5" />
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving || !form.name.trim()}
                className="px-6 py-2 text-base font-medium bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>

          {/* 셀럽 관리 */}
          <div className="border-t border-border">
            {/* 셀럽 섹션 헤더 */}
            <div
              className="flex items-center justify-between p-3 cursor-pointer hover:bg-bg-secondary/30"
              onClick={() => setIsCelebsExpanded(!isCelebsExpanded)}
            >
              <div className="flex items-center gap-2">
                <ChevronDown className={`w-4 h-4 text-text-tertiary ${isCelebsExpanded ? 'rotate-180' : ''}`} />
                <h4 className="text-sm font-medium text-text-primary">소속 셀럽</h4>
                <span className="text-xs text-text-tertiary">({celebs.length || tag.celeb_count || 0})</span>
              </div>
            </div>

            {/* 셀럽 섹션 콘텐츠 */}
            {isCelebsExpanded && (
              <div className="px-4 pb-4 space-y-3">
                {/* 검색 트리거 버튼 */}
                {!showSearch && (
                  <button
                    onClick={() => setShowSearch(true)}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-lg border border-dashed border-accent/50 bg-accent/5 text-accent hover:bg-accent/10 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    <span className="text-sm font-medium">소속 셀럽 추가</span>
                  </button>
                )}

                {/* 검색 */}
                {showSearch && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="셀럽 검색..."
                        autoFocus
                        className="w-full pl-8 pr-8 py-1.5 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
                      />
                      <button
                        onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]) }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {isSearching && <p className="text-xs text-text-tertiary">검색 중...</p>}
                    {searchResults.length > 0 && (
                      <div className="space-y-1">
                        {searchResults.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleAddCeleb(c)}
                            className="flex items-center justify-between p-1.5 rounded hover:bg-bg-secondary cursor-pointer group"
                          >
                            <div className="flex items-center gap-2">
                              <Avatar url={c.avatar_url} name={c.nickname} size="sm" />
                              <span className="text-sm text-text-primary">{c.nickname}</span>
                            </div>
                            <Plus className="w-3.5 h-3.5 text-text-tertiary group-hover:text-accent opacity-0 group-hover:opacity-100 transition-all" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 셀럽 목록 */}
                {isLoadingCelebs ? (
                  <p className="text-xs text-text-tertiary py-4 text-center">로딩 중...</p>
                ) : celebs.length === 0 ? (
                  <p className="text-xs text-text-tertiary py-4 text-center">등록된 셀럽이 없다.</p>
                ) : (
                  <div className="space-y-2">
                    {celebs.map((item, index) => (
                      <div
                        key={item.celeb_id}
                        draggable
                        onDragStart={() => handleCelebDragStart(index)}
                        onDragOver={(e) => handleCelebDragOver(e, index)}
                        onDragEnd={handleCelebDragEnd}
                        className={`p-2 rounded-lg bg-bg-secondary/30 hover:bg-bg-secondary/50 ${celebDraggedIndex === index ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center gap-2">
                          <GripVertical className="w-4 h-4 text-text-tertiary cursor-grab shrink-0" />
                          <Avatar url={item.celeb?.avatar_url} name={item.celeb?.nickname} size="sm" />
                          <p className="flex-1 text-sm font-medium text-text-primary truncate">{item.celeb?.nickname}</p>
                          <button
                            onClick={() => {
                              setEditingDescId(editingDescId === item.celeb_id ? null : item.celeb_id)
                              setEditingShortDesc(item.short_desc ?? '')
                              setEditingLongDesc(item.long_desc ?? '')
                            }}
                            className="p-1 text-text-tertiary hover:text-text-secondary"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleRemoveCeleb(item.celeb_id)} className="p-1 text-text-tertiary hover:text-red-500">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        {/* 짧은/긴 설명 표시 */}
                        {editingDescId !== item.celeb_id && (item.short_desc || item.long_desc) && (
                          <div className="mt-1.5 pl-9 space-y-0.5">
                            {item.short_desc && <p className="text-xs text-accent font-medium">{item.short_desc}</p>}
                            {item.long_desc && <p className="text-xs text-text-tertiary line-clamp-2">{item.long_desc}</p>}
                          </div>
                        )}
                        {editingDescId !== item.celeb_id && !item.short_desc && !item.long_desc && (
                          <p className="mt-1 pl-9 text-xs text-text-tertiary">(설명 없음)</p>
                        )}
                        {/* 편집 폼 */}
                        {editingDescId === item.celeb_id && (
                          <div className="mt-2 pl-9 space-y-2">
                            <input
                              type="text"
                              value={editingShortDesc}
                              onChange={(e) => setEditingShortDesc(e.target.value)}
                              placeholder="짧은 문구 (예: 무에서 창조, 시대를 앞서감)"
                              className="w-full px-2 py-1 bg-bg-main border border-border rounded text-xs text-text-primary"
                            />
                            <textarea
                              value={editingLongDesc}
                              onChange={(e) => setEditingLongDesc(e.target.value)}
                              placeholder="상세 설명..."
                              rows={3}
                              className="w-full px-2 py-1 bg-bg-main border border-border rounded text-xs text-text-primary resize-none"
                            />
                            <div className="flex justify-end gap-1">
                              <button onClick={() => setEditingDescId(null)} className="px-2 py-1 text-xs text-text-secondary hover:bg-bg-tertiary rounded">취소</button>
                              <button onClick={() => handleSaveDesc(item.celeb_id)} className="px-2 py-1 text-xs text-white bg-accent hover:bg-accent-hover rounded">저장</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// #region Sub Components
function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <label className="w-20 text-xs font-medium text-text-secondary shrink-0">{label}</label>
      {children}
    </div>
  )
}

function Avatar({ url, name, size = 'sm' }: { url?: string | null; name?: string; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'
  return url ? (
    <img src={url} alt={name} className={`${sizeClass} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${sizeClass} rounded-full bg-bg-tertiary flex items-center justify-center shrink-0`}>
      <User className="w-3.5 h-3.5 text-text-tertiary" />
    </div>
  )
}
// #endregion
