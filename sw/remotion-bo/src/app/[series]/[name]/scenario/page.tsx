'use client'

import { useEffect } from 'react'
import { useEpisode } from '@/lib/episode-context'
import { ScenarioView } from '@/components/ScenarioView'

export default function ScenarioPage() {
  const { episode, name } = useEpisode()

  useEffect(() => {
    document.title = `${episode?.host?.nickname ?? name} 시나리오 — Remotion BO`
  }, [episode, name])

  if (!episode) return <div className="text-text-dim">로딩...</div>

  return <ScenarioView episode={episode} />
}
