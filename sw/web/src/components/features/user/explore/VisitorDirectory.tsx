'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { getCountryNameByLocale } from '@/lib/countries'
import type { CelebDirectoryRow } from '@/actions/celebs/getCelebDirectory'

type LocalFigure = Pick<CelebDirectoryRow, 'slug' | 'nickname' | 'nickname_en' | 'title' | 'title_en'>

/** Load only the visitor's small local section; the full HTML index remains shared ISR. */
export default function VisitorDirectory({ profession }: { profession?: string }) {
  const locale = useLocale()
  const t = useTranslations('explore.directory')
  const [data, setData] = useState<{ country: string | null; figures: LocalFigure[] } | null>(null)
  useEffect(() => {
    let cancelled = false
    const query = new URLSearchParams({ directory: '1' })
    if (profession) query.set('profession', profession)
    void fetch(`/api/visitor-country?${query}`, { cache: 'no-store' })
      .then(async response => response.ok ? response.json() : null)
      .then(value => { if (!cancelled) setData(value) }).catch(() => {})
    return () => { cancelled = true }
  }, [profession])
  if (!data?.country || !data.figures.length) return null
  const country = getCountryNameByLocale(data.country, locale)
  const figures = [...data.figures].sort((a, b) =>
    (locale === 'en' ? a.nickname_en || a.nickname : a.nickname).localeCompare(locale === 'en' ? b.nickname_en || b.nickname : b.nickname, locale))
  const query = new URLSearchParams({ nationality: data.country, contentPresence: 'all', ...(profession ? { profession } : {}) })
  return (
    <section className="mb-8 rounded-lg border border-accent/20 p-4 sm:p-5" data-visitor-directory={data.country}>
      <h2 className="mb-3 text-lg font-semibold text-accent">{t('countryHeading', { country })}</h2>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-1 md:grid-cols-3">
        {figures.slice(0, 12).map(figure => <li key={figure.slug} className="min-w-0">
          <Link href={`/celeb/${figure.slug}`} prefetch={false}
            className="block break-words rounded py-2 text-sm hover:bg-accent/5 hover:text-accent outline-none focus-visible:ring-2 focus-visible:ring-accent">
            {locale === 'en' ? figure.nickname_en || figure.nickname : figure.nickname}
          </Link>
        </li>)}
      </ul>
      <Link href={`/explore?${query}`} prefetch={false}
        className="mt-3 inline-flex min-h-10 items-center rounded px-2 text-sm text-accent hover:bg-accent/10 outline-none focus-visible:ring-2 focus-visible:ring-accent">
        {t('viewCountry', { country })} →
      </Link>
    </section>
  )
}
