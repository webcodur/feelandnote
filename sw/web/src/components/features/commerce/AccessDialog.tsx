'use client'

import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'
import Modal, { ModalBody } from '@/components/ui/Modal'
import ContentImage from '@/components/ui/ContentImage'
import type { AccessType } from '@/lib/commerce/contentAccess'

export default function AccessDialog({ type, title, creator, thumbnail, onClose, children }: {
  type: AccessType | 'BOOK'; title?: string | null; creator?: string | null; thumbnail?: string | null; onClose: () => void; children: ReactNode
}) {
  const t = useTranslations('content.access')
  return <Modal isOpen onClose={onClose} title={t('open')} widthClassName="max-w-[440px]" frame="plain" stickyHeader escapeCapture animateHeightDuration={320}
    boxClassName="overflow-hidden rounded-lg border border-accent/25 bg-bg-card shadow-2xl [&_div.overflow-y-auto]:[overflow-anchor:none]"
    overlayClassName="bg-black/60 backdrop-blur-sm" titleClassName="font-medium text-accent" titleStyle={{ fontSize: '14px' }}
    closeButtonClassName="absolute end-1 top-1 z-40 flex size-11 items-center justify-center rounded-lg text-text-secondary hover:bg-bg-secondary hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
    <ModalBody className="space-y-4 break-keep p-5 sm:p-6">
      <div className="flex items-center gap-4">
        {thumbnail && <div className={`relative w-16 shrink-0 overflow-hidden rounded-sm border border-purchase-ink/20 bg-bg-main ${type === 'MUSIC' ? 'h-16' : 'h-24'}`}>
          <ContentImage src={thumbnail} alt="" sizes="64px" className="object-contain" loading="eager" dissolve={false} />
        </div>}
        <div className="min-w-0 flex-1 space-y-1.5 text-center">
          {title && <p className="break-words text-xl font-semibold leading-snug text-purchase-ink">{title}</p>}
          {creator && <p className="break-words text-sm leading-relaxed text-text-secondary">{creator}</p>}
        </div>
      </div>
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
