'use client'

import { useState } from 'react'
import { BookOpen } from 'lucide-react'
import { isBookShelfAvailable } from '@/lib/books/bookShelf'
import BookShelfSelection from './BookShelfSelection'
import LibraryCategoryPicker from '@/components/shared/LibraryCategoryPicker'
import { LIBRARY_CONTROL_LAYOUT as layout } from '@/components/shared/libraryControlLayout'
import type { BookShelfGroup } from './types'
import styles from './BookShelf.module.css'

interface Props {
  groups: BookShelfGroup[]
  ariaLabel: string
  title?: string
  id?: string
  className?: string
  controlsLayout?: 'default' | 'profession-page'
}

/** 개인·신화·팩션의 공통 책장. 분류는 칩으로 바꾸고 제목에서 선택 목록을 연다. */
export default function BookShelf({ groups, ariaLabel, title, id, className = '', controlsLayout = 'default' }: Props) {
  const pageControls = controlsLayout === 'profession-page'
  const normalized = groups.map((group) => ({ ...group,
    books: [...new Map(group.books.filter(isBookShelfAvailable).map((book) => [book.id, book])).values()],
    listGroups: group.listGroups?.map((item) => ({ ...item,
      books: [...new Map(item.books.filter(isBookShelfAvailable).map((book) => [book.id, book])).values()],
    })).filter((item) => item.books.length > 0),
    choices: group.choices?.map((choice) => ({ ...choice,
      books: [...new Map(choice.books.filter(isBookShelfAvailable).map((book) => [book.id, book])).values()],
    })),
  }))
  const available = normalized.filter((group) => group.books.length > 0)
  const [activeKey, setActiveKey] = useState(available[0]?.key)
  const [listOpen, setListOpen] = useState(false)
  const [titlePulseRequest, setTitlePulseRequest] = useState(0)
  const [choiceKeys, setChoiceKeys] = useState<Record<string, string>>({})
  const active = available.find((group) => group.key === activeKey) ?? available[0]
  if (!active) return null
  const choice = active.choices?.find((item) => item.key === choiceKeys[active.key] && item.books.length > 0)
    ?? active.choices?.find((item) => item.books.length > 0)
  const shownBooks = choice?.books ?? active.books
  const shownIntro = choice?.intro ?? active.intro
  const overview = choice?.overview ?? active.overview
  const groupPicker = <LibraryCategoryPicker
    className={pageControls ? layout.professionPagePicker : undefined}
    chipClassName={pageControls ? layout.professionChip : undefined}
    columns={active.context?.kind === 'profession' && normalized.length === 3 ? 3 : 2}
    options={normalized.map((group) => ({ key: group.key, label: group.chipLabel ?? group.label, count: group.chipLabel !== undefined ? undefined : group.books.length, disabled: group.books.length === 0 }))}
    value={active.key} ariaLabel={ariaLabel}
    onChange={(key) => { setActiveKey(key); if (!listOpen) setTitlePulseRequest((current) => current + 1) }} />
  const choicePicker = choice && <LibraryCategoryPicker className={layout.secondaryPicker}
      columns={active.context?.kind === 'profession' && active.choices?.length === 3 ? 3 : 2}
      options={active.choices!.map((item) => ({ key: item.key, label: item.label, count: item.books.length, disabled: item.books.length === 0 }))}
      value={choice.key} ariaLabel={active.label}
      onChange={(key) => { setChoiceKeys((current) => ({ ...current, [active.key]: key })); if (!listOpen) setTitlePulseRequest((current) => current + 1) }} />
  const categoryPicker = <div className="flex flex-col gap-2">{groupPicker}{choicePicker}</div>

  return (
    <div className="min-w-0" aria-label={ariaLabel} data-bookshelf>
      {title && <h3 className="flex items-center justify-center gap-2 px-4 py-4 text-center text-lg font-bold text-text-primary sm:px-6"><BookOpen size={17} aria-hidden />{title}</h3>}
      <div className={`mx-auto flex flex-col gap-2 ${pageControls ? layout.professionPageWidth : layout.width} ${layout.contentGap}`}>
        {groupPicker}
        {(choicePicker || active.addon) && <div className={layout.secondary} data-bookshelf-subcontrols>
          {choicePicker}{active.addon}
        </div>}
      </div>
      {active.context?.kind === 'profession' && (overview
        ? <section data-profession-overview className="mx-auto mb-6 max-w-2xl border-y border-accent/20 px-4 py-5 text-left sm:mb-8 sm:px-6 sm:py-6">
            <h3 className="mb-2 break-keep text-pretty text-base font-semibold leading-relaxed text-accent">{overview.title}</h3>
            <p className="break-keep text-pretty text-sm leading-7 text-text-secondary sm:text-[15px]">
              {overview.paragraphs.join(' ')}
            </p>
          </section>
        : <p className="mx-auto mb-5 max-w-2xl px-4 text-center text-sm leading-relaxed text-text-secondary">{shownIntro}</p>)}
      <section id={id} className={`${styles.shelf} min-w-0 ${className}`} aria-label={active.label}>
        <BookShelfSelection selectionKey={`${active.key}:${choice?.key ?? ''}:${active.selectionKey ?? ''}`} intro={`${active.label}: ${shownIntro}`} listSubtitle={choice ? `${active.label} · ${choice.label}: ${shownIntro}` : active.listSubtitle} books={shownBooks} context={active.context} pagination={active.pagination}
          listGroups={active.listGroups?.map((group) => ({ ...group, selectionKey: `${active.key}:${choice?.key ?? ''}:${group.key}` }))} onSelectListGroup={active.onSelectListGroup}
          listOpen={listOpen} onListOpenChange={setListOpen} categoryPicker={categoryPicker} titlePulseRequest={titlePulseRequest} />
      </section>
    </div>
  )
}
