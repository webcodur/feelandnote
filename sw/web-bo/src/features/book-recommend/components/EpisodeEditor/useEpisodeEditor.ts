import { useState, useCallback } from 'react'
import { EMPTY_HOST, EMPTY_NARRATOR } from './constants'
import { toImageChanges } from './types'
import type { EpisodeData, BookEntry, CinematicImage, ShortsConfig, ImageChange } from './types'

export function useEpisodeEditor(rawEpisode: EpisodeData, onChange: (ep: EpisodeData) => void) {
  const episode = { ...rawEpisode, host: rawEpisode.host ?? EMPTY_HOST, narrator: rawEpisode.narrator ?? EMPTY_NARRATOR, books: rawEpisode.books ?? [] }
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ host: true })
  const [openBooks, setOpenBooks] = useState<Record<number, boolean>>({ 0: true })

  const toggle = useCallback((id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }))
  }, [])

  const toggleBook = useCallback((idx: number) => {
    setOpenBooks(prev => ({ ...prev, [idx]: !prev[idx] }))
  }, [])

  // Update helpers
  const setHost = (field: string, value: string) => {
    onChange({ ...episode, host: { ...episode.host, [field]: value } })
  }
  const setNarrator = (field: string, value: string) => {
    onChange({ ...episode, narrator: { ...episode.narrator, [field]: value } })
  }
  const setBook = (idx: number, field: string, value: string) => {
    const books = [...episode.books]
    books[idx] = { ...books[idx], [field]: value }
    onChange({ ...episode, books })
  }
  const setBookStats = (idx: number, field: string, value: string) => {
    const books = [...episode.books]
    books[idx] = { ...books[idx], stats: { ...books[idx].stats, [field]: value } }
    onChange({ ...episode, books })
  }
  const addBook = () => {
    const blank: BookEntry = {
      title: '', creator: '', thumbnail_url: '', summary: '', summaryDuration: 0,
      contextMain: '', contextDuration: 0, stats: {}, titleDuration: 0,
    }
    onChange({ ...episode, books: [...episode.books, blank] })
    setOpenBooks(prev => ({ ...prev, [episode.books.length]: true }))
  }
  const removeBook = (idx: number) => {
    if (!confirm(`"${episode.books[idx].title || `#${idx + 1}`}" 삭제?`)) return
    onChange({ ...episode, books: episode.books.filter((_, i) => i !== idx) })
  }
  const moveBook = (idx: number, dir: -1 | 1) => {
    const target = idx + dir
    if (target < 0 || target >= episode.books.length) return
    const books = [...episode.books]
    ;[books[idx], books[target]] = [books[target], books[idx]]
    onChange({ ...episode, books })
  }

  // Book images helpers
  const setBookImages = (idx: number, images: CinematicImage[] | undefined) => {
    const books = [...episode.books]
    books[idx] = { ...books[idx], images }
    onChange({ ...episode, books })
  }
  const addBookImage = (bookIdx: number) => {
    const book = episode.books[bookIdx]
    const images = [...(book.images ?? [])]
    const n = bookIdx + 1
    const slot = images.length + 1
    images.push({ file: `${n}-${slot}.jpg` })
    setBookImages(bookIdx, images)
  }
  const updateBookImage = (bookIdx: number, imgIdx: number, field: keyof CinematicImage, value: string) => {
    const book = episode.books[bookIdx]
    const images = [...(book.images ?? [])]
    images[imgIdx] = { ...images[imgIdx], [field]: value }
    if (!value && field !== 'file') delete (images[imgIdx] as Record<string, unknown>)[field]
    setBookImages(bookIdx, images)
  }
  const removeBookImage = (bookIdx: number, imgIdx: number) => {
    const book = episode.books[bookIdx]
    const images = (book.images ?? []).filter((_, i) => i !== imgIdx)
    setBookImages(bookIdx, images.length ? images : undefined)
  }
  const moveBookImage = (bookIdx: number, imgIdx: number, dir: -1 | 1) => {
    const book = episode.books[bookIdx]
    const images = [...(book.images ?? [])]
    const target = imgIdx + dir
    if (target < 0 || target >= images.length) return
    ;[images[imgIdx], images[target]] = [images[target], images[imgIdx]]
    setBookImages(bookIdx, images)
  }

  // Shorts helpers — 옵션 2: 첫 번째 쇼츠(1번)만 편집한다.
  // 복수 쇼츠 편집은 ScenarioView의 탭에서 처리한다.
  const shortsArr: ShortsConfig[] = Array.isArray(episode.shorts) ? episode.shorts : []
  const shorts: ShortsConfig | undefined = shortsArr[0]
  const setShorts = (s: ShortsConfig) => {
    const next = [...shortsArr]
    next[0] = s
    onChange({ ...episode, shorts: next })
  }
  const setSegment = (idx: number, field: string, value: unknown) => {
    if (!shorts) return
    const segs = [...shorts.segments]
    segs[idx] = { ...segs[idx], [field]: value }
    setShorts({ ...shorts, segments: segs })
  }
  const addSegment = () => {
    if (!shorts) {
      setShorts({ segments: [{ id: 'new', role: 'narrator', text: '', visual: 'hook' }] })
      return
    }
    setShorts({ ...shorts, segments: [...shorts.segments, { id: `seg-${shorts.segments.length}`, role: 'narrator', text: '', visual: 'hook' }] })
  }
  const removeSegment = (idx: number) => {
    if (!shorts) return
    setShorts({ ...shorts, segments: shorts.segments.filter((_, i) => i !== idx) })
  }
  const setSegImage = (idx: number, value: string) => {
    setSegment(idx, 'image', value || undefined)
  }
  const addImageChange = (segIdx: number) => {
    if (!shorts) return
    const seg = shorts.segments[segIdx]
    const changes: ImageChange[] = [...toImageChanges(seg.imageChangeAt)]
    changes.push({ t: 0, image: '', text: '' })
    setSegment(segIdx, 'imageChangeAt', changes)
  }
  const updateImageChange = (segIdx: number, changeIdx: number, field: keyof ImageChange, value: string | number) => {
    if (!shorts) return
    const seg = shorts.segments[segIdx]
    const changes = [...toImageChanges(seg.imageChangeAt)]
    changes[changeIdx] = { ...changes[changeIdx], [field]: value }
    if (field === 'text' && !value) delete (changes[changeIdx] as Record<string, unknown>).text
    setSegment(segIdx, 'imageChangeAt', changes)
  }
  const removeImageChange = (segIdx: number, changeIdx: number) => {
    if (!shorts) return
    const seg = shorts.segments[segIdx]
    const changes = toImageChanges(seg.imageChangeAt).filter((_, i) => i !== changeIdx)
    setSegment(segIdx, 'imageChangeAt', changes.length ? changes : undefined)
  }

  return {
    episode,
    openSections,
    openBooks,
    toggle,
    toggleBook,
    setHost,
    setNarrator,
    setBook,
    setBookStats,
    addBook,
    removeBook,
    moveBook,
    addBookImage,
    updateBookImage,
    removeBookImage,
    moveBookImage,
    shorts,
    setShorts,
    setSegment,
    addSegment,
    removeSegment,
    setSegImage,
    addImageChange,
    updateImageChange,
    removeImageChange,
    onChange,
  }
}
