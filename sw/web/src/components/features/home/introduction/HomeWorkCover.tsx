'use client'

import { useState } from 'react'
import ContentCover from '@/components/ui/ContentCover'
import HomeMediaSymbol from './HomeMediaSymbol'
import type { HomeGraphItem } from './types'
import styles from './HomeGraphReading.module.css'

export default function HomeWorkCover({ item }: { item: Pick<HomeGraphItem, 'thumbnailUrl' | 'type'> }) {
  const [unavailableSource, setUnavailableSource] = useState<string | null>(null)
  return <ContentCover src={unavailableSource === item.thumbnailUrl ? null : item.thumbnailUrl} alt="" sizes="(min-width: 860px) 144px, 104px"
    className="object-contain" fallback={<span className={styles.coverFallback} data-home-cover-fallback={item.type}><HomeMediaSymbol type={item.type} /></span>}
    onLoad={event => {
      if (event.currentTarget.naturalWidth <= 1 || event.currentTarget.naturalHeight <= 1) setUnavailableSource(item.thumbnailUrl)
    }} />
}
