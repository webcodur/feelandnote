'use client'

import type { KeyboardEvent } from 'react'
import type { LucideIcon } from 'lucide-react'
import styles from './ShelfCategoryTabs.module.css'

export interface ShelfCategoryOption {
  key: string
  label: string
  /** 좁은 폭에서는 이름 대신 이 아이콘을 보여준다. 넓은 폭에서는 이름을 글자로 쓴다. */
  icon?: LucideIcon
  /** null은 아직 세지 않은 분류다. 0으로 표시하지 않는다. */
  count?: number | null
  disabled?: boolean
  description?: string
}

export interface ShelfCategoryRow {
  key: string
  label: string
  icon?: LucideIcon
  options: ShelfCategoryOption[]
}

interface Props {
  rows: ShelfCategoryRow[]
  value: string
  onChange: (key: string) => void
  panelId?: string
  /** 선택한 분류 아래에 붙는 하위 선택 줄(직군의 훈련·수업·탐구, 주제의 주제 이름). */
  choices?: { label: string; options: ShelfCategoryOption[]; value?: string; onChange: (key: string) => void }
}

function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
  const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'))
  const index = buttons.indexOf(event.target as HTMLButtonElement)
  const steps: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -1, ArrowDown: 1, Home: -index, End: buttons.length - 1 - index }
  if (index < 0 || steps[event.key] === undefined) return
  event.preventDefault()
  const next = buttons[(index + steps[event.key] + buttons.length) % buttons.length]
  next?.focus({ preventScroll: true })
  next?.click()
}

function Option({ option, selected, panelId, onSelect }: { option: ShelfCategoryOption; selected: boolean; panelId?: string; onSelect: () => void }) {
  const Icon = option.icon
  const name = option.description ?? option.label
  return <button type="button" role="tab" className={styles.option} data-shelf-category={option.key}
    id={panelId ? `${panelId}-tab-${option.key}` : undefined} aria-controls={panelId}
    aria-selected={selected} tabIndex={selected ? 0 : -1} disabled={option.disabled}
    aria-label={Icon || option.description ? name : undefined} title={Icon || option.description ? name : undefined} onClick={onSelect}>
    {Icon && <Icon size={18} strokeWidth={1.75} aria-hidden className={styles.icon} />}
    <span className={styles.label}>{option.label}</span>
    {option.count !== undefined && <span className={styles.count}>{option.count ?? '–'}</span>}
  </button>
}

/** 인물의 책장 분류를 「직접 감상」과 「인물 탐색」 두 줄로 한 번에 보여준다. */
export default function ShelfCategoryTabs({ rows, value, onChange, panelId, choices }: Props) {
  return <div className={styles.root} data-shelf-category-tabs>
    <div className={styles.rows} onKeyDown={moveFocus}>
      {rows.map(row => <div key={row.key} className={styles.row} data-shelf-category-row={row.key}>
        {row.icon && <span className={styles.rowIcon} title={row.label} aria-hidden><row.icon size={18} strokeWidth={1.75} /></span>}
        <span className={styles.rowLabel} aria-hidden>{row.label}</span>
        <div role="tablist" aria-label={row.label} className={styles.options}>
          {row.options.map(option => <Option key={option.key} option={option} selected={option.key === value}
            panelId={panelId} onSelect={() => onChange(option.key)} />)}
        </div>
      </div>)}
    </div>
    {choices && <div role="tablist" aria-label={choices.label} className={styles.choices} data-shelf-category-choices onKeyDown={moveFocus}>
      {choices.options.map(option => <Option key={option.key} option={option} selected={option.key === choices.value}
        onSelect={() => choices.onChange(option.key)} />)}
    </div>}
  </div>
}
