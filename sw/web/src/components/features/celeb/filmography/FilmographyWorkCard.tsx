'use client'

import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { Film } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import type { FilmographyWork } from '@/lib/celeb/filmography'

export default function FilmographyWorkCard({ work, className = '' }: { work: FilmographyWork; className?: string }) {
  const t = useTranslations('celebPage.filmography')
  const credits = work.jobs.length
    ? [...(work.roles.includes('acting') ? [t('roles.acting')] : []),
      ...new Set(work.jobs.map(job => t.has(`jobs.${job}`) ? t(`jobs.${job}`) : job))]
    : work.roles.map(role => t(`roles.${role}`))
  return <li className={`min-w-0 bg-bg-card ${className}`}>
    <Link href={`/content/${work.id}?category=video`} prefetch={false}
      className="group flex h-full flex-col gap-2.5 p-3 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent sm:p-4">
      <div className="relative aspect-[2/3] w-full shrink-0 overflow-hidden rounded-md border border-line bg-bg-raised group-hover:border-accent/70">
        {work.poster ? <Image src={work.poster} alt="" fill sizes="(max-width: 767px) 42vw, 240px" className="object-cover" />
          : <div className="flex h-full items-center justify-center text-text-tertiary"><Film size={36} aria-hidden /></div>}
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-xs tabular-nums text-text-tertiary">{t(`media.${work.mediaType}`)} · {work.year ?? t('undated')}</p>
        <h3 className="line-clamp-2 break-words text-sm font-semibold leading-snug text-text-primary [word-break:normal] group-hover:text-accent md:text-base" title={work.title}>{work.title}</h3>
        <p className="mt-1 line-clamp-3 break-words text-xs leading-relaxed text-text-secondary [word-break:normal]"
          title={[credits.join(' · '), ...work.characters].join(' · ')}>
          {credits.join(' · ')}
          {work.characters.length > 0 && <span className="text-text-tertiary"> · {t('character', { name: work.characters.join(' / ') })}</span>}
        </p>
      </div>
    </Link>
  </li>
}
