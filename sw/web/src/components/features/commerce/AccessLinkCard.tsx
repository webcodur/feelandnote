'use client'

import type { CSSProperties, MouseEventHandler, ReactNode } from 'react'
import { ArrowUpRight } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { cn } from '@/lib/utils'
import { ACCESS_LABEL_STYLE, ACCESS_LINK_STYLE } from './contentAccessStyles'

export default function AccessLinkCard({ name, href, affiliation = 'ordinary', ariaLabel, style, className, onClick, inlineDetails }: {
  name: string; href: string; affiliation?: 'affiliate' | 'ordinary' | 'unknown'; ariaLabel?: string; style?: CSSProperties; className?: string; onClick?: MouseEventHandler<HTMLAnchorElement>; inlineDetails?: ReactNode
}) {
  const t = useTranslations('content.access')
  return <a href={href} target="_blank" rel={affiliation === 'affiliate' ? 'noopener noreferrer nofollow sponsored' : 'noopener noreferrer'}
    className={cn(ACCESS_LINK_STYLE, className)} style={style} onClick={onClick}
    title={ariaLabel ?? name}
    aria-label={[ariaLabel ?? name, t('newWindow')].join(' · ')}>
    <span className="relative flex h-6 min-w-0 items-center justify-center px-6 text-center">
      {inlineDetails && <span className="absolute start-0 hidden whitespace-nowrap text-[11px] tabular-nums @min-[320px]/access:block">{inlineDetails}</span>}
      <span className={cn('min-w-0 truncate text-sm font-semibold', inlineDetails && '@min-[320px]/access:max-w-[58%]', ACCESS_LABEL_STYLE)}>{name}</span>
      <ArrowUpRight size={15} className="pointer-events-none absolute end-0 top-1/2 -translate-y-1/2" aria-hidden />
    </span>
  </a>
}
