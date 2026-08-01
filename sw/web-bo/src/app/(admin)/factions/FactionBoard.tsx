'use client'

/**
 * 세력도감 관리 화면의 관점 전환 껍데기.
 *
 * 영상 편과 도감 테마는 같은 DB를 공유하지만 운영자가 훑는 기준은 다르다.
 * 한 표에 섞지 않고 URL에 남는 두 모드로 나눠, 새로고침·뒤로 가기·직접 링크에서도
 * 현재 작업 관점을 잃지 않게 한다.
 */

import { useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Layers3, Plus, Video } from 'lucide-react'
import type { CelebTag } from '@/actions/admin/tags'
import type { FactionThemeSummary } from '@/actions/admin/factions/themes'
import type { FactionEpisodeSummary } from '@/actions/admin/factions/episodes'
import EpisodeFormModal from './EpisodeFormModal'
import ThemeFormModal from './ThemeFormModal'
import FactionThemeTable from './FactionBoard/sections/FactionThemeTable'
import FactionVideoTable from './FactionBoard/sections/FactionVideoTable'
import { folderToParam } from '@/lib/faction-edit-route'

type FactionView = 'videos' | 'themes'

const VIEW_OPTIONS: {
  value: FactionView
  label: string
  description: string
  icon: typeof Video
}[] = [
  {
    value: 'videos',
    label: '영상 편',
    description: '렌더 편성·구성·도감 연결을 영상 한 편씩 확인',
    icon: Video,
  },
  {
    value: 'themes',
    label: '도감 테마',
    description: '서비스에 진열되는 테마·인물·사진을 기준으로 확인',
    icon: Layers3,
  },
]

export default function FactionBoard({
  initialThemes,
  episodes,
  factionLocal,
}: {
  initialThemes: FactionThemeSummary[]
  episodes: FactionEpisodeSummary[]
  /** 렌더 저장소가 같은 컴퓨터에 있고 창구가 켜져 있는가 */
  factionLocal: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [themes, setThemes] = useState(initialThemes)
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false)
  const [isEpisodeModalOpen, setIsEpisodeModalOpen] = useState(false)
  const [queries, setQueries] = useState<Record<FactionView, string>>({
    videos: '',
    themes: '',
  })

  const view: FactionView = searchParams.get('view') === 'themes' ? 'themes' : 'videos'
  const query = queries[view]

  const changeQuery = (value: string) => {
    setQueries(current => current[view] === value ? current : { ...current, [view]: value })
  }

  const changeView = (next: FactionView) => {
    if (next === view) return
    const params = new URLSearchParams(searchParams.toString())
    params.set('view', next)
    window.history.pushState(null, '', `${pathname}?${params.toString()}`)
  }

  const handleThemeCreated = (newTag?: CelebTag) => {
    setIsThemeModalOpen(false)
    if (newTag) router.push(`/factions/themes/${newTag.id}`)
  }

  const handleEpisodeCreated = (folder?: string) => {
    setIsEpisodeModalOpen(false)
    if (folder) router.push(`/factions/${folderToParam(folder)}`)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-stretch justify-between gap-3 rounded-xl border border-border bg-bg-secondary/60 p-2">
        <div
          role="group"
          aria-label="세력도감 관리 기준"
          className="grid min-w-0 flex-1 grid-cols-1 gap-1 sm:grid-cols-2"
        >
          {VIEW_OPTIONS.map(option => {
            const Icon = option.icon
            const selected = view === option.value
            const count = option.value === 'videos' ? episodes.length : themes.length

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => changeView(option.value)}
                className={`flex min-w-0 items-center gap-3 rounded-lg border px-4 py-3 text-left ${
                  selected
                    ? 'border-accent bg-accent/15 text-text-primary'
                    : 'border-transparent text-text-secondary hover:border-border hover:bg-white/5 hover:text-text-primary'
                }`}
              >
                <span className={`rounded-md p-2 ${selected ? 'bg-accent text-white' : 'bg-bg-card text-text-secondary'}`}>
                  <Icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold">{option.label}</span>
                    <span className="rounded bg-bg-card px-1.5 py-0.5 text-xs tabular-nums text-text-secondary">
                      {count}
                    </span>
                  </span>
                  <span className="mt-0.5 block truncate text-xs text-text-secondary">
                    {option.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={() => view === 'videos' ? setIsEpisodeModalOpen(true) : setIsThemeModalOpen(true)}
          className="flex shrink-0 items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white hover:bg-accent-hover"
        >
          <Plus className="h-4 w-4" />
          {view === 'videos' ? '새 영상 편' : '새 테마'}
        </button>
      </div>

      {!factionLocal && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
          렌더 저장소가 연결되지 않았습니다. 사진·음원·파일 내보내기는 쓸 수 없고, 글과 구성 편집만 됩니다.
          연결하려면 <code className="font-mono">sw/web-bo/.env</code> 에 <code className="font-mono">FACTION_LOCAL=1</code> 을
          넣고 개발 서버를 다시 띄우세요.
        </p>
      )}

      {view === 'videos' ? (
        <section aria-label="영상 편 목록">
          <FactionVideoTable
            episodes={episodes}
            themes={themes}
            factionLocal={factionLocal}
            query={query}
            onQueryChange={changeQuery}
          />
        </section>
      ) : (
        <section aria-label="도감 테마 목록">
          <FactionThemeTable
            themes={themes}
            episodes={episodes}
            factionLocal={factionLocal}
            onThemesChange={setThemes}
            query={query}
            onQueryChange={changeQuery}
          />
        </section>
      )}

      {isThemeModalOpen && <ThemeFormModal tag={null} onClose={handleThemeCreated} />}
      {isEpisodeModalOpen && <EpisodeFormModal onClose={handleEpisodeCreated} />}
    </div>
  )
}
