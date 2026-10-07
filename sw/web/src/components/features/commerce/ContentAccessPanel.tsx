'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import { useLocale } from 'next-intl'
import { isAccessType, type ContentAccess } from '@/lib/commerce/contentAccess'
import { trackEvent } from '@/lib/analytics/track'
import PurchaseOpener from './PurchaseOpener'

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
      <PurchaseOpener type={type} expanded={isOpen}
        onOpen={() => {
          setOpenId(contentId)
          onOpenChange?.(true)
        }} />
      {isOpen && <ContentAccessModal key={contentId} contentId={contentId} type={type} title={title} creator={creator} thumbnail={thumbnail} placement={placement} initialAccess={initialAccess} onClose={close} />}
    </div>
  )
}
