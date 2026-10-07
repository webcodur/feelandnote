'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import Modal, { ModalBody } from '@/components/ui/Modal'
import ContentInfoHeader from '@/components/shared/content/ContentInfoHeader'
import type { AccessType } from '@/lib/commerce/contentAccess'

export default function AccessDialog({ type, title, creator, thumbnail, onClose, children }: {
  type: AccessType | 'BOOK'; title?: string | null; creator?: string | null; thumbnail?: string | null; onClose: () => void; children: ReactNode
}) {
  const t = useTranslations('content.access')
  return <Modal isOpen onClose={onClose} ariaLabel={title || t('open')} widthClassName="max-w-[440px]" frame="plain" escapeCapture animateHeightDuration={320}
    boxClassName="overflow-hidden rounded-lg border border-accent/25 bg-bg-card shadow-2xl [&_div.overflow-y-auto]:[overflow-anchor:none]"
    overlayClassName="bg-black/60 backdrop-blur-sm" titleClassName="font-medium text-accent" titleStyle={{ fontSize: '14px' }}
    closeButtonClassName="absolute end-1 top-1 z-40 flex size-11 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
    <ModalBody className="space-y-4 break-keep px-5 pb-5 pt-8 md:px-6 md:pb-6">
      <ContentInfoHeader type={type} title={title || t('open')} creator={creator} thumbnail={thumbnail} label={t('open')} compact />
      {children}
    </ModalBody>
  </Modal>
}

export function AccessDisclosure({ hasAffiliates, notices = [] }: { hasAffiliates: boolean; notices?: string[] }) {
  const t = useTranslations('content.access')
  if (!hasAffiliates) return null
  return <div className="space-y-1 text-center text-xs leading-relaxed text-text-secondary">
    {(notices.length ? notices : [t('affiliation.some')]).map(notice => <p key={notice}>{notice}</p>)}
  </div>
}
