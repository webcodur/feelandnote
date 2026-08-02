'use client'

/**
 * 테마 단체샷 관리 — 여러 장 등록, 끌어서 순서, 사진마다 무리 이름·나오는 인물 지정.
 *
 * 저장은 사진 목록 전체를 한 번에 쓴다(celeb_tags.team_images). 제목은 손을 뗄 때만,
 * 인물 켜고 끄기·순서는 조작 즉시 저장한다.
 */

import { useState } from 'react'
import { X } from 'lucide-react'
import type { FactionTeamImage } from '@feelandnote/shared/lib/faction-team-image'
import { setTagTeamImages, type CelebTagAssignment } from '@/actions/admin/tags'
import { uploadTagTeamImage, deleteTagTeamImage } from '@/actions/admin/storage'
import { resizeSingleImage, createPreviewUrl } from '@/lib/image'
import ImageCropModal from '@/components/ui/ImageCropModal'
import { ImagePickerButton } from './bits'

export function ThemeTeamImagesField({
  tagId,
  initialImages,
  celebs,
}: {
  tagId: string
  initialImages: FactionTeamImage[]
  /** 사진별 「나오는 인물」 선택지 — 테마 소속 인물 전체(제작 유래 포함) */
  celebs: CelebTagAssignment[]
}) {
  const [teamImages, setTeamImages] = useState<FactionTeamImage[]>(initialImages)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  const pickImage = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setCropSrc(await createPreviewUrl(file))
  }

  const handleCropDone = async (dataUrl: string) => {
    setCropSrc(null)
    setBusy(true)
    try {
      // 자른 결과는 무손실 PNG다. webp 압축은 resizeSingleImage에서 한 번만 한다
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], 'faction.png', { type: 'image/png' })
      const resized = await resizeSingleImage(file, 'faction')
      const up = await uploadTagTeamImage({ tagId, image: resized })
      if (!up.success || !up.url) throw new Error(up.error ?? '업로드 실패')
      const next = [...teamImages, { url: up.url }]
      setTeamImages(next)
      await setTagTeamImages(tagId, next)
    } catch (e) {
      alert(e instanceof Error ? e.message : '단체샷 업로드 실패')
    } finally {
      setBusy(false)
    }
  }

  const handleRemove = async (url: string) => {
    const next = teamImages.filter(img => img.url !== url)
    setTeamImages(next)
    await setTagTeamImages(tagId, next)
    await deleteTagTeamImage(url)
  }

  /** 제목은 손을 뗄 때(save 없이 patch 후 commit), 인물 켜고 끄기는 즉시 저장 */
  const patchImage = (index: number, patch: Partial<FactionTeamImage>, save = false) => {
    const next = teamImages.map((img, i) => (i === index ? { ...img, ...patch } : img))
    setTeamImages(next)
    if (save) void setTagTeamImages(tagId, next)
    return next
  }

  const commitImages = async () => { await setTagTeamImages(tagId, teamImages) }

  const toggleCeleb = (index: number, celebId: string) => {
    const current = teamImages[index]?.celebIds ?? []
    const next = current.includes(celebId)
      ? current.filter(id => id !== celebId)
      : [...current, celebId]
    patchImage(index, { celebIds: next }, true)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    const next = [...teamImages]
    const [dragged] = next.splice(draggedIndex, 1)
    next.splice(index, 0, dragged)
    setTeamImages(next)
    setDraggedIndex(index)
  }

  const handleDragEnd = async () => {
    if (draggedIndex === null) return
    setDraggedIndex(null)
    await setTagTeamImages(tagId, teamImages)
  }

  return (
    <div className="flex-1 space-y-2">
      {teamImages.map((img, index) => (
        <div
          key={img.url}
          draggable
          onDragStart={() => setDraggedIndex(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className={`flex gap-3 rounded-lg border border-border bg-bg-secondary p-2 ${draggedIndex === index ? 'opacity-50' : ''}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={img.url} alt="" className="h-24 w-24 shrink-0 rounded-lg border border-border object-cover" draggable={false} />

          <div className="min-w-0 flex-1 space-y-2">
            <input
              value={img.label ?? ''}
              onChange={(e) => patchImage(index, { label: e.target.value })}
              onBlur={commitImages}
              placeholder="이 사진이 담은 무리의 이름 (예: 안전을 설계한 사람들)"
              className="w-full rounded-lg border border-border bg-bg-card px-3 py-1.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
            />
            {celebs.length === 0 ? (
              <p className="text-xs text-text-tertiary">인물을 먼저 넣으면 이 사진에 누가 나오는지 고를 수 있습니다.</p>
            ) : (
              <div className="flex flex-wrap gap-1">
                {celebs.map(c => {
                  const on = (img.celebIds ?? []).includes(c.celeb_id)
                  return (
                    <button
                      key={c.celeb_id}
                      type="button"
                      onClick={() => toggleCeleb(index, c.celeb_id)}
                      className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${
                        on
                          ? 'border-accent bg-accent/15 text-accent'
                          : 'border-border bg-bg-card text-text-secondary hover:border-accent hover:text-accent'
                      }`}
                    >
                      {c.celeb?.nickname ?? '이름 없음'}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => handleRemove(img.url)}
            className="h-7 w-7 shrink-0 self-start rounded-full text-text-tertiary hover:bg-red-500/10 hover:text-red-500"
            title="이 사진 지우기"
          >
            <X className="mx-auto h-4 w-4" />
          </button>
        </div>
      ))}

      <ImagePickerButton busy={busy} onPick={pickImage} />
      <p className="text-xs text-text-tertiary">
        여러 장 등록할 수 있고 끌어서 순서를 바꿉니다. 사진마다 무리 이름과 나오는 인물을 지정하면
        도감에서 사진 아래에 그대로 보이고, 이름을 누르면 그 인물로 넘어갑니다.
      </p>

      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspectRatio={1}
          onComplete={handleCropDone}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </div>
  )
}
