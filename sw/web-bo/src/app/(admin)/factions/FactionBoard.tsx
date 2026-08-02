'use client'

/**
 * 세력도감 관리 화면 껍데기 — 목록은 하나다(26.08.03 목록 통합).
 *
 * 예전에는 영상 편과 도감 테마를 두 관점(view)으로 갈랐지만, 편집 화면이 하나로 합쳐지면서
 * 목록도 한 표로 합쳤다. 영상 편은 편 편집기로, 영상 없는 웹 전용 테마는 같은 자리의
 * 테마 화면으로 이어지고, 웹 전용 줄에는 「영상 없음」 표찰이 붙는다.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Layers3, Plus } from 'lucide-react'
import type { CelebTag } from '@/actions/admin/tags'
import type { FactionThemeSummary } from '@/actions/admin/factions/themes'
import type { FactionEpisodeSummary } from '@/actions/admin/factions/episodes'
import EpisodeFormModal from './EpisodeFormModal'
import ThemeFormModal from './ThemeFormModal'
import FactionAtlasTable from './FactionBoard/sections/FactionAtlasTable'
import { folderToParam } from '@/lib/faction-edit-route'

export default function FactionBoard({
  themes,
  episodes,
  factionLocal,
}: {
  themes: FactionThemeSummary[]
  episodes: FactionEpisodeSummary[]
  /** 렌더 저장소가 같은 컴퓨터에 있고 창구가 켜져 있는가 */
  factionLocal: boolean
}) {
  const router = useRouter()
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)
  const [isEpisodeModalOpen, setIsEpisodeModalOpen] = useState(false)
  const [query, setQuery] = useState('')

  const handleThemeCreated = (newTag?: CelebTag) => {
    setIsThemeModalOpen(false)
    // 새 테마는 영상이 없으므로 통합 진입점의 테마 화면으로 간다
    if (newTag) router.push(`/factions/${newTag.id}`)
  }

  const handleEpisodeCreated = (folder?: string) => {
    setIsEpisodeModalOpen(false)
    if (folder) router.push(`/factions/${folderToParam(folder)}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={() => setIsEpisodeModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          새 영상 편
        </button>
        <button
          type="button"
          onClick={() => setIsThemeModalOpen(true)}
          className="flex items-center justify-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-2.5 text-sm font-semibold text-text-secondary hover:border-accent hover:text-accent"
          title="영상 제작 없이 글과 사진만으로 도감에 실리는 테마를 만듭니다"
        >
          <Layers3 className="h-4 w-4" />
          새 웹 전용 테마
        </button>
      </div>

      {!factionLocal && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          렌더 저장소가 연결되지 않았습니다. 사진·음원·파일 내보내기는 쓸 수 없고, 글과 구성 편집만 됩니다.
          연결하려면 <code className="font-mono">sw/web-bo/.env</code> 에 <code className="font-mono">FACTION_LOCAL=1</code> 을
          넣고 개발 서버를 다시 띄우세요.
        </p>
      )}

      <section aria-label="세력도감 통합 목록">
        <FactionAtlasTable
          episodes={episodes}
          themes={themes}
          factionLocal={factionLocal}
          query={query}
          onQueryChange={setQuery}
        />
      </section>

      {isThemeModalOpen && <ThemeFormModal tag={null} onClose={handleThemeCreated} />}
      {isEpisodeModalOpen && <EpisodeFormModal onClose={handleEpisodeCreated} />}
    </div>
  )
}
