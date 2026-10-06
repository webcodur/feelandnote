'use client'

import { useState, useSyncExternalStore } from 'react'
import { ChevronLeft, ChevronRight, ListFilter } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Modal from '@/components/ui/Modal'
import { PROFESSION_ICONS, getProfessionColor } from '@/constants/professionIcons'
import { ATLAS_NAV_LAYOUT } from './myth/atlasNavigationData'

export interface DirectoryOption {
  value: string
  label: string
  href: string
  count?: number
}

function subscribeHash(callback: () => void) {
  window.addEventListener('hashchange', callback)
  return () => window.removeEventListener('hashchange', callback)
}
const readHash = () => {
  try { return decodeURI(window.location.hash) } catch { return '' }
}
const serverHash = () => ''
const focusClass = 'outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent'
const arrowClass = `grid min-h-12 place-items-center text-text-secondary hover:bg-white/10 hover:text-accent ${focusClass}`

export default function DirectoryNavigator({ kind, options, currentValue }: {
  kind: 'profession' | 'initial'
  options: DirectoryOption[]
  currentValue?: string
}) {
  const t = useTranslations('explore.directory')
  const ui = useTranslations('explore.ui')
  const [open, setOpen] = useState(false)
  const hash = useSyncExternalStore(subscribeHash, readHash, serverHash)
  const selected = kind === 'initial' ? options.find((option) => option.href === hash) : options.find((option) => option.value === currentValue)
  const current = selected ?? options[0]
  if (!current) return null
  const index = options.indexOf(current)
  const previous = options[(index - 1 + options.length) % options.length]
  const next = options[(index + 1) % options.length]
  const label = t(kind === 'profession' ? 'professionLabel' : 'initialLabel')
  const title = t(kind === 'profession' ? 'professionIndexTitle' : 'initialIndexTitle')
  const Icon = kind === 'profession' ? PROFESSION_ICONS[current.value] : null

  return <nav aria-label={title} className={ATLAS_NAV_LAYOUT.root} data-directory-navigation={kind}>
    <div className={ATLAS_NAV_LAYOUT.row}>
      <span className="hidden items-center justify-center ps-2 text-xs font-medium text-text-secondary md:flex">{label}</span>
      {options.length > 1 && <a href={previous.href} aria-label={`${ui('prev')} ${label}: ${previous.label}`} className={arrowClass}><ChevronLeft size={17} aria-hidden /></a>}
      {options.length < 2 && <span />}
      <button type="button" aria-haspopup="dialog" aria-label={t('chooseOption', { category: label, value: current.label })} onClick={() => setOpen(true)}
        className={`flex min-w-0 flex-wrap items-center justify-center gap-2 px-2 py-2.5 text-center text-sm font-semibold text-accent hover:bg-white/5 md:text-base ${focusClass}`}>
        {Icon && <Icon size={16} className={getProfessionColor(current.value)} aria-hidden />}
        <span className="break-words">{current.label}</span>
        {current.count !== undefined && <span className="text-xs font-normal text-text-secondary">{t('professionCount', { count: current.count })}</span>}
        <ListFilter size={14} aria-hidden className="shrink-0 text-text-secondary" />
      </button>
      {options.length > 1 && <a href={next.href} aria-label={`${ui('next')} ${label}: ${next.label}`} className={arrowClass}><ChevronRight size={17} aria-hidden /></a>}
      {options.length < 2 && <span />}
    </div>
    {open && <Modal isOpen onClose={() => setOpen(false)} title={title} titleClassName="text-center text-text-primary" size="lg" stickyHeader frame="plain" boxClassName="rounded-panel border border-white/20 bg-bg-main">
      <div className="flex flex-wrap justify-center gap-2 p-4 sm:p-5" data-directory-picker={kind}>
        {options.map((option) => {
          const active = option.value === current.value
          const OptionIcon = kind === 'profession' ? PROFESSION_ICONS[option.value] : null
          return <a key={option.value} href={option.href} aria-current={active ? (kind === 'profession' ? 'page' : 'location') : undefined} onClick={() => setOpen(false)}
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-control border px-3 py-2 text-sm ${focusClass} ${active ? 'border-accent/50 bg-accent/10 text-accent hover:bg-accent/20' : 'border-white/15 text-text-secondary hover:border-white/30 hover:bg-white/5 hover:text-accent'}`}>
            {OptionIcon && <OptionIcon size={15} className={getProfessionColor(option.value)} aria-hidden />}
            {option.label}
            {option.count !== undefined && <span className="text-xs text-text-tertiary">{option.count}</span>}
          </a>
        })}
      </div>
    </Modal>}
  </nav>
}
