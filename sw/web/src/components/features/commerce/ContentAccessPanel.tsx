'use client'

import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import dynamic from 'next/dynamic'
import { useLocale, useTranslations } from 'next-intl'
import { isAccessType, type ContentAccess } from '@/lib/commerce/contentAccess'
import { trackEvent } from '@/lib/analytics/track'
import { BOOK_PURCHASE_LABEL_STYLE, BOOK_PURCHASE_OPENER_STYLE } from '@/constants/affiliatePlatforms'
import { ACCESS_OPENER_SPECTRUM } from './contentAccessStyles'

const ContentAccessModal = dynamic(() => import('./ContentAccessModal'), { ssr: false })

export interface ContentAccessPanelProps {
  contentId: string
  type: string
  title: string
  creator?: string | null
  thumbnail?: string | null
  placement: string
  enabled?: boolean
  compact?: boolean
  initialAccess?: ContentAccess
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export default function ContentAccessPanel({ contentId, type, title, creator, thumbnail, placement, enabled = true, compact = false, initialAccess, open, onOpenChange }: ContentAccessPanelProps) {
  const t = useTranslations('content.access')
  const locale = useLocale()
  const [openId, setOpenId] = useState<string | null>(null)
  const close = useCallback(() => { setOpenId(null); onOpenChange?.(false) }, [onOpenChange])
  const isOpen = enabled && isAccessType(type) && (open ?? openId === contentId)
  const tracked = useRef(false)
  useEffect(() => {
    if (isOpen && !tracked.current) trackEvent('commerce_open', { screen: placement, content_id: contentId, content_type: type, locale })
    tracked.current = isOpen
  }, [isOpen, contentId, type, placement, locale])
  if (!enabled || !isAccessType(type)) return null
  return (
    <div data-content-access={contentId} className={compact ? 'min-w-0' : 'px-3 py-3 sm:px-4'}>
      <button type="button" aria-haspopup="dialog" aria-expanded={isOpen}
        style={{ '--purchase-spectrum': ACCESS_OPENER_SPECTRUM[type] } as CSSProperties}
        onClick={event => {
          event.preventDefault()
          event.stopPropagation()
          setOpenId(contentId)
          onOpenChange?.(true)
        }}
        className={`group/purchase flex h-11 w-full cursor-pointer items-center justify-center overflow-hidden rounded-md border px-2 text-center text-[13px] font-semibold [--purchase-label-scale:1.04] focus-visible:outline-none focus-visible:ring-2 sm:text-sm ${BOOK_PURCHASE_OPENER_STYLE}`}>
        <span className={`min-w-0 truncate whitespace-nowrap ${BOOK_PURCHASE_LABEL_STYLE}`}>{t('open')}</span>
      </button>
      {isOpen && <ContentAccessModal key={contentId} contentId={contentId} type={type} title={title} creator={creator} thumbnail={thumbnail} placement={placement} initialAccess={initialAccess} onClose={close} />}
    </div>
  )
}
