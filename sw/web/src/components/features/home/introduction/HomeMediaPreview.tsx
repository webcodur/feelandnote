'use client'

import { useState } from 'react'
import { CirclePlay } from 'lucide-react'
import { useTranslations } from 'next-intl'
import Modal from '@/components/ui/Modal'
import MediaEmbed from '@/components/features/content/MediaEmbed'
import type { HomeGraphItem } from './types'
import styles from './HomeGraphReading.module.css'

export default function HomeMediaPreview({ item }: { item: HomeGraphItem }) {
  const t = useTranslations('home.landing.graph')
  const [open, setOpen] = useState(false)
  const label = t('mediaPreview', { type: t(`branches.${item.type}.title`) })
  return <>
    <button type="button" className={styles.mediaToggle} data-media-toggle aria-haspopup="dialog" aria-expanded={open}
      aria-label={label} title={label} onClick={() => setOpen(true)}>
      <CirclePlay size={18} aria-hidden />
    </button>
    {open && <Modal isOpen onClose={() => setOpen(false)} title={`${item.title} · ${label}`} stickyHeader size="full"
      frame="plain" boxClassName="rounded-panel border border-line-strong bg-bg-card" animateHeight={false}>
      <div className={styles.mediaContent} data-home-work-media={item.type}>
        <MediaEmbed contentId={item.id} type={item.type} title={item.title} showImages emptyMessage={t('mediaUnavailable')} />
      </div>
    </Modal>}
  </>
}
