'use client'

import { useMemo, useState } from 'react'
import { isVideoFile, parseImagePrefix, fieldFromCode } from '../utils'
import type { ImageField } from '../types'
import { sortBy, type FieldFilter, type SortMode, type UsageFilter, type Group } from './constants'

/**
 * ImagePool 필터·정렬·그룹핑 상태와 파생 값을 한 곳에 모은 훅.
 *
 * 입력: 전체 이미지 리스트, 사용 여부 맵, 책 인덱스 맵, 폴더 맵, 책 제목.
 * 출력: 검색·필터·뷰모드 상태와 setter, 그리고 필터/정렬 적용 후의 그룹·폴더별 파일 목록.
 */
export function useImagePoolFilter({
  allImages, usedFiles, fileBookMap, fileFieldMap, fileFolders, subFolders, bookTitles,
}: {
  allImages: string[]
  usedFiles: Set<string>
  fileBookMap: Map<string, number>
  fileFieldMap: Map<string, ImageField>
  fileFolders: Record<string, string>
  subFolders: string[]
  view: string
  bookTitles?: string[]
}) {
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<FieldFilter>('all')
  const [sortMode, setSortMode] = useState<SortMode>('default')
  const [usageFilter, setUsageFilter] = useState<UsageFilter>('all')

  // ⚠️ 롱폼·쇼츠는 "동일한 이미지군"을 공유한다. 롱폼에서 쓰는 이미지를 쇼츠에서, 쇼츠에서 쓰는
  //    이미지를 롱폼에서 그대로 끌어다 써야 하므로, view(롱폼/쇼츠)에 따라 풀의 이미지를 숨기면 안 된다.
  //    → view 와 무관하게 항상 전체를 노출한다. 사용 중인 파일은 used 뱃지로만 구분한다.
  //    (과거 'shorts-' 접두 파일을 롱폼 뷰에서 일괄 숨겨, 쇼츠용 이미지가 롱폼 풀에서 0개로 사라지는
  //     회귀가 있었다. 다시 view 기준 필터를 넣지 마라.)
  const scoped = allImages

  /** 공통 필터 — 검색·필드·사용여부 */
  const matchesFilters = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (fn: string) => {
      const isUsed = usedFiles.has(fn)
      if (usageFilter === 'unused' && isUsed) return false
      if (usageFilter === 'used' && !isUsed) return false
      if (filter !== 'all') {
        let field: ImageField | null = fileFieldMap.get(fn) ?? null
        if (!field) {
          const prefix = parseImagePrefix(fn)
          field = prefix ? fieldFromCode(prefix.fieldCode) : null
        }
        if (field !== filter) return false
      }
      if (q && !fn.toLowerCase().includes(q)) return false
      return true
    }
  }, [query, filter, usageFilter, usedFiles, fileFieldMap])

  /** 루트 파일(폴더 없는 것) — 책별 그룹핑 대상 */
  const rootFiltered = useMemo(
    () => scoped.filter(fn => !(fileFolders[fn] ?? '') && matchesFilters(fn)),
    [scoped, fileFolders, matchesFilters],
  )

  /** 서브폴더별 파일 맵 (필터 적용 후) */
  const folderFiles = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const folder of subFolders) map.set(folder, [])
    for (const fn of scoped) {
      const f = fileFolders[fn] ?? ''
      if (!f) continue
      if (!matchesFilters(fn)) continue
      const arr = map.get(f) ?? []
      arr.push(fn)
      map.set(f, arr)
    }
    return map
  }, [scoped, subFolders, fileFolders, matchesFilters])

  // 책별 그룹핑: fileBookMap에서 책 인덱스 조회 → book-N. 없으면(사용 안 됨) 'unused'.
  // prefix가 있지만 books.images에 등록되지 않은 경우는 prefix bookNum으로 폴백.
  const groups = useMemo<Group[]>(() => {
    const buckets = new Map<string, string[]>()
    for (const fn of rootFiltered) {
      let bookIdx = fileBookMap.get(fn)
      if (bookIdx === undefined) {
        const p = parseImagePrefix(fn)
        if (p) bookIdx = p.bookNum - 1
      }
      const key = bookIdx !== undefined ? `book-${bookIdx + 1}` : 'unused'
      const arr = buckets.get(key) ?? []
      arr.push(fn)
      buckets.set(key, arr)
    }
    // 섹션 순서: unused 먼저 → 1, 2, 3... 오름차순
    const keys = Array.from(buckets.keys()).sort((a, b) => {
      if (a === 'unused') return -1
      if (b === 'unused') return 1
      const na = parseInt(a.slice(5), 10)
      const nb = parseInt(b.slice(5), 10)
      return na - nb
    })
    return keys.map(key => {
      const files = sortBy(sortMode, buckets.get(key)!)
      let label: string
      if (key === 'unused') {
        label = `미배정 (${files.length})`
      } else {
        const bookNum = parseInt(key.slice(5), 10)
        const title = bookTitles?.[bookNum - 1]
        label = title ? `책 ${bookNum} — ${title} (${files.length})` : `책 ${bookNum} (${files.length})`
      }
      return { key, label, files }
    })
  }, [rootFiltered, sortMode, bookTitles, fileBookMap])

  const usedCount = useMemo(() => scoped.filter(f => usedFiles.has(f)).length, [scoped, usedFiles])
  const videoCount = useMemo(() => scoped.filter(isVideoFile).length, [scoped])

  return {
    query, setQuery,
    filter, setFilter,
    sortMode, setSortMode,
    usageFilter, setUsageFilter,
    scoped, groups, folderFiles,
    usedCount, videoCount,
  }
}
