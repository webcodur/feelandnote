'use client'

import { useCallback } from 'react'
import type { CinematicImage } from '../types'
import { segToImages } from '../utils'
import { applyImagesToSeg } from './useImageOps'
import { remapImageAnchors } from '../anchorSync'

/** 솔로 섹션 한 칸 — 이미지 편집에 필요한 최소 형태(쇼츠 segment 와 동일 구조). */
export interface SoloImageSection {
  image?: string
  imageChangeAt?: Array<{ t?: number; image: string; text?: string }>
  text?: string
}

/**
 * 솔로 자유섹션 이미지 조작 — 쇼츠 segment 와 동일한 공용 모델을 그대로 적용한다.
 *
 * 쇼츠는 episode.shorts[].segments 에, 솔로는 episode 밖 자체 sections 상태에 저장하는 차이만 있다.
 * 그래서 makeImageOps 의 쇼츠 분기 부품(segToImages·applyImagesToSeg)을 sections 상태에 맞춰 재사용한다.
 * 저장 경로 형식(mediaPath = episodes/... 풀 경로)은 쇼츠와 완전히 동일하다.
 *
 * 정렬: 한 섹션 안 전환점은 primary(첫 칸) 고정 + 나머지는 본문 내 앵커 위치 순으로 정렬해 흐름과 맞춘다.
 */
export function useSoloImageOps<T extends SoloImageSection>({
  sections, setSections, mediaPath, dupNames,
}: {
  sections: T[]
  setSections: (updater: (prev: T[]) => T[]) => void
  mediaPath: (fileName: string) => string
  /** 다른 책과 이름이 겹치는 파일 집합 — 겹치는 파일만 폴더 포함 식별자로 다룬다. */
  dupNames: Set<string>
}) {
  const getImages = useCallback((idx: number): CinematicImage[] => {
    const raw = segToImages(sections[idx], dupNames)
    if (raw.length <= 1) return raw
    const segText = sections[idx]?.text ?? ''
    const pos = (img: CinematicImage): number => (img.text ? segText.indexOf(img.text) : -1)
    const [primary, ...rest] = raw
    const sorted = [...rest].sort((a, b) => {
      const pa = pos(a), pb = pos(b)
      if (pa < 0 && pb < 0) return 0
      if (pa < 0) return 1
      if (pb < 0) return -1
      return pa - pb
    })
    return [primary, ...sorted]
  }, [sections, dupNames])

  /** sections[idx] 의 image·imageChangeAt 을 imgs 로 다시 쓴다 (쇼츠 setImages 와 동일 모델). */
  const setImages = useCallback((idx: number, imgs: CinematicImage[]) => {
    setSections(prev => prev.map((s, j) => {
      if (j !== idx) return s
      const seg = { ...s }
      applyImagesToSeg(seg, imgs, mediaPath)
      return seg
    }))
  }, [setSections, mediaPath])

  const removeImage = useCallback((idx: number, imgIdx: number) => {
    setImages(idx, getImages(idx).filter((_, j) => j !== imgIdx))
  }, [getImages, setImages])

  /** 이미지 파일만 해제 — 앵커(text)는 유지하고 빈 슬롯으로 전환 */
  const removeImageOnly = useCallback((idx: number, imgIdx: number) => {
    setImages(idx, getImages(idx).map((img, j) => (j === imgIdx ? { ...img, file: '' } : img)))
  }, [getImages, setImages])

  const replaceImage = useCallback((idx: number, imgIdx: number, fileName: string) => {
    const imgs = [...getImages(idx)]
    imgs[imgIdx] = { ...imgs[imgIdx], file: fileName }
    setImages(idx, imgs)
  }, [getImages, setImages])

  const addAnchor = useCallback((idx: number, anchorText: string) => {
    const imgs = getImages(idx)
    if (imgs.some(img => img.text === anchorText)) return
    const next: CinematicImage[] = [...imgs, { file: '', text: anchorText }]
    // primary(첫 칸)는 text 앵커를 못 싣는다(seg.image 는 파일 경로뿐).
    // 앵커가 첫 칸으로 가면 저장 때 text 가 버려지므로, 빈 시작 슬롯을 앞에 깔아 imageChangeAt 영역으로 보낸다.
    if (next.length === 1) next.unshift({ file: '' })
    setImages(idx, next)
  }, [getImages, setImages])

  /**
   * 본문 커밋 시 앵커 이전 — 섹션 본문을 newText 로 바꾸면서, 이 섹션의 이미지 앵커(text)를
   * 옛 본문(oldText)에서 새 본문 대응 위치로 이전한다. 본문이 안 바뀌면 그대로 둔다.
   */
  const commitTextWithAnchors = useCallback((idx: number, newText: string, oldText: string) => {
    setSections(prev => prev.map((s, j) => {
      if (j !== idx) return s
      const next = { ...s, text: newText }
      if (oldText === newText) return next
      const imgs = segToImages(next, dupNames)
      const remapped = remapImageAnchors(oldText, newText, imgs, msg => console.info(`[솔로 #${idx + 1}] ${msg}`))
      applyImagesToSeg(next, remapped, mediaPath)
      return next
    }))
  }, [setSections, mediaPath, dupNames])

  /** 풀에서 파일을 끌어다 배치 — 같은 회차 내 다른 섹션에 있으면 먼저 떼는 이동(MOVE) 시맨틱(쇼츠와 동일). */
  const dropImage = useCallback((idx: number, fileName: string) => {
    setSections(prev => {
      const ns = prev.map(s => ({ ...s }))
      // 타깃에 이미 있으면 no-op
      const targetImgs = segToImages(ns[idx], dupNames)
      if (targetImgs.some(img => img.file === fileName)) return prev

      // MOVE: 다른 섹션에 있으면 제거
      for (let si = 0; si < ns.length; si++) {
        if (si === idx) continue
        const srcImgs = segToImages(ns[si], dupNames)
        const hit = srcImgs.findIndex(img => img.file === fileName)
        if (hit < 0) continue
        applyImagesToSeg(ns[si], srcImgs.filter((_, j) => j !== hit), mediaPath)
        break
      }

      // 타깃 — 빈 슬롯(file 없는 자리) 우선, 없으면 끝에 추가
      const emptyIdx = targetImgs.findIndex(img => !img.file)
      const next: CinematicImage[] = emptyIdx >= 0
        ? targetImgs.map((img, j) => (j === emptyIdx ? { ...img, file: fileName } : img))
        : [...targetImgs, { file: fileName }]
      applyImagesToSeg(ns[idx], next, mediaPath)
      return ns
    })
  }, [setSections, mediaPath, dupNames])

  return { getImages, setImages, removeImage, removeImageOnly, replaceImage, addAnchor, dropImage, commitTextWithAnchors }
}
