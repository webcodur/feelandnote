'use client'

import type { CSSProperties } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { type AccessSource, type AccessSourceState } from '@/lib/commerce/contentAccess'
import { cn } from '@/lib/utils'
import { ACCESS_SERVICES } from './contentAccessStyles'
import AccessLinkCard from './AccessLinkCard'
import AppleAccessLink from './AppleAccessLink'
import AccessStatusRow from './AccessStatusRow'

export default function AccessServiceSlot({ source, state, onVisit }: { source: AccessSource; state: AccessSourceState; onVisit: (platform: string) => void }) {
  const t = useTranslations('content.access')
  const locale = useLocale()
  const name = source === 'watchProviders' ? t('watchProviders') : ACCESS_SERVICES[source].name
  const { data } = state
  const won = (price: number) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'KRW', maximumFractionDigits: 0 }).format(price)
  const hasLinks = Boolean(data?.links.length || data?.providers?.length)
  return <div data-access-source={source} data-access-state={state.status} className="space-y-2.5">
    {(state.status !== 'ready' || !hasLinks) && <AccessStatusRow name={name} loading={state.status === 'loading'} failed={state.status === 'error'}
      description={[t(state.status === 'loading' ? `phase.${state.phase}` : state.status === 'error' ? 'failedStore' : 'emptyStore'), state.status === 'loading' ? state.detail : ''].filter(Boolean).join(' · ')} />}
    {state.status === 'ready' && data?.links.map(link => {
      if (link.service === 'appleMusic' || link.service === 'appleTv') {
        return <AppleAccessLink key={link.url} service={link.service} href={link.url} onVisit={() => onVisit(link.service)} />
      }
      const service = ACCESS_SERVICES[link.service]
      const label = [service.name, link.edition ? t(`editionKinds.${link.edition}`) : ''].filter(Boolean).join(' · ')
      const price = link.free ? t('free') : link.price != null ? won(link.price) : ''
      return <AccessLinkCard key={link.url} name={label} href={link.url} onClick={() => onVisit(link.service)}
        style={{ '--access-color': service.color, '--access-end': service.end } as CSSProperties}
        inlineDetails={price || undefined}
        ariaLabel={[label, ...link.platforms, link.title, price, link.discountPercent ? `−${link.discountPercent}%` : ''].filter(Boolean).join(' · ')} />
    })}
    {!!data?.providers?.length && <dl className="grid grid-cols-2 overflow-hidden rounded-md border border-accent/25 bg-[linear-gradient(110deg,var(--color-bg-stone-light),var(--color-bg-card))]">
      {data.providers.map((provider, index, providers) => {
        const lone = index === providers.length - 1 && providers.length % 2 === 1
        const lastRow = index >= providers.length - (providers.length % 2 || 2)
        return <div key={provider.id} title={[provider.name, ...provider.kinds.map(kind => t(`watchKinds.${kind}`))].join(' · ')}
          className={cn('flex h-[46px] min-w-0 items-center justify-center border-accent/15 px-4', !lastRow && 'border-b', index % 2 === 0 && !lone && 'border-e', lone && 'col-span-2')}>
          <dt className="line-clamp-2 break-words text-center text-[13px] font-semibold leading-snug text-text-primary">{provider.name}</dt>
          <dd className="sr-only">{provider.kinds.map(kind => t(`watchKinds.${kind}`)).join(' · ')}</dd>
        </div>
      })}
    </dl>}
    {data?.watchUrl && <AccessLinkCard name={t('watchCta')} href={data.watchUrl} onClick={() => onVisit('tmdb')} style={{ '--access-color': '#587f75', '--access-end': '#897345' } as CSSProperties} />}
  </div>
}
