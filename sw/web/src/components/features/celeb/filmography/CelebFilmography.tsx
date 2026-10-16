'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { ArrowUpRight } from 'lucide-react'
import PendingBlock from '@/components/ui/pending/PendingBlock'
import RetryBlock from '@/components/ui/pending/RetryBlock'
import type { useCelebFilmography } from './useCelebFilmography'
import FilmographyList from './FilmographyList'

const FOCUS = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
const EXTERNAL = `inline-flex min-h-11 items-center gap-1.5 rounded px-2 text-sm text-text-secondary hover:text-accent ${FOCUS}`

export default function CelebFilmography({ data, loading, error, retry }: ReturnType<typeof useCelebFilmography>) {
  const t = useTranslations('celebPage.filmography')
  if (loading) return <PendingBlock variant="grid" count={4} cols="grid-cols-2 sm:grid-cols-4" aspect="aspect-[2/3]" message={t('loading')} />
  if (error) return <RetryBlock message={t('error')} onRetry={retry} />
  if (!data?.works.length) return null
  const works = data.works

  return <div className="space-y-6">
    <p className="text-center text-sm leading-relaxed text-text-secondary">{t('description')}</p>
    <FilmographyList works={works} />
    <div className="flex flex-wrap items-center justify-center gap-x-4 border-t border-line pt-3">
      <a href={`https://www.themoviedb.org/person/${data.personId}`} target="_blank" rel="noopener noreferrer" className={EXTERNAL}>
        <Image src="/images/logos/tmdb.svg" width={70} height={9} alt="TMDB" className="h-auto w-[70px]" />
        {t('tmdb')}<ArrowUpRight size={14} aria-hidden />
      </a>
      {data.imdbId && <a href={`https://www.imdb.com/name/${data.imdbId}/`} target="_blank" rel="noopener noreferrer" className={EXTERNAL}>
        {t('imdb')}<ArrowUpRight size={14} aria-hidden />
      </a>}
      <p className="w-full text-center text-[11px] leading-relaxed text-text-tertiary">{t('attribution')}</p>
    </div>
  </div>
}
