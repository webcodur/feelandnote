'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { EpisodeData } from '../EpisodeEditor'
import type { CinematicImage, ImageField, AnchorPick, ImageEditorProps } from './types'
import { segToImages, addImagePrefix, stripImagePrefix } from './utils'

const FIELD_ORDER: Record<string, number> = { summary: 0, context: 1 }

export function useImageEditor(params: {
  episode: EpisodeData
  updateEpisode: (ep: EpisodeData) => void
  series: string
  name: string
  view: string
  books: any[]
  shortsArr: any[]
  currentShortsIndex: number
  currentShorts: any
}) {
  const { episode, updateEpisode, series, name, view, books, shortsArr, currentShortsIndex, currentShorts } = params
  const isShortsView = view.startsWith('shorts-')
  const segments: any[] = currentShorts?.segments ?? []

  /* ── 이미지 편집기 (공통) ── */
  const [anchorPick, setAnchorPick] = useState<AnchorPick>(null)
  const [folderImages, setFolderImages] = useState<string[]>([])
  const [epStatus, setEpStatus] = useState<string>('live')
  const imageBaseUrl = `/api/${series}/images/${name}`

  /** 디스크에서 이미지 파일 rename. 성공 시 newName 반환, 실패 시 null */
  const renameFile = useCallback(async (oldName: string, newName: string): Promise<string | null> => {
    if (oldName === newName) return oldName
    try {
      const res = await fetch(`/api/${series}/images/${name}/${oldName}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName }),
      })
      if (res.ok) { refreshFolderImages(); return newName }
      console.warn('[이미지 rename 실패]', await res.text())
      return null
    } catch { return null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, name])

  const refreshFolderImages = useCallback(() => {
    fetch(`/api/${series}/images/${name}`)
      .then(r => r.json())
      .then(d => { setFolderImages(d.files ?? []); if (d.status) setEpStatus(d.status) })
      .catch(() => {})
  }, [series, name])
  useEffect(() => { refreshFolderImages() }, [refreshFolderImages])

  const episodeDir = `episodes/${epStatus}/${name}/images`

  const positionOf = (idx: number) => {
    if (view === 'longform') {
      const book = books[idx] as any
      return (img: CinematicImage): number => {
        if (!img.text) return -1
        const fo = FIELD_ORDER[img.field ?? 'summary'] ?? 0
        const ft: string = img.field === 'context'
            ? [book?.contextMain, ...((book?.quotePairs ?? []) as any[]).flatMap((p: any) => [p.quote, p.after])].filter(Boolean).join(' \n ')
            : book?.summary
        const tp = (ft ?? '').indexOf(img.text)
        return tp < 0 ? -1 : fo * 100000 + tp
      }
    }
    const segText = segments[idx]?.text ?? ''
    return (img: CinematicImage): number => img.text ? segText.indexOf(img.text) : -1
  }

  /** 텍스트 앵커 순서로 정렬하여 반환. 쇼츠는 primary(seg.image) 고정 */
  const sortByPos = (imgs: CinematicImage[], pos: (img: CinematicImage) => number) =>
    [...imgs].sort((a, b) => {
      const pa = pos(a), pb = pos(b)
      if (pa < 0 && pb < 0) return 0
      if (pa < 0) return 1
      if (pb < 0) return -1
      return pa - pb
    })
  const getImages = (idx: number): CinematicImage[] => {
    const raw = view === 'longform' ? (books[idx]?.images ?? []) : segToImages(segments[idx])
    if (raw.length <= 1) return raw
    const pos = positionOf(idx)
    if (isShortsView) {
      const [primary, ...rest] = raw
      return [primary, ...sortByPos(rest, pos)]
    }
    return sortByPos(raw, pos)
  }

  const writeShorts = (next: any) => {
    if (currentShortsIndex < 1) return
    const arr = [...shortsArr]
    arr[currentShortsIndex - 1] = next  // 1-based → 배열 인덱스
    updateEpisode({ ...episode, shorts: arr } as any)
  }

  const setImages = (idx: number, imgs: CinematicImage[]) => {
    if (view === 'longform') {
      const nb = [...books] as any[]; nb[idx] = { ...nb[idx], images: imgs.length ? imgs : undefined }
      updateEpisode({ ...episode, books: nb })
    } else {
      if (!currentShorts) return
      const ns = [...segments]; const seg = { ...ns[idx] }
      if (imgs.length === 0) { delete seg.image; delete seg.imageChangeAt }
      else {
        seg.image = `${episodeDir}/${imgs[0].file}`
        if (imgs.length > 1) {
          seg.imageChangeAt = imgs.slice(1).map(img => ({ t: 0, image: `${episodeDir}/${img.file}`, ...(img.text ? { text: img.text } : {}) }))
        } else { delete seg.imageChangeAt }
      }
      ns[idx] = seg
      writeShorts({ ...currentShorts, segments: ns })
    }
  }

  const imgRemove = async (idx: number, imgIdx: number) => {
    const imgs = getImages(idx)
    const removed = imgs[imgIdx]
    // 롱폼: prefix 제거하여 baseName 복원
    if (view === 'longform' && removed?.file) {
      const baseName = stripImagePrefix(removed.file)
      if (baseName !== removed.file) await renameFile(removed.file, baseName)
    }
    setImages(idx, imgs.filter((_, j) => j !== imgIdx))
  }
  const imgReplace = (idx: number, imgIdx: number, fileName: string) => {
    const imgs = [...getImages(idx)]; imgs[imgIdx] = { ...imgs[imgIdx], file: fileName }; setImages(idx, imgs)
  }
  const imgAddAnchor = (idx: number, anchorText: string, field?: ImageField) => {
    const imgs = getImages(idx)
    if (imgs.some(img => img.text === anchorText)) return
    setImages(idx, [...imgs, { file: '', text: anchorText, ...(field ? { field } : {}) }])
  }

  const assignedFiles = useMemo(() => {
    const set = new Set<string>()
    if (view === 'longform') {
      for (const b of books) for (const img of ((b as any).images ?? [])) if (img.file) set.add(img.file)
    } else {
      if (currentShorts?.revealBg) set.add(currentShorts.revealBg)
      for (const seg of segments) {
        if (seg.image) set.add((seg.image as string).split('/').pop()!)
        const ch = seg.imageChangeAt ? (Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : [seg.imageChangeAt]) : []
        for (const c of ch) set.add((c as any).image.split('/').pop()!)
      }
    }
    return set
  }, [view, books, segments, currentShorts])

  const imgDrop = async (idx: number, fileName: string, field?: ImageField) => {
    const imgs = getImages(idx)
    if (view === 'longform') {
      const ei = imgs.findIndex(img => img.file === fileName)
      if (ei >= 0) {
        // 이미 배정된 이미지 — field 변경 시 prefix도 갱신
        const newField = field ?? imgs[ei].field
        const newName = addImagePrefix(fileName, idx, newField ?? 'context')
        const renamed = await renameFile(fileName, newName)
        const u = [...imgs]; u[ei] = { ...u[ei], file: renamed ?? fileName, field: newField }; setImages(idx, u)
        return
      }
      // 신규 배정 — prefix 부착
      const imgField = field ?? (imgs.length === 0 ? 'summary' : 'context')
      const newName = addImagePrefix(fileName, idx, imgField)
      const renamed = await renameFile(fileName, newName)
      const finalName = renamed ?? fileName
      let autoText: string | undefined
      if (imgs.length > 0) {
        const b = books[idx] as any
        const ft = imgField === 'context' ? b?.contextMain : b?.summary
        autoText = ft?.trim().split(/\s+/)[0]
      }
      setImages(idx, [...imgs, { file: finalName, field: imgField, ...(autoText ? { text: autoText } : {}) }])
    } else {
      if (assignedFiles.has(fileName)) return
      let autoText: string | undefined
      if (imgs.length > 0) { autoText = segments[idx]?.text?.trim().split(/\s+/)[0] }
      setImages(idx, [...imgs, { file: fileName, ...(field ? { field } : {}), ...(autoText ? { text: autoText } : {}) }])
    }
  }

  const imgHandlePick = useCallback((selected: string, field?: ImageField) => {
    setAnchorPick(prev => prev ? { ...prev, draft: selected, ...(field ? { field } : {}) } : null)
  }, [])

  const imgConfirmAnchor = () => {
    if (!anchorPick?.draft) return
    const { itemIdx: idx, imgIdx, draft, field } = anchorPick
    const imgs = [...getImages(idx)]
    imgs[imgIdx] = { ...imgs[imgIdx], text: draft, ...(field ? { field } : {}) }
    setImages(idx, imgs)
    setAnchorPick(null)
  }

  const unassigned = useMemo(() => {
    if (view === 'longform') return folderImages.filter(f => !f.startsWith('shorts') && !assignedFiles.has(f))
    return folderImages.filter(f => !assignedFiles.has(f))
  }, [view, folderImages, assignedFiles])

  /** 반대쪽 뷰에서의 사용 현황 (파일명 → 설명) */
  const crossUsage = useMemo(() => {
    const map = new Map<string, string>()
    if (view === 'longform') {
      // 롱폼 → 쇼츠 사용 여부
      for (const shorts of shortsArr) {
        if (!shorts?.segments) continue
        for (const seg of shorts.segments) {
          if (seg.image) { const fn = (seg.image as string).split('/').pop()!; map.set(fn, `쇼츠 ${seg.id}`) }
          const ch = seg.imageChangeAt ? (Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : [seg.imageChangeAt]) : []
          for (const c of ch) { const fn = (c as any).image.split('/').pop()!; if (!map.has(fn)) map.set(fn, `쇼츠 ${seg.id}`) }
        }
      }
    } else {
      // 쇼츠 → 롱폼 사용 여부
      for (let bi = 0; bi < books.length; bi++) {
        for (const img of ((books[bi] as any).images ?? [])) {
          if (img.file) map.set(img.file, `책 ${bi + 1} ${img.field ?? ''}`)
        }
      }
    }
    return map
  }, [view, books, shortsArr])

  const imgProps: ImageEditorProps = { anchorPick, setAnchorPick, imageBaseUrl, unassigned, refreshFolderImages, getImages,
    removeImage: imgRemove, replaceImage: imgReplace, addAnchor: imgAddAnchor, dropImage: imgDrop,
    handlePick: imgHandlePick, confirmAnchor: imgConfirmAnchor, crossUsage }

  return {
    anchorPick, setAnchorPick,
    imageBaseUrl, unassigned, folderImages, refreshFolderImages,
    epStatus, assignedFiles, crossUsage,
    getImages, imgProps,
  }
}
