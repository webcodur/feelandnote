'use client'

import { useId, useState } from 'react'
import { BookOpen } from 'lucide-react'
import { isBookShelfAvailable } from '@/lib/books/bookShelf'
import BookShelfSelection from './BookShelfSelection'
import type { BookShelfGroup } from './types'
import styles from './BookShelf.module.css'

interface Props {
  groups: BookShelfGroup[]
  ariaLabel: string
  title?: string
  id?: string
  className?: string
}

/** 개인·신화·팩션의 공통 책장. 모든 탭은 같은 책 선택·판본·소개·구매 화면을 쓴다. */
export default function BookShelf({ groups, ariaLabel, title, id, className = '' }: Props) {
  const instanceId = useId()
  const prefix = id ? `${id}-bookshelf` : `bookshelf-${instanceId}`
  const available = groups.map((group) => ({ ...group,
    books: [...new Map(group.books.filter(isBookShelfAvailable).map((book) => [book.id, book])).values()],
  })).filter((group) => group.books.length > 0)
  const [activeKey, setActiveKey] = useState(available[0]?.key)
  const active = available.find((group) => group.key === activeKey) ?? available[0]
  if (!active) return null

  return (
    <section className={`${styles.shelf} min-w-0 overflow-hidden rounded-xl border ${className}`} aria-label={ariaLabel} data-bookshelf>
      {title && <h3 className="flex items-center gap-2 border-b border-white/10 px-4 py-4 text-lg font-bold text-text-primary sm:px-6"><BookOpen size={17} aria-hidden />{title}</h3>}
      <div role="tablist" aria-label={ariaLabel} className={`${styles.tabs} grid border-b`}
        style={{ gridTemplateColumns: `repeat(${available.length}, minmax(0, 1fr))` }}>
        {available.map((group, index) => (
          <button key={group.key} id={`${prefix}-tab-${group.key}`} type="button" role="tab"
            aria-selected={group.key === active.key} aria-controls={`${prefix}-panel-${group.key}`}
            tabIndex={group.key === active.key ? 0 : -1} onClick={() => setActiveKey(group.key)}
            onKeyDown={(event) => {
              const direction = { ArrowLeft: -1, ArrowRight: 1, Home: -index, End: available.length - 1 - index }[event.key]
              if (direction === undefined) return
              event.preventDefault()
              const next = available[(index + direction + available.length) % available.length].key
              setActiveKey(next)
              document.getElementById(`${prefix}-tab-${next}`)?.focus()
            }}
            className={`${styles.tab} flex min-h-12 min-w-0 items-center justify-center border-b-2 px-1 py-2 text-center text-xs font-medium outline-none hover:bg-accent/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:px-3 sm:text-base ${group.key === active.key ? 'border-accent text-accent' : 'border-transparent text-text-secondary'}`}>
            <span className="break-words">{group.label}</span>
          </button>
        ))}
      </div>
      <div id={`${prefix}-panel-${active.key}`} role="tabpanel" aria-labelledby={`${prefix}-tab-${active.key}`}>
        {active.addon}
        <BookShelfSelection key={`${active.key}:${active.selectionKey ?? ''}`} intro={`${active.label}: ${active.intro}`} listSubtitle={active.listSubtitle} books={active.books} context={active.context} pagination={active.pagination} />
      </div>
    </section>
  )
}
