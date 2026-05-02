'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SERIES } from '@/lib/series-registry'

type EpisodeStatus = 'uploaded' | 'wip' | 'candidate'

type EpisodeSummary = {
  name: string
  nickname: string
  booksCount: number
  hasShorts: boolean
  voiceCount: number
  birthYear: number | null
  status: EpisodeStatus
}

type PartEntry = {
  partNum: number
  baseName: string
  status: EpisodeStatus
  ko?: EpisodeSummary
  en?: EpisodeSummary
}

type PersonGroup = {
  personKey: string
  nickname: string
  birthYear: number | null
  status: EpisodeStatus
  parts: PartEntry[]
}

function fmtYear(y: number | null): string {
  if (y == null) return '?'
  return y < 0 ? `BC ${Math.abs(y)}` : String(y)
}

function parseEpName(name: string) {
  const isEn = name.endsWith('-en')
  const withoutEn = isEn ? name.slice(0, -3) : name
  const partMatch = withoutEn.match(/-(\d+)$/)
  const partNum = partMatch ? parseInt(partMatch[1]) : 1
  const basePerson = withoutEn.replace(/-\d+$/, '')
  return { isEn, basePerson, partNum, groupKey: withoutEn }
}

function groupByPerson(episodes: EpisodeSummary[]): PersonGroup[] {
  const partMap = new Map<string, PartEntry>()
  const personMap = new Map<string, PersonGroup>()

  for (const ep of episodes) {
    const { isEn, basePerson, partNum, groupKey } = parseEpName(ep.name)

    if (!partMap.has(groupKey)) {
      partMap.set(groupKey, { partNum, baseName: groupKey, status: ep.status ?? 'wip' })
    }
    const part = partMap.get(groupKey)!
    if (isEn) part.en = ep
    else { part.ko = ep; part.status = ep.status ?? 'wip' }

    if (!personMap.has(basePerson)) {
      personMap.set(basePerson, {
        personKey: basePerson,
        nickname: ep.nickname,
        birthYear: ep.birthYear ?? null,
        status: ep.status ?? 'wip',
        parts: [],
      })
    }
    const person = personMap.get(basePerson)!
    if (!isEn) {
      person.nickname = ep.nickname
      person.birthYear = ep.birthYear ?? null
    }
  }

  for (const [groupKey, part] of partMap) {
    const { basePerson } = parseEpName(groupKey)
    const person = personMap.get(basePerson)!
    if (!person.parts.some(p => p.baseName === groupKey)) person.parts.push(part)
  }

  for (const person of personMap.values()) {
    person.parts.sort((a, b) => a.partNum - b.partNum)
    person.status = person.parts[person.parts.length - 1].status
  }

  return [...personMap.values()]
}

function StatusIcon({ status, hasVoice }: { status: EpisodeStatus; hasVoice: boolean }) {
  if (status === 'uploaded') return <span className="text-green-400 text-[10px]">▲</span>
  if (hasVoice) return <span className="text-success-text text-[10px]">●</span>
  if (status === 'candidate') return <span className="text-amber-400 text-[10px]">◇</span>
  return <span className="text-text-dim text-[10px]">○</span>
}

type CandidateSummary = { name: string; nickname: string; booksCount: number; birthYear: number | null }

const STATUS_SECTIONS: { key: EpisodeStatus; label: string; color: string }[] = [
  { key: 'uploaded', label: 'Uploaded', color: 'text-green-400' },
  { key: 'wip', label: 'WIP', color: 'text-blue-400' },
  { key: 'candidate', label: 'Candidate', color: 'text-amber-400' },
]

export function Sidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [activeSeries, setActiveSeries] = useState<string | null>(null)
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([])
  const [candidates, setCandidates] = useState<CandidateSummary[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<'lineup' | 'draft'>('lineup')

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'b') { e.preventDefault(); setCollapsed(prev => !prev) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  useEffect(() => {
    const match = pathname.match(/^\/([^/]+)/)
    if (match) {
      const id = match[1]
      if (SERIES.some(s => s.id === id)) setActiveSeries(id)
    }
  }, [pathname])

  const fetchList = useCallback(() => {
    if (!activeSeries) { setEpisodes([]); setCandidates([]); return }
    fetch(`/api/${activeSeries}/episodes`).then(r => r.json()).then(setEpisodes).catch(() => setEpisodes([]))
    fetch(`/api/${activeSeries}/candidates`).then(r => r.json()).then(setCandidates).catch(() => setCandidates([]))
  }, [activeSeries])

  useEffect(fetchList, [fetchList])

  const byBirth = (a: { birthYear: number | null }, b: { birthYear: number | null }) =>
    (a.birthYear ?? 9999) - (b.birthYear ?? 9999)

  const persons = groupByPerson(episodes).filter(p => {
    const q = search.toLowerCase()
    return p.personKey.includes(q) || p.nickname.includes(search)
  }).sort((a, b) => byBirth(a, b))

  const realNames = new Set(episodes.map(e => e.name))
  const filteredCandidates = candidates.filter(d => {
    if (realNames.has(d.name)) return false
    const q = search.toLowerCase()
    return d.name.includes(q) || d.nickname.includes(search)
  }).sort((a, b) => byBirth(a, b))

  if (collapsed) {
    return (
      <div className="flex h-full shrink-0">
        <aside className="w-10 border-r border-border flex flex-col items-center py-4 gap-1">
          {SERIES.map(s => (
            <button key={s.id} title={s.label}
              onClick={() => { setCollapsed(false); setActiveSeries(s.id) }}
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
          <div className="flex items-center justify-between mb-2">
            <Link href={`/${activeSeries}`}>
              <h2 className="text-xs font-bold text-accent tracking-widest">
                {SERIES.find(s => s.id === activeSeries)?.label}
              </h2>
            </Link>
            <div className="flex rounded overflow-hidden border border-border text-[10px]">
              <button onClick={() => setTab('lineup')}
                className={`px-1.5 py-0.5 font-semibold transition-colors ${tab === 'lineup' ? 'bg-accent text-bg-main' : 'text-text-dim hover:text-text-secondary'}`}>
                All {persons.length}
              </button>
              <button onClick={() => setTab('draft')}
                className={`px-1.5 py-0.5 font-semibold transition-colors ${tab === 'draft' ? 'bg-zinc-500 text-white' : 'text-text-dim hover:text-text-secondary'}`}>
                Draft {filteredCandidates.length}
              </button>
            </div>
          </div>

          <input type="text" placeholder="검색..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-xs mb-2 focus:outline-none focus:border-accent" />

          {tab === 'lineup' && (
            <div className="space-y-3">
              {STATUS_SECTIONS.map(({ key, label, color }) => {
                const sectionPersons = persons.filter(p => p.status === key)
                if (sectionPersons.length === 0) return null
                return (
                  <div key={key}>
                    <div className={`text-[10px] font-bold tracking-wider ${color} mb-1 px-1`}>
                      {label} ({sectionPersons.length})
                    </div>
                    <div className="space-y-0.5">
                      {sectionPersons.map(person => {
                        const firstPart = person.parts[0]
                        const primary = firstPart.ko ?? firstPart.en!
                        const isSingle = person.parts.length === 1
                        const activePart = person.parts.find(p => {
                          const epName = (p.ko ?? p.en!)?.name
                          return epName && (pathname.startsWith(`/${activeSeries}/${epName}/`) || pathname === `/${activeSeries}/${epName}`)
                        })
                        const isActive = !!activePart

                        const content = (
                          <>
                            <StatusIcon status={person.status} hasVoice={(primary?.voiceCount ?? 0) > 0} />
                            <span className="font-semibold truncate">{person.nickname}</span>
                            <span className="ml-auto flex items-center gap-1 shrink-0">
                              {!isSingle && person.parts.map(p => {
                                const ep = p.ko ?? p.en!
                                if (!ep) return null
                                const isActivePart = activePart?.baseName === p.baseName
                                return (
                                  <Link key={p.baseName} href={`/${activeSeries}/${ep.name}`}
                                    onClick={e => e.stopPropagation()}
                                    className={`text-[9px] w-4 h-4 flex items-center justify-center rounded font-bold transition-colors ${isActivePart ? 'bg-accent text-bg-main' : 'bg-bg-main border border-border text-text-dim hover:text-accent hover:border-accent/40'}`}>
                                    {p.partNum}
                                  </Link>
                                )
                              })}
                              <span className="text-[10px] text-text-dim">{fmtYear(person.birthYear)}</span>
                            </span>
                          </>
                        )

                        if (isSingle) {
                          return (
                            <Link key={person.personKey} href={`/${activeSeries}/${primary.name}`}
                              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${isActive ? 'bg-bg-card border border-border-active' : 'hover:bg-bg-hover'}`}>
                              {content}
                            </Link>
                          )
                        }

                        return (
                          <div key={person.personKey}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs ${isActive ? 'bg-bg-card border border-border-active' : 'hover:bg-bg-hover'}`}>
                            {content}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {persons.length === 0 && (
                <div className="text-xs text-text-dim py-4 text-center">
                  {episodes.length === 0 ? '에피소드 없음' : '검색 결과 없음'}
                </div>
              )}
            </div>
          )}

          {tab === 'draft' && (
            <div className="space-y-0.5">
              {filteredCandidates.map(d => {
                const active = pathname.startsWith(`/${activeSeries}/${d.name}`)
                return (
                  <Link key={d.name} href={`/${activeSeries}/${d.name}`}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${active ? 'bg-bg-card border border-border-active' : 'hover:bg-bg-hover'}`}>
                    <span className="text-zinc-500 text-[10px]">◇</span>
                    <span className="font-semibold truncate">{d.nickname}</span>
                    <span className="ml-auto text-[10px] text-text-dim shrink-0">{fmtYear(d.birthYear)}</span>
                  </Link>
                )
              })}
              {filteredCandidates.length === 0 && (
                <div className="text-xs text-text-dim py-4 text-center">
                  {candidates.length === 0 ? 'Draft 없음' : '검색 결과 없음'}
                </div>
              )}
            </div>
          )}
        </aside>
      )}
    </div>
  )
}
