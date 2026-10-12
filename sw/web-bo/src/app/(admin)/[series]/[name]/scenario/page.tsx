'use client'

import { ADMIN_NAME } from '@feelandnote/shared/constants/site-brand'

import { useEffect } from 'react'
import { useEpisode } from '@/features/book-recommend/lib/episode-context'
import { ScenarioView } from '@/features/book-recommend/components/ScenarioView'

export default function ScenarioPage() {
  const { episode, name } = useEpisode()

  useEffect(() => {
    document.title = `${episode?.host?.nickname ?? name} 시나리오 — ${ADMIN_NAME}`
  }, [episode, name])

  if (!episode) return <div className="text-text-dim">로딩...</div>

  return <ScenarioView episode={episode} />
}
