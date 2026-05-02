'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import type { EpisodeData } from '../EpisodeEditor'
import type { CinematicImage, ImageField, AnchorPick, ImageEditorProps } from './types'
import { segToImages, addImagePrefix, stripImagePrefix, isVideoFile } from './utils'

const mediaRoot = (fileName: string) => (isVideoFile(fileName) ? 'videos' : 'images')

const FIELD_ORDER: Record<string, number> = { summary: 0, context: 1, quote: 1 }

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
  const [subFolders, setSubFolders] = useState<string[]>([])
  const [fileFolders, setFileFolders] = useState<Record<string, string>>({})
  const [duplicates, setDuplicates] = useState<Array<{ name: string; folders: string[] }>>([])
  const [epStatus, setEpStatus] = useState<string>('live')
  const imageBaseUrl = `/api/${series}/images/${name}`

  /** 디스크에서 미디어 파일 rename (확장자로 images/videos 라우트 분기). 성공 시 newName 반환, 실패 시 null */
  const renameFile = useCallback(async (oldName: string, newName: string): Promise<string | null> => {
    if (oldName === newName) return oldName
    try {
      const res = await fetch(`/api/${series}/${mediaRoot(oldName)}/${name}/${oldName}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName }),
      })
      if (res.ok) { refreshFolderImages(); return newName }
      console.warn('[미디어 rename 실패]', await res.text())
      return null
    } catch { return null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [series, name])

  /** 이미지 + 영상 폴더 두 API를 병렬 호출해 합집합으로 풀을 구성.
   *  파일명 전역 유일 가정(확장자 다르므로 실질 충돌 없음) — 서브폴더는 이미지 쪽만 지원(영상은 루트). */
  const refreshFolderImages = useCallback(() => {
    Promise.all([
      fetch(`/api/${series}/images/${name}`).then(r => r.json()).catch(() => ({})),
      fetch(`/api/${series}/videos/${name}`).then(r => r.json()).catch(() => ({})),
    ]).then(([img, vid]) => {
      const imgFiles: string[] = img.files ?? []
      const vidFiles: string[] = vid.files ?? []
      setFolderImages([...imgFiles, ...vidFiles])
      setSubFolders(img.folders ?? [])
      setFileFolders({ ...(img.fileFolders ?? {}), ...(vid.fileFolders ?? {}) })
      setDuplicates([...(img.duplicates ?? []), ...(vid.duplicates ?? [])])
      if (img.status) setEpStatus(img.status)
      else if (vid.status) setEpStatus(vid.status)
    }).catch(() => {})
  }, [series, name])
  useEffect(() => { refreshFolderImages() }, [refreshFolderImages])

  /** 파일을 서브폴더로 이동 (확장자 분기). targetFolder='' = 루트. 영상 파일은 videos/ 루트 전제 — targetFolder는 images 전용. */
  const moveFileToFolder = useCallback(async (fileName: string, targetFolder: string): Promise<boolean> => {
    if (isVideoFile(fileName) && targetFolder) {
      alert('영상은 서브폴더 이동을 지원하지 않습니다.')
      return false
    }
    try {
      const res = await fetch(`/api/${series}/${mediaRoot(fileName)}/${name}/${fileName}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetFolder }),
      })
      if (res.ok) { refreshFolderImages(); return true }
      const err = await res.json().catch(() => ({}))
      alert(`이동 실패: ${err.error ?? res.statusText}`)
      return false
    } catch (e) {
      alert(`이동 실패: ${(e as Error).message}`)
      return false
    }
  }, [series, name, refreshFolderImages])

  /** 서브폴더 생성. folderPath는 '/' 구분 상대경로 */
  const createFolder = useCallback(async (folderPath: string): Promise<boolean> => {
    const parts = folderPath.split('/').filter(Boolean)
    if (!parts.length) return false
    try {
      const res = await fetch(`/api/${series}/folders/${name}/${parts.join('/')}`, { method: 'POST' })
      if (res.ok) { refreshFolderImages(); return true }
      const err = await res.json().catch(() => ({}))
      alert(`폴더 생성 실패: ${err.error ?? res.statusText}`)
      return false
    } catch (e) {
      alert(`폴더 생성 실패: ${(e as Error).message}`)
      return false
    }
  }, [series, name, refreshFolderImages])

  const renameFolder = useCallback(async (folderPath: string, newName: string): Promise<boolean> => {
    const parts = folderPath.split('/').filter(Boolean)
    if (!parts.length || !newName) return false
    try {
      const res = await fetch(`/api/${series}/folders/${name}/${parts.join('/')}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newName }),
      })
      if (res.ok) { refreshFolderImages(); return true }
      const err = await res.json().catch(() => ({}))
      alert(`폴더 이름 변경 실패: ${err.error ?? res.statusText}`)
      return false
    } catch (e) {
      alert(`폴더 이름 변경 실패: ${(e as Error).message}`)
      return false
    }
  }, [series, name, refreshFolderImages])

  const deleteFolder = useCallback(async (folderPath: string): Promise<boolean> => {
    const parts = folderPath.split('/').filter(Boolean)
    if (!parts.length) return false
    try {
      const res = await fetch(`/api/${series}/folders/${name}/${parts.join('/')}`, { method: 'DELETE' })
      if (res.ok) { refreshFolderImages(); return true }
      const err = await res.json().catch(() => ({}))
      alert(`폴더 삭제 실패: ${err.error ?? res.statusText}`)
      return false
    } catch (e) {
      alert(`폴더 삭제 실패: ${(e as Error).message}`)
      return false
    }
  }, [series, name, refreshFolderImages])

  const episodeBaseDir = `episodes/${epStatus}/${name}`
  const episodeDir = `${episodeBaseDir}/images`
  /** 파일명 확장자에 따라 실제 저장 경로 합성. 영상은 videos/, 이미지는 images/.
   *  fileFolders 맵에 서브폴더 정보가 있으면 포함시켜 루트로 경로가 평탄화되지 않게 한다
   *  (예: shorts/s2/foo.png, artworks/bar.jpg 등 서브폴더 파일의 경로 보존). */
  const mediaPath = (fileName: string) => {
    const sub = fileFolders[fileName] ?? ''
    const subPart = sub ? `${sub}/` : ''
    return `${episodeBaseDir}/${mediaRoot(fileName)}/${subPart}${fileName}`
  }

  const positionOf = (idx: number) => {
    if (view === 'longform') {
      const book = books[idx] as any
      return (img: CinematicImage): number => {
        if (!img.text) return -1
        const fo = FIELD_ORDER[img.field ?? 'summary'] ?? 0
        const ft: string = (img.field === 'context' || img.field === 'quote')
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
        seg.image = mediaPath(imgs[0].file)
        if (imgs.length > 1) {
          seg.imageChangeAt = imgs.slice(1).map(img => ({ t: 0, image: mediaPath(img.file), ...(img.text ? { text: img.text } : {}) }))
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
  /** 이미지 파일만 해제 — 앵커(text)는 유지하고 빈 슬롯으로 전환 */
  const imgRemoveFileOnly = async (idx: number, imgIdx: number) => {
    const imgs = getImages(idx)
    const target = imgs[imgIdx]
    if (!target?.file) return
    if (view === 'longform') {
      const baseName = stripImagePrefix(target.file)
      if (baseName !== target.file) await renameFile(target.file, baseName)
    }
    setImages(idx, imgs.map((img, j) => j === imgIdx ? { ...img, file: '' } : img))
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
        const ft = imgField === 'summary'
          ? b?.summary
          : imgField === 'quote'
            ? ((b?.quotePairs ?? []) as any[])[0]?.quote
            : b?.contextMain
        autoText = (ft ?? '').trim().split(/\s+/)[0] || undefined
      }
      setImages(idx, [...imgs, { file: finalName, field: imgField, ...(autoText ? { text: autoText } : {}) }])
    } else {
      if (!currentShorts) return
      // 타깃 구간에 이미 있으면 no-op
      if (imgs.some(img => img.file === fileName)) return

      const ns = segments.map((s: any) => ({ ...s }))
      const writeSeg = (seg: any, nextImgs: CinematicImage[]) => {
        if (nextImgs.length === 0) { delete seg.image; delete seg.imageChangeAt; return }
        seg.image = mediaPath(nextImgs[0].file)
        if (nextImgs.length > 1) {
          seg.imageChangeAt = nextImgs.slice(1).map(img => ({ t: 0, image: mediaPath(img.file), ...(img.text ? { text: img.text } : {}) }))
        } else { delete seg.imageChangeAt }
      }

      // MOVE: 같은 쇼츠 내 다른 구간에 있으면 먼저 제거 (이동 시맨틱)
      for (let si = 0; si < ns.length; si++) {
        if (si === idx) continue
        const srcImgs = segToImages(ns[si])
        const hit = srcImgs.findIndex(img => img.file === fileName)
        if (hit < 0) continue
        writeSeg(ns[si], srcImgs.filter((_, j) => j !== hit))
        break
      }

      // 타깃 구간에 파일 추가
      const targetImgs = segToImages(ns[idx])
      let autoText: string | undefined
      if (targetImgs.length > 0) { autoText = segments[idx]?.text?.trim().split(/\s+/)[0] }
      const next = [...targetImgs, { file: fileName, ...(field ? { field } : {}), ...(autoText ? { text: autoText } : {}) }]
      writeSeg(ns[idx], next)

      writeShorts({ ...currentShorts, segments: ns })
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

  // crossUsage(롱폼+모든 쇼츠의 모든 배치)를 전체 사용 파일 집합으로 정리.
  // ImagePool은 view와 무관하게 "어디서든 사용 중"을 used 뱃지로 표시한다.

  /** 파일별 전체 사용 현황. 롱폼 + 모든 쇼츠의 모든 배치를 수집한다. */
  const crossUsage = useMemo(() => {
    const map = new Map<string, string[]>()
    const add = (fn: string, label: string) => {
      const arr = map.get(fn)
      if (arr) { if (!arr.includes(label)) arr.push(label) }
      else map.set(fn, [label])
    }
    // 롱폼 사용
    for (let bi = 0; bi < books.length; bi++) {
      for (const img of ((books[bi] as any).images ?? [])) {
        if (img.file) add(img.file, `롱폼 책${bi + 1} ${img.field ?? ''}`.trim())
      }
    }
    // 모든 쇼츠 사용
    shortsArr.forEach((shorts: any, si: number) => {
      if (!shorts) return
      const shortsLabel = `쇼츠${si + 1}`
      if (shorts.revealBg) add(shorts.revealBg, `${shortsLabel} 배경`)
      if (!shorts.segments) return
      for (const seg of shorts.segments) {
        if (seg.image) { const fn = (seg.image as string).split('/').pop()!; add(fn, `${shortsLabel} ${seg.id}`) }
        const ch = seg.imageChangeAt ? (Array.isArray(seg.imageChangeAt) ? seg.imageChangeAt : [seg.imageChangeAt]) : []
        for (const c of ch) { const fn = (c as any).image.split('/').pop()!; add(fn, `${shortsLabel} ${seg.id}`) }
      }
    })
    return map
  }, [books, shortsArr])

  const usedFiles = useMemo(() => new Set(crossUsage.keys()), [crossUsage])

  /** 파일명 → 사용 책 인덱스 (0-based). 롱폼 books.images에 담긴 파일만 수록. 쇼츠는 책 귀속 X */
  const fileBookMap = useMemo(() => {
    const map = new Map<string, number>()
    for (let bi = 0; bi < books.length; bi++) {
      for (const img of ((books[bi] as any).images ?? [])) {
        if (img.file && !map.has(img.file)) map.set(img.file, bi)
      }
    }
    return map
  }, [books])

  /** 파일명 → field(summary|context|quote). 롱폼 books.images에 저장된 field 값 */
  const fileFieldMap = useMemo(() => {
    const map = new Map<string, 'summary' | 'context' | 'quote'>()
    for (const b of books) {
      for (const img of ((b as any).images ?? [])) {
        if (img.file && img.field && !map.has(img.file)) map.set(img.file, img.field)
      }
    }
    return map
  }, [books])

  const imgProps: ImageEditorProps = { anchorPick, setAnchorPick, imageBaseUrl,
    folderImages, usedFiles, fileBookMap, fileFieldMap, refreshFolderImages, view, getImages,
    removeImage: imgRemove, removeImageOnly: imgRemoveFileOnly, replaceImage: imgReplace, addAnchor: imgAddAnchor, dropImage: imgDrop,
    handlePick: imgHandlePick, confirmAnchor: imgConfirmAnchor, crossUsage,
    subFolders, fileFolders, duplicates,
    moveFileToFolder, createFolder, renameFolder, deleteFolder }

  return {
    anchorPick, setAnchorPick,
    imageBaseUrl, unassigned, folderImages, refreshFolderImages,
    epStatus, assignedFiles, crossUsage, usedFiles, fileBookMap, fileFieldMap,
    getImages, imgProps,
    subFolders, fileFolders, duplicates,
    moveFileToFolder, createFolder, renameFolder, deleteFolder,
  }
}
