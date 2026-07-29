'use client'

/**
 * 영상 편 기준 목록.
 *
 * 연결된 테마가 있더라도 영상 한 편은 반드시 한 행으로 남는다. 렌더 편성 여부와
 * 도감 이관 가능 여부는 서로 다른 상태이므로 각각의 칸에서 따로 보여준다.
 */

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, Layers, ListVideo, Users, Video } from 'lucide-react'
import type { FactionThemeSummary } from '@/actions/admin/factions/themes'
import type { FactionEpisodeSummary } from '@/actions/admin/factions/episodes'
import { regenerateFactionRegistry } from '@/actions/admin/factions/export'
import FactionEpisodeActions from '@/components/factions/FactionEpisodeActions'
import {
  FactionTable,
  FactionTableBadge,
  FactionTableCell,
  FactionTableCount,
  FactionTableEmpty,
  FactionTableRow,
  type FactionTableColumn,
} from '@/components/factions/FactionTable'
import { useToast } from '@/contexts/ToastContext'
import { folderToParam } from '@/lib/faction-edit-route'
import FactionSearchField from '../FactionSearchField'
import { getFactionSearchTokens, matchesFactionSearch } from '../factionSearch'

type VideoFilter = 'all' | 'registered' | 'unregistered' | 'unlinked'

interface EpisodeThemeLink {
  id: string
  name: string
  nameEn: string | null
  color: string
}

const COLUMNS: FactionTableColumn[] = [
  { key: 'episode', header: '영상 편' },
  { key: 'render', header: '렌더 편성', width: '8.5rem' },
  { key: 'catalog', header: '도감 이관', width: '11rem' },
  { key: 'composition', header: '세력 / 인물', width: '9rem', align: 'center' },
  { key: 'themes', header: '연결 테마', width: '18rem' },
  { key: 'updated', header: '수정', width: '6.5rem', align: 'center' },
  { key: 'open', header: '', width: '8rem', align: 'center' },
]

const OPEN_BUTTON = 'inline-flex items-center gap-1.5 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm font-medium text-text-secondary hover:border-accent hover:text-accent'

const DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: '2-digit',
  day: '2-digit',
})

function formatUpdatedAt(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : DATE_FORMATTER.format(date)
}

export default function FactionVideoTable({
  episodes,
  themes,
  factionLocal,
  query,
  onQueryChange,
}: {
  episodes: FactionEpisodeSummary[]
  themes: FactionThemeSummary[]
  factionLocal: boolean
  query: string
  onQueryChange: (value: string) => void
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const [pending, startTransition] = useTransition()
  const [filter, setFilter] = useState<VideoFilter>('all')

  const themesByFolder = useMemo(() => {
    const result = new Map<string, EpisodeThemeLink[]>()
    for (const theme of themes) {
      for (const episode of theme.episodes) {
        const list = result.get(episode.folder) ?? []
        list.push({
          id: theme.id,
          name: theme.name,
          nameEn: theme.name_en,
          color: theme.color,
        })
        result.set(episode.folder, list)
      }
    }
    return result
  }, [themes])

  const counts = useMemo(() => {
    let registered = 0
    let unlinked = 0
    for (const episode of episodes) {
      if (episode.registered) registered += 1
      if (!themesByFolder.has(episode.folder)) unlinked += 1
    }
    return {
      all: episodes.length,
      registered,
      unregistered: episodes.length - registered,
      unlinked,
    }
  }, [episodes, themesByFolder])

  const searchTokens = useMemo(() => getFactionSearchTokens(query), [query])

  const visibleEpisodes = useMemo(() => {
    return episodes.filter(episode => {
      const links = themesByFolder.get(episode.folder) ?? []
      const matchesFilter =
        filter === 'all'
        || (filter === 'registered' && episode.registered)
        || (filter === 'unregistered' && !episode.registered)
        || (filter === 'unlinked' && links.length === 0)

      if (!matchesFilter) return false
      return matchesFactionSearch(searchTokens, [
        episode.title,
        episode.titleEn,
        episode.folder,
        episode.logline,
        episode.blockNote,
        ...links.flatMap(theme => [theme.name, theme.nameEn]),
      ])
    })
  }, [episodes, filter, searchTokens, themesByFolder])

  const filters: { value: VideoFilter; label: string; count: number }[] = [
    { value: 'all', label: '전체', count: counts.all },
    { value: 'registered', label: '렌더 편성', count: counts.registered },
    { value: 'unregistered', label: '미편성', count: counts.unregistered },
    { value: 'unlinked', label: '테마 미연결', count: counts.unlinked },
  ]

  const regenerate = () => {
    startTransition(async () => {
      try {
        const result = await regenerateFactionRegistry()
        showToast('success', result.changed ? `편성 ${result.list.length}편으로 갱신했습니다` : '이미 최신입니다')
        router.refresh()
      } catch (error) {
        showToast('error', `편성 목록 재생성 실패 — ${error instanceof Error ? error.message : String(error)}`)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" aria-label="영상 편 필터">
          {filters.map(option => {
            const selected = filter === option.value
            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setFilter(option.value)}
                className={`rounded-lg border px-3 py-2 text-sm font-medium ${
                  selected
                    ? 'border-accent bg-accent/15 text-accent'
                    : 'border-border bg-bg-card text-text-secondary hover:border-accent hover:text-text-primary'
                }`}
              >
                {option.label}
                <span className="ml-1.5 tabular-nums opacity-70">{option.count}</span>
              </button>
            )
          })}
        </div>

        <FactionSearchField
          value={query}
          onChange={onQueryChange}
          label="영상 편 검색"
          placeholder="제목·폴더·테마·설명 검색"
          resultText={searchTokens.length > 0
            ? `${visibleEpisodes.length}/${counts[filter]}편`
            : `${counts[filter]}편`}
          className="w-full sm:w-[28rem]"
        />
      </div>

      <FactionTable columns={COLUMNS}>
        {visibleEpisodes.length === 0 ? (
          <FactionTableEmpty colSpan={COLUMNS.length}>
            조건에 맞는 영상 편이 없습니다.
          </FactionTableEmpty>
        ) : (
          visibleEpisodes.map(episode => {
            const linkedThemes = themesByFolder.get(episode.folder) ?? []
            return (
              <FactionTableRow
                key={episode.id}
                onOpen={() => router.push(`/factions/${folderToParam(episode.folder)}`)}
              >
                <FactionTableCell isFirst>
                  <span className="flex min-w-0 items-start gap-3">
                    <span className="mt-0.5 rounded-md bg-accent/10 p-2 text-accent">
                      <Video className="h-4 w-4" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold text-text-primary group-hover:text-accent">
                        {episode.title.split('\n')[0]}
                      </span>
                      <span className="mt-0.5 block truncate font-mono text-xs text-text-secondary">
                        {episode.folder}
                      </span>
                    </span>
                  </span>
                </FactionTableCell>

                <FactionTableCell>
                  {episode.registered ? (
                    <FactionTableBadge
                      className="bg-accent/15 text-accent"
                      icon={<ListVideo className="h-3.5 w-3.5" />}
                      title="렌더·음성·출간 대상"
                    >
                      편성 {episode.sortOrder}
                    </FactionTableBadge>
                  ) : (
                    <FactionTableBadge title="렌더 편성에서 제외됨">미편성</FactionTableBadge>
                  )}
                </FactionTableCell>

                <FactionTableCell>
                  <span className="flex min-w-0 flex-col items-start gap-1">
                    <FactionTableBadge
                      className={episode.status === 'ready'
                        ? 'bg-green-500/10 text-green-400'
                        : 'bg-amber-500/10 text-amber-400'}
                      title="영상 제작 진척도가 아니라 도감 테마로 옮길 수 있는지 나타냅니다"
                    >
                      {episode.status === 'ready' ? '이관 가능' : '이관 보류'}
                    </FactionTableBadge>
                    {episode.blockNote && (
                      <span
                        title={episode.blockNote}
                        className="block max-w-40 truncate text-xs text-amber-400/80"
                      >
                        {episode.blockNote}
                      </span>
                    )}
                  </span>
                </FactionTableCell>

                <FactionTableCell align="center">
                  <span className="inline-flex items-center gap-4">
                    <FactionTableCount
                      value={episode.groupCount}
                      icon={<Layers className="h-4 w-4" />}
                      title="세력 수"
                    />
                    <FactionTableCount
                      value={episode.personCount}
                      icon={<Users className="h-4 w-4" />}
                      title="인물 수"
                    />
                  </span>
                </FactionTableCell>

                <FactionTableCell>
                  {linkedThemes.length === 0 ? (
                    <FactionTableBadge className="bg-amber-500/10 text-amber-400">
                      미연결
                    </FactionTableBadge>
                  ) : (
                    <span className="flex flex-wrap gap-1">
                      {linkedThemes.map(theme => (
                        <Link
                          key={theme.id}
                          href={`/factions/themes/${theme.id}`}
                          title={`${theme.name} 도감 테마 편집`}
                          className="rounded hover:bg-white/5"
                        >
                          <FactionTableBadge color={theme.color} icon={<Layers className="h-3 w-3" />}>
                            {theme.name}
                          </FactionTableBadge>
                        </Link>
                      ))}
                    </span>
                  )}
                </FactionTableCell>

                <FactionTableCell align="center">
                  <span className="text-sm tabular-nums text-text-secondary" title={episode.updatedAt}>
                    {formatUpdatedAt(episode.updatedAt)}
                  </span>
                </FactionTableCell>

                <FactionTableCell align="center">
                  <span className="flex items-center justify-center gap-1">
                    <Link
                      href={`/factions/${folderToParam(episode.folder)}`}
                      title={`${episode.title.split('\n')[0]} 영상 편집기로`}
                      className={OPEN_BUTTON}
                    >
                      편집
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <FactionEpisodeActions
                      folder={episode.folder}
                      variant="menu"
                      factionLocal={factionLocal}
                    />
                  </span>
                </FactionTableCell>
              </FactionTableRow>
            )
          })
        )}
      </FactionTable>

      {factionLocal && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-bg-secondary px-4 py-3">
          <p className="text-xs text-text-secondary">
            편성 목록 파일을 다시 만듭니다. 렌더가 이 파일을 보고 어떤 편을 만들지 정합니다.
          </p>
          <button
            type="button"
            onClick={regenerate}
            disabled={pending}
            className="shrink-0 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm text-text-secondary hover:border-accent hover:text-accent disabled:opacity-50"
          >
            편성 목록 다시 만들기
          </button>
        </div>
      )}
    </div>
  )
}
