'use client'

import { useEffect, useRef } from 'react'
import { List } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMouseDragScroll } from '@/hooks/useMouseDragScroll'
import BookShelfBookChip from './BookShelfBookChip'
import type { BookShelfBook } from './types'
import styles from './BookShelf.module.css'
import layout from './BookShelfChoiceRow.module.css'

/** 작품과 판본 모두 목록 버튼 옆에서 고른다. */
export default function BookShelfChoiceRow({ label, choices, selectedKey, onSelect, onOpenList, kind }: {
  label: string; choices: { key: string; book: BookShelfBook }[]; selectedKey: string;
  onSelect: (key: string) => void; onOpenList: () => void; kind: 'work' | 'edition';
}) {
  const t = useTranslations('celebPage')
  const { ref, cursorClassName, dragProps } = useMouseDragScroll<HTMLDivElement>()
  const selectedRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const rail = ref.current, button = selectedRef.current
    if (!rail || !button) return
    const railBox = rail.getBoundingClientRect(), buttonBox = button.getBoundingClientRect()
    if (buttonBox.left >= railBox.left && buttonBox.right <= railBox.right) return
    const left = rail.scrollLeft + buttonBox.left - railBox.left - (rail.clientWidth - button.clientWidth) / 2
    rail.scrollTo({ left: Math.max(0, Math.min(rail.scrollWidth - rail.clientWidth, left)),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [ref, selectedKey])
  const controlClass = 'inline-flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-md border border-white/25 bg-white/5 px-3 text-sm font-medium text-white/90 outline-none hover:border-white/50 hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-accent'
  return (
    <div className={`${layout.row} ${kind === 'work' ? layout.work : layout.edition} flex min-w-0 items-center gap-3 px-4 sm:px-6`}
      data-bookshelf-heading={kind === 'work' ? true : undefined} data-bookshelf-edition-nav={kind === 'edition' ? true : undefined}>
      <div className={`${kind === 'edition' ? layout.branch : ''} shrink-0 border-s-2 border-accent ps-2`}>
        <button type="button" onClick={onOpenList} aria-haspopup="dialog" className={controlClass}
          aria-label={`${label}: ${t('bookShelfBookList')}`}
          data-bookshelf-open-list={kind === 'work' ? '' : undefined} data-bookshelf-edition-open={kind === 'edition' ? '' : undefined}>
          <span>{label}</span><List size={16} aria-hidden />
        </button>
      </div>
      <div ref={ref} {...dragProps} aria-label={kind === 'work' ? t('sourceWorkPickerLabel') : t('sourceEditionSelect')}
        className={`flex min-w-0 flex-1 gap-2 overflow-x-auto overscroll-x-contain py-0.5 select-none scrollbar-hide pointer-coarse:snap-x pointer-coarse:snap-proximity [overflow-anchor:none] ${cursorClassName}`}>
        {choices.map(({ key, book }) => <BookShelfBookChip key={key} book={book} type="button"
          ref={key === selectedKey ? selectedRef : undefined} aria-pressed={key === selectedKey}
          aria-label={t(kind === 'work' ? 'sourceWorkSelect' : 'sourceEditionSelectAria', { title: book.title })}
          onClick={() => onSelect(key)} data-bookshelf-book={kind === 'work' ? key : undefined}
          data-bookshelf-edition-chip={kind === 'edition' ? key : undefined}
          className={`${styles.railBook} flex h-12 w-max max-w-[min(100%,28rem)] shrink-0 snap-start items-center border px-3 py-1 text-start outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent`}>
          <span className="min-w-0 flex-1"><span className={`${styles.bookTitle} block truncate text-sm font-semibold`}>{book.title}</span>
            {book.creator && <span className={`${styles.bookCreator} mt-0.5 block truncate text-xs`}>{book.creator}</span>}
          </span>
        </BookShelfBookChip>)}
      </div>
    </div>
  )
}
