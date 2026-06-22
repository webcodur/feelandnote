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
  User,
  ImagePlus,
  Loader2,
  Wand2,
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
  setTagTeamImages,
  setTagCelebImage,
} from '@/actions/admin/tags'
import {
  uploadTagTeamImage,
  deleteTagTeamImage,
  uploadTagCelebImage,
  deleteTagCelebImage,
} from '@/actions/admin/storage'
import { resizeSingleImage, createPreviewUrl } from '@/lib/image'
import ImageCropModal from '@/components/ui/ImageCropModal'

// name_en → slug 후보 (소문자·하이픈)
function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

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
    name_en: tag.name_en ?? '',
    description: tag.description ?? '',
    description_en: tag.description_en ?? '',
    color: tag.color,
    slug: tag.slug ?? '',
    is_featured: tag.is_featured,
    start_date: tag.start_date ?? '',
    end_date: tag.end_date ?? '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const hasChanges =
    form.name !== tag.name ||
    form.name_en !== (tag.name_en ?? '') ||
    form.description !== (tag.description ?? '') ||
    form.description_en !== (tag.description_en ?? '') ||
    form.color !== tag.color ||
    form.slug !== (tag.slug ?? '') ||
    form.is_featured !== tag.is_featured ||
    form.start_date !== (tag.start_date ?? '') ||
    form.end_date !== (tag.end_date ?? '')
  // #endregion

  // #region 단체 이미지 + 전용 화보 상태
  const [teamImages, setTeamImages] = useState<string[]>(tag.team_images ?? [])
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [cropTarget, setCropTarget] = useState<{ kind: 'team' } | { kind: 'celeb'; celebId: string } | null>(null)
  const [imgBusy, setImgBusy] = useState(false)
  const [teamDraggedIndex, setTeamDraggedIndex] = useState<number | null>(null)
  // #endregion

  // #region 셀럽 관리 상태
  const [celebs, setCelebs] = useState<CelebTagAssignment[]>([])
  const [isLoadingCelebs, setIsLoadingCelebs] = useState(false)
  const [isCelebsExpanded, setIsCelebsExpanded] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CelebForTag[]>([])
  const [isSearching, setIsSearching] = useState(false)
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
      name_en: form.name_en,
      description: form.description,
      description_en: form.description_en,
      color: form.color,
      slug: form.slug || null,
      is_featured: form.is_featured,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
    })
    setIsSaving(false)
    if (result.success) {
      onUpdate({
        ...tag,
        ...form,
        name_en: form.name_en || null,
        description_en: form.description_en || null,
        slug: form.slug || null,
        team_images: teamImages,
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
        short_desc_en: null,
        long_desc_en: null,
        spotlight_image_url: null,
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

  const handleSaveDesc = async (celebId: string, item: CelebTagAssignment) => {
    const shortVal = item.short_desc?.trim() || null
    const longVal = item.long_desc?.trim() || null
    const shortEnVal = item.short_desc_en?.trim() || null
    const longEnVal = item.long_desc_en?.trim() || null
    const result = await updateTagAssignmentDesc(celebId, tag.id, shortVal, longVal, shortEnVal, longEnVal)
    if (!result.success) {
      alert(result.error ?? '설명 저장 실패')
    }
  }

  const handleDescChange = (celebId: string, field: 'short_desc' | 'long_desc' | 'short_desc_en' | 'long_desc_en', value: string) => {
    setCelebs(prev => prev.map(c =>
      c.celeb_id === celebId ? { ...c, [field]: value } : c
    ))
  }
  // #endregion

  // #region 이미지 핸들러 (단체 / 전용 화보)
  const pickImage = async (target: { kind: 'team' } | { kind: 'celeb'; celebId: string }, file: File) => {
    if (!file.type.startsWith('image/')) return
    const preview = await createPreviewUrl(file)
    setCropTarget(target)
    setCropSrc(preview)
  }

  const handleCropDone = async (dataUrl: string) => {
    const target = cropTarget
    setCropSrc(null)
    setCropTarget(null)
    if (!target) return

    setImgBusy(true)
    try {
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], 'spotlight.webp', { type: 'image/webp' })
      const resized = await resizeSingleImage(file, 'spotlight')

      if (target.kind === 'team') {
        const up = await uploadTagTeamImage({ tagId: tag.id, image: resized })
        if (!up.success || !up.url) throw new Error(up.error ?? '업로드 실패')
        const next = [...teamImages, up.url]
        setTeamImages(next)
        await setTagTeamImages(tag.id, next)
      } else {
        const up = await uploadTagCelebImage({ tagId: tag.id, celebId: target.celebId, image: resized })
        if (!up.success || !up.url) throw new Error(up.error ?? '업로드 실패')
        await setTagCelebImage(tag.id, target.celebId, up.url)
        setCelebs(prev => prev.map(c => c.celeb_id === target.celebId ? { ...c, spotlight_image_url: up.url! } : c))
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : '이미지 업로드 실패')
    } finally {
      setImgBusy(false)
    }
  }

  const handleRemoveTeamImage = async (url: string) => {
    const next = teamImages.filter(u => u !== url)
    setTeamImages(next)
    await setTagTeamImages(tag.id, next)
    await deleteTagTeamImage(url)
  }

  const handleTeamDragStart = (index: number) => setTeamDraggedIndex(index)
  const handleTeamDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (teamDraggedIndex === null || teamDraggedIndex === index) return
    const next = [...teamImages]
    const [dragged] = next.splice(teamDraggedIndex, 1)
    next.splice(index, 0, dragged)
    setTeamImages(next)
    setTeamDraggedIndex(index)
  }
  const handleTeamDragEnd = async () => {
    if (teamDraggedIndex === null) return
    setTeamDraggedIndex(null)
    await setTagTeamImages(tag.id, teamImages)
  }

  const handleRemoveCelebImage = async (celebId: string) => {
    await setTagCelebImage(tag.id, celebId, null)
    await deleteTagCelebImage({ tagId: tag.id, celebId })
    setCelebs(prev => prev.map(c => c.celeb_id === celebId ? { ...c, spotlight_image_url: null } : c))
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
      <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-bg-secondary/50" onClick={onToggle}>
        <GripVertical className="w-5 h-5 text-text-tertiary cursor-grab shrink-0" />
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex items-center px-3 py-1.5 rounded-full text-base font-medium shrink-0"
              style={{ backgroundColor: `${tag.color}20`, color: tag.color }}
            >
              {tag.name}
            </span>
            {tag.name_en && (
              <span className="text-xs text-text-tertiary shrink-0">{tag.name_en}</span>
            )}
          </div>
        </div>
        <div className="flex-1 flex flex-col min-w-0 truncate">
          {tag.description && (
            <span className="text-base text-text-secondary truncate">{tag.description}</span>
          )}
          {tag.description_en && (
            <span className="text-xs text-text-tertiary truncate">{tag.description_en}</span>
          )}
        </div>
        {tag.is_featured && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium bg-accent/20 text-accent shrink-0">
            <Sparkles className="w-4 h-4" />
          </span>
        )}
        <span className="inline-flex items-center gap-1.5 text-base text-text-secondary shrink-0">
          <Users className="w-4 h-4" />
          {celebs.length || tag.celeb_count || 0}
        </span>
        <ChevronDown className={`w-5 h-5 text-text-tertiary shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-border">
          {/* 태그 정보 수정 */}
          <div className="p-5 space-y-4">
            <FormRow label="태그 이름">
              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-bg-secondary border border-border rounded-lg text-base text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
                />
                <input
                  type="text"
                  value={form.name_en}
                  onChange={(e) => setForm({ ...form, name_en: e.target.value })}
                  placeholder="EN name (optional)"
                  className="w-full px-4 py-2.5 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent/50"
                />
              </div>
            </FormRow>
            <FormRow label="주소(slug)">
              <div className="flex-1 flex items-center gap-2">
                <div className="flex items-center flex-1 px-3 bg-bg-secondary border border-border rounded-lg focus-within:ring-1 focus-within:ring-accent/50">
                  <span className="text-sm text-text-tertiary shrink-0">/explore/spotlight/</span>
                  <input
                    type="text"
                    value={form.slug}
                    onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })}
                    placeholder="xai"
                    className="flex-1 py-2.5 bg-transparent text-base text-text-primary placeholder:text-text-tertiary focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => setForm({ ...form, slug: slugify(form.name_en || form.name) })}
                  disabled={!form.name_en && !form.name}
                  className="flex items-center gap-1 px-3 py-2.5 text-sm text-text-secondary bg-bg-secondary border border-border rounded-lg hover:text-text-primary disabled:opacity-50"
                  title="영문 이름에서 자동 생성"
                >
                  <Wand2 className="w-4 h-4" /> 자동
                </button>
              </div>
            </FormRow>
            <FormRow label="설명">
              <div className="flex-1 space-y-1.5">
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-bg-secondary border border-border rounded-lg text-base text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
                />
                <input
                  type="text"
                  value={form.description_en}
                  onChange={(e) => setForm({ ...form, description_en: e.target.value })}
                  placeholder="EN description (optional)"
                  className="w-full px-4 py-2.5 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent/50"
                />
              </div>
            </FormRow>
            <FormRow label="색상">
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, color: c })}
                    className={`w-8 h-8 rounded-full border-2 ${form.color === c ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
                <input
                  type="color"
                  value={form.color}
                  onChange={(e) => setForm({ ...form, color: e.target.value })}
                  className="w-8 h-8 rounded-full cursor-pointer"
                />
              </div>
            </FormRow>
            <FormRow label="스포트라이트">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={form.is_featured}
                  onChange={(e) => setForm({ ...form, is_featured: e.target.checked })}
                  className="w-5 h-5 rounded border-border bg-bg-secondary accent-accent"
                />
                {form.is_featured && (
                  <>
                    <input
                      type="date"
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                      className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary"
                    />
                    <span className="text-text-tertiary text-sm">~</span>
                    <input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm({ ...form, end_date: e.target.value })}
                      className="px-3 py-2 bg-bg-secondary border border-border rounded-lg text-sm text-text-primary"
                    />
                  </>
                )}
              </div>
            </FormRow>
            <FormRow label="단체 이미지">
              <div className="flex-1 space-y-1.5">
                <div className="flex flex-wrap gap-2">
                  {teamImages.map((url, index) => (
                    <div
                      key={url}
                      draggable
                      onDragStart={() => handleTeamDragStart(index)}
                      onDragOver={(e) => handleTeamDragOver(e, index)}
                      onDragEnd={handleTeamDragEnd}
                      className={`relative w-24 h-24 rounded-lg overflow-hidden border border-border group ${teamDraggedIndex === index ? 'opacity-50' : ''}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" draggable={false} />
                      <button
                        type="button"
                        onClick={() => handleRemoveTeamImage(url)}
                        className="absolute top-1 right-1 p-1 rounded-full bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <ImagePickerButton
                    busy={imgBusy}
                    onPick={(file) => pickImage({ kind: 'team' }, file)}
                  />
                </div>
                <p className="text-xs text-text-tertiary">테마 단체샷. 여러 장 등록 가능, 드래그로 순서 변경. 상단 배너에 표시된다.</p>
              </div>
            </FormRow>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex items-center justify-center w-12 h-12 text-red-500 hover:bg-red-500/10 rounded-lg disabled:opacity-50 transition-colors"
                title="태그 삭제"
              >
                <Trash2 className="w-6 h-6" />
              </button>
              <button
                onClick={handleSave}
                disabled={!hasChanges || isSaving || !form.name.trim()}
                className="px-8 py-3 text-base font-medium bg-accent text-white rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-colors"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>

          {/* 셀럽 관리 */}
          <div className="border-t border-border">
            {/* 셀럽 섹션 헤더 */}
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-bg-secondary/30"
              onClick={() => setIsCelebsExpanded(!isCelebsExpanded)}
            >
              <div className="flex items-center gap-2">
                <ChevronDown className={`w-5 h-5 text-text-tertiary ${isCelebsExpanded ? 'rotate-180' : ''}`} />
                <h4 className="text-base font-medium text-text-primary">소속 셀럽</h4>
                <span className="text-sm text-text-tertiary">({celebs.length || tag.celeb_count || 0})</span>
              </div>
            </div>

            {/* 셀럽 섹션 콘텐츠 */}
            {isCelebsExpanded && (
              <div className="px-4 pb-4 space-y-4">
                {/* 검색 트리거 버튼 */}
                {!showSearch && (
                  <button
                    onClick={() => setShowSearch(true)}
                    className="w-full flex items-center justify-center gap-2 py-4 rounded-lg border border-dashed border-accent/50 bg-accent/5 text-accent hover:bg-accent/10 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                    <span className="text-base font-medium">소속 셀럽 추가</span>
                  </button>
                )}

                {/* 검색 */}
                {showSearch && (
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="셀럽 검색..."
                        autoFocus
                        className="w-full pl-10 pr-10 py-2.5 bg-bg-secondary border border-border rounded-lg text-base text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
                      />
                      <button
                        onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]) }}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                    {isSearching && <p className="text-sm text-text-tertiary">검색 중...</p>}
                    {searchResults.length > 0 && (
                      <div className="space-y-1">
                        {searchResults.map((c) => (
                          <div
                            key={c.id}
                            onClick={() => handleAddCeleb(c)}
                            className="flex items-center justify-between p-2.5 rounded-lg hover:bg-bg-secondary cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <Avatar url={c.avatar_url} name={c.nickname} size="md" />
                              <span className="text-base text-text-primary">{c.nickname}</span>
                            </div>
                            <Plus className="w-5 h-5 text-text-tertiary group-hover:text-accent opacity-0 group-hover:opacity-100 transition-all" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* 셀럽 목록 */}
                {isLoadingCelebs ? (
                  <p className="text-sm text-text-tertiary py-6 text-center">로딩 중...</p>
                ) : celebs.length === 0 ? (
                  <p className="text-sm text-text-tertiary py-6 text-center">등록된 셀럽이 없다.</p>
                ) : (
                  <div className="space-y-3">
                    {celebs.map((item, index) => (
                      <div
                        key={item.celeb_id}
                        draggable
                        onDragStart={() => handleCelebDragStart(index)}
                        onDragOver={(e) => handleCelebDragOver(e, index)}
                        onDragEnd={handleCelebDragEnd}
                        className={`p-3 rounded-lg bg-bg-secondary/30 hover:bg-bg-secondary/50 ${celebDraggedIndex === index ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center gap-3">
                          <GripVertical className="w-5 h-5 text-text-tertiary cursor-grab shrink-0" />
                          <Avatar url={item.celeb?.avatar_url} name={item.celeb?.nickname} size="md" />
                          <p className="flex-1 text-base font-medium text-text-primary truncate">{item.celeb?.nickname}</p>
                          <CelebSpotlightImage
                            url={item.spotlight_image_url}
                            busy={imgBusy}
                            onPick={(file) => pickImage({ kind: 'celeb', celebId: item.celeb_id }, file)}
                            onRemove={() => handleRemoveCelebImage(item.celeb_id)}
                          />
                          <button onClick={() => handleRemoveCeleb(item.celeb_id)} className="p-1.5 text-text-tertiary hover:text-red-500">
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="mt-3 pl-11 space-y-2">
                          <div className="space-y-1">
                            <input
                              type="text"
                              value={item.short_desc ?? ''}
                              onChange={(e) => handleDescChange(item.celeb_id, 'short_desc', e.target.value)}
                              onBlur={() => handleSaveDesc(item.celeb_id, item)}
                              placeholder="짧은 문구 (예: 무에서 창조, 시대를 앞서감)"
                              className="w-full px-3 py-2 bg-bg-main border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
                            />
                            <input
                              type="text"
                              value={item.short_desc_en ?? ''}
                              onChange={(e) => handleDescChange(item.celeb_id, 'short_desc_en', e.target.value)}
                              onBlur={() => handleSaveDesc(item.celeb_id, item)}
                              placeholder="EN short desc (optional)"
                              className="w-full px-3 py-2 bg-bg-main border border-border rounded-lg text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent/50"
                            />
                          </div>
                          <div className="space-y-1">
                            <textarea
                              value={item.long_desc ?? ''}
                              onChange={(e) => handleDescChange(item.celeb_id, 'long_desc', e.target.value)}
                              onBlur={() => handleSaveDesc(item.celeb_id, item)}
                              placeholder="상세 설명..."
                              rows={2}
                              className="w-full px-3 py-2 bg-bg-main border border-border rounded-lg text-sm text-text-primary resize-none focus:outline-none focus:ring-1 focus:ring-accent/50"
                            />
                            <textarea
                              value={item.long_desc_en ?? ''}
                              onChange={(e) => handleDescChange(item.celeb_id, 'long_desc_en', e.target.value)}
                              onBlur={() => handleSaveDesc(item.celeb_id, item)}
                              placeholder="EN long desc (optional)"
                              rows={2}
                              className="w-full px-3 py-2 bg-bg-main border border-border rounded-lg text-xs text-text-primary placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-accent/50"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspectRatio={1}
          onComplete={handleCropDone}
          onCancel={() => { setCropSrc(null); setCropTarget(null) }}
        />
      )}
    </div>
  )
}

// #region Sub Components
function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4">
      <label className="w-24 text-sm font-medium text-text-secondary shrink-0">{label}</label>
      {children}
    </div>
  )
}

function Avatar({ url, name, size = 'sm' }: { url?: string | null; name?: string; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'w-8 h-8' : 'w-10 h-10'
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5'
  return url ? (
    <img src={url} alt={name} className={`${sizeClass} rounded-full object-cover shrink-0`} />
  ) : (
    <div className={`${sizeClass} rounded-full bg-bg-tertiary flex items-center justify-center shrink-0`}>
      <User className={`${iconSize} text-text-tertiary`} />
    </div>
  )
}

// 단체 이미지 추가 버튼 (드래그/클릭)
function ImagePickerButton({ busy, onPick }: { busy: boolean; onPick: (file: File) => void }) {
  const [dragging, setDragging] = useState(false)
  return (
    <label
      onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
      onDragLeave={(e) => { e.preventDefault(); setDragging(false) }}
      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) onPick(f) }}
      className={`w-24 h-24 rounded-lg border border-dashed flex items-center justify-center cursor-pointer transition-colors ${dragging ? 'border-accent bg-accent/10' : 'border-border hover:border-accent/50'}`}
    >
      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = '' }} />
      {busy ? <Loader2 className="w-5 h-5 text-accent animate-spin" /> : <ImagePlus className="w-6 h-6 text-text-tertiary" />}
    </label>
  )
}

// 인물 전용 화보 썸네일 (추가/교체/삭제)
function CelebSpotlightImage({ url, busy, onPick, onRemove }: { url: string | null; busy: boolean; onPick: (file: File) => void; onRemove: () => void }) {
  if (url) {
    return (
      <div className="relative w-10 h-10 rounded-lg overflow-hidden border border-accent/50 group shrink-0" title="기획전 전용 화보">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt="" className="w-full h-full object-cover" />
        <button
          type="button"
          onClick={onRemove}
          className="absolute inset-0 flex items-center justify-center bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          title="전용 화보 삭제"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }
  return (
    <label className="w-10 h-10 rounded-lg border border-dashed border-border flex items-center justify-center cursor-pointer hover:border-accent/50 shrink-0" title="기획전 전용 화보 추가">
      <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = '' }} />
      {busy ? <Loader2 className="w-4 h-4 text-accent animate-spin" /> : <ImagePlus className="w-5 h-5 text-text-tertiary" />}
    </label>
  )
}
// #endregion
