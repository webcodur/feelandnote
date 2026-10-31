'use client'

import { useEffect, useRef } from 'react'
import { ArrowUpRight, BookOpen, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { CelebFactionBookGroup } from '@/actions/celebs/getCelebFactionBooks'
import { Link } from '@/i18n/navigation'
import { mythHref } from '@/components/features/user/explore/myth/mythHref'
import { isBookShelfAvailable } from '@/lib/books/bookShelf'
import styles from '@/components/shared/BookShelf/BookShelf.module.css'
import BookShelfTransition from '@/components/shared/BookShelf/BookShelfTransition'

/** 공통 책장에 소속 선택과 신화·세력 페이지 이동만 덧붙인다. */
export default function BookShelfAffiliationAddon({ groups, selected, onSelect, isActive, onActivate }: {
  groups: CelebFactionBookGroup[]
  selected: CelebFactionBookGroup
  onSelect: (id: string) => void
  isActive: boolean
  onActivate: () => void
}) {
  const t = useTranslations('celebPage')
  const selectedBookCount = new Set(selected.books.filter(isBookShelfAvailable).map((book) => book.contentId)).size
  const selectRef = useRef<HTMLSelectElement>(null)
  const iconRef = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const select = selectRef.current
    const icon = iconRef.current?.querySelector('svg')
    if (!select || !icon || !CSS.supports('appearance', 'base-select')) return
    // React 19는 option 안의 SVG를 허용하지 않아, 수화 뒤 네이티브 선택기를 보강한다.
    let button = select.querySelector('button')
    if (!button) {
      button = document.createElement('button')
      button.type = 'button'
      button.tabIndex = -1
      button.append(document.createElement('selectedcontent'))
      select.prepend(button)
    }
    for (const option of select.options) {
      const label = option.dataset.affiliationLabel ?? option.label
      const countStart = label.lastIndexOf(' (')
      const count = document.createElement('span')
      count.style.whiteSpace = 'nowrap'
      count.append(document.createTextNode(label.slice(countStart + 1, -1) + ' '), icon.cloneNode(true), document.createTextNode(')'))
      option.replaceChildren(document.createTextNode(`${label.slice(0, countStart)} `), count)
    }
    const selectedContent = button.querySelector('selectedcontent')
    const selectedOption = select.selectedOptions[0]
    if (selectedContent && selectedOption) {
      selectedContent.replaceChildren(...Array.from(selectedOption.childNodes, (node) => node.cloneNode(true)))
    }
  }, [groups])
  return (
    <div className={`flex w-full items-stretch overflow-visible rounded-md border text-[13px] ${isActive ? 'border-accent/60 bg-accent/10 text-accent' : 'border-line-strong bg-white/[0.025] text-text-secondary'}`} data-bookshelf-affiliation data-active={isActive}>
      <div className="flex min-w-0 flex-1 items-stretch">
        <button type="button" onClick={onActivate} aria-pressed={isActive} data-bookshelf-activate-affiliation
          className="flex h-9 min-w-0 flex-1 items-center justify-start gap-1.5 rounded-s-md px-3 font-semibold leading-5 hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent active:bg-accent/20 pointer-coarse:h-11">
          <BookShelfTransition inline changeKey={selected.factionName} className="truncate">{selected.factionName}</BookShelfTransition>
          <span className="ms-auto inline-flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums"><BookShelfTransition inline changeKey={selectedBookCount} className="min-w-[2ch] text-right">{selectedBookCount}</BookShelfTransition><BookOpen size={14} aria-hidden /></span>
        </button>
        <span className="relative inline-flex w-9 shrink-0 pointer-coarse:w-11">
          <select ref={selectRef} value={selected.factionId} onChange={(event) => onSelect(event.target.value)} data-bookshelf-select-affiliation
            aria-label={t('groupAffiliation')}
            className={`${styles.sourceSelect} h-9 w-9 min-w-0 cursor-pointer appearance-none border-0 bg-transparent p-0 text-transparent outline-none hover:bg-accent/10 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent pointer-coarse:h-11 pointer-coarse:w-11`}>
            {groups.map((group) => {
              const bookCount = new Set(group.books.filter(isBookShelfAvailable).map((book) => book.contentId)).size
              return <option key={group.factionId} value={group.factionId} data-affiliation-label={`${group.factionName} (${bookCount})`}
                aria-label={`${group.factionName} (${t('bookShelfCount', { count: bookCount })})`} className="bg-bg-secondary px-3 text-center text-text-primary">{`${group.factionName} (${bookCount})`}</option>
            })}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden />
          <span ref={iconRef} hidden aria-hidden><BookOpen size={14} aria-hidden /></span>
        </span>
      </div>
      <div className="flex shrink-0 justify-center">
        <Link href={selected.isMyth ? mythHref(selected.factionSlug) : `/explore/faction/${selected.factionSlug}`}
          aria-label={t('affiliationPageOpen', { name: selected.factionName })}
          title={t('affiliationPageOpen', { name: selected.factionName })}
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-e-md border-s border-line text-text-secondary hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent active:bg-accent/20 pointer-coarse:h-11 pointer-coarse:w-11">
          <ArrowUpRight size={17} strokeWidth={2} aria-hidden />
        </Link>
      </div>
    </div>
  )
}
