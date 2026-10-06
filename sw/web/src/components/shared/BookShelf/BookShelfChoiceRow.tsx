'use client'

import { useEffect, useRef } from 'react'
import { Menu } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useMouseDragScroll } from '@/hooks/useMouseDragScroll'
import BookShelfBookChip from './BookShelfBookChip'
import type { BookShelfBook } from './types'
import styles from './BookShelf.module.css'
import layout from './BookShelfChoiceRow.module.css'

/** 제목을 바로 나열하고, 긴 목록은 손이나 마우스로 옆으로 밀어 고른다. */
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
      behavior: 'instant' })
  }, [ref, selectedKey])
  if (!choices.length) return null
  return (
    <div className={`${layout.row} flex min-w-0 flex-1 items-center gap-2`}
      data-bookshelf-heading={kind === 'work' ? true : undefined} data-bookshelf-edition-nav={kind === 'edition' ? true : undefined}>
      <div ref={ref} {...dragProps} aria-label={kind === 'work' ? t('sourceWorkPickerLabel') : t('sourceEditionSelect')}
        className={`flex min-w-0 flex-1 gap-2 overflow-x-auto overscroll-x-contain py-0.5 select-none scrollbar-hide pointer-coarse:snap-x pointer-coarse:snap-proximity [overflow-anchor:none] ${cursorClassName}`}>
        {choices.map(({ key, book }) => {
          // 판본 칩은 같은 작품끼리 저자가 같아 역자·출판사로 구분하고, 둘 다 없을 때만 저자로 돌아간다.
          const subtitle = kind === 'edition'
            ? [book.translator ? t('sourceEditionTranslator', { name: book.translator }) : null, book.publisher]
                .filter(Boolean).join(' · ') || book.creator
            : book.creator
          const chipTitle = kind === 'edition' && subtitle ? `${book.title} — ${subtitle}` : book.title
          return <BookShelfBookChip key={key} book={book} type="button"
            ref={key === selectedKey ? selectedRef : undefined} aria-pressed={key === selectedKey}
            aria-label={t(kind === 'work' ? 'sourceWorkSelect' : 'sourceEditionSelectAria', { title: chipTitle })}
            title={chipTitle}
            onClick={() => onSelect(key)} data-bookshelf-book={kind === 'work' ? key : undefined}
            data-bookshelf-edition-chip={kind === 'edition' ? key : undefined}
            className={`${styles.railBook} flex h-12 w-max max-w-[min(100%,28rem)] shrink-0 snap-start items-center border px-3 py-1 text-start outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent`}>
            <span className="min-w-0 flex-1"><span className={`${styles.bookTitle} block truncate text-sm font-semibold`}>{book.title}</span>
              {subtitle && <span className={`${styles.bookCreator} mt-0.5 block truncate text-xs`}>{subtitle}</span>}
            </span>
          </BookShelfBookChip>
        })}
      </div>
      <button type="button" onClick={onOpenList} aria-haspopup="dialog"
        aria-label={`${label}: ${t('bookShelfBookList')}`} title={t('bookShelfBookList')}
        data-bookshelf-open-list={kind === 'work' ? '' : undefined} data-bookshelf-edition-open={kind === 'edition' ? '' : undefined}
        className="flex h-11 w-8 shrink-0 items-center justify-center rounded text-text-tertiary outline-none hover:bg-accent/10 hover:text-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent">
        <Menu size={16} aria-hidden />
      </button>
    </div>
  )
}
