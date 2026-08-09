'use client'

/**
 * 세력도감 통합 목록 — 영상 편과 웹 전용 테마를 한 표에 세운다(26.08.03 목록 통합).
 *
 * 26.08.03 상위분류 도입: 편·테마를 낱개로 늘어놓지 않고 서비스 도감과 같은 갈래
 * (인공지능·권력과 전쟁·신화와 이야기 …)로 묶어 접었다 폈다 한다. 갈래의 정본은
 * `celeb_tags.parent_id` 하나이고, 갈래 자체인 테마는 제 줄 대신 묶음 머리로 올라선다.
 * 어느 갈래에도 안 걸린 편은 맨 아래 「분류 없음」에 모여, 갈래를 붙여야 할 대상이 드러난다.
 *
 * 웹 전용 테마 줄에는 「영상 없음」 표찰이 붙고, 렌더·이관 대신 도감 노출 상태와
 * 단체샷·개인샷 수를 보인다. 검색·필터는 두 갈래 모두에 걸린다.
 */

import { Fragment, useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowRight, ChevronsDownUp, ChevronsUpDown } from 'lucide-react'
import type { FactionThemeSummary } from '@/actions/admin/factions/themes'
import type { FactionEpisodeSummary } from '@/actions/admin/factions/episodes'
import { regenerateFactionRegistry } from '@/actions/admin/factions/export'
import {
  FactionTable,
  FactionTableEmpty,
  FactionTableSection,
  type FactionTableColumn,
} from '@/components/factions/FactionTable'
import { useToast } from '@/contexts/ToastContext'
import FactionSearchField from '../FactionSearchField'
import { getFactionSearchTokens, matchesFactionSearch } from '../factionSearch'
import { EpisodeAtlasRow, OPEN_BUTTON, ThemeActiveToggle, ThemeAtlasRow, themeEditPath } from './AtlasRows'
import { buildAtlasSections, buildThemesByFolder, groupTagIds } from './atlasGrouping'
import InlineThemeName from './InlineThemeName'

type AtlasFilter = 'all' | 'registered' | 'unregistered' | 'unlinked' | 'webonly'

const COLUMNS: FactionTableColumn[] = [
  { key: 'item', header: '영상 편 · 테마', width: '16rem' },
  { key: 'render', header: '렌더 편성', width: '8.5rem' },
  { key: 'catalog', header: '도감', width: '11rem' },
  { key: 'composition', header: '세력 / 인물', width: '9rem', align: 'center' },
  { key: 'factions', header: '세력', width: '15rem' },
  { key: 'active', header: '활성화 여부', width: '9rem' },
  { key: 'updated', header: '수정', width: '6.5rem', align: 'center' },
  { key: 'open', header: '', width: '8rem', align: 'center' },
]

export default function FactionAtlasTable({
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
  const [filter, setFilter] = useState<AtlasFilter>('all')
  /** 펼친 상위분류 — 기본값을 비워 처음에는 모든 세력이 접혀 있게 한다 */
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())

  const themesByFolder = useMemo(() => buildThemesByFolder(themes), [themes])
  const groupIds = useMemo(() => groupTagIds(themes), [themes])

  /**
   * 영상 편이 하나도 없는 테마 — 통합 목록에 제 줄을 갖는 유일한 테마다.
   * 상위분류 테마는 묶음 머리로 올라서므로 줄 수에서 뺀다.
   */
  const webOnlyThemes = useMemo(
    () => themes.filter(theme => theme.episodes.length === 0 && !groupIds.has(theme.id)),
    [themes, groupIds],
  )

  const counts = useMemo(() => {
    let registered = 0
    let unlinked = 0
    for (const episode of episodes) {
      if (episode.registered) registered += 1
      if (!themesByFolder.has(episode.folder)) unlinked += 1
    }
    return {
      all: episodes.length + webOnlyThemes.length,
      registered,
      unregistered: episodes.length - registered,
      unlinked,
      webonly: webOnlyThemes.length,
    }
  }, [episodes, themesByFolder, webOnlyThemes])

  const searchTokens = useMemo(() => getFactionSearchTokens(query), [query])

  const visibleEpisodes = useMemo(() => {
    if (filter === 'webonly') return []
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

  const visibleThemes = useMemo(() => {
    if (filter !== 'all' && filter !== 'webonly') return []
    return webOnlyThemes.filter(theme => matchesFactionSearch(searchTokens, [
      theme.name,
      theme.name_en,
      theme.description,
      theme.description_en,
      theme.slug,
    ]))
  }, [webOnlyThemes, filter, searchTokens])

  const sections = useMemo(
    () => buildAtlasSections({
      episodes: visibleEpisodes,
      themes: visibleThemes,
      allThemes: themes,
      themesByFolder,
    }),
    [visibleEpisodes, visibleThemes, themes, themesByFolder],
  )

  const visibleCount = visibleEpisodes.length + visibleThemes.length
  /** 찾는 중에는 접힘을 무시한다 — 찾은 것이 접힌 묶음 안에 숨으면 못 찾은 것과 같다 */
  const searching = searchTokens.length > 0
  const allCollapsed = sections.length > 0 && sections.every(section => !expanded.has(section.key))

  const toggleSection = (key: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const toggleAll = () => {
    setExpanded(allCollapsed ? new Set(sections.map(section => section.key)) : new Set())
  }

  const filters: { value: AtlasFilter; label: string; count: number }[] = [
    { value: 'all', label: '전체', count: counts.all },
    { value: 'registered', label: '렌더 편성', count: counts.registered },
    { value: 'unregistered', label: '미편성', count: counts.unregistered },
    { value: 'unlinked', label: '테마 미연결', count: counts.unlinked },
    { value: 'webonly', label: '영상 없음', count: counts.webonly },
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
        <div className="flex flex-wrap items-center gap-2" aria-label="세력도감 목록 필터">
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

        <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
          <button
            type="button"
            onClick={toggleAll}
            disabled={sections.length === 0}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-border bg-bg-card px-3 py-2 text-sm font-medium text-text-secondary hover:border-accent hover:text-accent disabled:opacity-50"
            title="상위분류를 한꺼번에 접거나 폅니다"
          >
            {allCollapsed ? <ChevronsUpDown className="h-4 w-4" /> : <ChevronsDownUp className="h-4 w-4" />}
            {allCollapsed ? '모두 펼치기' : '모두 접기'}
          </button>

          <FactionSearchField
            value={query}
            onChange={onQueryChange}
            label="세력도감 검색"
            placeholder="제목·폴더·테마·설명 검색"
            resultText={searching ? `${visibleCount}/${counts[filter]}건` : `${counts[filter]}건`}
            className="w-full sm:w-[28rem]"
          />
        </div>
      </div>

      <FactionTable columns={COLUMNS}>
        {visibleCount === 0 ? (
          <FactionTableEmpty colSpan={COLUMNS.length}>
            조건에 맞는 영상 편·테마가 없습니다.
          </FactionTableEmpty>
        ) : (
          sections.map(section => {
            const open = searching || expanded.has(section.key)
            const rowCount = section.episodes.length + section.themes.length
            const groupTheme = section.tagId ? themes.find(t => t.id === section.tagId) : undefined

            return (
              <Fragment key={section.key}>
                <FactionTableSection
                  colSpan={COLUMNS.length}
                  open={open}
                  onToggle={searching ? undefined : () => toggleSection(section.key)}
                  title={
                    <span className="flex items-center gap-2">
                      {section.color && (
                        <span
                          aria-hidden
                          className="h-2.5 w-2.5 rounded-full"
                          style={{ backgroundColor: section.color }}
                        />
                      )}
                      {groupTheme ? (
                        <InlineThemeName
                          key={`${groupTheme.id}:${groupTheme.name}`}
                          themeId={groupTheme.id}
                          name={groupTheme.name}
                          className="group-hover/section:text-accent"
                        />
                      ) : section.name}
                    </span>
                  }
                  note={`${rowCount}건`}
                  action={
                    groupTheme ? (
                      <span className="flex items-center gap-2">
                        <ThemeActiveToggle
                          themeId={groupTheme.id}
                          themeName={groupTheme.name}
                          initialActive={groupTheme.is_featured}
                        />
                        <Link
                          href={themeEditPath(groupTheme)}
                          title={`${groupTheme.name} 상위분류 화면으로`}
                          className={OPEN_BUTTON}
                        >
                          분류 편집
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </span>
                    ) : (
                      <span className="text-xs text-text-secondary">
                        상위분류가 없는 편·테마입니다
                      </span>
                    )
                  }
                />

                {open && section.episodes.map(episode => (
                  <EpisodeAtlasRow
                    key={episode.id}
                    episode={episode}
                    linkedThemes={themesByFolder.get(episode.folder) ?? []}
                    factionLocal={factionLocal}
                  />
                ))}

                {open && section.themes.map(theme => (
                  <ThemeAtlasRow key={theme.id} theme={theme} />
                ))}
              </Fragment>
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
