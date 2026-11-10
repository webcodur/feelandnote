'use client'

import { useEffect, useEffectEvent, useId, useState } from 'react'
import { useTranslations } from 'next-intl'
import { BookOpen } from 'lucide-react'
import BookShelfSelection from './BookShelfSelection'
import BookShelfBookList from './BookShelfBookList'
import LibraryCategoryPicker from '@/components/shared/LibraryCategoryPicker'
import { LIBRARY_CONTROL_LAYOUT as layout } from '@/components/shared/libraryControlLayout'
import { availableShelfBooks, type BookShelfGroup } from './types'
import styles from './BookShelf.module.css'
import { RetryBlock } from '@/components/ui/pending'
import LibraryShelfUtilities from '@/components/shared/LibraryShelfUtilities'
import LibraryShelfLazyItem from '@/components/shared/LibraryShelfLazyItem'
import BookShelfPersonalControls from './BookShelfPersonalControls'
import AnimatedHeight from '@/components/ui/AnimatedHeight'
import BookShelfTransition from './BookShelfTransition'
import { BOOKSHELF_MOTION, BOOKSHELF_MOTION_STYLE } from './bookShelfMotion'

interface Props {
  groups: BookShelfGroup[]
  ariaLabel: string
  title?: string
  id?: string
  className?: string
  controlsLayout?: 'default' | 'profession-page' | 'personal'
  urlGroupParam?: string
  /** 바깥 선택기가 분류와 읽기 목적을 정한다. 이때 책장 자체 선택기는 숨기고 현재 분류의 보조 조작만 남긴다. */
  selection?: { groupKey: string; choiceKey?: string }
}

/** 개인·신화·팩션의 공통 책장. 선택한 분류의 도서를 같은 본문과 목록으로 보여준다. */
export default function BookShelf({ groups, ariaLabel, title, id, className = '', controlsLayout = 'default', urlGroupParam, selection }: Props) {
  const t = useTranslations('celebPage')
  const pendingIndexId = useId()
  const pageControls = controlsLayout === 'profession-page'
  const personalControls = controlsLayout === 'personal'
  const normalized = groups.map((group) => ({ ...group,
    books: availableShelfBooks(group.books),
    listGroups: group.listGroups?.map((item) => ({ ...item, books: availableShelfBooks(item.books) })).filter((item) => item.books.length > 0),
    choices: group.choices?.map((choice) => ({ ...choice, books: availableShelfBooks(choice.books) })),
  }))
  const available = normalized.filter((group) => group.books.length > 0 || group.deferred)
  const [activeKey, setActiveKey] = useState(available[0]?.key)
  const selectUrlGroup = useEffectEvent(() => {
    if (!urlGroupParam || selection) return
    const key = new URLSearchParams(window.location.search).get(urlGroupParam)
    if (key && groups.some(group => group.key === key)) setActiveKey(key)
  })
  useEffect(() => {
    if (!urlGroupParam) return
    const frame = requestAnimationFrame(() => selectUrlGroup())
    return () => cancelAnimationFrame(frame)
  }, [urlGroupParam])
  const [listOpen, setListOpen] = useState(false)
  const [showAllItems, setShowAllItems] = useState(false)
  const [titlePulseRequest, setTitlePulseRequest] = useState(0)
  const [choiceKeys, setChoiceKeys] = useState<Record<string, string>>({})
  const active = available.find((group) => group.key === (selection?.groupKey ?? activeKey)) ?? available[0]
  const pulseKey = selection && `${selection.groupKey}:${selection.choiceKey ?? ''}`
  const [shownPulseKey, setShownPulseKey] = useState(pulseKey)
  if (pulseKey !== shownPulseKey) {
    setShownPulseKey(pulseKey)
    if (!listOpen) setTitlePulseRequest((current) => current + 1)
  }
  const loadState = active?.deferred?.state
  const load = active?.deferred?.onLoad
  useEffect(() => { if (loadState === 'idle') load?.() }, [loadState, load])
  if (!active) return null
  const choice = active.choices?.find((item) => item.key === (selection ? selection.choiceKey : choiceKeys[active.key]) && item.books.length > 0)
    ?? active.choices?.find((item) => item.books.length > 0)
  const shownBooks = choice?.books ?? active.books
  const shownIntro = choice?.intro ?? active.intro
  const overview = choice?.overview ?? active.overview
  const selectGroup = (key: string) => {
    setActiveKey(key)
    if (!listOpen) setTitlePulseRequest((current) => current + 1)
  }
  const chipGroups = normalized.filter((group) => !group.control)
  const personalGroup = chipGroups.find((group) => group.key === 'profession' && (group.books.length > 0 || group.deferred))
  const personalChoice = personalGroup?.choices?.find((item) => item.key === choiceKeys[personalGroup.key] && item.books.length > 0)
    ?? personalGroup?.choices?.find((item) => item.books.length > 0)
  const groupPicker = <LibraryCategoryPicker
    className={pageControls ? layout.professionPagePicker : undefined}
    chipClassName={pageControls ? layout.professionChip : undefined}
    columns={active.context?.kind === 'profession' && normalized.length === 3 ? 3 : 2}
    options={chipGroups.map((group) => ({ key: group.key, label: group.chipLabel ?? group.label,
      count: group.chipLabel !== undefined || (group.deferred && group.deferred.state !== 'ready') ? undefined : group.books.length,
      disabled: group.books.length === 0 && !group.deferred }))}
    value={active.key} ariaLabel={ariaLabel}
    onChange={selectGroup} />
  const groupControls = available.filter((group) => group.control).map((group) => (
    <div key={group.key} className={personalControls ? 'w-full' : layout.secondary} data-bookshelf-group-control={group.key}>
      {group.control!({ isActive: active.key === group.key, onActivate: () => selectGroup(group.key) })}
    </div>
  ))
  const choicePicker = choice && <LibraryCategoryPicker className={layout.secondaryPicker}
      columns={active.context?.kind === 'profession' && active.choices?.length === 3 ? 3 : 2}
      options={active.choices!.map((item) => ({ key: item.key, label: item.label, count: item.books.length, disabled: item.books.length === 0 }))}
      value={choice.key} ariaLabel={active.label}
      onChange={(key) => { setChoiceKeys((current) => ({ ...current, [active.key]: key })); if (!listOpen) setTitlePulseRequest((current) => current + 1) }} />
  const personalPicker = <BookShelfPersonalControls groups={chipGroups} selected={personalGroup} activeKey={active.key}
    isActive={active.key === personalGroup?.key} choiceKey={personalChoice?.key} ariaLabel={ariaLabel} onSelect={selectGroup}
    onChoice={(key) => {
      if (!personalGroup) return
      setChoiceKeys((current) => ({ ...current, [personalGroup.key]: key }))
      selectGroup(personalGroup.key)
    }} />
  const activeControl = selection && active.control && <div className="w-full" data-bookshelf-group-control={active.key}>
    {active.control({ isActive: true, onActivate: () => {} })}
  </div>
  const categoryPicker = selection ? activeControl || undefined
    : <div className="flex flex-col gap-3" style={BOOKSHELF_MOTION_STYLE}>{groupControls}{personalControls ? personalPicker : <>{groupPicker}{choicePicker}</>}</div>
  const pending = loadState === 'failed' ? <RetryBlock onRetry={load} />
    : loadState && loadState !== 'ready' ? <div role="status" aria-busy="true" data-bookshelf-loading
        className="flex min-h-12 items-center justify-center gap-2 px-4 py-3 text-center text-xs text-text-tertiary">
        <span aria-hidden className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-current motion-reduce:animate-none" />
        {t('loading.books')}
      </div> : null

  return (
    <div className="min-w-0 [overflow-anchor:none]" style={BOOKSHELF_MOTION_STYLE} aria-label={ariaLabel} data-bookshelf>
      {title && <h3 className="flex items-center justify-center gap-2 px-4 py-4 text-center text-lg font-bold text-text-primary sm:px-6"><BookOpen size={17} aria-hidden />{title}</h3>}
      {selection ? activeControl && <div className={`mx-auto w-full max-w-[26rem] px-4 sm:px-0 ${layout.contentGap}`}>{activeControl}</div>
      : <AnimatedHeight duration={BOOKSHELF_MOTION.duration} className={`mx-auto ${personalControls ? 'w-full max-w-[26rem] px-4 sm:px-0' : pageControls ? layout.professionPageWidth : layout.width} ${layout.contentGap}`}>
      <div className={`flex flex-col ${personalControls ? 'gap-3' : 'gap-2'}`}>
        {groupControls}
        {personalControls ? personalPicker : <>{groupPicker}
        {choicePicker && <div className={layout.secondary} data-bookshelf-subcontrols>
          {choicePicker}
        </div>}</>}
      </div>
      </AnimatedHeight>}
      {active.context?.kind === 'profession' && <BookShelfTransition changeKey={overview?.title ?? shownIntro}>{overview
        ? <section data-profession-overview className="mx-auto mb-6 max-w-2xl border-y border-accent/20 px-4 py-5 text-left sm:mb-8 sm:px-6 sm:py-6">
            <h3 className="mb-2 break-keep text-pretty text-base font-semibold leading-relaxed text-accent">{overview.title}</h3>
            <p className="break-keep text-pretty text-sm leading-7 text-text-secondary sm:text-[15px]">
              {overview.paragraphs.join(' ')}
            </p>
          </section>
        : <p className="mx-auto mb-5 max-w-2xl px-4 text-center text-sm leading-relaxed text-text-secondary">{shownIntro}</p>}</BookShelfTransition>}
      <section id={id} className={`${styles.shelf} min-w-0 ${className}`} aria-label={active.label}>
        <LibraryShelfUtilities showAllItems={showAllItems}
          onAllItemsChange={(value) => { setShowAllItems(value); setListOpen(false) }} />
        {pending || shownBooks.length === 0 ? <>
          {pending ?? <p className="py-8 text-center text-sm text-text-secondary">{t('bookShelfSearchEmpty')}</p>}
          {listOpen && <BookShelfBookList selectionKey={active.key} title={t('bookShelfBookList')} subtitle={active.intro} books={[]}
            selectedId="" onSelect={() => {}} onClose={() => setListOpen(false)} categoryPicker={categoryPicker} indexId={pendingIndexId} pending={pending} />}
          </>
          : <>
          <div hidden={showAllItems}>
            <BookShelfSelection selectionKey={`${active.key}:${choice?.key ?? ''}:${active.selectionKey ?? ''}`} intro={`${active.label}: ${shownIntro}`} listSubtitle={choice ? `${active.label} · ${choice.label}: ${shownIntro}` : active.listSubtitle} books={shownBooks} context={active.context} pagination={active.pagination} isActive={!showAllItems}
              listGroups={active.listGroups?.map((group) => ({ ...group, selectionKey: `${active.key}:${choice?.key ?? ''}:${group.key}` }))} onSelectListGroup={active.onSelectListGroup}
              listOpen={listOpen} onListOpenChange={setListOpen} categoryPicker={categoryPicker} titlePulseRequest={titlePulseRequest} />
          </div>
          {showAllItems && <div data-shelf-all-items className="space-y-6 [overflow-anchor:none]">
            {shownBooks.map((book, index) => <LibraryShelfLazyItem key={`${active.key}:${choice?.key ?? ''}:${active.selectionKey ?? ''}:${book.id}`} title={book.title}>
              <BookShelfSelection selectionKey={book.id} intro={shownIntro ?? ''} books={[book]} context={active.context}
                listOpen={false} onListOpenChange={setListOpen} showNavigation={false} allItemsPosition={{ index, total: shownBooks.length }} />
            </LibraryShelfLazyItem>)}
            {active.pagination?.failed ? <RetryBlock onRetry={active.pagination.onLoadMore} /> : active.pagination?.hasMore && (
              <button type="button" disabled={active.pagination.loading} aria-busy={active.pagination.loading} onClick={active.pagination.onLoadMore}
                className="min-h-11 w-full rounded-control border border-white/15 px-3 py-2 text-sm text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-wait disabled:opacity-50">
                {t('bookShelfLoadMore')}
              </button>
            )}
          </div>}
          </>}
      </section>
    </div>
  )
}
