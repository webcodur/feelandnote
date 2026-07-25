import { useState, useEffect, useCallback, useMemo } from 'react'
import { usePathname } from 'next/navigation'
import { SERIES, isSeriesModel } from '@/lib/series-registry'
import type { CandidateSummary, EpisodeSummary, PersonGroup, TabKey } from './types'
import { groupByPerson, tabKeyId } from './utils'
import { SIDEBAR_COLLAPSED_KEY } from './constants'

export function useSidebarState() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [activeSeries, setActiveSeries] = useState<string | null>(null)
  const [episodes, setEpisodes] = useState<EpisodeSummary[]>([])
  const [candidates, setCandidates] = useState<CandidateSummary[]>([])
  const [search, setSearch] = useState('')
  const [tab, setTab] = useState<TabKey>({ kind: 'group', group: '' })

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY)
      if (saved !== null) setCollapsed(saved === '1')
    } catch {}
  }, [])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // 물리적 키 위치(KeyB)로 판정한다. e.key는 CapsLock·한영 전환·Shift에 따라 'B'/'ㅠ'로 바뀌어 빗나간다.
      if (e.ctrlKey && e.code === 'KeyB') {
        e.preventDefault()
        setCollapsed(prev => {
          const next = !prev
          try { window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? '1' : '0') } catch {}
          return next
        })
      }
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
    // 인물 묶음·후보 풀은 책 기반(서재 탐방) 전용이다. 담화는 전용 목록 컴포넌트가
    // 자체적으로 불러오므로 여기서는 건너뛴다.
    if (!activeSeries || !isSeriesModel(activeSeries, 'book')) { setEpisodes([]); setCandidates([]); return }
    fetch(`/api/${activeSeries}/episodes`).then(r => r.json()).then(setEpisodes).catch(() => setEpisodes([]))
    fetch(`/api/${activeSeries}/candidates`).then(r => r.json()).then(setCandidates).catch(() => setCandidates([]))
  }, [activeSeries])

  useEffect(fetchList, [fetchList])

  const byBirth = (a: { birthYear: number | null }, b: { birthYear: number | null }) =>
    (a.birthYear ?? 9999) - (b.birthYear ?? 9999)

  const persons = useMemo(() => groupByPerson(episodes), [episodes])

  // 그룹 정렬: 이름 있는 그룹 알파벳 → '' (그 외) → '_archive' (보관소)
  const groupKeys = useMemo(() => {
    const set = new Set<string>()
    for (const p of persons) set.add(p.group)
    const arr = [...set].filter(g => g !== '' && g !== '_archive').sort()
    if (set.has('')) arr.push('')
    if (set.has('_archive')) arr.push('_archive')
    return arr
  }, [persons])

  // 첫 로드 시 첫 그룹으로 자동 이동
  useEffect(() => {
    if (tab.kind !== 'group') return
    if (groupKeys.length === 0) return
    if (!groupKeys.includes(tab.group)) {
      setTab({ kind: 'group', group: groupKeys[0] })
    }
  }, [groupKeys, tab])

  const groupCounts = groupKeys.map(g => ({
    group: g,
    count: persons.filter(p => p.group === g).length,
  }))

  const filteredPersons = useMemo(() => {
    if (tab.kind !== 'group') return [] as PersonGroup[]
    const q = search.toLowerCase()
    return persons
      .filter(p => p.group === tab.group)
      .filter(p => p.personKey.includes(q) || p.nickname.includes(search))
      .sort((a, b) => byBirth(a, b))
  }, [persons, tab, search])

  const realNames = new Set(episodes.map(e => e.name))
  const filteredCandidates = candidates.filter(d => {
    if (realNames.has(d.name)) return false
    const q = search.toLowerCase()
    return d.name.includes(q) || d.nickname.includes(search)
  }).sort((a, b) => byBirth(a, b))

  const tabId = tabKeyId(tab)

  return {
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
  }
}
