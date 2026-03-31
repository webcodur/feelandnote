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

type EpisodeGroup = {
  baseName: string
  status: EpisodeStatus
  ko?: EpisodeSummary
  en?: EpisodeSummary
}

/** 생년 표시: BC는 "BC 356", AD는 "1971" */
function fmtYear(y: number | null): string {
  if (y == null) return '?'
  return y < 0 ? `BC ${Math.abs(y)}` : String(y)
}

/** 동일 인물 다편 감지: baseName 기준으로 "1편", "2편" 등 반환 */
function detectPartLabel(baseName: string, allBaseNames: string[]): string | null {
  const partMatch = baseName.match(/-(\d+)$/)
  if (partMatch) return `${partMatch[1]}편`
  const hasSequel = allBaseNames.some(n => {
    const suffix = n.slice(baseName.length)
    return suffix.length > 0 && /^-\d+$/.test(suffix)
  })
  return hasSequel ? '1편' : null
}

function groupEpisodes(episodes: EpisodeSummary[]): EpisodeGroup[] {
  const map = new Map<string, EpisodeGroup>()
  for (const ep of episodes) {
    const isEn = ep.name.endsWith('-en')
    const base = isEn ? ep.name.slice(0, -3) : ep.name
    if (!map.has(base)) map.set(base, { baseName: base, status: ep.status ?? 'wip' })
    const g = map.get(base)!
    if (isEn) g.en = ep; else { g.ko = ep; g.status = ep.status ?? 'wip' }
  }
  return [...map.values()]
}

/** 에피소드 상태 아이콘 */
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

  // Ctrl+B 토글
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'b') {
        e.preventDefault()
        setCollapsed(prev => !prev)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // URL에서 현재 시리즈 감지
  useEffect(() => {
    const match = pathname.match(/^\/([^/]+)/)
    if (match) {
      const id = match[1]
      if (SERIES.some(s => s.id === id)) {
        setActiveSeries(id)
      }
    }
  }, [pathname])

  // 시리즈 선택 시 Lineup + Candidate 목록 로드
  const fetchList = useCallback(() => {
    if (!activeSeries) { setEpisodes([]); setCandidates([]); return }
    fetch(`/api/${activeSeries}/episodes`).then(r => r.json()).then(setEpisodes).catch(() => setEpisodes([]))
    fetch(`/api/${activeSeries}/candidates`).then(r => r.json()).then(setCandidates).catch(() => setCandidates([]))
  }, [activeSeries])

  useEffect(fetchList, [fetchList])

  const byBirth = (a: { birthYear: number | null }, b: { birthYear: number | null }) =>
    (a.birthYear ?? 9999) - (b.birthYear ?? 9999)

  const groups = groupEpisodes(episodes).filter(g => {
    const q = search.toLowerCase()
    return g.baseName.includes(q)
      || g.ko?.nickname.includes(search)
      || g.en?.nickname.includes(search)
  }).sort((a, b) => byBirth(
    { birthYear: (a.ko ?? a.en!).birthYear },
    { birthYear: (b.ko ?? b.en!).birthYear },
  ))

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
              className={`text-base p-1.5 rounded-lg transition-colors ${
                activeSeries === s.id ? 'bg-bg-card text-accent' : 'hover:bg-bg-hover text-text-secondary'
              }`}>
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
      {/* 1단: 시리즈 아이콘 */}
      <aside className="w-12 border-r border-border flex flex-col items-center py-4 gap-1">
        {SERIES.map(s => (
          <button key={s.id} title={s.label}
            onClick={() => setActiveSeries(activeSeries === s.id ? null : s.id)}
            className={`text-lg p-1.5 rounded-lg transition-colors ${
              activeSeries === s.id ? 'bg-bg-card border border-border-active text-accent' : 'hover:bg-bg-hover text-text-secondary'
            }`}>
            {s.icon}
          </button>
        ))}

        <div className="flex-1" />
      </aside>

      {/* 2단: 에피소드 목록 */}
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
                All {groups.length}
              </button>
              <button onClick={() => setTab('draft')}
                className={`px-1.5 py-0.5 font-semibold transition-colors ${tab === 'draft' ? 'bg-zinc-500 text-white' : 'text-text-dim hover:text-text-secondary'}`}>
                Draft {filteredCandidates.length}
              </button>
            </div>
          </div>

          <input
            type="text"
            placeholder="검색..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-bg-card border border-border rounded px-2 py-1.5 text-xs mb-2 focus:outline-none focus:border-accent"
          />

          {/* Lineup 탭: 상태별 섹션 */}
          {tab === 'lineup' && (
            <div className="space-y-3">
              {STATUS_SECTIONS.map(({ key, label, color }) => {
                const sectionGroups = groups.filter(g => g.status === key)
                if (sectionGroups.length === 0) return null
                return (
                  <div key={key}>
                    <div className={`text-[10px] font-bold tracking-wider ${color} mb-1 px-1`}>
                      {label} ({sectionGroups.length})
                    </div>
                    <div className="space-y-0.5">
                      {sectionGroups.map(g => {
                        const primary = g.ko ?? g.en!
                        const active = pathname.startsWith(`/${activeSeries}/${g.ko?.name}/`) || pathname.startsWith(`/${activeSeries}/${g.en?.name}/`)
                          || pathname === `/${activeSeries}/${g.ko?.name}` || pathname === `/${activeSeries}/${g.en?.name}`
                        const partLabel = detectPartLabel(g.baseName, groups.map(o => o.baseName))
                        return (
                          <Link key={g.baseName} href={`/${activeSeries}/${primary.name}`}
                            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
                              active ? 'bg-bg-card border border-border-active' : 'hover:bg-bg-hover'
                            }`}>
                            <StatusIcon status={g.status} hasVoice={primary.voiceCount > 0} />
                            <span className="font-semibold truncate">{primary.nickname}</span>
                            {partLabel && <span className="text-[9px] px-1 rounded bg-purple-500/15 text-purple-400 shrink-0">{partLabel}</span>}
                            <span className="ml-auto flex items-center gap-1 shrink-0">
                              {g.ko && <span className="text-[9px] px-0.5 rounded bg-blue-500/15 text-blue-400">K</span>}
                              {g.en && <span className="text-[9px] px-0.5 rounded bg-green-500/15 text-green-400">E</span>}
                              <span className="text-[10px] text-text-dim">{fmtYear(primary.birthYear)}</span>
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              {groups.length === 0 && (
                <div className="text-xs text-text-dim py-4 text-center">
                  {episodes.length === 0 ? '에피소드 없음' : '검색 결과 없음'}
                </div>
              )}
            </div>
          )}

          {/* Draft 탭 */}
          {tab === 'draft' && (
            <div className="space-y-0.5">
              {filteredCandidates.map(d => {
                const active = pathname.startsWith(`/${activeSeries}/${d.name}`)
                const candidatePartLabel = detectPartLabel(d.name, filteredCandidates.map(c => c.name))
                return (
                  <Link key={d.name} href={`/${activeSeries}/${d.name}`}
                    className={`flex items-center gap-1.5 px-2 py-1.5 rounded-md text-xs transition-colors ${
                      active ? 'bg-bg-card border border-border-active' : 'hover:bg-bg-hover'
                    }`}>
                    <span className="text-zinc-500 text-[10px]">◇</span>
                    <span className="font-semibold truncate">{d.nickname}</span>
                    {candidatePartLabel && <span className="text-[9px] px-1 rounded bg-purple-500/15 text-purple-400 shrink-0">{candidatePartLabel}</span>}
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
