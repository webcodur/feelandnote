'use client'

/**
 * 인물 행의 도감 구획 — 영상 원문(직함·영상 소개문) 바로 아래에서 도감 표기를 나란히 보고 고친다.
 *
 * 도감 표기의 원천은 영상 원문이고, 여기 입력은 그 위에 얹는 손질이다(faction_people.web_* 칸).
 * 칸을 비우면 손질이 풀려 원문이 그대로 실린다 — placeholder 가 그 원문을 보여준다.
 * 저장은 기존 도감 액션(updateTagAssignmentDesc·setTagCelebHidden·setTagCelebImage)을 재사용해
 * 저장 즉시 서비스에 반영된다.
 */

import { useEffect, useState } from 'react'
import { Eye, EyeOff, ImageIcon, Trash2 } from '@feelandnote/shared/bo/icons'
import type { FactionPerson } from '@/lib/faction-types'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import {
  updateTagAssignmentDesc, setTagCelebHidden, setTagCelebImage,
} from '@/actions/admin/tags'
import { uploadTagCelebImage, deleteTagCelebImage } from '@/actions/admin/storage'
import { resizeSingleImage, createPreviewUrl } from '@/lib/image'
import ImageCropModal from '@/components/ui/ImageCropModal'
import { AutoResizeTextarea } from '../../../../shared/AutoResizeTextarea'
import { useFactionAtlas } from '../../../../shared/FactionAtlasContext'

type Props = {
  person: FactionPerson
  groupIndex: number
  clusterIndex: number
  personIndex: number
  editLang: EditLang
}

export function PersonAtlasPanel({ person, groupIndex, clusterIndex, personIndex, editLang }: Props) {
  const atlas = useFactionAtlas()
  const theme = atlas?.groupLink(groupIndex)?.theme ?? null
  const state = atlas?.loaded
    ? atlas.personState(groupIndex, clusterIndex, personIndex, {
      celebId: person.celebId, slug: person.slug, name: person.name,
    })
    : null

  // 손질 편집 로컬 상태 — 빈 칸 = 손질 없음(원문 그대로)
  const [shortDesc, setShortDesc] = useState('')
  const [longDesc, setLongDesc] = useState('')
  const [shortDescEn, setShortDescEn] = useState('')
  const [longDescEn, setLongDescEn] = useState('')
  const [imgBusy, setImgBusy] = useState(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)

  useEffect(() => {
    if (!state) return
    setShortDesc(state.webShortDesc ?? '')
    setLongDesc(state.webLongDesc ?? '')
    setShortDescEn(state.webShortDescEn ?? '')
    setLongDescEn(state.webLongDescEn ?? '')
  }, [state?.personId, state?.webShortDesc, state?.webLongDesc, state?.webShortDescEn, state?.webLongDescEn]) // eslint-disable-line react-hooks/exhaustive-deps

  if (!atlas?.loaded || !theme) return null

  if (!state) {
    return (
      <AtlasFrame theme={theme}>
        <span className="text-[11px] text-text-dim">대본을 저장하면 도감 손질 칸이 열립니다.</span>
      </AtlasFrame>
    )
  }
  if (!state.celebId) {
    return (
      <AtlasFrame theme={theme}>
        <span className="text-[11px] text-text-dim">
          도감 미노출 — 셀럽 계정이 연결되지 않은 인물입니다(위의 셀럽 연결부터).
        </span>
      </AtlasFrame>
    )
  }

  const celebId = state.celebId
  const personId = state.personId

  // 원문(폴백) — 도감이 손질 없을 때 그대로 싣는 값. placeholder 로 보여준다.
  const originShort = person.lines?.[0]?.trim() || ''
  const originLong = person.epithet?.trim()
    || (person.lines ?? []).slice(1, 3).filter(Boolean).join(', ')
  const originShortEn = person.linesEn?.[0]?.trim() || ''
  const originLongEn = person.epithetEn?.trim()
    || (person.linesEn ?? []).slice(1, 3).filter(Boolean).join(', ')

  const savedDesc = {
    short: state.webShortDesc ?? '', long: state.webLongDesc ?? '',
    shortEn: state.webShortDescEn ?? '', longEn: state.webLongDescEn ?? '',
  }

  /** 소개 손질 저장 — 네 칸을 한 번에 보낸다(액션 규격). 값이 그대로면 부르지 않는다 */
  const saveDesc = async () => {
    const next = {
      short: shortDesc.trim(), long: longDesc.trim(),
      shortEn: shortDescEn.trim(), longEn: longDescEn.trim(),
    }
    if (next.short === savedDesc.short && next.long === savedDesc.long
      && next.shortEn === savedDesc.shortEn && next.longEn === savedDesc.longEn) return

    const res = await updateTagAssignmentDesc(
      celebId, theme.id,
      next.short || null, next.long || null,
      next.shortEn || null, next.longEn || null,
    )
    if (res.success) {
      atlas.patchPerson(personId, {
        webShortDesc: next.short || null,
        webLongDesc: next.long || null,
        webShortDescEn: next.shortEn || null,
        webLongDescEn: next.longEn || null,
      })
    } else {
      alert(res.error ?? '도감 소개 저장 실패')
    }
  }

  const toggleHidden = async () => {
    const next = !state.webHidden
    atlas.patchPerson(personId, { webHidden: next })
    const res = await setTagCelebHidden(theme.id, celebId, next)
    if (!res.success) {
      atlas.patchPerson(personId, { webHidden: !next })
      alert(res.error ?? '도감 노출 전환 실패')
    }
  }

  const pickImage = async (file: File) => {
    if (!file.type.startsWith('image/')) return
    setCropSrc(await createPreviewUrl(file))
  }

  const handleCropDone = async (dataUrl: string) => {
    setCropSrc(null)
    setImgBusy(true)
    try {
      // 자른 결과는 무손실 PNG — webp 압축은 resizeSingleImage 한 번만(테마 편집기와 같은 절차)
      const blob = await (await fetch(dataUrl)).blob()
      const file = new File([blob], 'faction.png', { type: 'image/png' })
      const resized = await resizeSingleImage(file, 'faction')
      const up = await uploadTagCelebImage({ tagId: theme.id, celebId, image: resized })
      if (!up.success || !up.url) throw new Error(up.error ?? '업로드 실패')
      const res = await setTagCelebImage(theme.id, celebId, up.url)
      if (!res.success) throw new Error(res.error ?? '주소 저장 실패')
      atlas.patchPerson(personId, { webImageUrl: up.url })
    } catch (e) {
      alert(e instanceof Error ? e.message : '개인샷 업로드 실패')
    } finally {
      setImgBusy(false)
    }
  }

  const removeImage = async () => {
    if (!confirm('도감 개인샷을 지울까요? (영상 이미지는 그대로 둡니다)')) return
    setImgBusy(true)
    try {
      const res = await setTagCelebImage(theme.id, celebId, null)
      if (!res.success) throw new Error(res.error ?? '삭제 실패')
      await deleteTagCelebImage({ tagId: theme.id, celebId })
      atlas.patchPerson(personId, { webImageUrl: null })
    } catch (e) {
      alert(e instanceof Error ? e.message : '개인샷 삭제 실패')
    } finally {
      setImgBusy(false)
    }
  }

  const untouched = !savedDesc.short && !savedDesc.long && !savedDesc.shortEn && !savedDesc.longEn

  return (
    <AtlasFrame theme={theme}>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {untouched && (
            <span className="rounded border border-border bg-bg-main px-1.5 py-0.5 text-[10px] text-text-dim" title="손질한 도감 소개가 없어 영상 원문이 그대로 실립니다">
              원문 그대로
            </span>
          )}
          <button
            type="button"
            onClick={toggleHidden}
            className={`flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-semibold ${
              state.webHidden
                ? 'border-border bg-bg-main text-text-dim hover:border-accent hover:text-accent'
                : 'border-accent/40 bg-accent/10 text-accent hover:bg-accent/20'
            }`}
            title={state.webHidden ? '지금 도감에서 안 보입니다 — 눌러서 보이기' : '도감에 보입니다 — 눌러서 감추기'}
          >
            {state.webHidden ? <EyeOff size={12} /> : <Eye size={12} />}
            {state.webHidden ? '도감 숨김' : '도감 노출'}
          </button>
          {/* 개인샷 — 있으면 썸네일 + 삭제, 없으면 업로드 칸 */}
          {state.webImageUrl ? (
            <span className="flex items-center gap-1">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={state.webImageUrl} alt="" className="h-8 w-8 rounded border border-accent/50 object-cover" title="도감 개인샷" />
              <button
                type="button"
                onClick={removeImage}
                disabled={imgBusy}
                className="rounded border border-border p-1 text-text-dim hover:border-danger hover:text-danger-text disabled:opacity-50"
                title="도감 개인샷 삭제"
              >
                <Trash2 size={12} />
              </button>
            </span>
          ) : (
            <label
              className="flex cursor-pointer items-center gap-1 rounded-md border border-dashed border-border px-2 py-0.5 text-[11px] text-text-dim hover:border-accent hover:text-accent"
              title="도감 개인샷 업로드 — 도감 카드에서 얼굴 사진 대신 크게 실리는 화보"
            >
              <input
                type="file" accept="image/*" className="hidden" disabled={imgBusy}
                onChange={e => { const f = e.target.files?.[0]; if (f) void pickImage(f); e.target.value = '' }}
              />
              <ImageIcon size={12} /> {imgBusy ? '올리는 중…' : '개인샷 없음 — 올리기'}
            </label>
          )}
        </div>

        {editLang !== 'en' && (
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={shortDesc}
              onChange={e => setShortDesc(e.target.value)}
              onBlur={() => void saveDesc()}
              placeholder={originShort ? `원문 그대로: ${originShort}` : '다듬은 한줄 소개 (비우면 영상 직함 그대로)'}
              className="w-full rounded-md border border-border bg-bg-main px-2 py-1 text-sm focus:border-accent focus:outline-none"
              title="도감의 한줄 소개 — 비우면 영상 첫 직함이 그대로 실립니다"
            />
            <AutoResizeTextarea
              value={longDesc}
              onChange={e => setLongDesc(e.target.value)}
              onBlur={() => void saveDesc()}
              rows={1}
              placeholder={originLong ? `원문 그대로: ${originLong}` : '다듬은 상세 소개 (비우면 영상 소개문·이력 그대로)'}
              className="w-full resize-none rounded-md border border-border bg-bg-main px-2 py-1 text-sm leading-snug focus:border-accent focus:outline-none"
              title="도감의 상세 소개 — 비우면 영상 소개문(없으면 이력 2·3줄)이 그대로 실립니다"
            />
          </div>
        )}
        {editLang !== 'ko' && (
          <div className="flex flex-col gap-1">
            <input
              type="text"
              value={shortDescEn}
              onChange={e => setShortDescEn(e.target.value)}
              onBlur={() => void saveDesc()}
              placeholder={originShortEn ? `EN 원문 그대로: ${originShortEn}` : 'EN short desc (optional)'}
              className="w-full rounded-md border border-border/60 bg-bg-main/50 px-2 py-1 text-xs text-text-secondary focus:border-accent focus:outline-none"
            />
            <AutoResizeTextarea
              value={longDescEn}
              onChange={e => setLongDescEn(e.target.value)}
              onBlur={() => void saveDesc()}
              rows={1}
              placeholder={originLongEn ? `EN 원문 그대로: ${originLongEn}` : 'EN long desc (optional)'}
              className="w-full resize-none rounded-md border border-border/60 bg-bg-main/50 px-2 py-1 text-xs leading-snug text-text-secondary focus:border-accent focus:outline-none"
            />
          </div>
        )}
      </div>

      {cropSrc && (
        <ImageCropModal
          imageSrc={cropSrc}
          aspectRatio={1}
          onComplete={handleCropDone}
          onCancel={() => setCropSrc(null)}
        />
      )}
    </AtlasFrame>
  )
}

/** 공통 틀 — 테마 색 왼줄 + 「도감」 라벨. 영상 원문 입력칸들과 구획이 갈리게 */
function AtlasFrame({ theme, children }: { theme: { name: string; color: string }; children: React.ReactNode }) {
  return (
    <div
      className="flex items-start gap-2 rounded-md border border-border bg-bg-secondary/40 p-2"
      style={{ borderLeft: `3px solid ${theme.color}` }}
    >
      <span
        className="w-24 shrink-0 pt-1 text-xs font-semibold text-text-dim"
        title={`세력도감 「${theme.name}」 테마에 실리는 표기 — 영상 원문과 별개의 손질 칸`}
      >
        도감 표기 -
      </span>
      {children}
    </div>
  )
}
