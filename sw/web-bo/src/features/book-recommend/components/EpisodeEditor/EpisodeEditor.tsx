'use client'

import { useEpisodeEditor } from './useEpisodeEditor'
import { HostSection } from './sections/HostSection'
import { NarratorSection } from './sections/NarratorSection'
import { BooksSection } from './sections/BooksSection'
import { ShortsSection } from './sections/ShortsSection'
import type { EpisodeData } from './types'

export function EpisodeEditor({ episode: rawEpisode, onChange }: { episode: EpisodeData; onChange: (ep: EpisodeData) => void }) {
  const ctx = useEpisodeEditor(rawEpisode, onChange)

  return (
    <div className="relative space-y-3">
      <HostSection ctx={ctx} />
      <NarratorSection ctx={ctx} />
      <BooksSection ctx={ctx} />
      <ShortsSection ctx={ctx} />
    </div>
  )
}
