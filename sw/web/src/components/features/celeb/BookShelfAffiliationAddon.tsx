'use client'

import { ArrowUpRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import type { CelebFactionBookGroup } from '@/actions/celebs/getCelebFactionBooks'
import { Link } from '@/i18n/navigation'
import { mythHref } from '@/components/features/user/explore/myth/mythHref'
import styles from '@/components/shared/BookShelf/BookShelf.module.css'

/** 공통 책장에 소속 선택과 신화·세력 페이지 이동만 덧붙인다. */
export default function BookShelfAffiliationAddon({ groups, selected, onSelect }: {
  groups: CelebFactionBookGroup[]
  selected: CelebFactionBookGroup
  onSelect: (id: string) => void
}) {
  const t = useTranslations('celebPage')
  return (
    <div className={`${styles.affiliation} flex flex-wrap items-center justify-center gap-x-5 gap-y-2 px-3 py-2`} data-bookshelf-affiliation>
      <label className="flex min-w-0 flex-wrap items-center justify-center gap-2 text-sm text-text-secondary">
        <span>{t('groupAffiliation')}</span>
        <select value={selected.factionId} onChange={(event) => onSelect(event.target.value)} data-bookshelf-select-affiliation
          className="min-h-11 max-w-full rounded-lg border border-white/15 bg-bg-secondary px-3 text-sm font-semibold text-text-primary outline-none hover:border-accent hover:text-accent focus-visible:ring-2 focus-visible:ring-accent">
          {groups.map((group) => <option key={group.factionId} value={group.factionId}>{group.factionName}</option>)}
        </select>
      </label>
      <div className="flex min-w-0 justify-center">
        <Link href={selected.isMyth ? mythHref(selected.factionSlug) : `/explore/faction/${selected.factionSlug}`}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm text-text-secondary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          {t('affiliationPageOpen', { name: selected.factionName })}<ArrowUpRight size={14} aria-hidden />
        </Link>
      </div>
    </div>
  )
}
