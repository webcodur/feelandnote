'use client'

import type { CinematicImage, ImageField } from '../types'
import { segToImages, addImagePrefix, stripImagePrefix } from '../utils'

const FIELD_ORDER: Record<string, number> = { summary: 0, context: 1, quote: 1 }

/**
 * 책/세그먼트 단위 이미지 배열 조회·정렬·변경 작업.
 *
 * 롱폼은 books[idx].images에 보관, 쇼츠는 segments[idx].image + imageChangeAt에 분산 저장.
 * 텍스트 앵커 위치(positionOf) 기준으로 정렬해 본문 흐름과 일치시킨다.
 * 드롭/삭제/교체 시 디스크 파일명 prefix(`{book}-{field}-`) 붙이고 떼는 일도 함께 처리.
 */
export function makeImageOps({
  isShortsView, books, segments, currentShorts, currentShortsIndex, shortsArr, episode, updateEpisode,
  renameFile, mediaPath,
}: {
  isShortsView: boolean
  books: any[]
  segments: any[]
  currentShorts: any
  currentShortsIndex: number
  shortsArr: any[]
  episode: any
  updateEpisode: (ep: any) => void
  renameFile: (oldName: string, newName: string) => Promise<string | null>
  mediaPath: (fileName: string) => string
}) {
  const positionOf = (idx: number) => {
    if (!isShortsView) {
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

  const sortByPos = (imgs: CinematicImage[], pos: (img: CinematicImage) => number) =>
    [...imgs].sort((a, b) => {
      const pa = pos(a), pb = pos(b)
      if (pa < 0 && pb < 0) return 0
      if (pa < 0) return 1
      if (pb < 0) return -1
      return pa - pb
    })

  const getImages = (idx: number): CinematicImage[] => {
    const raw = !isShortsView ? (books[idx]?.images ?? []) : segToImages(segments[idx])
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
    arr[currentShortsIndex - 1] = next
    updateEpisode({ ...episode, shorts: arr })
  }

  const setImages = (idx: number, imgs: CinematicImage[]) => {
    if (!isShortsView) {
      const nb = [...books] as any[]; nb[idx] = { ...nb[idx], images: imgs.length ? imgs : undefined }
      updateEpisode({ ...episode, books: nb })
    } else {
      if (!currentShorts) return
      const ns = [...segments]; const seg = { ...ns[idx] }
      if (imgs.length === 0) { delete seg.image; delete seg.imageChangeAt }
      else {
        // 섹션 앵커(primary) 이미지만 비운 경우 imgs[0].file 이 빈 문자열.
        // 빈 문자열 그대로 보존해 자리 표시(키 자체를 지우면 라운드트립에서 슬롯이 사라진다).
        // 렌더(BookRecommendShort) 측은 seg.image 가 falsy 면 직전 이미지 승계로 처리하므로 안전.
        seg.image = imgs[0].file ? mediaPath(imgs[0].file) : ''
        if (imgs.length > 1) {
          seg.imageChangeAt = imgs.slice(1).map(img => ({ t: 0, image: img.file ? mediaPath(img.file) : '', ...(img.text ? { text: img.text } : {}) }))
        } else { delete seg.imageChangeAt }
      }
      ns[idx] = seg
      writeShorts({ ...currentShorts, segments: ns })
    }
  }

  const removeImage = async (idx: number, imgIdx: number) => {
    const imgs = getImages(idx)
    const removed = imgs[imgIdx]
    // 롱폼: prefix 제거하여 baseName 복원
    if (!isShortsView && removed?.file) {
      const baseName = stripImagePrefix(removed.file)
      if (baseName !== removed.file) await renameFile(removed.file, baseName)
    }
    setImages(idx, imgs.filter((_, j) => j !== imgIdx))
  }

  /** 이미지 파일만 해제 — 앵커(text)는 유지하고 빈 슬롯으로 전환 */
  const removeImageOnly = async (idx: number, imgIdx: number) => {
    const imgs = getImages(idx)
    const target = imgs[imgIdx]
    if (!target?.file) return
    if (!isShortsView) {
      const baseName = stripImagePrefix(target.file)
      if (baseName !== target.file) await renameFile(target.file, baseName)
    }
    setImages(idx, imgs.map((img, j) => j === imgIdx ? { ...img, file: '' } : img))
  }

  const replaceImage = (idx: number, imgIdx: number, fileName: string) => {
    const imgs = [...getImages(idx)]; imgs[imgIdx] = { ...imgs[imgIdx], file: fileName }; setImages(idx, imgs)
  }

  const addAnchor = (idx: number, anchorText: string, field?: ImageField) => {
    const imgs = getImages(idx)
    if (imgs.some(img => img.text === anchorText)) return
    setImages(idx, [...imgs, { file: '', text: anchorText, ...(field ? { field } : {}) }])
  }

  const dropImage = async (idx: number, fileName: string, field?: ImageField) => {
    const imgs = getImages(idx)
    if (!isShortsView) {
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

  return { getImages, setImages, removeImage, removeImageOnly, replaceImage, addAnchor, dropImage }
}
