'use client'

import { useMemo } from 'react'

/**
 * 이미지 풀 사이드바에 필요한 사용 현황 맵 묶음.
 *
 * - assignedFiles: 현재 보고 있는 view(롱폼/특정 쇼츠)에 배정된 파일.
 * - crossUsage: 롱폼 + 모든 쇼츠 어디든 사용 중인 파일과 위치 라벨 목록.
 * - usedFiles: crossUsage 키 집합 (빠른 used 체크).
 * - fileBookMap·fileFieldMap: 롱폼 books.images의 책 인덱스/field 매핑.
 */
export function usePoolMaps({
  isShortsView, books, segments, currentShorts, shortsArr, view,
}: {
  isShortsView: boolean
  books: any[]
  segments: any[]
  currentShorts: any
  shortsArr: any[]
  view: string
}) {
  const assignedFiles = useMemo(() => {
    const set = new Set<string>()
    if (!isShortsView) {
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

  const fileBookMap = useMemo(() => {
    const map = new Map<string, number>()
    for (let bi = 0; bi < books.length; bi++) {
      for (const img of ((books[bi] as any).images ?? [])) {
        if (img.file && !map.has(img.file)) map.set(img.file, bi)
      }
    }
    return map
  }, [books])

  const fileFieldMap = useMemo(() => {
    const map = new Map<string, 'summary' | 'context' | 'quote'>()
    for (const b of books) {
      for (const img of ((b as any).images ?? [])) {
        if (img.file && img.field && !map.has(img.file)) map.set(img.file, img.field)
      }
    }
    return map
  }, [books])

  return { assignedFiles, crossUsage, usedFiles, fileBookMap, fileFieldMap }
}
