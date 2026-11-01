'use client'

import type { KeyboardEvent } from 'react'
import { useTranslations } from 'next-intl'
import type { BookShelfGroup } from './types'
import styles from './BookShelf.module.css'
import BookShelfTransition from './BookShelfTransition'
import BookShelfControlHeading from './BookShelfControlHeading'

interface Props {
  groups: BookShelfGroup[]
  selected?: BookShelfGroup
  activeKey: string
  choiceKey?: string
  isActive: boolean
  ariaLabel: string
  onSelect: (key: string) => void
  onChoice: (key: string) => void
}

/** 등장·집필·감상은 별도 선택 줄, 직군과 읽기 목적은 독립된 카드로 표시한다. */
export default function BookShelfPersonalControls({ groups, selected, activeKey, choiceKey, isActive, ariaLabel, onSelect, onChoice }: Props) {
  const t = useTranslations('celebPage')
  const count = (group: BookShelfGroup) => group.deferred && group.deferred.state !== 'ready'
    ? null : group.books.length
  const selectedCount = selected ? count(selected) : null
  const pending = !!selected?.deferred && selected.deferred.state !== 'ready'
  const relations = groups.filter((group) => group.key !== 'profession')
  const navigate = (event: KeyboardEvent<HTMLDivElement>) => {
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
    const index = buttons.indexOf(event.target as HTMLButtonElement)
    const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1, ArrowDown: 1, Home: -index, End: buttons.length - 1 - index }
    if (index < 0 || steps[event.key] === undefined) return
    event.preventDefault()
    const next = buttons[(index + steps[event.key] + buttons.length) % buttons.length]
    next?.focus()
    next?.click()
  }

  return (
    <div className="flex flex-col gap-3" data-bookshelf-personal-controls>
      {relations.length > 0 && <div role="radiogroup" aria-label={ariaLabel} data-bookshelf-relations
        className="grid grid-flow-col auto-cols-fr gap-2" onKeyDown={navigate}>
        {relations.map((group) => <button key={group.key} type="button" role="radio" data-bookshelf-relation={group.key}
          aria-checked={activeKey === group.key} data-selected={activeKey === group.key}
          disabled={group.books.length === 0 && !group.deferred} onClick={() => onSelect(group.key)}
          className={`${styles.purpose} ${styles.controlHeight} flex min-w-0 items-center justify-center gap-2 rounded-md border px-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-35`}>
          <span className={styles.controlLabel} data-bookshelf-control-label><BookShelfTransition inline changeKey={group.label}>{group.label}</BookShelfTransition></span>
          <span className={styles.controlCount} data-bookshelf-control-count><BookShelfTransition inline changeKey={count(group) ?? 'pending'}>{count(group) ?? '–'}</BookShelfTransition></span>
        </button>)}
      </div>}
      {selected && <div className={styles.personalCard} data-bookshelf-profession-controls data-active={isActive} aria-busy={pending}>
      <div className="flex min-w-0 items-stretch">
        <button type="button" onClick={() => onSelect(selected.key)} aria-pressed={isActive} data-bookshelf-activate-personal
          className={`${styles.personalTitle} ${styles.controlHeight} flex min-w-0 flex-1 items-center rounded-t-lg px-3 hover:bg-white/[0.06] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent active:bg-white/[0.1]`}>
          <BookShelfControlHeading label={t('bookShelfCategoryTitle', { category: selected.label })} count={selectedCount} />
        </button>
      </div>
      {selected.choices && <div role="radiogroup" aria-label={selected.label} data-bookshelf-subcontrols
        className="grid grid-cols-3 gap-2 border-t border-line px-3 py-3"
        onKeyDown={navigate}>
        {selected.choices.map((choice) => <button key={choice.key} type="button" role="radio"
          aria-checked={isActive && choice.key === choiceKey} data-selected={choice.key === choiceKey}
          disabled={choice.books.length === 0} onClick={() => onChoice(choice.key)}
          className={`${styles.purpose} flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 rounded-md border px-1 py-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-35`}>
          <span className={styles.controlLabel} data-bookshelf-control-label>{choice.label}</span>
          <span className={styles.controlCount} data-bookshelf-control-count><BookShelfTransition inline changeKey={pending ? 'pending' : choice.books.length} className="min-w-[2ch]">{pending ? '–' : choice.books.length}</BookShelfTransition></span>
        </button>)}
      </div>}
      </div>}
    </div>
  )
}
