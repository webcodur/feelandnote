'use client'

import { useEffect, useRef } from 'react'
import { ArrowUpRight, BookOpen, ChevronDown } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { CelebFactionBookGroup } from '@/actions/celebs/getCelebFactionBooks'
import { Link } from '@/i18n/navigation'
import { mythHref } from '@/components/features/user/explore/myth/mythHref'
import { isBookShelfAvailable } from '@/lib/books/bookShelf'
import styles from '@/components/shared/BookShelf/BookShelf.module.css'

/** 공통 책장에 소속 선택과 신화·세력 페이지 이동만 덧붙인다. */
export default function BookShelfAffiliationAddon({ groups, selected, onSelect }: {
  groups: CelebFactionBookGroup[]
  selected: CelebFactionBookGroup
  onSelect: (id: string) => void
}) {
  const t = useTranslations('celebPage')
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
    <div className="flex w-full items-center justify-center gap-2" data-bookshelf-affiliation>
      <div className="min-w-0 flex-1 text-sm text-text-secondary">
        <span className="relative inline-flex w-full min-w-0">
          <select ref={selectRef} value={selected.factionId} onChange={(event) => onSelect(event.target.value)} data-bookshelf-select-affiliation
            aria-label={t('groupAffiliation')}
            className={`${styles.affiliationSelect} min-h-11 w-full min-w-0 appearance-none rounded-md border border-white/[0.18] bg-white/[0.04] pl-3 pr-8 text-center text-sm font-semibold leading-5 text-text-primary outline-none [text-align-last:center] hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent`}>
            {groups.map((group) => {
              const bookCount = new Set(group.books.filter(isBookShelfAvailable).map((book) => book.contentId)).size
              return <option key={group.factionId} value={group.factionId} data-affiliation-label={`${group.factionName} (${bookCount})`}
                aria-label={`${group.factionName} (${t('bookShelfCount', { count: bookCount })})`} className="pl-3 pr-8 text-center">{`${group.factionName} (${bookCount})`}</option>
            })}
          </select>
          <ChevronDown size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2" aria-hidden />
          <span ref={iconRef} hidden aria-hidden><BookOpen size={14} aria-hidden /></span>
        </span>
      </div>
      <div className="flex shrink-0 justify-center">
        <Link href={selected.isMyth ? mythHref(selected.factionSlug) : `/explore/faction/${selected.factionSlug}`}
          aria-label={t('affiliationPageOpen', { name: selected.factionName })}
          title={t('affiliationPageOpen', { name: selected.factionName })}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-control border border-line-strong bg-white/[0.03] text-accent hover:border-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:bg-accent/20">
          <ArrowUpRight size={22} strokeWidth={2.5} aria-hidden />
        </Link>
      </div>
    </div>
  )
}
