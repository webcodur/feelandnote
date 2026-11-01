'use client'

import { useEffect, useRef } from 'react'
import { ArrowUpRight, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { CelebFactionBookGroup } from '@/actions/celebs/getCelebFactionBooks'
import { Link } from '@/i18n/navigation'
import { mythHref } from '@/components/features/user/explore/myth/mythHref'
import { isBookShelfAvailable } from '@/lib/books/bookShelf'
import styles from '@/components/shared/BookShelf/BookShelf.module.css'
import BookShelfControlHeading from '@/components/shared/BookShelf/BookShelfControlHeading'

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
  useEffect(() => {
    const select = selectRef.current
    if (!select || !CSS.supports('appearance', 'base-select')) return
    // 기본 선택값은 숨기고 꺾쇠만 남긴다. 선택 항목은 네이티브 목록에서 표시한다.
    let button = select.querySelector('button')
    if (!button) {
      button = document.createElement('button')
      button.type = 'button'
      button.tabIndex = -1
      button.append(document.createElement('selectedcontent'))
      select.prepend(button)
    }
    const selectedContent = button.querySelector('selectedcontent')
    const selectedOption = select.selectedOptions[0]
    if (selectedContent && selectedOption) {
      selectedContent.replaceChildren(...Array.from(selectedOption.childNodes, (node) => node.cloneNode(true)))
    }
  }, [groups])
  return (
    <div className={`${styles.affiliation} relative flex w-full items-stretch overflow-visible rounded-md border ${isActive ? 'border-accent/60 bg-accent/10 text-accent' : 'border-line-strong bg-white/[0.025] text-text-secondary'}`} data-bookshelf-affiliation data-active={isActive}>
        <button type="button" onClick={() => {
          if (isActive) selectRef.current?.showPicker()
          else onActivate()
        }} aria-pressed={isActive} aria-haspopup={isActive ? 'listbox' : undefined} data-bookshelf-activate-affiliation
          className={`${styles.controlHeight} flex min-w-0 flex-1 items-center rounded-md px-3 hover:bg-white/[0.06] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent active:bg-white/[0.1]`}>
          <BookShelfControlHeading label={selected.factionName} count={selectedBookCount} actions />
        </button>
        <span className={`${styles.controlAction} ${styles.controlDropdown} absolute top-0 inline-flex`}>
          <select ref={selectRef} value={selected.factionId} onChange={(event) => onSelect(event.target.value)} data-bookshelf-select-affiliation
            aria-label={t('groupAffiliation')}
            className={`${styles.sourceSelect} ${styles.controlAction} min-w-0 cursor-pointer appearance-none border-0 bg-transparent p-0 text-transparent outline-none hover:bg-white/[0.06] active:bg-white/[0.1] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent`}>
            {groups.map((group) => {
              const bookCount = new Set(group.books.filter(isBookShelfAvailable).map((book) => book.contentId)).size
              return <option key={group.factionId} value={group.factionId}
                aria-label={`${group.factionName} (${t('bookShelfCount', { count: bookCount })})`}
                className="bg-bg-secondary px-3 text-center text-text-primary">{`${group.factionName} (${bookCount})`}</option>
            })}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2" aria-hidden />
        </span>
        <Link href={selected.isMyth ? mythHref(selected.factionSlug) : `/explore/faction/${selected.factionSlug}`}
          aria-label={t('affiliationPageOpen', { name: selected.factionName })}
          title={t('affiliationPageOpen', { name: selected.factionName })}
          className={`${styles.controlAction} absolute right-0 top-0 inline-flex items-center justify-center rounded-e-md border-s border-line text-text-secondary hover:bg-white/[0.06] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent active:bg-white/[0.1]`}>
          <ArrowUpRight size={16} strokeWidth={2} aria-hidden />
        </Link>
    </div>
  )
}
