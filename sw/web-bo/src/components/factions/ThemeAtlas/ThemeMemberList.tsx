'use client'

/**
 * 테마 소속 인물 명단 — 수동(웹 전용) 인물의 추가·순서·제거·소개·숨김·개인샷을 다룬다.
 *
 * 제작 유래 인물(영상 제작에서 온 행)은 편 편집기의 인물 행(도감 표기 칸)이 손질의 집이다.
 * 그래서 편 편집기 안(embedded)에서는 수동 명단만 보이고, 웹 전용 테마 화면에서는
 * 혹시 남은 제작 유래 행도 읽기 전용으로 함께 보인다(옛 테마 편집기와 같은 규칙).
 */

import { useEffect, useState } from 'react'
import { GripVertical, Plus, Search, X } from 'lucide-react'
import {
  type CelebTagAssignment,
  type CelebForTag,
  getTagCelebs,
  searchCelebsForTag,
  addCelebToTag,
  removeCelebFromTag,
  updateTagAssignmentDesc,
  updateTagCelebOrder,
  setTagCelebImage,
  setTagCelebHidden,
} from '@/actions/admin/tags'
import { uploadTagCelebImage, deleteTagCelebImage } from '@/actions/admin/storage'
import { resizeSingleImage, createPreviewUrl } from '@/lib/image'
import ImageCropModal from '@/components/ui/ImageCropModal'
import { Avatar, CelebFactionImage } from './bits'

export function ThemeMemberList({
  tagId,
  celebs,
  onCelebsChange,
  hideProduction = false,
}: {
  tagId: string
  celebs: CelebTagAssignment[]
  onCelebsChange: (next: CelebTagAssignment[]) => void
  /** 편 편집기 안에서는 제작 유래 행을 감춘다 — 손질은 위 인물 행이 맡는다 */
  hideProduction?: boolean
}) {
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<CelebForTag[]>([])
  const [isSearching, setIsSearching] = useState(false)
  /** 수동 명단 안에서의 끌기 인덱스 (manual 배열 기준) */
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [imgBusy, setImgBusy] = useState(false)
  const [cropCelebId, setCropCelebId] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  // 뷰가 제작 유래를 앞, 수동을 뒤에 두므로 두 갈래로 갈라도 순서가 보존된다
  const production = celebs.filter(c => c.source === 'production')
  const manual = celebs.filter(c => c.source === 'manual')

  // #region 인물 검색·추가
  useEffect(() => {
    if (!showSearch || !searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      const results = await searchCelebsForTag(searchQuery, tagId)
      setSearchResults(results)
      setIsSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, showSearch, tagId])

  const handleAdd = async (celeb: CelebForTag) => {
    const result = await addCelebToTag(celeb.id, tagId)
    if (!result.success) {
      alert(result.error ?? '인물 추가 실패')
      return
    }
    setSearchResults(prev => prev.filter(c => c.id !== celeb.id))
    if (result.revived) {
      // 이미 영상 제작에서 온 인물 — 새 배정 대신 숨김이 풀렸다. 서버 데이터로 다시 그린다
      alert('이미 영상 제작에서 온 인물이라 새로 넣는 대신 숨김을 풀었습니다.')
      onCelebsChange(await getTagCelebs(tagId))
      return
    }
    onCelebsChange([...celebs, {
      celeb_id: celeb.id,
      tag_id: tagId,
      short_desc: null,
      long_desc: null,
      short_desc_en: null,
      long_desc_en: null,
      faction_image_url: null,
      hidden: false,
      sort_order: result.sort_order ?? celebs.length,
      source: 'manual',
      person_id: null,
      assignment_id: null,
      celeb: { id: celeb.id, nickname: celeb.nickname, avatar_url: celeb.avatar_url, title: celeb.title },
    }])
  }
  // #endregion

  // #region 순서 (수동 명단 안에서만)
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    const nextManual = [...manual]
    const [dragged] = nextManual.splice(draggedIndex, 1)
    nextManual.splice(index, 0, dragged)
    onCelebsChange([...production, ...nextManual])
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return
    setDraggedIndex(null)
    await updateTagCelebOrder(tagId, manual.map(c => c.celeb_id))
  }
  // #endregion

  // #region 제거·소개·숨김
  const handleRemove = async (celebId: string) => {
    const result = await removeCelebFromTag(celebId, tagId)
    if (!result.success) {
      alert(result.error ?? '인물 제거 실패')
      return
    }
    if (result.hiddenInstead) {
      // 제작 유래 인물은 지울 실체가 없다 — 서버가 숨김으로 바꿨으니 화면도 그대로 따른다
      onCelebsChange(celebs.map(c => (c.celeb_id === celebId ? { ...c, hidden: true } : c)))
      alert('영상 제작에서 온 인물이라 지우는 대신 숨김 처리했습니다.')
      return
    }
    onCelebsChange(celebs.filter(c => c.celeb_id !== celebId))
  }

  const handleDescChange = (celebId: string, field: 'short_desc' | 'long_desc' | 'short_desc_en' | 'long_desc_en', value: string) => {
    onCelebsChange(celebs.map(c => (c.celeb_id === celebId ? { ...c, [field]: value } : c)))
  }

  const handleSaveDesc = async (item: CelebTagAssignment) => {
    const result = await updateTagAssignmentDesc(
      item.celeb_id, tagId,
      item.short_desc?.trim() || null,
      item.long_desc?.trim() || null,
      item.short_desc_en?.trim() || null,
      item.long_desc_en?.trim() || null,
    )
    if (!result.success) alert(result.error ?? '설명 저장 실패')
  }

  const handleToggleHidden = async (celebId: string, hidden: boolean) => {
    onCelebsChange(celebs.map(c => (c.celeb_id === celebId ? { ...c, hidden } : c)))
    const result = await setTagCelebHidden(tagId, celebId, hidden)
    if (!result.success) {
      onCelebsChange(celebs.map(c => (c.celeb_id === celebId ? { ...c, hidden: !hidden } : c)))
      alert(result.error ?? '도감 노출 전환 실패')
    }
  }
  // #endregion

  // #region 개인샷
  const pickImage = async (celebId: string, file: File) => {
    if (!file.type.startsWith('image/')) return
    setCropCelebId(celebId)
    setCropSrc(await createPreviewUrl(file))
  }

  const handleCropDone = async (dataUrl: string) => {
    const celebId = cropCelebId
    setCropSrc(null)
    setCropCelebId(null)
    if (!celebId) return
    setImgBusy(true)
    try {
      // 자른 결과는 무손실 PNG다. webp 압축은 resizeSingleImage에서 한 번만 한다
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], 'faction.png', { type: 'image/png' })
      const resized = await resizeSingleImage(file, 'faction')
      const up = await uploadTagCelebImage({ tagId, celebId, image: resized })
      if (!up.success || !up.url) throw new Error(up.error ?? '업로드 실패')
      const res = await setTagCelebImage(tagId, celebId, up.url)
      if (!res.success) throw new Error(res.error ?? '주소 저장 실패')
      onCelebsChange(celebs.map(c => (c.celeb_id === celebId ? { ...c, faction_image_url: up.url! } : c)))
    } catch (e) {
      alert(e instanceof Error ? e.message : '개인샷 업로드 실패')
    } finally {
      setImgBusy(false)
    }
  }

  const handleRemoveImage = async (celebId: string) => {
    await setTagCelebImage(tagId, celebId, null)
    await deleteTagCelebImage({ tagId, celebId })
    onCelebsChange(celebs.map(c => (c.celeb_id === celebId ? { ...c, faction_image_url: null } : c)))
  }
  // #endregion

  const renderRow = (item: CelebTagAssignment, manualIndex: number | null) => (
    <div
      key={item.celeb_id}
      draggable={manualIndex !== null}
      onDragStart={() => manualIndex !== null && setDraggedIndex(manualIndex)}
      onDragOver={(e) => manualIndex !== null && handleDragOver(e, manualIndex)}
      onDragEnd={handleDragEnd}
      className={`rounded-lg bg-bg-secondary/30 p-3 hover:bg-bg-secondary/50 ${manualIndex !== null && draggedIndex === manualIndex ? 'opacity-50' : ''} ${item.hidden ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-3">
        {item.source === 'manual' ? (
          <GripVertical className="w-5 h-5 shrink-0 cursor-grab text-text-tertiary" />
        ) : (
          <GripVertical
            className="w-5 h-5 shrink-0 text-text-tertiary/30"
            aria-label="영상 제작에서 온 인물 — 순서는 편 편집기에서 정합니다"
          />
        )}
        <Avatar url={item.celeb?.avatar_url} name={item.celeb?.nickname} />
        <p className="flex-1 truncate text-base font-medium text-text-primary">{item.celeb?.nickname}</p>
        <span
          title={item.source === 'production'
            ? '영상 제작 인물에서 온 행 — 소개·사진·숨김 손질은 편 편집기의 인물 행에서 합니다'
            : '이 명단에서 직접 넣은 웹 전용 인물'}
          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
            item.source === 'production'
              ? 'bg-purple-500/15 text-purple-400'
              : 'border border-border bg-bg-card text-text-tertiary'
          }`}
        >
          {item.source === 'production' ? '제작' : '수동'}
        </span>
        {item.source === 'production' ? (
          <span
            className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
              item.hidden
                ? 'border-border bg-bg-card text-text-tertiary'
                : 'border-accent/40 bg-accent/10 text-accent'
            }`}
            title="노출·숨김은 편 편집기의 인물 행에서 조정합니다"
          >
            {item.hidden ? '숨김' : '도감 노출'}
          </span>
        ) : (
          <button
            onClick={() => handleToggleHidden(item.celeb_id, !item.hidden)}
            title={item.hidden ? '지금 도감에서 안 보입니다 — 눌러서 보이기' : '도감에 보입니다 — 눌러서 감추기'}
            className={`shrink-0 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
              item.hidden
                ? 'border-border bg-bg-card text-text-tertiary hover:border-accent hover:text-accent'
                : 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20'
            }`}
          >
            {item.hidden ? '숨김' : '도감 노출'}
          </button>
        )}
        <CelebFactionImage
          url={item.faction_image_url}
          busy={imgBusy}
          readOnly={item.source === 'production'}
          onPick={(file) => pickImage(item.celeb_id, file)}
          onRemove={() => handleRemoveImage(item.celeb_id)}
        />
        {item.source === 'manual' && (
          <button
            onClick={() => handleRemove(item.celeb_id)}
            className="p-1.5 text-text-tertiary hover:text-red-500"
            title="테마에서 제거"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>
      <div className="mt-3 space-y-2 pl-11">
        {item.source === 'production' ? (
          // 제작 유래 — 읽기 전용. 소개 손질은 편 편집기의 인물 행에서 한다
          <div className="space-y-1 text-sm text-text-secondary" title="소개 손질은 편 편집기의 인물 행에서 합니다">
            <p className="truncate">{item.short_desc || <span className="text-text-tertiary">짧은 문구 없음</span>}</p>
            <p className="whitespace-pre-wrap text-xs text-text-tertiary">{item.long_desc || '상세 설명 없음'}</p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <input
                type="text"
                value={item.short_desc ?? ''}
                onChange={(e) => handleDescChange(item.celeb_id, 'short_desc', e.target.value)}
                onBlur={() => handleSaveDesc(item)}
                placeholder="짧은 문구 (예: 무에서 창조, 시대를 앞서감)"
                className="w-full rounded-lg border border-border bg-bg-main px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
              <input
                type="text"
                value={item.short_desc_en ?? ''}
                onChange={(e) => handleDescChange(item.celeb_id, 'short_desc_en', e.target.value)}
                onBlur={() => handleSaveDesc(item)}
                placeholder="EN short desc (optional)"
                className="w-full rounded-lg border border-border bg-bg-main px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
            </div>
            <div className="space-y-1">
              <textarea
                value={item.long_desc ?? ''}
                onChange={(e) => handleDescChange(item.celeb_id, 'long_desc', e.target.value)}
                onBlur={() => handleSaveDesc(item)}
                placeholder="상세 설명..."
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-bg-main px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
              <textarea
                value={item.long_desc_en ?? ''}
                onChange={(e) => handleDescChange(item.celeb_id, 'long_desc_en', e.target.value)}
                onBlur={() => handleSaveDesc(item)}
                placeholder="EN long desc (optional)"
                rows={2}
                className="w-full resize-none rounded-lg border border-border bg-bg-main px-3 py-2 text-xs text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent/50"
              />
            </div>
          </>
        )}
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-medium text-text-primary">
          {hideProduction ? '수동 인물 명단' : '소속 인물'}
        </h3>
        <span className="text-sm text-text-tertiary">
          ({hideProduction ? manual.length : celebs.length})
        </span>
      </div>

      {hideProduction && production.length > 0 && (
        <p className="rounded-lg border border-border bg-bg-card/60 px-3 py-2 text-xs text-text-tertiary">
          영상 제작에서 온 인물 {production.length}명은 위 인물 행(도감 표기 칸)에서 손질합니다.
          여기는 영상에 없는 인물을 도감에만 더 세우는 수동 명단입니다.
        </p>
      )}

      {!showSearch && (
        <button
          onClick={() => setShowSearch(true)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-accent/50 bg-accent/5 py-3 text-accent hover:bg-accent/10"
        >
          <Plus className="h-5 w-5" />
          <span className="text-base font-medium">인물 추가</span>
        </button>
      )}

      {showSearch && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-tertiary" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="인물 검색..."
              autoFocus
              className="w-full rounded-lg border border-border bg-bg-secondary py-2.5 pl-10 pr-10 text-base text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/50"
            />
            <button
              onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]) }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {isSearching && <p className="text-sm text-text-tertiary">검색 중...</p>}
          {searchResults.length > 0 && (
            <div className="space-y-1">
              {searchResults.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleAdd(c)}
                  className="group flex cursor-pointer items-center justify-between rounded-lg p-2.5 hover:bg-bg-secondary"
                >
                  <div className="flex items-center gap-3">
                    <Avatar url={c.avatar_url} name={c.nickname} />
                    <span className="text-base text-text-primary">{c.nickname}</span>
                  </div>
                  <Plus className="h-5 w-5 text-text-tertiary opacity-0 group-hover:text-accent group-hover:opacity-100" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(hideProduction ? manual : celebs).length === 0 ? (
        <p className="py-4 text-center text-sm text-text-tertiary">
          {hideProduction ? '수동으로 넣은 인물이 없습니다.' : '등록된 인물이 없습니다.'}
        </p>
      ) : (
        <div className="space-y-3">
          {!hideProduction && production.map(item => renderRow(item, null))}
          {manual.map((item, index) => renderRow(item, index))}
        </div>
      )}

      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspectRatio={1}
          onComplete={handleCropDone}
          onCancel={() => { setCropSrc(null); setCropCelebId(null) }}
        />
      )}
    </div>
  )
}
