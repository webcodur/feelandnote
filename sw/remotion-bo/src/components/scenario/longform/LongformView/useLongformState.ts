'use client'

import { useEffect, useState } from 'react'
import type { EpisodeData } from '../../../EpisodeEditor'
import { locateImageSectionKey, setField } from '../../utils'

export type MusicFile = { name: string; duration: number | null }

/**
 * 롱폼 편집에 필요한 mutation 헬퍼·필드 부분 저장·BGM 적용·이미지 풀 위치 점프 모음.
 *
 * - mutation은 항상 allBooks(전체 배열) 기준으로 한다. focus=book 모드에서 한 권만 보여도
 *   spread 시 인덱스가 어긋나면 데이터 손상이 일어난다.
 * - saveField는 디스크 최신 상태에 path만 교체해서 저장 — 다른 탭 변경 보존.
 */
export function useLongformState({
  episode, onUpdate, series, name, books, allBooks, fileBookMap,
}: {
  episode: EpisodeData
  onUpdate: (ep: EpisodeData) => void
  series: string
  name: string
  books: any[]
  allBooks: any[]
  fileBookMap: Map<string, number>
}) {
  const narrator = episode.narrator!
  const host = episode.host!

  const uN = (field: string, value: string) => onUpdate({ ...episode, narrator: { ...narrator, [field]: value } })
  const uH = (field: string, value: string) => onUpdate({ ...episode, host: { ...host, [field]: value } })
  // value=undefined이면 setField가 키 자체를 제거해 JSON이 깔끔하게 유지된다.
  const uB = (i: number, field: string, value: unknown) => {
    const newBooks = [...allBooks]
    newBooks[i] = setField(newBooks[i] ?? {}, field, value)
    onUpdate({ ...episode, books: newBooks })
  }

  const updateQuotePair = (bookIdx: number, pairIdx: number, field: string, value: any) => {
    const newBooks = [...allBooks]
    const book = { ...newBooks[bookIdx] }
    const pairs = [...((book as any).quotePairs ?? [])]
    pairs[pairIdx] = setField(pairs[pairIdx] ?? {}, field, value)
    ;(book as any).quotePairs = pairs
    newBooks[bookIdx] = book
    onUpdate({ ...episode, books: newBooks })
  }

  const addQuotePair = (bookIdx: number) => {
    const newBooks = [...allBooks]
    const book = { ...newBooks[bookIdx] }
    ;(book as any).quotePairs = [...((book as any).quotePairs ?? []), { quote: '(인용문 입력)' }]
    newBooks[bookIdx] = book
    onUpdate({ ...episode, books: newBooks })
  }

  const removeQuotePair = (bookIdx: number, pairIdx: number) => {
    if (!confirm('직접 인용을 삭제합니다.')) return
    const newBooks = [...allBooks]
    const book = { ...newBooks[bookIdx] }
    const pairs = [...((book as any).quotePairs ?? [])]
    pairs.splice(pairIdx, 1)
    ;(book as any).quotePairs = pairs.length ? pairs : undefined
    newBooks[bookIdx] = book
    onUpdate({ ...episode, books: newBooks })
  }

  const saveField = async (path: Array<string | number>, value: unknown) => {
    const res = await fetch(`/api/${series}/episodes/${name}/field`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path, value }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error ?? res.statusText)
    }
  }

  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([])
  const [musicBasePath, setMusicBasePath] = useState('')
  useEffect(() => {
    fetch(`/api/${series}/music/${name}`)
      .then(r => r.json())
      .then(d => { setMusicFiles(d.files ?? []); setMusicBasePath(d.basePath ?? '') })
      .catch(() => {})
  }, [series, name])

  const setBookBgm = (bookIdx: number, section: 'summary' | 'context', fileName: string | null) => {
    const newBooks = [...allBooks] as any[]
    const book = { ...newBooks[bookIdx] }
    const bgm = { ...(book.bgm ?? {}) }
    if (fileName) {
      const meta = musicFiles.find(f => f.name === fileName)
      const trackDuration = meta?.duration != null ? Math.round(meta.duration * 100) / 100 : undefined
      bgm[section] = {
        file: `${musicBasePath}/${fileName}`,
        volume: 0.3,
        loop: true,
        ...(trackDuration != null ? { trackDuration } : {}),
      }
    } else {
      delete bgm[section]
    }
    book.bgm = Object.keys(bgm).length ? bgm : undefined
    newBooks[bookIdx] = book
    onUpdate({ ...episode, books: newBooks })
  }

  /** 풀 이미지 → 배정된 섹션으로 스크롤. 책 아코디언도 열어준다. */
  const locateImage = (fileName: string) => {
    const bookIdx = fileBookMap.get(fileName)
    if (bookIdx === undefined) return
    const bookEl = document.getElementById(`book-${bookIdx}`) as HTMLDetailsElement | null
    if (bookEl && !bookEl.open) bookEl.open = true
    const sectionKey = locateImageSectionKey(fileName, books as any)
    requestAnimationFrame(() => {
      const target = sectionKey ? document.getElementById(`row-${sectionKey}`) : bookEl
      if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  return {
    uN, uH, uB,
    updateQuotePair, addQuotePair, removeQuotePair,
    saveField,
    musicFiles, setBookBgm,
    locateImage,
  }
}
