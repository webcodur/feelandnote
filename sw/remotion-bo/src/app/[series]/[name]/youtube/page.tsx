'use client'

import { useEffect } from 'react'
import { useEpisode } from '@/lib/episode-context'
import { YouTubePanel } from '@/components/YouTubePanel'

export default function YouTubePage() {
  const { series, name, episode, post } = useEpisode()

  useEffect(() => {
    document.title = `${episode?.host?.nickname ?? name} YouTube — Remotion BO`
  }, [episode, name])

  return <YouTubePanel series={series} name={name} post={post} />
}
