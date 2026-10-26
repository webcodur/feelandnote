'use client'

import { useState } from 'react'
import ContentCover from '@/components/ui/ContentCover'
import HomeMediaSymbol from './HomeMediaSymbol'
import type { HomeGraphItem } from './types'

export default function HomeWorkCover({ item }: { item: Pick<HomeGraphItem, 'thumbnailUrl' | 'type'> }) {
  const [unavailableSource, setUnavailableSource] = useState<string | null>(null)
  return <ContentCover src={unavailableSource === item.thumbnailUrl ? null : item.thumbnailUrl} alt="" sizes="(min-width: 800px) 100px, 68px"
    className="object-contain" dissolve={false} fallback={<HomeMediaSymbol type={item.type} />}
    onLoad={event => {
      if (event.currentTarget.naturalWidth <= 1 || event.currentTarget.naturalHeight <= 1) setUnavailableSource(item.thumbnailUrl)
    }} />
}
