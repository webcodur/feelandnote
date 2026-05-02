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
  status: EpisodeStatus
  parts: PartEntry[]
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
      partMap.set(groupKey, { partNum, baseName: groupKey, status: ep.status ?? 'todo' })
    }
    const part = partMap.get(groupKey)!
    if (isEn) part.en = ep
    else { part.ko = ep; part.status = ep.status ?? 'todo' }

    if (!personMap.has(basePerson)) {
      personMap.set(basePerson, { personKey: basePerson, nickname: ep.nickname, status: ep.status ?? 'todo', parts: [] })
    }
    const person = personMap.get(basePerson)!
    if (!isEn) person.nickname = ep.nickname
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

const STATUS_OPTIONS: { value: EpisodeStatus; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'live', label: 'Live' },
  { value: 'done', label: 'Done' },
]

function PersonCard({ person, series, tabStatus, onStatusChange, changingStatus }: {
  person: PersonGroup
  series: string
  tabStatus: EpisodeStatus
  onStatusChange: (baseName: string, status: EpisodeStatus) => void
  changingStatus: string | null
}) {
  const defaultIdx = Math.max(0, person.parts.findIndex(p => p.status === tabStatus))
  const [selectedIdx, setSelectedIdx] = useState(defaultIdx)
  const part = person.parts[selectedIdx] ?? person.parts[0]
  const primary = part.ko ?? part.en!

  return (
    <div className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent/30 transition-colors">
      <div className="flex items-center gap-2 mb-2">
        <Link href={`/${series}/${primary.name}`} className="font-semibold hover:text-accent transition-colors">
          {person.nickname}
        </Link>
        {person.parts.length > 1 && (
          <div className="flex gap-0.5">
            {person.parts.map((p, i) => (
              <button key={p.baseName} onClick={() => setSelectedIdx(i)}
                className={`text-[10px] px-1.5 py-0.5 rounded font-bold transition-colors ${i === selectedIdx ? 'bg-accent text-bg-main' : 'bg-bg-main border border-border text-text-dim hover:text-accent hover:border-accent/40'}`}>
                {p.partNum}편
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-2">
          <div className="flex gap-1">
            {part.ko ? (
              <Link href={`/${series}/${part.ko.name}`}
                className="text-[10px] px-1.5 py-px rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30 transition-colors">KO</Link>
            ) : (
              <span className="text-[10px] px-1.5 py-px rounded bg-bg-main text-text-dim border border-border">KO</span>
            )}
            {part.en ? (
              <Link href={`/${series}/${part.en.name}`}
                className="text-[10px] px-1.5 py-px rounded bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-colors">EN</Link>
            ) : (
              <span className="text-[10px] px-1.5 py-px rounded bg-bg-main text-text-dim border border-border">EN</span>
            )}
          </div>
          <select
            value={part.status}
            onChange={e => onStatusChange(part.baseName, e.target.value as EpisodeStatus)}
            disabled={changingStatus === part.baseName}
            className="text-[10px] bg-bg-main border border-border rounded px-1 py-0.5 text-text-secondary cursor-pointer disabled:opacity-50">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </div>
      <div className="text-xs text-text-secondary space-y-1">
        <div>{primary.booksCount}권{primary.hasShorts ? ' · Shorts' : ''}</div>
        <div className="flex items-center gap-3">
          {part.ko && <span>KO {part.ko.voiceCount} wav · {part.ko.voiceSizeMB}MB</span>}
          {part.en && <span>EN {part.en.voiceCount} wav · {part.en.voiceSizeMB}MB</span>}
        </div>
      </div>
    </div>
  )
}

type TabKey = EpisodeStatus | 'candidate-pool' | 'storage'

const STATUS_TABS: { key: TabKey; label: string; color: string }[] = [
  { key: 'done', label: 'Done', color: 'bg-green-500' },
  { key: 'live', label: 'Live', color: 'bg-blue-500' },
  { key: 'todo', label: 'Todo', color: 'bg-amber-500' },
  { key: 'candidate-pool', label: 'Draft', color: 'bg-zinc-500' },
  { key: 'storage', label: 'Storage', color: 'bg-purple-500' },
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
    fetch(`/api/${series}/episodes`).then(r => r.json()).then(setEpisodes).catch(() => setEpisodes([]))
    fetch(`/api/${series}/candidates`).then(r => r.json()).then(setCandidates).catch(() => setCandidates([]))
  }, [series])

  useEffect(fetchAll, [fetchAll])

  if (!seriesDef) return <div className="text-text-dim">시리즈를 찾을 수 없다.</div>

  const persons = groupByPerson(episodes)
  const realNames = new Set(episodes.map(e => e.name))

  const filteredPersons = persons
    .filter(p => tab !== 'candidate-pool' && tab !== 'storage' && p.parts.some(pt => pt.status === tab))
    .filter(p => {
      const q = search.toLowerCase()
      return p.personKey.includes(q) || p.nickname.includes(search)
    })

  const filteredCandidates = candidates
    .filter(d => !realNames.has(d.name))
    .filter(d => {
      const q = search.toLowerCase()
      return d.name.includes(q) || d.nickname.includes(search)
    })

  const counts: Record<TabKey, number> = {
    done: persons.filter(p => p.parts.some(pt => pt.status === 'done')).length,
    live: persons.filter(p => p.parts.some(pt => pt.status === 'live')).length,
    todo: persons.filter(p => p.parts.some(pt => pt.status === 'todo')).length,
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

  const handleStatusChange = async (baseName: string, newStatus: EpisodeStatus) => {
    setChangingStatus(baseName)
    try {
      await fetch(`/api/${series}/status`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: baseName, status: newStatus }),
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

      <div className="flex gap-1 rounded-md overflow-hidden border border-border text-xs mb-6 w-fit">
        {STATUS_TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 font-semibold transition-colors ${tab === t.key ? `${t.color} text-white` : 'text-text-secondary hover:text-text-primary'}`}>
            {t.label}{counts[t.key] >= 0 ? ` ${counts[t.key]}` : ''}
          </button>
        ))}
      </div>

      <input type="text" placeholder="인물 검색..." value={search} onChange={e => setSearch(e.target.value)}
        className="w-full max-w-sm bg-bg-card border border-border rounded-md px-3 py-2 text-sm mb-6 focus:outline-none focus:border-accent" />

      {tab === 'storage' && <VoiceStorage series={series} />}

      {tab !== 'candidate-pool' && tab !== 'storage' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {filteredPersons.map(p => (
            <PersonCard key={`${p.personKey}-${tab}`} person={p} series={series}
              tabStatus={tab as EpisodeStatus}
              onStatusChange={handleStatusChange} changingStatus={changingStatus} />
          ))}
          {filteredPersons.length === 0 && <p className="text-sm text-text-dim col-span-full">해당 상태의 에피소드가 없다.</p>}
        </div>
      )}

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
