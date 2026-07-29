'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getSeriesById } from '@/features/book-recommend/lib/series-registry'
import { TaskPanel } from '@/features/book-recommend/components/TaskPanel'
import { VoiceStorage } from '@/features/book-recommend/components/VoiceStorage'

type EpisodeStatus = 'todo' | 'live' | 'done'

type EpisodeSummary = {
  name: string; nickname: string; booksCount: number; hasShorts: boolean
  voiceCount: number; voiceSizeMB: number
  status: EpisodeStatus
  group: string
}

type CandidateSummary = { name: string; nickname: string; booksCount: number }

type PartEntry = {
  partNum: number
  baseName: string
  status: EpisodeStatus
  group: string
  ko?: EpisodeSummary
  en?: EpisodeSummary
}

type PersonGroup = {
  personKey: string
  nickname: string
  status: EpisodeStatus
  group: string
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
      partMap.set(groupKey, { partNum, baseName: groupKey, status: ep.status ?? 'todo', group: ep.group ?? '' })
    }
    const part = partMap.get(groupKey)!
    if (isEn) part.en = ep
    else { part.ko = ep; part.status = ep.status ?? 'todo'; part.group = ep.group ?? '' }

    if (!personMap.has(basePerson)) {
      personMap.set(basePerson, { personKey: basePerson, nickname: ep.nickname, status: ep.status ?? 'todo', group: ep.group ?? '', parts: [] })
    }
    const person = personMap.get(basePerson)!
    if (!isEn) {
      person.nickname = ep.nickname
      person.group = ep.group ?? ''
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

const STATUS_OPTIONS: { value: EpisodeStatus; label: string }[] = [
  { value: 'todo', label: 'Todo' },
  { value: 'live', label: 'Live' },
  { value: 'done', label: 'Done' },
]

const STATUS_DOT_COLOR: Record<EpisodeStatus, string> = {
  todo: 'bg-amber-500',
  live: 'bg-blue-500',
  done: 'bg-green-500',
}

function PersonTableRow({ person, series, onStatusChange, changingStatus }: {
  person: PersonGroup
  series: string
  onStatusChange: (baseName: string, status: EpisodeStatus) => void
  changingStatus: string | null
}) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const part = person.parts[selectedIdx] ?? person.parts[0]
  const primary = part.ko ?? part.en!
  const router = useRouter()

  return (
    <tr 
      className="group border-b border-border/50 hover:bg-bg-card cursor-pointer"
      onClick={(e) => {
        const target = e.target as HTMLElement
        if (target.closest('button, a, select')) return
        router.push(`/${series}/${primary.name}`)
      }}
    >
      <td className="py-2 px-3 align-middle w-24">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT_COLOR[part.status]}`} title={part.status} />
          <select
            value={part.status}
            onChange={e => onStatusChange(part.baseName, e.target.value as EpisodeStatus)}
            disabled={changingStatus === part.baseName}
            className="text-[11px] bg-bg-card border border-border/40 rounded px-1 py-0.5 text-text-secondary cursor-pointer disabled:opacity-50">
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
      </td>
      <td className="py-2 px-3 align-middle">
        <Link href={`/${series}/${primary.name}`} className="font-semibold group-hover:text-accent">
          {person.nickname}
        </Link>
      </td>
      <td className="py-2 px-3 align-middle w-32">
        {person.parts.length > 1 ? (
          <div className="flex gap-0.5 flex-wrap">
            {person.parts.map((p, i) => (
              <button key={p.baseName} onClick={() => setSelectedIdx(i)}
                className={`text-[11px] px-1.5 py-0.5 rounded font-bold ${i === selectedIdx ? 'bg-accent text-bg-main' : 'bg-bg-main border border-border text-text-dim hover:text-accent hover:border-accent/40'}`}>
                {p.partNum}편
              </button>
            ))}
          </div>
        ) : (
          <span className="text-text-dim text-[11px]">1편</span>
        )}
      </td>
      <td className="py-2 px-3 align-middle w-24">
        <div className="flex gap-1">
          {part.ko ? (
            <Link href={`/${series}/${part.ko.name}`} className="text-[11px] px-1.5 py-px rounded bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500/30">KO</Link>
          ) : <span className="text-[11px] px-1.5 py-px rounded bg-bg-main text-text-dim border border-border">KO</span>}
          {part.en ? (
            <Link href={`/${series}/${part.en.name}`} className="text-[11px] px-1.5 py-px rounded bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30">EN</Link>
          ) : <span className="text-[11px] px-1.5 py-px rounded bg-bg-main text-text-dim border border-border">EN</span>}
        </div>
      </td>
      <td className="py-2 px-3 align-middle text-xs text-text-secondary w-24">
        {primary.booksCount}권{primary.hasShorts ? ' · Shorts' : ''}
      </td>
      <td className="py-2 px-3 align-middle text-xs text-text-secondary">
        {part.ko ? <span>{part.ko.voiceCount} wav · {part.ko.voiceSizeMB}MB</span> : '-'}
      </td>
      <td className="py-2 px-3 align-middle text-xs text-text-secondary">
        {part.en ? <span>{part.en.voiceCount} wav · {part.en.voiceSizeMB}MB</span> : '-'}
      </td>
    </tr>
  )
}

/** 그룹 라벨 — 빈 그룹은 "그 외"(루트), 그 외에는 group 마지막 세그먼트의 키 그대로. */
function groupLabel(group: string): string {
  if (!group) return '그 외'
  if (group === '_archive') return '보관소'
  return group.split('/').pop() || group
}

type TabKey =
  | { kind: 'group'; group: string }     // 인물 폴더 그룹별
  | { kind: 'candidate-pool' }
  | { kind: 'storage' }

function tabKeyId(t: TabKey): string {
  if (t.kind === 'group') return `g:${t.group}`
  return t.kind
}

export default function BookRecommendProductionDashboard() {
  return <BookRecommendSeriesHome series="book-recommend" />
}

function BookRecommendSeriesHome({ series }: { series: string }) {
  const seriesDef = getSeriesById(series)
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([])
  const [candidates, setCandidates] = useState<CandidateSummary[]>([])
  const [search, setSearch] = useState('')
  const [sortOption, setSortOption] = useState<'name' | 'books-desc' | 'voice-desc' | 'status'>('name')
  const [tab, setTab] = useState<TabKey>({ kind: 'group', group: '' })
  const [promoting, setPromoting] = useState<string | null>(null)
  const [changingStatus, setChangingStatus] = useState<string | null>(null)

  useEffect(() => {
    if (seriesDef) document.title = `${seriesDef.label} — Feel & Note BO`
  }, [seriesDef])

  const fetchAll = useCallback(() => {
    fetch(`/api/${series}/episodes`).then(r => r.json()).then(setEpisodes).catch(() => setEpisodes([]))
    fetch(`/api/${series}/candidates`).then(r => r.json()).then(setCandidates).catch(() => setCandidates([]))
  }, [series])

  useEffect(fetchAll, [fetchAll])

  // 모든 인물 묶음
  const persons = useMemo(() => groupByPerson(episodes), [episodes])
  const realNames = useMemo(() => new Set(episodes.map(e => e.name)), [episodes])

  // 그룹 동적 추출 — 인물이 한 명이라도 속한 그룹들의 정렬된 집합
  const groupKeys = useMemo(() => {
    const set = new Set<string>()
    for (const p of persons) set.add(p.group)
    // 빈 그룹("")은 항상 맨 뒤(그 외). _archive 는 더 뒤.
    const arr = [...set].filter(g => g !== '' && g !== '_archive').sort()
    if (set.has('')) arr.push('')
    if (set.has('_archive')) arr.push('_archive')
    return arr
  }, [persons])

  // 첫 로드 시 첫 그룹으로 자동 이동(빈 그룹이 첫 자리에 잡혀 있으면 그대로 OK)
  useEffect(() => {
    if (tab.kind !== 'group') return
    if (groupKeys.length === 0) return
    if (!groupKeys.includes(tab.group)) {
      setTab({ kind: 'group', group: groupKeys[0] })
    }
  }, [groupKeys, tab])

  if (!seriesDef) return <div className="text-text-dim">시리즈를 찾을 수 없다.</div>

  const filteredPersons = tab.kind === 'group'
    ? persons
        .filter(p => p.group === tab.group)
        .filter(p => {
          const q = search.toLowerCase()
          return p.personKey.includes(q) || p.nickname.includes(search)
        })
        .sort((a, b) => {
          if (sortOption === 'name') return a.nickname.localeCompare(b.nickname)
          const aPrimary = a.parts[0]?.ko ?? a.parts[0]?.en
          const bPrimary = b.parts[0]?.ko ?? b.parts[0]?.en
          if (sortOption === 'books-desc') return (bPrimary?.booksCount ?? 0) - (aPrimary?.booksCount ?? 0)
          if (sortOption === 'voice-desc') return (bPrimary?.voiceCount ?? 0) - (aPrimary?.voiceCount ?? 0)
          if (sortOption === 'status') {
            const statusWeight = { todo: 0, live: 1, done: 2 }
            const wA = statusWeight[a.status] ?? 0
            const wB = statusWeight[b.status] ?? 0
            if (wA !== wB) return wA - wB
            return a.nickname.localeCompare(b.nickname)
          }
          return 0
        })
    : []

  const filteredCandidates = candidates
    .filter(d => !realNames.has(d.name))
    .filter(d => {
      const q = search.toLowerCase()
      return d.name.includes(q) || d.nickname.includes(search)
    })
    .sort((a, b) => {
      if (sortOption === 'books-desc') return (b.booksCount ?? 0) - (a.booksCount ?? 0)
      return a.nickname.localeCompare(b.nickname)
    })

  const groupCounts = groupKeys.map(g => ({
    group: g,
    count: persons.filter(p => p.group === g).length,
  }))

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

  const tabId = tabKeyId(tab)

  const openFolder = (target: 'episodes' | 'archive') => {
    fetch('/api/open-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target }),
    }).catch(() => {})
  }

  return (
    <div>
      <div className="flex items-center gap-4 mb-1">
        <h1 className="text-xl font-bold">{seriesDef.icon} {seriesDef.label}</h1>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/book-recommend/search" className="text-xs font-semibold text-accent hover:text-accent-hover">
            + 새 에피소드
          </Link>
          <Link href="/book-recommend/guide" className="text-xs font-semibold text-text-secondary hover:text-accent">
            가이드
          </Link>
          <button onClick={() => openFolder('episodes')}
            className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-accent hover:border-accent/60 hover:bg-accent/10 font-semibold">
            📁 에피소드 폴더
          </button>
          <button onClick={() => openFolder('archive')}
            className="text-xs px-2 py-1 rounded border border-border text-text-secondary hover:text-accent hover:border-accent/60 hover:bg-accent/10 font-semibold">
            📁 보관소
          </button>
          <Link href={`/${series}/youtube`} className="text-xs text-text-secondary hover:text-accent font-semibold">
            YouTube 편성 →
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-md border border-border text-xs mb-6 w-fit overflow-hidden">
        {groupCounts.map(({ group, count }) => {
          const id = `g:${group}`
          const active = tabId === id
          return (
            <button key={id} onClick={() => setTab({ kind: 'group', group })}
              className={`px-3 py-1.5 font-semibold ${active ? 'bg-accent text-bg-main' : 'text-text-secondary hover:text-text-primary'}`}>
              {groupLabel(group)} {count}
            </button>
          )
        })}
        <button onClick={() => setTab({ kind: 'candidate-pool' })}
          className={`px-3 py-1.5 font-semibold ${tabId === 'candidate-pool' ? 'bg-zinc-500 text-white' : 'text-text-secondary hover:text-text-primary'}`}>
          Draft {filteredCandidates.length}
        </button>
        <button onClick={() => setTab({ kind: 'storage' })}
          className={`px-3 py-1.5 font-semibold ${tabId === 'storage' ? 'bg-purple-500 text-white' : 'text-text-secondary hover:text-text-primary'}`}>
          Storage
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <input type="text" placeholder="인물 검색..." value={search} onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm bg-bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent" />
        <select value={sortOption} onChange={e => setSortOption(e.target.value as any)}
          className="bg-bg-card border border-border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-accent text-text-secondary cursor-pointer">
          <option value="name">가나다순</option>
          <option value="books-desc">책 많은 순</option>
          <option value="voice-desc">음성 많은 순</option>
          <option value="status">상태순 (Todo 우선)</option>
        </select>
      </div>

      {tab.kind === 'storage' && <VoiceStorage series={series} />}

      {tab.kind === 'group' && (
        <div className="mb-8 overflow-x-auto border border-border rounded-lg bg-bg-secondary/20">
          <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-text-secondary bg-bg-secondary/50">
                <th className="py-2 px-3 font-semibold">상태</th>
                <th className="py-2 px-3 font-semibold">인물명</th>
                <th className="py-2 px-3 font-semibold">편수</th>
                <th className="py-2 px-3 font-semibold">언어</th>
                <th className="py-2 px-3 font-semibold">책 권수</th>
                <th className="py-2 px-3 font-semibold">음성 (KO)</th>
                <th className="py-2 px-3 font-semibold">음성 (EN)</th>
              </tr>
            </thead>
            <tbody>
              {filteredPersons.map(p => (
                <PersonTableRow key={`${p.personKey}`} person={p} series={series}
                  onStatusChange={handleStatusChange} changingStatus={changingStatus} />
              ))}
              {filteredPersons.length === 0 && (
                <tr><td colSpan={7} className="py-8 text-center text-sm text-text-dim">이 그룹에 속한 인물이 없다.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab.kind === 'candidate-pool' && (
        <div className="mb-8 overflow-x-auto border border-border rounded-lg bg-bg-secondary/20">
          <table className="w-full text-left border-collapse text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-border text-text-secondary bg-bg-secondary/50">
                <th className="py-2 px-3 font-semibold">인물명</th>
                <th className="py-2 px-3 font-semibold">ID</th>
                <th className="py-2 px-3 font-semibold">책 권수</th>
                <th className="py-2 px-3 font-semibold text-right">액션</th>
              </tr>
            </thead>
            <tbody>
              {filteredCandidates.map(d => (
                <tr key={d.name} className="border-b border-border/50 hover:bg-bg-card">
                  <td className="py-3 px-3 font-semibold">{d.nickname}</td>
                  <td className="py-3 px-3 text-xs text-text-dim">{d.name}</td>
                  <td className="py-3 px-3 text-xs text-text-secondary">{d.booksCount}권</td>
                  <td className="py-3 px-3 text-right">
                    <button
                      onClick={() => handlePromote(d.name)}
                      disabled={promoting === d.name}
                      className="text-[11px] px-2 py-1 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 hover:bg-amber-500/30 font-semibold disabled:opacity-50">
                      {promoting === d.name ? 'Promoting...' : 'Promote'}
                    </button>
                  </td>
                </tr>
              ))}
              {filteredCandidates.length === 0 && (
                <tr><td colSpan={4} className="py-8 text-center text-sm text-text-dim">검색 결과 없음</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <TaskPanel />
    </div>
  )
}
