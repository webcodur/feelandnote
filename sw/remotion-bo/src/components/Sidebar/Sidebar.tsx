'use client'

import Link from 'next/link'
import { SERIES } from '@/lib/series-registry'
import { useSidebarState } from './useSidebarState'
import { groupLabel } from './utils'
import { SIDEBAR_COLLAPSED_KEY } from './constants'
import { GroupList } from './sections/GroupList'
import { DraftList } from './sections/DraftList'
import { UiLabel } from '@/components/ui-label'

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

  if (collapsed) {
    return (
      <div className="flex h-full shrink-0">
        <aside className="w-10 border-r border-border flex flex-col items-center py-4 gap-1">
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
    <div className="relative flex h-full shrink-0">
      <UiLabel ko="사이드바" code="Sidebar" />
      <aside className="w-12 border-r border-border flex flex-col items-center py-4 gap-1">
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
        <aside className="w-56 border-r border-border overflow-y-auto p-3">
          <Link href={`/${activeSeries}`}>
            <h2 className="text-xs font-bold text-accent tracking-widest mb-2">
              {SERIES.find(s => s.id === activeSeries)?.label}
            </h2>
          </Link>

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
        </aside>
      )}
    </div>
  )
}
