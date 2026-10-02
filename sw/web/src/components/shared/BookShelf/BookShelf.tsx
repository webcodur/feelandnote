'use client'

import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { isBookShelfAvailable } from '@/lib/books/bookShelf'
import BookShelfSelection from './BookShelfSelection'
import LibraryCategoryPicker from '@/components/shared/LibraryCategoryPicker'
import type { BookShelfGroup } from './types'
import styles from './BookShelf.module.css'

interface Props {
  groups: BookShelfGroup[]
  ariaLabel: string
  title?: string
  id?: string
  className?: string
}

/** 개인·신화·팩션의 공통 책장. 분류는 칩으로 바꾸고 제목에서 선택 목록을 연다. */
export default function BookShelf({ groups, ariaLabel, title, id, className = '' }: Props) {
  const normalized = groups.map((group) => ({ ...group,
    books: [...new Map(group.books.filter(isBookShelfAvailable).map((book) => [book.id, book])).values()],
  }))
  const available = normalized.filter((group) => group.books.length > 0)
  const [activeKey, setActiveKey] = useState(available[0]?.key)
  const [listOpen, setListOpen] = useState(false)
  const [titlePulseRequest, setTitlePulseRequest] = useState(0)
  const active = available.find((group) => group.key === activeKey) ?? available[0]
  if (!active) return null
  const categoryPicker = <LibraryCategoryPicker
    options={normalized.map((group) => ({ key: group.key, label: group.label, count: group.books.length, disabled: group.books.length === 0 }))}
    value={active.key} ariaLabel={ariaLabel}
    onChange={(key) => { setActiveKey(key); if (!listOpen) setTitlePulseRequest((current) => current + 1) }} />

  return (
    <div className="min-w-0" aria-label={ariaLabel} data-bookshelf>
      {title && <h3 className="flex items-center gap-2 border-b border-white/10 px-4 py-4 text-lg font-bold text-text-primary sm:px-6"><BookOpen size={17} aria-hidden />{title}</h3>}
      <div className="mx-auto mb-3 w-fit max-w-full">{categoryPicker}</div>
      <section id={id} className={`${styles.shelf} min-w-0 ${className}`} aria-label={active.label}>
        {active.addon}
        <BookShelfSelection selectionKey={`${active.key}:${active.selectionKey ?? ''}`} intro={`${active.label}: ${active.intro}`} listSubtitle={active.listSubtitle} books={active.books} context={active.context} pagination={active.pagination}
          listOpen={listOpen} onListOpenChange={setListOpen} categoryPicker={categoryPicker} titlePulseRequest={titlePulseRequest} />
      </section>
    </div>
  )
}
