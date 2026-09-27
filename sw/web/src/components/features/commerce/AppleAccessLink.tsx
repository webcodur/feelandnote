'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useLocale, useTranslations } from 'next-intl'
import { ACCESS_SERVICES } from './contentAccessStyles'

export default function AppleAccessLink({ service, href, onVisit }: {
  service: 'appleMusic' | 'appleTv'; href: string; onVisit: () => void
}) {
  const locale = useLocale()
  const t = useTranslations('content.access')
  const [failed, setFailed] = useState(false)
  const name = ACCESS_SERVICES[service].name
  const badge = service === 'appleMusic' ? 'listen-on-apple-music' : 'watch-on-apple-tv'
  return <div className="flex justify-center">
    <a href={href} target="_blank" rel="noopener noreferrer" onClick={onVisit}
      aria-label={`${name} · ${t('newWindow')}`}
      className="inline-flex min-h-11 max-w-full items-center justify-center rounded-md outline-none hover:ring-1 hover:ring-accent/60 focus-visible:ring-2 focus-visible:ring-accent">
      {!failed && <Image
        src={`https://toolbox.marketingtools.apple.com/api/badges/${badge}/badge/${locale === 'en' ? 'en-us' : 'ko-kr'}?size=250x83`}
        alt={name} width={160} height={53} unoptimized className="h-auto w-40 max-w-full"
        onError={() => setFailed(true)} />}
      {failed && <span className="rounded-md border border-border px-4 py-2 text-sm font-semibold text-text-primary">{name}</span>}
    </a>
  </div>
}
