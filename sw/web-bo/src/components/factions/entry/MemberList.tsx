'use client'

/**
 * 세력 소속 인물 명단 — 인물의 추가·순서·제거·소개·숨김·개인샷·그룹을 다룬다.
 */

import { useEffect, useState } from 'react'
import { GripVertical, Plus, Search, X } from 'lucide-react'
import {
  type FactionMember,
  type FactionCelebPick,
  searchCelebsForFaction,
  addCelebToFaction,
  removeCelebFromFaction,
  updateFactionMemberDesc,
  updateFactionMemberOrder,
  setFactionMemberImage,
  setFactionMemberHidden,
  type FactionGroup,
  getFactionGroups,
  createFactionGroup,
  setFactionMemberGroup,
} from '@/actions/admin/factions/entries'
import { uploadFactionCelebImage, deleteFactionCelebImage } from '@/actions/admin/storage'
import { resizeSingleImage, createPreviewUrl } from '@/lib/image'
import ImageCropModal from '@/components/ui/ImageCropModal'
import { Avatar, CelebFactionImage } from './bits'

export function MemberList({
  lv2Id,
  members,
  onMembersChange,
}: {
  lv2Id: string
  members: FactionMember[]
  onMembersChange: (next: FactionMember[]) => void
}) {
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FactionCelebPick[]>([])
  const [isSearching, setIsSearching] = useState(false)
  /** 끌고 있는 인물의 명단 인덱스 */
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [imgBusy, setImgBusy] = useState(false)
  const [cropCelebId, setCropCelebId] = useState<string | null>(null)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  /** 도감 그룹(faction_lv3) — 행마다 고르고, 새 그룹은 위 칸에서 더한다 */
  const [groups, setGroups] = useState<FactionGroup[]>([])
  const [newGroupName, setNewGroupName] = useState('')

  useEffect(() => {
    getFactionGroups(lv2Id).then(setGroups)
  }, [lv2Id])

  // #region 인물 검색·추가
  useEffect(() => {
    if (!showSearch || !searchQuery.trim()) {
      setSearchResults([])
      return
    }
    const timer = setTimeout(async () => {
      setIsSearching(true)
      const results = await searchCelebsForFaction(searchQuery, lv2Id)
      setSearchResults(results)
      setIsSearching(false)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery, showSearch, lv2Id])

  const handleAdd = async (celeb: FactionCelebPick) => {
    const result = await addCelebToFaction(celeb.id, lv2Id)
    if (!result.success) {
      alert(result.error ?? '인물 추가 실패')
      return
    }
    setSearchResults(prev => prev.filter(c => c.id !== celeb.id))
    onMembersChange([...members, {
      celeb_id: celeb.id,
      lv2_id: lv2Id,
      short_desc: null,
      long_desc: null,
      short_desc_en: null,
      long_desc_en: null,
      image_url: null,
      hidden: false,
      sort_order: result.sort_order ?? members.length,
      member_id: null,
      celeb: { id: celeb.id, nickname: celeb.nickname, avatar_url: celeb.avatar_url, title: celeb.title },
    }])
  }
  // #endregion

  // #region 순서
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    const next = [...members]
    const [dragged] = next.splice(draggedIndex, 1)
    next.splice(index, 0, dragged)
    onMembersChange(next)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return
    setDraggedIndex(null)
    await updateFactionMemberOrder(lv2Id, members.map(c => c.celeb_id))
  }
  // #endregion

  // #region 제거·소개·숨김
  const handleRemove = async (celebId: string) => {
    const result = await removeCelebFromFaction(celebId, lv2Id)
    if (!result.success) {
      alert(result.error ?? '인물 제거 실패')
      return
    }
    onMembersChange(members.filter(c => c.celeb_id !== celebId))
  }

  const handleDescChange = (celebId: string, field: 'short_desc' | 'long_desc' | 'short_desc_en' | 'long_desc_en', value: string) => {
    onMembersChange(members.map(c => (c.celeb_id === celebId ? { ...c, [field]: value } : c)))
  }

  const handleSaveDesc = async (item: FactionMember) => {
    const result = await updateFactionMemberDesc(
      item.celeb_id, lv2Id,
      item.short_desc?.trim() || null,
      item.long_desc?.trim() || null,
      item.short_desc_en?.trim() || null,
      item.long_desc_en?.trim() || null,
    )
    if (!result.success) alert(result.error ?? '설명 저장 실패')
  }

  const handleToggleHidden = async (celebId: string, hidden: boolean) => {
    onMembersChange(members.map(c => (c.celeb_id === celebId ? { ...c, hidden } : c)))
    const result = await setFactionMemberHidden(lv2Id, celebId, hidden)
    if (!result.success) {
      onMembersChange(members.map(c => (c.celeb_id === celebId ? { ...c, hidden: !hidden } : c)))
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
      const up = await uploadFactionCelebImage({ lv2Id, celebId, image: resized })
      if (!up.success || !up.url) throw new Error(up.error ?? '업로드 실패')
      const res = await setFactionMemberImage(lv2Id, celebId, up.url)
      if (!res.success) throw new Error(res.error ?? '주소 저장 실패')
      onMembersChange(members.map(c => (c.celeb_id === celebId ? { ...c, image_url: up.url! } : c)))
    } catch (e) {
      alert(e instanceof Error ? e.message : '개인샷 업로드 실패')
    } finally {
      setImgBusy(false)
    }
  }

  const handleRemoveImage = async (celebId: string) => {
    await setFactionMemberImage(lv2Id, celebId, null)
    await deleteFactionCelebImage({ lv2Id, celebId })
    onMembersChange(members.map(c => (c.celeb_id === celebId ? { ...c, image_url: null } : c)))
  }
  // #endregion

  // #region 그룹
  const handleGroupChange = async (celebId: string, groupId: string | null) => {
    const prev = members
    const name = groups.find(g => g.id === groupId)?.name ?? null
    onMembersChange(members.map(c => (c.celeb_id === celebId ? { ...c, lv3_id: groupId, group_name: name } : c)))
    const result = await setFactionMemberGroup(lv2Id, celebId, groupId)
    if (!result.success) {
      onMembersChange(prev)
      alert(result.error ?? '그룹 지정 실패')
    }
  }

  const handleAddGroup = async () => {
    const result = await createFactionGroup(lv2Id, newGroupName, null)
    if (!result.group) {
      alert(result.error ?? '그룹 추가 실패')
      return
    }
    setGroups(prev => [...prev, result.group!])
    setNewGroupName('')
  }
  // #endregion

  const renderRow = (item: FactionMember, index: number) => (
    <div
      key={item.celeb_id}
      draggable
      onDragStart={() => setDraggedIndex(index)}
      onDragOver={(e) => handleDragOver(e, index)}
      onDragEnd={handleDragEnd}
      className={`rounded-lg bg-bg-secondary/30 p-3 hover:bg-bg-secondary/50 ${draggedIndex === index ? 'opacity-50' : ''} ${item.hidden ? 'opacity-60' : ''}`}
    >
      <div className="flex items-center gap-3">
        <GripVertical className="w-5 h-5 shrink-0 cursor-grab text-text-tertiary" />
        <Avatar url={item.celeb?.avatar_url} name={item.celeb?.nickname} />
        <p className="flex-1 truncate text-base font-medium text-text-primary">{item.celeb?.nickname}</p>
        <select
          value={item.lv3_id ?? ''}
          onChange={(e) => handleGroupChange(item.celeb_id, e.target.value || null)}
          title="도감 그룹입니다. 비우면 맨 끝 「그 외」로 갑니다"
          className="max-w-40 shrink-0 rounded-lg border border-border bg-bg-main px-2 py-1.5 text-xs text-text-primary hover:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/50"
        >
          <option value="">그룹 없음(그 외)</option>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
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
        <CelebFactionImage
          url={item.image_url}
          busy={imgBusy}
          onPick={(file) => pickImage(item.celeb_id, file)}
          onRemove={() => handleRemoveImage(item.celeb_id)}
        />
        <button
          onClick={() => handleRemove(item.celeb_id)}
          className="p-1.5 text-text-tertiary hover:text-red-500"
          title="세력에서 제거"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="mt-3 space-y-2 pl-11">
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
      </div>
    </div>
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-medium text-text-primary">소속 인물</h3>
        <span className="text-sm text-text-tertiary">({members.length})</span>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="text"
          value={newGroupName}
          onChange={(e) => setNewGroupName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && newGroupName.trim()) handleAddGroup() }}
          placeholder="새 그룹 이름"
          className="flex-1 rounded-lg border border-border bg-bg-main px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent/50"
        />
        <button
          onClick={handleAddGroup}
          disabled={!newGroupName.trim()}
          className="shrink-0 rounded-lg border border-accent/40 bg-accent/10 px-3 py-2 text-sm font-medium text-accent hover:bg-accent/20 disabled:cursor-default disabled:opacity-40"
        >
          그룹 추가
        </button>
        <span className="shrink-0 text-xs text-text-tertiary">그룹 {groups.length}개</span>
      </div>
      {/* 그룹 설명·순서·이름은 신화 편집(/myths)이 쥔다 — 신화 화면에만 쓰이는 값이라 이 명단에 두 벌 두지 않는다 */}

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
              <X className="w-5 h-5" />
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

      {members.length === 0 ? (
        <p className="py-4 text-center text-sm text-text-tertiary">등록된 인물이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {members.map((item, index) => renderRow(item, index))}
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
