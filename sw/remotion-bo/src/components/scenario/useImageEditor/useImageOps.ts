'use client'

import type { CinematicImage, ImageField } from '../types'
import { segToImages, imagesToSeg, addImagePrefix, stripImagePrefix } from '../utils'
import { shortsArrIndexBySlot } from '../../voice-utils'

/** CinematicImage[] 를 seg(쇼츠 segment / 솔로 section) 의 image·imageChangeAt 키에 반영한다.
 *  imagesToSeg 결과를 seg 객체에 쓰되, undefined 인 필드는 키 자체를 제거한다. seg 를 직접 변형한다. */
export function applyImagesToSeg(
  seg: { image?: string; imageChangeAt?: unknown },
  imgs: CinematicImage[],
  mediaPath: (fileName: string) => string,
) {
  const { image, imageChangeAt } = imagesToSeg(imgs, mediaPath)
  if (image === undefined) delete seg.image
  else seg.image = image
  if (imageChangeAt === undefined) delete seg.imageChangeAt
  else seg.imageChangeAt = imageChangeAt
}

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
  renameFile, mediaPath, dupNames,
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
  /** 다른 책과 이름이 겹치는 파일 집합 — 겹치는 파일만 폴더 포함 식별자로 다룬다. */
  dupNames: Set<string>
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
    const raw = !isShortsView ? (books[idx]?.images ?? []) : segToImages(segments[idx], dupNames)
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
    // currentShortsIndex 는 고정 slot 번호다(배열 위치 아님). slot 으로 쓰기 위치를 찾는다 —
    // 배열 위치로 쓰면 slot≠위치인 책에서 다른 쇼츠를 덮어쓰고 현재 화면엔 반영되지 않는다.
    const arr = [...shortsArr]
    arr[shortsArrIndexBySlot(arr, currentShortsIndex)] = next
    updateEpisode({ ...episode, shorts: arr })
  }

  const setImages = (idx: number, imgs: CinematicImage[]) => {
    if (!isShortsView) {
      const nb = [...books] as any[]; nb[idx] = { ...nb[idx], images: imgs.length ? imgs : undefined }
      updateEpisode({ ...episode, books: nb })
    } else {
      if (!currentShorts) return
      const ns = [...segments]; const seg = { ...ns[idx] }
      // 섹션 앵커(primary) 이미지만 비운 경우 imgs[0].file 이 빈 문자열 — imagesToSeg 가 ''로 보존한다.
      // 렌더(BookRecommendShort) 측은 seg.image 가 falsy 면 직전 이미지 승계로 처리하므로 안전.
      applyImagesToSeg(seg, imgs, mediaPath)
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
    const next: CinematicImage[] = [...imgs, { file: '', text: anchorText, ...(field ? { field } : {}) }]
    // 쇼츠: 시작 이미지(seg.image)는 파일 경로만 담아 text 앵커를 못 싣는다.
    // 앵커가 첫 칸(primary)으로 가면 저장 때 text 가 버려지므로, 빈 시작 슬롯을 앞에 깔아
    // imageChangeAt(text 보존) 영역으로 보낸다.
    if (isShortsView && next.length === 1) next.unshift({ file: '' })
    setImages(idx, next)
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
      // 신규 배정 — prefix 부착. 앵커 텍스트는 비워 두고 사용자가 명시 픽업으로 채운다.
      const imgField = field ?? (imgs.length === 0 ? 'summary' : 'context')
      const newName = addImagePrefix(fileName, idx, imgField)
      const renamed = await renameFile(fileName, newName)
      const finalName = renamed ?? fileName
      // 빈 슬롯(file 없이 text 만 가진 자리)이 있으면 그 자리부터 채운다. field 일치만 본다.
      const emptyIdx = imgs.findIndex(img => !img.file && (img.field ?? 'context') === imgField)
      if (emptyIdx >= 0) {
        const u = [...imgs]; u[emptyIdx] = { ...u[emptyIdx], file: finalName, field: imgField }
        setImages(idx, u)
      } else {
        setImages(idx, [...imgs, { file: finalName, field: imgField }])
      }
    } else {
      if (!currentShorts) return
      // 타깃 구간에 이미 있으면 no-op
      if (imgs.some(img => img.file === fileName)) return

      const ns = segments.map((s: any) => ({ ...s }))
      const writeSeg = (seg: any, nextImgs: CinematicImage[]) => applyImagesToSeg(seg, nextImgs, mediaPath)

      // MOVE: 같은 쇼츠 내 다른 구간에 있으면 먼저 제거 (이동 시맨틱)
      for (let si = 0; si < ns.length; si++) {
        if (si === idx) continue
        const srcImgs = segToImages(ns[si], dupNames)
        const hit = srcImgs.findIndex(img => img.file === fileName)
        if (hit < 0) continue
        writeSeg(ns[si], srcImgs.filter((_, j) => j !== hit))
        break
      }

      // 타깃 구간 — 빈 슬롯(file 없는 자리)이 있으면 거기부터 채우고, 없으면 끝에 추가.
      // 자동 앵커 부착(첫 단어 자동 삽입)은 다중 슬롯이 동일 앵커로 몰리는 문제가 있어 폐기.
      // 앵커 텍스트는 사용자가 명시 픽업으로 채운다.
      const targetImgs = segToImages(ns[idx], dupNames)
      const emptyIdx = targetImgs.findIndex(img => !img.file)
      let next: CinematicImage[]
      if (emptyIdx >= 0) {
        next = targetImgs.map((img, j) =>
          j === emptyIdx ? { ...img, file: fileName, ...(field ? { field } : {}) } : img,
        )
      } else {
        next = [...targetImgs, { file: fileName, ...(field ? { field } : {}) }]
      }
      writeSeg(ns[idx], next)

      writeShorts({ ...currentShorts, segments: ns })
    }
  }

  return { getImages, setImages, removeImage, removeImageOnly, replaceImage, addAnchor, dropImage }
}
