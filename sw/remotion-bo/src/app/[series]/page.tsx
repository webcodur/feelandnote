'use client'

import { useState, useEffect, useCallback, use } from 'react'
import Link from 'next/link'
import { getSeriesById } from '@/lib/series-registry'
import { TaskPanel } from '@/components/TaskPanel'
import { VoiceStorage } from '@/components/VoiceStorage'

type EpisodeStatus = 'todo' | 'live' | 'done'

type EpisodeSummary = {
  name: string; nickname: string; booksCount: number; hasShorts: boolean
  voiceCount: number; voiceSizeMB: number
  status: EpisodeStatus
}

type CandidateSummary = { name: string; nickname: string; booksCount: number }

type EpisodeGroup = {
  baseName: string
  status: EpisodeStatus
  /** 파트 번호 (1편이면 1, 2편이면 2 등. 단일 에피소드도 1) */
  partNum: number
  ko?: EpisodeSummary
  en?: EpisodeSummary
}

/** 에피소드명에서 -en 및 -\d+ 접미사를 분리 */
function parseEpName(name: string) {
  const isEn = name.endsWith('-en')
  const withoutEn = isEn ? name.slice(0, -3) : name
  const partMatch = withoutEn.match(/-(\d+)$/)
  const partNum = partMatch ? parseInt(partMatch[1]) : 1
  const basePerson = withoutEn.replace(/-\d+$/, '')
  return { isEn, basePerson, partNum, groupKey: withoutEn }
}

function groupEpisodes(episodes: EpisodeSummary[]): EpisodeGroup[] {
  const map = new Map<string, EpisodeGroup>()
  for (const ep of episodes) {
    const { isEn, groupKey, partNum } = parseEpName(ep.name)
    if (!map.has(groupKey)) map.set(groupKey, { baseName: groupKey, status: ep.status ?? 'todo', partNum })
    const g = map.get(groupKey)!
    if (isEn) g.en = ep; else { g.ko = ep; g.status = ep.status ?? 'todo' }
  }
  return [...map.values()]
}

/** 같은 인물의 파트 수 계산 (1편만 있으면 1) */
function countParts(groups: EpisodeGroup[], group: EpisodeGroup): number {
  const { basePerson } = parseEpName(group.baseName)
  return groups.filter(g => parseEpName(g.baseName).basePerson === basePerson).length
}

type TabKey = EpisodeStatus | 'candidate-pool' | 'storage'  // 'todo' | 'live' | 'done' | ...

const STATUS_TABS: { key: TabKey; label: string; color: string }[] = [
  { key: 'done', label: 'Done', color: 'bg-green-500' },
  { key: 'live', label: 'Live', color: 'bg-blue-500' },
  { key: 'todo', label: 'Todo', color: 'bg-amber-500' },
  { key: 'candidate-pool', label: 'Draft', color: 'bg-zinc-500' },
  { key: 'storage', label: 'Storage', color: 'bg-purple-500' },
]

const STATUS_OPTIONS: { value: EpisodeStatus; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'live', label: 'Live' },
  { value: 'done', label: 'Done' },
]

export default function SeriesHomePage({ params }: { params: Promise<{ series: string }> }) {
  const { series } = use(params)
  const seriesDef = getSeriesById(series)
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([])
  const [candidates, setCandidates] = useState<CandidateSummary[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabKey>('live')
  const [promoting, setPromoting] = useState<string | null>(null)
  const [changingStatus, setChangingStatus] = useState<string | null>(null)

  useEffect(() => {
    if (seriesDef) document.title = `${seriesDef.label} — Remotion BO`
  }, [seriesDef])

  const fetchAll = useCallback(() => {
    fetch(`/api/${series}/episodes`).then(r => r.json()).then(setEpisodes)
    fetch(`/api/${series}/candidates`).then(r => r.json()).then(setCandidates)
  }, [series])

  useEffect(fetchAll, [fetchAll])

  if (!seriesDef) return <div className="text-text-dim">시리즈를 찾을 수 없다.</div>

  const groups = groupEpisodes(episodes)
  const realNames = new Set(episodes.map(e => e.name))

  const filteredGroups = groups
    .filter(g => g.status === tab)
    .filter(g => {
      const q = search.toLowerCase()
      return g.baseName.includes(q) || g.ko?.nickname.includes(search) || g.en?.nickname.includes(search)
    })

  const filteredCandidates = candidates
    .filter(d => !realNames.has(d.name))
    .filter(d => {
      const q = search.toLowerCase()
      return d.name.includes(q) || d.nickname.includes(search)
    })

  const counts: Record<TabKey, number> = {
    done: groups.filter(g => g.status === 'done').length,
    live: groups.filter(g => g.status === 'live').length,
    todo: groups.filter(g => g.status === 'todo').length,
    'candidate-pool': filteredCandidates.length,
    storage: -1,
  }

  const handlePromote = async (name: string) => {
    setPromoting(name)
    try {
      const res = await fetch(`/api/${series}/candidates`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (res.ok) fetchAll()
      else alert('Promote failed: ' + (data.error ?? ''))
    } finally {
      setPromoting(null)
    }
  }

  const handleStatusChange = async (name: string, newStatus: EpisodeStatus) => {
    setChangingStatus(name)
    try {
      await fetch(`/api/${series}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, status: newStatus }),
      })
      fetchAll()
    } finally {
      setChangingStatus(null)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-1">
        <h1 className="text-xl font-bold">{seriesDef.icon} {seriesDef.label}</h1>
        <Link href={`/${series}/youtube`} className="ml-auto text-xs text-text-secondary hover:text-accent transition-colors font-semibold">
          YouTube 편성 →
        </Link>
      </div>

      {/* 상태 탭 */}
      <div className="flex gap-1 rounded-md overflow-hidden border border-border text-xs mb-6 w-fit">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 font-semibold transition-colors ${
              tab === t.key ? `${t.color} text-white` : 'text-text-secondary hover:text-text-primary'
            }`}>
            {t.label}{counts[t.key] >= 0 ? ` ${counts[t.key]}` : ''}
          </button>
        ))}
      </div>

      <input
        type="text" placeholder="인물 검색..." value={search} onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm bg-bg-card border border-border rounded-md px-3 py-2 text-sm mb-6 focus:outline-none focus:border-accent"
      />

      {/* Storage 탭 */}
      {tab === 'storage' && <VoiceStorage series={series} />}

      {/* 에피소드 그리드 (Uploaded / WIP / Candidate) */}
      {tab !== 'candidate-pool' && tab !== 'storage' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {filteredGroups.map(g => {
            const primary = g.ko ?? g.en!
            return (
              <div key={g.baseName} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent/30 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <Link href={`/${series}/${primary.name}`} className="font-semibold hover:text-accent transition-colors">
                    {primary.nickname}
                    {countParts(filteredGroups, g) > 1 && (
                      <span className="ml-1.5 text-xs font-medium text-accent">{g.partNum}편</span>
                    )}
                  </Link>
                  <div className="flex items-center gap-2">
                    {/* 언어 배지 */}
                    <div className="flex gap-1">
                      {g.ko ? (
                        <Link href={`/${series}/${g.ko.name}`}
                          className="text-[10px] px-1.5 py-px rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors">KO</Link>
                      ) : (
                        <span className="text-[10px] px-1.5 py-px rounded bg-bg-main text-text-dim border border-border">KO</span>
                      )}
                      {g.en ? (
                        <Link href={`/${series}/${g.en.name}`}
                          className="text-[10px] px-1.5 py-px rounded bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors">EN</Link>
                      ) : (
                        <span className="text-[10px] px-1.5 py-px rounded bg-bg-main text-text-dim border border-border">EN</span>
                      )}
                    </div>
                    <select
                      value={g.status}
                      onChange={e => handleStatusChange(g.baseName, e.target.value as EpisodeStatus)}
                      disabled={changingStatus === g.baseName}
                      className="text-[10px] bg-bg-main border border-border rounded px-1 py-0.5 text-text-secondary cursor-pointer disabled:opacity-50">
                      {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                <div className="text-xs text-text-secondary space-y-1">
                  <div>{primary.booksCount}권{primary.hasShorts ? ' · Shorts' : ''}</div>
                  <div className="flex items-center gap-3">
                    {g.ko && <span>KO {g.ko.voiceCount} wav · {g.ko.voiceSizeMB}MB</span>}
                    {g.en && <span>EN {g.en.voiceCount} wav · {g.en.voiceSizeMB}MB</span>}
                  </div>
                </div>
              </div>
            )
          })}
          {filteredGroups.length === 0 && <p className="text-sm text-text-dim col-span-full">해당 상태의 에피소드가 없다.</p>}
        </div>
      )}

      {/* Draft 탭 (후보 풀) */}
      {tab === 'candidate-pool' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {filteredCandidates.map(d => (
            <div key={d.name} className="bg-bg-secondary border border-border rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">{d.nickname}</span>
                <button
                  onClick={() => handlePromote(d.name)}
                  disabled={promoting === d.name}
                  className="text-[10px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 font-semibold disabled:opacity-50 transition-colors">
                  {promoting === d.name ? 'Promoting...' : 'Promote'}
                </button>
              </div>
              <div className="text-xs text-text-secondary">
                <span>{d.booksCount}권</span>
                <span className="text-text-dim ml-2 text-[10px]">{d.name}</span>
              </div>
            </div>
          ))}
          {filteredCandidates.length === 0 && <p className="text-sm text-text-dim col-span-full">검색 결과 없음</p>}
        </div>
      )}

      <TaskPanel />
    </div>
  )
}
