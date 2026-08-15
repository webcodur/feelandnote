'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { EditLangSwitch, formatMmss, type EditLang } from '@feelandnote/shared/bo/editor'
import type { FactionEditTab } from '@/lib/faction-edit-route'

type Props = {
  editBase: string
  editLang: EditLang
  tab: FactionEditTab
  composeSub: 'shorts' | 'longform'
  showCards: boolean
  durationSec: number
  cutCount: number
  episodeActions: ReactNode
  onEditLangChange: (next: EditLang) => void
  onTabChange: (next: FactionEditTab) => void
}

const tabClass = (active: boolean) => `rounded-md px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${
  active ? 'bg-accent text-bg-main' : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
}`

export function FactionEditorHeader({
  editBase, editLang, tab, composeSub, showCards, durationSec, cutCount, episodeActions,
  onEditLangChange, onTabChange,
}: Props) {
  const editing = !showCards

  return (
    <header className="mb-2 border-y border-border bg-bg-main py-2">
      <div className="flex flex-wrap items-center gap-3">
        <Link href={editBase} className="shrink-0 rounded-md px-2 py-1.5 text-sm font-semibold text-text-secondary hover:bg-bg-hover hover:text-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
          ← 목록
        </Link>

        <EditLangSwitch value={editLang} onChange={onEditLangChange} />

        <nav className="flex items-center gap-1 rounded-lg border border-border bg-bg-card p-1" aria-label="편집 화면">
          <button type="button" aria-pressed={tab === 'info' && editing} onClick={() => onTabChange('info')} className={tabClass(tab === 'info' && editing)}>
            정비
          </button>
          <button type="button" aria-pressed={tab !== 'info' && editing} onClick={() => onTabChange(composeSub)} className={tabClass(tab !== 'info' && editing)}>
            편성
          </button>
        </nav>

        {tab !== 'info' && (
          <nav className="flex items-center gap-1 rounded-lg border border-border bg-bg-card p-1" aria-label="편성 종류">
            <button type="button" aria-pressed={tab === 'shorts' && editing} onClick={() => onTabChange('shorts')} className={tabClass(tab === 'shorts' && editing)}>
              쇼츠
            </button>
            <button type="button" aria-pressed={tab === 'longform' && editing} onClick={() => onTabChange('longform')} className={tabClass(tab === 'longform' && editing)}>
              롱폼
            </button>
          </nav>
        )}

        <div className="ml-auto flex flex-wrap items-center justify-end gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-3 py-1.5 text-sm">
            <span className="text-text-tertiary">재생시간</span>
            <strong className="font-mono text-text-primary">{formatMmss(durationSec)}</strong>
            <span className="h-4 w-px bg-border" />
            <span className="text-text-tertiary">컷</span>
            <strong className="font-mono text-text-primary">{cutCount}</strong>
          </div>
          {episodeActions}
        </div>
      </div>
    </header>
  )
}
