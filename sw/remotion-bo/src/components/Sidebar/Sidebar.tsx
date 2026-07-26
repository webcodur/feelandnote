'use client'

import Link from 'next/link'
import { SERIES, seriesDataModel, type SeriesDataModel } from '@/lib/series-registry'
import { useSidebarState } from './useSidebarState'
import { groupLabel } from './utils'
import { SIDEBAR_COLLAPSED_KEY } from './constants'
import { GroupList } from './sections/GroupList'
import { DraftList } from './sections/DraftList'

/**
 * 에피소드 목록 등록표 — 데이터 계열별 전용 목록 컴포넌트.
 * 표에 없는 계열(book)은 아래 인물 묶음·검색 UI를 그대로 쓴다. 새 시리즈는 여기에 한 줄 얹는다.
 *
 * ⚠ 26.07.26 현재 표가 비었다 — 유일한 항목이던 가상 담화가 web-bo 로 이관됐다.
 */
const EPISODE_LISTS: Partial<Record<SeriesDataModel, React.ComponentType<{ activeSeries: string; pathname: string }>>> = {}

export function Sidebar() {
  const {
    pathname,
    collapsed,
    setCollapsed,
    activeSeries,
    setActiveSeries,
    episodes,
    candidates,
    search,
    setSearch,
    tab,
    setTab,
    groupCounts,
    filteredPersons,
    filteredCandidates,
    tabId,
  } = useSidebarState()

  const dataModel = activeSeries ? seriesDataModel(activeSeries) : undefined
  const EpisodeList = dataModel ? EPISODE_LISTS[dataModel] : undefined

  if (collapsed) {
    return (
      <div className="flex h-full shrink-0">
        <aside className="relative w-10 border-r border-border flex flex-col items-center py-4 gap-1">
          {SERIES.map(s => (
            <button key={s.id} title={s.label}
              onClick={() => {
                setCollapsed(false)
                try { window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, '0') } catch {}
                setActiveSeries(s.id)
              }}
              className={`text-base p-1.5 rounded-lg transition-colors ${activeSeries === s.id ? 'bg-bg-card text-accent' : 'hover:bg-bg-hover text-text-secondary'}`}>
              {s.icon}
            </button>
          ))}
          <div className="flex-1" />
        </aside>
      </div>
    )
  }

  return (
    <div className="flex h-full shrink-0">
      <aside className="relative w-12 border-r border-border flex flex-col items-center py-4 gap-1">
        {SERIES.map(s => (
          <button key={s.id} title={s.label}
            onClick={() => setActiveSeries(activeSeries === s.id ? null : s.id)}
            className={`text-lg p-1.5 rounded-lg transition-colors ${activeSeries === s.id ? 'bg-bg-card border border-border-active text-accent' : 'hover:bg-bg-hover text-text-secondary'}`}>
            {s.icon}
          </button>
        ))}
        <div className="flex-1" />
      </aside>

      {activeSeries && (
        <aside className="relative w-56 border-r border-border overflow-y-auto p-3">
          <Link href={`/${activeSeries}`}>
            <h2 className="text-xs font-bold text-accent tracking-widest mb-2">
              {SERIES.find(s => s.id === activeSeries)?.label}
            </h2>
          </Link>

          {EpisodeList ? (
            <EpisodeList activeSeries={activeSeries} pathname={pathname} />
          ) : (
          <>
          <div className="flex flex-wrap gap-1 rounded overflow-hidden border border-border text-[10px] mb-2">
            {groupCounts.map(({ group, count }) => {
              const id = `g:${group}`
              const active = tabId === id
              return (
                <button key={id} onClick={() => setTab({ kind: 'group', group })}
                  className={`px-1.5 py-0.5 font-semibold transition-colors ${active ? 'bg-accent text-bg-main' : 'text-text-dim hover:text-text-secondary'}`}>
                  {groupLabel(group)} {count}
                </button>
              )
            })}
            <button onClick={() => setTab({ kind: 'draft' })}
              className={`px-1.5 py-0.5 font-semibold transition-colors ${tabId === 'draft' ? 'bg-zinc-500 text-white' : 'text-text-dim hover:text-text-secondary'}`}>
              Draft {filteredCandidates.length}
            </button>
          </div>

          <input type="text" placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-xs mb-2 focus:outline-none focus:border-accent" />

          {tab.kind === 'group' && (
            <GroupList
              filteredPersons={filteredPersons}
              activeSeries={activeSeries}
              pathname={pathname}
              episodesLength={episodes.length}
            />
          )}

          {tab.kind === 'draft' && (
            <DraftList
              filteredCandidates={filteredCandidates}
              activeSeries={activeSeries}
              pathname={pathname}
              candidatesLength={candidates.length}
            />
          )}
          </>
          )}
        </aside>
      )}
    </div>
  )
}
