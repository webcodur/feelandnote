'use client'

import { useId, useMemo, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Search, X } from 'lucide-react'
import { FILMOGRAPHY_BATCH_SIZE, FILMOGRAPHY_ROLES, filterFilmography, type FilmographyFilters, type FilmographyWork } from '@/lib/celeb/filmography'
import FilmographyWorkCard from './FilmographyWorkCard'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
const INPUT = `min-h-11 rounded-md border border-line bg-bg-raised text-sm text-text-primary hover:border-accent/60 ${FOCUS}`
const DEFAULT_FILTERS: FilmographyFilters = { search: '', media: 'all', role: 'all', sort: 'popular' }

export default function FilmographyList({ works }: { works: FilmographyWork[] }) {
  const t = useTranslations('celebPage.filmography')
  const [filters, setFilters] = useState(DEFAULT_FILTERS)
  const [visibleCount, setVisibleCount] = useState(FILMOGRAPHY_BATCH_SIZE)
  const listId = useId()
  const filtered = useMemo(() => filterFilmography(works, filters), [works, filters])
  const shownCount = Math.min(visibleCount, filtered.length)
  const hasMore = shownCount < filtered.length
  const mediaWorks = works.filter(work => filters.media === 'all' || work.mediaType === filters.media)
  const roles = FILMOGRAPHY_ROLES.filter(role => mediaWorks.some(work => work.roles.includes(role)))
  const update = (change: Partial<FilmographyFilters>) => {
    setFilters(value => ({ ...value, ...change }))
    setVisibleCount(FILMOGRAPHY_BATCH_SIZE)
  }
  const chip = (active: boolean) => `min-h-11 rounded-md border px-3 py-2 text-sm font-medium ${FOCUS} ${active
    ? 'border-accent/60 bg-accent/10 text-accent' : 'border-line bg-bg-raised text-text-secondary hover:border-accent/60 hover:text-accent'}`

  return <div className="overflow-hidden rounded-xl border border-line bg-bg-card">
    <div className="space-y-4 border-b border-line bg-bg-raised/40 p-4 sm:p-5">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 sm:gap-3">
        <div className="relative min-w-0">
          <label htmlFor={`${listId}-search`} className="sr-only">{t('searchLabel')}</label>
          <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input id={`${listId}-search`} type="search" value={filters.search} placeholder={t('searchPlaceholder')}
            className={`${INPUT} w-full pl-9 pr-11 [&::-webkit-search-cancel-button]:appearance-none`} aria-controls={listId}
            onChange={event => update({ search: event.target.value })} />
          {filters.search && <button type="button" aria-label={t('clearSearch')} className={`absolute right-0 top-0 flex size-11 items-center justify-center rounded text-text-secondary hover:text-accent ${FOCUS}`}
            onClick={() => update({ search: '' })}><X size={16} aria-hidden /></button>}
        </div>
        <select aria-label={t('sortLabel')} value={filters.sort} className={`${INPUT} max-w-32 px-2 sm:px-3`} aria-controls={listId}
          onChange={event => update({ sort: event.target.value as FilmographyFilters['sort'] })}>
          <option value="popular">{t('sort.popular')}</option><option value="latest">{t('sort.latest')}</option>
        </select>
      </div>
      <div className="flex flex-wrap justify-center gap-3 sm:justify-between">
        <div role="group" aria-label={t('mediaFilter')} className="flex flex-wrap justify-center gap-2">
          {(['all', 'movie', 'tv'] as const).filter(media => media === 'all' || works.some(work => work.mediaType === media)).map(media =>
            <button key={media} type="button" aria-pressed={filters.media === media} className={chip(filters.media === media)} aria-controls={listId}
              onClick={() => update({ media, role: 'all' })}>
              {t(`media.${media}`)} <span className="ml-1 text-xs tabular-nums opacity-70">{media === 'all' ? works.length : works.filter(work => work.mediaType === media).length}</span>
            </button>)}
        </div>
        {roles.length > 1 && <>
        <select aria-label={t('roleFilter')} className={`${INPUT} w-full px-3 sm:hidden`} value={filters.role} aria-controls={listId}
          onChange={event => update({ role: event.target.value as FilmographyFilters['role'] })}>
          <option value="all">{t('allRoles')}</option>
          {roles.map(role => <option key={role} value={role}>{t(`roles.${role}`)}</option>)}
        </select>
        <div role="group" aria-label={t('roleFilter')} className="hidden flex-wrap justify-center gap-2 sm:flex">
          {(['all', ...roles] as const).map(role => <button key={role} type="button" aria-pressed={filters.role === role} className={chip(filters.role === role)}
            aria-controls={listId} onClick={() => update({ role })}>{role === 'all' ? t('allRoles') : t(`roles.${role}`)}</button>)}
        </div></>}
      </div>
      <p className="text-xs tabular-nums text-text-tertiary" aria-live="polite">{t('shownCount', { shown: shownCount, count: filtered.length })}</p>
    </div>
    <ul id={listId} aria-label={t('results')} className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3 lg:grid-cols-4">
      {filtered.slice(0, shownCount).map(work => <FilmographyWorkCard key={work.id} work={work} />)}
    </ul>
    {hasMore && <div className="border-t border-line bg-bg-raised/40 p-4 text-center">
      <button type="button" className={chip(false)} aria-controls={listId}
        onClick={() => setVisibleCount(count => count + FILMOGRAPHY_BATCH_SIZE)}>{t('loadMore')}</button>
    </div>}
    {filtered.length === 0 && <div className="space-y-4 py-8 text-center">
      <p className="text-sm text-text-secondary" role="status">{t('empty')}</p>
      <button type="button" className={chip(false)} onClick={() => update(DEFAULT_FILTERS)}>{t('reset')}</button>
    </div>}
  </div>
}
