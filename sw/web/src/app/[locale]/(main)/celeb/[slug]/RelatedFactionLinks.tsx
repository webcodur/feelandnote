import Image from 'next/image'
import { ArrowUpRight, Users } from 'lucide-react'
import { getLocale, getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { mythHref } from '@/components/features/user/explore/myth/mythHref'
import { getFactionPreviewData } from '@/lib/celeb/factionPreviewData'
import { selectFactionPreview } from '@/lib/celeb/factionPreview'
import RetryBlock from '@/components/ui/pending/RetryBlock'
import type { FactionItem } from '@/actions/user/getCelebBySlug'

interface Props {
  memberships: FactionItem[]
  personId: string
  waitFor?: Promise<unknown>
}

export default async function RelatedFactionLinks({ memberships, personId, waitFor }: Props) {
  await waitFor
  const [locale, t, covers] = await Promise.all([
    getLocale(), getTranslations('celebPage'),
    getFactionPreviewData([...new Set(memberships.map(row => row.id))].sort()).catch((error: unknown) => {
      console.error('[RelatedFactionLinks] 세력 미리보기 조회 실패:', error)
      return null
    }),
  ])
  if (!covers) return <RetryBlock />
  const previewById = new Map(covers.map(row => [row.id, row]))
  const factions = memberships.filter(row => previewById.has(row.id))
  if (!factions.length) return null

  return <div className="mx-auto w-full max-w-5xl" data-related-factions>
    <p className="mb-5 text-center text-sm leading-relaxed text-text-secondary md:mb-6">{t('relatedFactionsIntro')}</p>
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
    {factions.map((faction, index) => {
      const name = locale === 'en' ? faction.name_en?.trim() || faction.name : faction.name
      const data = previewById.get(faction.id)!
      const preview = selectFactionPreview(data.members, personId, locale)
      const cover = data.cover
      return <Link key={faction.id} href={faction.isMyth ? mythHref(faction.slug) : `/explore/faction/${faction.slug}`} prefetch={false}
        aria-label={t('relatedFactionOpen', { name })}
        className="group relative isolate block aspect-[3/2] w-full min-w-0 overflow-hidden rounded-card border border-line bg-bg-secondary hover:border-accent/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        <div className="absolute inset-0 -z-10 overflow-hidden" aria-hidden>
          {cover && <Image src={cover} alt="" fill unoptimized sizes="(max-width: 639px) 100vw, (max-width: 767px) 50vw, 33vw" className="object-cover transition-transform duration-700 group-hover:scale-[1.04] motion-reduce:transition-none motion-reduce:transform-none" />}
          {!cover && <div className="flex h-full items-center justify-center bg-bg-stone-light text-text-tertiary"><Users size={48} /></div>}
          <div className="absolute inset-0 bg-linear-to-l from-bg-main/90 via-bg-main/40 via-45% to-transparent to-85%" />
          <div className="absolute inset-0 bg-linear-to-t from-bg-main/70 via-transparent via-50% to-transparent" />
        </div>
        <div className="absolute inset-x-4 top-4 flex items-center justify-between gap-3 text-text-primary" aria-hidden>
          <span className="rounded-control bg-bg-main/45 px-2 py-1 font-mono text-[11px] tracking-widest">{String(index + 1).padStart(2, '0')}</span>
          <ArrowUpRight size={20} className="group-hover:text-accent" />
        </div>
        <div className="absolute bottom-4 end-4 w-[75%] min-w-0 text-end">
          <span className="ms-auto mb-2 block h-px w-7 bg-accent/70" aria-hidden />
          <h3 className="line-clamp-2 text-balance font-serif text-[22px] font-semibold leading-tight text-text-primary group-hover:text-accent">{name}</h3>
          {preview && <div className="mt-2" data-faction-preview={preview.kind}>
            <p className="line-clamp-2 text-[13px] leading-[18px] text-text-secondary" title={preview.names.join(' · ')}>{preview.names.join(' · ')}</p>
            {preview.remaining > 0 && <p className="mt-0.5 text-[11px] leading-4 text-text-secondary">{t(preview.kind === 'people' ? 'relatedFactionMorePeople' : 'relatedFactionMoreGroups', { count: preview.remaining })}</p>}
          </div>}
        </div>
      </Link>
    })}
    </div>
  </div>
}
