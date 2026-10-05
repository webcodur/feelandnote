'use client'

import { useEffect, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import AnimatedHeight from '@/components/ui/AnimatedHeight'
import { type AccessType, type ContentAccess } from '@/lib/commerce/contentAccess'
import { trackCommerceClick } from '@/lib/analytics/track'
import AccessDialog from './AccessDialog'
import { isDeveloperMode } from '@/lib/developer-mode'
import AccessServiceSlot from './AccessServiceSlot'
import { useContentAccess } from './useContentAccess'

export default function ContentAccessModal({ contentId, type, title, creator, thumbnail, placement, initialAccess, onClose }: {
  contentId: string; type: AccessType; title: string; creator?: string | null; thumbnail?: string | null; placement: string; initialAccess?: ContentAccess; onClose: () => void
}) {
  const t = useTranslations('content.access')
  const locale = useLocale()
  const { states, sources, retry } = useContentAccess(contentId, type, initialAccess)
  const hasProviderLookup = sources.includes('watchProviders')
  const watchRegion = states.watchProviders?.data?.region
  const regionName = watchRegion ? new Intl.DisplayNames([locale], { type: 'region' }).of(watchRegion) : undefined
  const loading = sources.some(source => states[source]?.status === 'loading')
  const failed = sources.some(source => states[source]?.status === 'error')
  const completed = sources.filter(source => states[source]?.status !== 'loading').length
  const currentPhase = sources.map(source => states[source]).find(state => state?.status === 'loading')?.phase
  const [slow, setSlow] = useState(false)
  useEffect(() => {
    if (!loading) return
    const timer = setTimeout(() => setSlow(true), 8000)
    return () => clearTimeout(timer)
  }, [loading])
  const track = (platform: string) => trackCommerceClick({ screen: placement, target: hasProviderLookup ? 'watch-providers' : 'product', contentId, platform, locale })
  const sourceStyle = 'rounded-sm underline decoration-border underline-offset-3 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'
  return <AccessDialog type={type} title={title} creator={creator} thumbnail={thumbnail} onClose={onClose}>
    <div className="space-y-2.5">
      <p role="status" className="text-xs text-text-secondary">{t(sources.length > 1 ? loading ? 'progress' : 'complete' : loading ? 'loading' : 'completeSingle', { done: completed, total: sources.length })}{type === 'GAME' && ` · ${t('regionKR')}`}{hasProviderLookup && regionName && ` · ${t('region', { country: regionName })}`}{currentPhase && ` · ${t(`phase.${currentPhase}`)}`}</p>
      {type === 'GAME' && locale === 'en' && <p className="text-xs leading-relaxed text-text-secondary">{t('gameRegionNotice')}</p>}
      {loading && slow && <p className="text-xs leading-relaxed text-accent">{t('slow')}</p>}
      {sources.map(source => <AnimatedHeight key={source} independent duration={320}>
        <AccessServiceSlot source={source} state={states[source] ?? { status: 'loading', phase: 'identity' }} onVisit={track} />
      </AnimatedHeight>)}
      {failed && !loading && <button type="button" onClick={() => { setSlow(false); retry() }} className="w-full rounded-md border border-accent/35 px-3 py-2 text-sm text-accent hover:border-accent hover:bg-accent/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">{t('retryFailed')}</button>}
    </div>
    {(type === 'GAME' || hasProviderLookup || (isDeveloperMode() && !initialAccess)) && (
      <div className="space-y-2 border-t border-border pt-4 text-xs leading-relaxed text-text-secondary">
        {isDeveloperMode() && !initialAccess && <p className="text-red-400">{t(`method.${type}`)}</p>}
        {type === 'GAME' && <a href="https://www.igdb.com/" target="_blank" rel="noopener noreferrer" className={sourceStyle}>{t('gameSource')}</a>}
        {hasProviderLookup && <p>{t('videoSource')} <a href="https://www.justwatch.com/" target="_blank" rel="noopener noreferrer" className={sourceStyle}>JustWatch</a> · <a href="https://www.themoviedb.org/" target="_blank" rel="noopener noreferrer" className={sourceStyle}>TMDB</a></p>}
      </div>
    )}
  </AccessDialog>
}
