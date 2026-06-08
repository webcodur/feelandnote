'use client'

import { useEpisodeEditor } from './useEpisodeEditor'
import { HostSection } from './sections/HostSection'
import { NarratorSection } from './sections/NarratorSection'
import { BooksSection } from './sections/BooksSection'
import { ShortsSection } from './sections/ShortsSection'
import type { EpisodeData } from './types'
import { UiLabel } from '@/components/ui-label'

export function EpisodeEditor({ episode: rawEpisode, onChange }: { episode: EpisodeData; onChange: (ep: EpisodeData) => void }) {
  const ctx = useEpisodeEditor(rawEpisode, onChange)

  return (
    <div className="relative space-y-3">
      <UiLabel ko="에피소드 기본정보" code="EpisodeEditor" />
      <HostSection ctx={ctx} />
      <NarratorSection ctx={ctx} />
      <BooksSection ctx={ctx} />
      <ShortsSection ctx={ctx} />
    </div>
  )
}
