'use client'

import { ADMIN_NAME } from '@feelandnote/shared/constants/site-brand'

import { useEffect } from 'react'
import { useEpisode } from '@/features/book-recommend/lib/episode-context'
import { YouTubePanel } from '@/features/book-recommend/components/YouTubePanel'

export default function YouTubePage() {
  const { series, name, episode, post } = useEpisode()

  useEffect(() => {
    document.title = `${episode?.host?.nickname ?? name} YouTube — ${ADMIN_NAME}`
  }, [episode, name])

  return <YouTubePanel series={series} name={name} post={post} />
}
