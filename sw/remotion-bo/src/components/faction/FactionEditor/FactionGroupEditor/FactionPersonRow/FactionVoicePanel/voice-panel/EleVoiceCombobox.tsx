'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  type EleVoiceLike,
  type EleSortKey,
  ELE_SORT_LABEL,
  collectFacets,
  matchesFacets,
  sortVoices,
  facetLabel,
  facetValueLabel,
} from '../../../../../../voice-utils'
import { ELE_VOICE_STATUS_LABEL, type EleVoiceNote, type EleVoiceNoteStatus } from '@/lib/ele-voice-notes'
import type { FactionVoiceHistoryEntry } from '@/lib/faction-voice-casting-history'
import type { FactionEleVoiceRecommendation } from './faction-voice-recommendations'

/**
 * ElevenLabs 보이스 콤보박스 — 드롭다운(전체 목록 + 이름 검색 + 거르기·정렬)과 직접 입력을 한 위젯에 합친다.
 *
 * 표준 datalist 는 입력값(voiceId)으로 목록을 필터링해, 보이스가 선택된 상태(입력칸에 id 가 차 있음)에서
 * 드롭다운을 다시 열면 그 id 와 매칭되는 항목만 떠 사실상 목록이 사라진다. 그래서 직접 구현한다.
 *
 * 동작:
 *  - 입력칸 클릭/포커스 → 드롭다운 펼침. 검색어가 비면 전체 목록, 입력하면 이름으로 필터.
 *  - 성별·나이·억양·언어·용도·분류 칩으로 거르고, 이름·분류·미리듣기 기준으로 정렬한다.
 *  - 목록 항목 클릭 → 그 보이스 voiceId 를 저장(입력칸엔 이름 표시).
 *  - 목록에 없는 보이스 → 검색어를 그대로 voiceId 로 지정하는 항목이 맨 아래에 뜬다(공유 보이스 등 대응).
 *  - 검색은 query 로만 다루고 저장은 명시적 선택(클릭)으로만 — 타이핑이 곧장 저장되지 않아 검색/직접입력이 안 섞인다.
 */

type Voice = EleVoiceLike
type VoiceQuickFilter = 'good' | 'maybe' | 'noted' | 'used' | 'unused'

const QUICK_FILTER_LABEL: Record<VoiceQuickFilter, string> = {
  good: '좋음',
  maybe: '보류',
  noted: '메모 있음',
  used: '기존 사용',
  unused: '미사용',
}
const QUICK_FILTERS: VoiceQuickFilter[] = ['good', 'maybe', 'noted', 'used', 'unused']

export function EleVoiceCombobox({
  voices, value, onChange, loading, error, recommendations = [],
  voiceNotes = {}, notesLoading = false, notesError = null, savingVoiceId = null, onUpdateVoiceNote,
  voiceHistory = {}, historyLoading = false, historyError = null, historyUsageCount = 0,
}: {
  voices: Voice[]
  /** 현재 voiceId */
  value: string
  /** voiceId 변경 */
  onChange: (voiceId: string) => void
  loading: boolean
  error: string | null
  recommendations?: FactionEleVoiceRecommendation[]
  voiceNotes?: Record<string, EleVoiceNote>
  notesLoading?: boolean
  notesError?: string | null
  savingVoiceId?: string | null
  onUpdateVoiceNote?: (voice: Voice, patch: { status?: EleVoiceNoteStatus | null; note?: string }) => void
  voiceHistory?: Record<string, FactionVoiceHistoryEntry>
  historyLoading?: boolean
  historyError?: string | null
  historyUsageCount?: number
}) {
  const [open, setOpen] = useState(false)
  // 편집(검색) 중 여부 — 켜지면 입력칸이 query 를, 꺼지면 선택된 보이스 이름을 보여준다.
  const [editing, setEditing] = useState(false)
  const [query, setQuery] = useState('')
  // 거르기·정렬 상태.
  const [activeFacets, setActiveFacets] = useState<Record<string, string[]>>({})
  const [sortKey, setSortKey] = useState<EleSortKey>('default')
  const [previewOnly, setPreviewOnly] = useState(false)
  const [recommendationOnly, setRecommendationOnly] = useState(false)
  const [showBlocked, setShowBlocked] = useState(false)
  const [quickFilters, setQuickFilters] = useState<VoiceQuickFilter[]>([])
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({})
  const wrapRef = useRef<HTMLDivElement>(null)
  // 보이스 샘플 미리듣기 — ElevenLabs preview_url 을 재생. 한 번에 하나만.
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [previewingId, setPreviewingId] = useState<string | null>(null)

  const playPreview = (v: Voice) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    if (previewingId === v.voice_id) { setPreviewingId(null); return }
    if (!v.preview_url) return
    const a = new Audio(v.preview_url)
    audioRef.current = a
    setPreviewingId(v.voice_id)
    a.onended = () => setPreviewingId(null)
    a.play().catch(() => setPreviewingId(null))
  }

  // 드롭다운이 닫히면 재생을 멈춘다(선택·바깥 클릭·Escape 모두 setOpen(false) 경유).
  useEffect(() => {
    if (open) return
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null }
    setPreviewingId(null)
  }, [open])

  const selected = voices.find(v => v.voice_id === value)
  useEffect(() => {
    setNoteDrafts(prev => {
      let changed = false
      const next = { ...prev }
      for (const note of Object.values(voiceNotes)) {
        if (!(note.voiceId in next)) {
          next[note.voiceId] = note.note ?? ''
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [voiceNotes])
  const voiceById = useMemo(
    () => new Map(voices.map(v => [v.voice_id, v])),
    [voices],
  )
  const recommendationById = useMemo(
    () => new Map(recommendations.map((r, index) => [r.voiceId, { ...r, rank: index + 1 }])),
    [recommendations],
  )
  const recommendationIdSet = useMemo(
    () => new Set(recommendations.map(r => r.voiceId)),
    [recommendations],
  )
  const topRecommendations = useMemo(
    () => recommendations
      .map((rec, index) => ({ rec, rank: index + 1, voice: voiceById.get(rec.voiceId) }))
      .filter((item): item is { rec: FactionEleVoiceRecommendation; rank: number; voice: Voice } => !!item.voice)
      .slice(0, 3),
    [recommendations, voiceById],
  )
  const blockedCount = useMemo(
    () => Object.values(voiceNotes).filter(n => n.status === 'blocked').length,
    [voiceNotes],
  )
  // 표시값: 검색 중이면 입력 query, 아니면 선택된 이름(목록에 없으면 raw voiceId).
  const display = editing ? query : (selected?.name ?? value)

  // 바깥 클릭 시 닫기 + 검색 종료(표시값을 선택 이름으로 되돌린다).
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false); setEditing(false); setQuery('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const facets = useMemo(() => collectFacets(voices), [voices])
  const activeFacetCount = useMemo(
    () => Object.values(activeFacets).reduce((n, vs) => n + vs.length, 0)
      + (previewOnly ? 1 : 0)
      + (recommendationOnly ? 1 : 0)
      + (showBlocked ? 1 : 0)
      + quickFilters.length,
    [activeFacets, previewOnly, recommendationOnly, showBlocked, quickFilters.length])

  const q = query.trim().toLowerCase()
  const matchesQuickFilters = useCallback((voiceId: string) => quickFilters.every(filter => {
    const note = voiceNotes[voiceId]
    const history = voiceHistory[voiceId]
    if (filter === 'good') return note?.status === 'good'
    if (filter === 'maybe') return note?.status === 'maybe'
    if (filter === 'noted') return !!note?.note
    if (filter === 'used') return !!history?.count
    return !history?.count
  }), [quickFilters, voiceHistory, voiceNotes])
  const filtered = useMemo(() => {
    const result = voices.filter(v =>
      (showBlocked || voiceNotes[v.voice_id]?.status !== 'blocked')
      &&
      (!recommendationOnly || recommendationIdSet.has(v.voice_id))
      &&
      matchesQuickFilters(v.voice_id)
      &&
      (!q || v.name.toLowerCase().includes(q))
      && matchesFacets(v, activeFacets)
      && (!previewOnly || !!v.preview_url))
    const sorted = sortVoices(result, sortKey)
    if (!recommendationOnly) return sorted
    return sorted.sort((a, b) =>
      (recommendationById.get(a.voice_id)?.rank ?? 999) - (recommendationById.get(b.voice_id)?.rank ?? 999))
  }, [voices, q, activeFacets, previewOnly, recommendationOnly, showBlocked, voiceNotes, recommendationIdSet, recommendationById, sortKey, matchesQuickFilters])

  // 검색어가 어느 보이스 이름과도 정확히 안 맞고, 이미 등록된 id 도 아니면 "직접 지정" 항목을 띄운다.
  const rawQuery = query.trim()
  const showRaw = !!rawQuery
    && !voices.some(v => v.name.toLowerCase() === q || v.voice_id === rawQuery)

  const pick = (voiceId: string) => {
    onChange(voiceId)
    setEditing(false); setOpen(false); setQuery('')
  }

  const toggleFacet = (key: string, val: string) => {
    setActiveFacets(prev => {
      const cur = prev[key] ?? []
      const next = cur.includes(val) ? cur.filter(x => x !== val) : [...cur, val]
      const out = { ...prev, [key]: next }
      if (!next.length) delete out[key]
      return out
    })
  }
  const toggleQuickFilter = (filter: VoiceQuickFilter) => {
    setQuickFilters(prev => {
      if (prev.includes(filter)) return prev.filter(item => item !== filter)

      let next = [...prev, filter]
      if (filter === 'good') next = next.filter(item => item !== 'maybe')
      if (filter === 'maybe') next = next.filter(item => item !== 'good')
      if (filter === 'used') next = next.filter(item => item !== 'unused')
      if (filter === 'unused') next = next.filter(item => item !== 'used')
      return next
    })
  }
  const clearFacets = () => {
    setActiveFacets({})
    setPreviewOnly(false)
    setRecommendationOnly(false)
    setShowBlocked(false)
    setQuickFilters([])
  }
  const showRecommendations = () => {
    setOpen(true)
    setEditing(false)
    setQuery('')
    setRecommendationOnly(true)
  }
  const historyLabel = (entry: FactionVoiceHistoryEntry | undefined) => {
    if (!entry?.count) return null
    const names = entry.usages.slice(0, 3).map(usage => usage.personName).join(', ')
    return `사용 ${entry.count}회${names ? ` · ${names}` : ''}`
  }

  return (
    <div ref={wrapRef} className="relative" onClick={e => e.stopPropagation()}>
      <div className="flex items-stretch rounded border border-border overflow-hidden">
        <span className="px-2 flex items-center text-sm text-text-secondary bg-slate-100 text-slate-800 font-extrabold border-r border-slate-300 shrink-0">ELE 보이스</span>
        <input
          type="text"
          value={display}
          onFocus={() => { setEditing(true); setQuery(''); setRecommendationOnly(false); setOpen(true) }}
          onChange={e => { setEditing(true); setQuery(e.target.value); setRecommendationOnly(false); setOpen(true) }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (filtered.length) pick(filtered[0].voice_id)
              else if (rawQuery) pick(rawQuery)
            } else if (e.key === 'Escape') {
              setOpen(false); setEditing(false); setQuery('')
            }
          }}
          placeholder={loading ? '불러오는 중…' : selected ? selected.name : '보이스 검색 또는 voiceId 입력'}
          className="h-8 flex-1 text-sm bg-white px-3 text-slate-950 font-bold focus:outline-none"
        />
        <button
          type="button"
          onMouseDown={e => e.preventDefault()}
          onClick={() => { setOpen(o => !o); setEditing(false); setQuery(''); setRecommendationOnly(false) }}
          className="px-2 flex items-center bg-white text-slate-500 hover:text-slate-800 border-l border-slate-200 shrink-0"
          title="목록 펼치기"
        >▼</button>
      </div>

      {topRecommendations.length > 0 && (
        <div className="mt-1.5 rounded border border-amber-300 bg-amber-50 px-2 py-1.5">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[11px] font-black text-amber-800">추천 후보</span>
            <span className="font-mono text-[10px] text-amber-700">{recommendations.length}</span>
            <button
              type="button"
              onClick={showRecommendations}
              className="ml-auto rounded border border-amber-300 bg-white px-2 py-0.5 text-[10px] font-bold text-amber-800 hover:bg-amber-100"
            >
              후보만 보기
            </button>
          </div>
          <div className="grid gap-1 sm:grid-cols-3">
            {topRecommendations.map(({ rec, rank, voice }) => {
              const isPlaying = previewingId === voice.voice_id
              const history = voiceHistory[voice.voice_id]
              return (
                <div key={voice.voice_id} className="flex min-w-0 items-center gap-1 rounded border border-amber-200 bg-white px-1.5 py-1">
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); playPreview(voice) }}
                    disabled={!voice.preview_url}
                    title={voice.preview_url ? '미리듣기' : '미리듣기 없음'}
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] ${
                      voice.preview_url
                        ? 'border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                        : 'border border-slate-200 bg-white text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    {isPlaying ? '■' : '▶'}
                  </button>
                  <button
                    type="button"
                    onClick={() => pick(voice.voice_id)}
                    title={rec.reasons.join(' · ')}
                    className="min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-[11px] font-extrabold text-slate-900">{rank}. {voice.name}</span>
                    <span className="block truncate text-[10px] font-semibold text-amber-700">{rec.reasons.slice(0, 2).join(' · ')}</span>
                    {history && <span className="block truncate text-[10px] font-semibold text-slate-500">{historyLabel(history)}</span>}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {(notesLoading || notesError || blockedCount > 0 || historyLoading || historyError || historyUsageCount > 0) && (
        <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-500">
          {notesLoading && <span>보이스 메모 불러오는 중…</span>}
          {notesError && <span className="text-danger-text">메모 저장소 오류: {notesError}</span>}
          {blockedCount > 0 && <span className="font-semibold text-slate-600">제외 {blockedCount}개</span>}
          {historyLoading && <span>기존 매칭 읽는 중…</span>}
          {historyError && <span className="text-danger-text">매칭 이력 오류: {historyError}</span>}
          {historyUsageCount > 0 && <span className="font-semibold text-slate-600">기존 매칭 {historyUsageCount}건</span>}
        </div>
      )}

      {open && (
        <>
        {/* 뒤 배경 — 클릭 시 닫기. 큰 목록 패널을 뒤 화면과 분리한다 */}
        <div
          className="fixed inset-0 z-40 bg-black/40"
          onMouseDown={() => { setOpen(false); setEditing(false); setQuery('') }}
        />
        <div className="fixed left-1/2 top-1/2 z-50 flex h-[88vh] w-[min(48rem,92vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded border border-slate-300 bg-white shadow-2xl">
          {loading && <div className="px-3 py-2 text-xs text-slate-500 font-bold">불러오는 중…</div>}
          {error && <div className="px-3 py-2 text-xs text-danger-text font-bold">목록 로드 실패 — voiceId 직접 입력: {error}</div>}

          {/* 거르기·정렬 막대 — 칩이 많아도 목록을 밀어내지 않게 최대 높이를 두고 자체 스크롤한다 */}
          {!loading && !error && (facets.length > 0 || voices.length > 0) && (
            <div className="max-h-[40%] shrink-0 space-y-1.5 overflow-auto border-b border-slate-200 bg-white px-3 py-2">
              <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-600">
                <span className="font-semibold">정렬</span>
                <select
                  value={sortKey}
                  onChange={e => setSortKey(e.target.value as EleSortKey)}
                  className="rounded border border-slate-300 bg-white px-1.5 py-0.5 text-[11px] text-slate-800 font-bold focus:outline-none"
                >
                  {(Object.keys(ELE_SORT_LABEL) as EleSortKey[]).map(k => (
                    <option key={k} value={k}>{ELE_SORT_LABEL[k]}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setPreviewOnly(!previewOnly)}
                  className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                    previewOnly
                      ? 'bg-purple-100 text-purple-700 border-purple-300'
                      : 'bg-white border-slate-300 text-slate-500 hover:text-slate-800'
                  }`}
                >▶ 미리듣기만</button>
                {recommendations.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRecommendationOnly(!recommendationOnly)}
                    className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                      recommendationOnly
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : 'bg-white border-slate-300 text-slate-500 hover:text-slate-800'
                    }`}
                  >추천 {recommendations.length}</button>
                )}
                {blockedCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowBlocked(!showBlocked)}
                    className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${
                      showBlocked
                        ? 'bg-rose-100 text-rose-700 border-rose-300'
                        : 'bg-white border-slate-300 text-slate-500 hover:text-slate-800'
                    }`}
                  >제외 {showBlocked ? '표시' : '숨김'}</button>
                )}
                {QUICK_FILTERS.map(filter => {
                  const active = quickFilters.includes(filter)
                  const tone = filter === 'good'
                    ? active ? 'bg-emerald-100 text-emerald-700 border-emerald-300' : 'bg-white border-slate-300 text-slate-500 hover:text-slate-800'
                    : filter === 'maybe'
                      ? active ? 'bg-amber-100 text-amber-700 border-amber-300' : 'bg-white border-slate-300 text-slate-500 hover:text-slate-800'
                      : filter === 'used'
                        ? active ? 'bg-sky-100 text-sky-700 border-sky-300' : 'bg-white border-slate-300 text-slate-500 hover:text-slate-800'
                        : active ? 'bg-slate-200 text-slate-800 border-slate-400' : 'bg-white border-slate-300 text-slate-500 hover:text-slate-800'
                  return (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => toggleQuickFilter(filter)}
                      className={`px-1.5 py-0.5 rounded border text-[10px] font-bold ${tone}`}
                    >
                      {QUICK_FILTER_LABEL[filter]}
                    </button>
                  )
                })}
                <span className="ml-auto text-slate-400 font-mono">{filtered.length}/{voices.length}</span>
                {activeFacetCount > 0 && (
                  <button
                    type="button"
                    onClick={clearFacets}
                    className="px-1.5 py-0.5 rounded border border-slate-300 text-[10px] font-bold text-slate-500 hover:text-slate-800"
                  >초기화 ({activeFacetCount})</button>
                )}
              </div>

              {facets.map(f => {
                const sel = activeFacets[f.key] ?? []
                return (
                  <div key={f.key} className="flex items-start gap-1.5">
                    <span className="w-8 shrink-0 pt-0.5 text-[10px] font-bold text-slate-500">{facetLabel(f.key)}</span>
                    <div className="flex flex-1 flex-wrap items-center gap-1">
                      {f.values.map(val => {
                        const on = sel.includes(val)
                        return (
                          <button
                            key={val}
                            type="button"
                            onClick={() => toggleFacet(f.key, val)}
                            className={`px-1.5 py-0.5 rounded text-[10px] border font-bold ${
                              on
                                ? 'bg-emerald-100 text-emerald-700 border-emerald-300'
                                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400 hover:text-slate-700'
                            }`}
                          >{facetValueLabel(val)}</button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* 보이스 목록 — 필터 막대와 분리된 독립 스크롤 영역 */}
          <div className="min-h-0 flex-1 overflow-auto">
          {!loading && !error && filtered.length === 0 && !showRaw && (
            <div className="px-3 py-2 text-xs text-slate-400 font-bold">일치하는 보이스 없음</div>
          )}
          {!loading && !error && filtered.length > 0 && (
            <>
              {/* 헤더 행 — 컬럼: 듣기 · 이름 · 분류 · 보이스 ID */}
              <div className="sticky top-0 z-10 grid grid-cols-[24px_1fr_auto_148px] gap-3 border-b border-slate-200 bg-slate-100 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                <span />
                <span>이름</span>
                <span className="text-center">분류</span>
                <span>보이스 ID</span>
              </div>
              {filtered.map(v => {
                const sel = v.voice_id === value
                const gender = v.labels?.gender ?? null
                const age = v.labels?.age ?? null
                const isPlaying = previewingId === v.voice_id
                const rec = recommendationById.get(v.voice_id)
                const note = voiceNotes[v.voice_id]
                const history = voiceHistory[v.voice_id]
                const historyText = historyLabel(history)
                const noteDraft = noteDrafts[v.voice_id] ?? note?.note ?? ''
                const status = note?.status
                const blocked = status === 'blocked'
                return (
                  <div
                    key={v.voice_id}
                    role="button"
                    tabIndex={0}
                    onClick={() => pick(v.voice_id)}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(v.voice_id) } }}
                    className={`grid w-full cursor-pointer grid-cols-[24px_1fr_auto_148px] items-center gap-3 px-3 py-2 text-left ${
                      sel ? 'bg-emerald-50 text-emerald-800' : blocked ? 'bg-rose-50/70 text-slate-700 hover:bg-rose-50' : 'text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); playPreview(v) }}
                      disabled={!v.preview_url}
                      title={v.preview_url ? '미리듣기' : '미리듣기 없음'}
                      className={`flex h-5 w-5 items-center justify-center rounded text-[10px] ${
                        v.preview_url
                          ? 'border border-slate-300 bg-white text-slate-600 hover:border-purple-400 hover:text-purple-700'
                          : 'border border-slate-200 bg-white text-slate-300 cursor-not-allowed'
                      }`}
                    >{isPlaying ? '■' : '▶'}</button>
                    <span className="flex min-w-0 flex-col">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <span className={`truncate text-sm ${sel ? 'font-extrabold' : 'font-bold'}`}>{v.name}</span>
                        {rec && <span className="shrink-0 rounded bg-amber-100 px-1 text-[9px] font-black text-amber-800">추천 {rec.rank}</span>}
                        {history && <span className="shrink-0 rounded bg-slate-100 px-1 text-[9px] font-black text-slate-600">사용 {history.count}</span>}
                        {status && <span className={`shrink-0 rounded px-1 text-[9px] font-black ${
                          status === 'good' ? 'bg-emerald-100 text-emerald-700'
                            : status === 'maybe' ? 'bg-amber-100 text-amber-700'
                              : 'bg-rose-100 text-rose-700'
                        }`}>{ELE_VOICE_STATUS_LABEL[status]}</span>}
                        {gender && (
                          <span className={`shrink-0 rounded px-1 text-[9px] font-bold ${
                            gender === 'female' ? 'bg-pink-100 text-pink-700'
                              : gender === 'male' ? 'bg-sky-100 text-sky-700'
                              : 'bg-slate-100 text-slate-500'
                          }`}>{facetValueLabel(gender)}</span>
                        )}
                        {age && <span className="shrink-0 text-[9px] text-slate-400">{facetValueLabel(age)}</span>}
                        {v.account && (
                          <span className={`shrink-0 rounded px-1 text-[9px] font-bold ${
                            v.account.id === 'default'
                              ? 'bg-slate-100 text-slate-500'
                              : 'bg-amber-100 text-amber-700'
                          }`} title={`ElevenLabs 계정: ${v.account.label}`}>{v.account.label}</span>
                        )}
                      </span>
                      {rec && (
                        <span className="truncate text-[10px] font-semibold text-amber-700">{rec.reasons.slice(0, 3).join(' · ')}</span>
                      )}
                      {historyText && (
                        <span className="truncate text-[10px] font-semibold text-slate-500">{historyText}</span>
                      )}
                      {onUpdateVoiceNote && (
                        <span className="mt-1 flex min-w-0 items-center gap-1">
                          {(['good', 'maybe', 'blocked'] as const).map(s => (
                            <button
                              key={s}
                              type="button"
                              onClick={e => { e.stopPropagation(); onUpdateVoiceNote(v, { status: s }) }}
                              disabled={savingVoiceId === v.voice_id}
                              className={`shrink-0 rounded border px-1.5 py-0.5 text-[10px] font-bold disabled:opacity-50 ${
                                status === s
                                  ? s === 'good'
                                    ? 'border-emerald-300 bg-emerald-100 text-emerald-700'
                                    : s === 'maybe'
                                      ? 'border-amber-300 bg-amber-100 text-amber-700'
                                      : 'border-rose-300 bg-rose-100 text-rose-700'
                                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-400 hover:text-slate-800'
                              }`}
                            >
                              {ELE_VOICE_STATUS_LABEL[s]}
                            </button>
                          ))}
                          {status && (
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); onUpdateVoiceNote(v, { status: null }) }}
                              disabled={savingVoiceId === v.voice_id}
                              className="shrink-0 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-400 hover:border-slate-400 hover:text-slate-700 disabled:opacity-50"
                            >
                              해제
                            </button>
                          )}
                          <input
                            value={noteDraft}
                            onChange={e => setNoteDrafts(prev => ({ ...prev, [v.voice_id]: e.target.value }))}
                            onClick={e => e.stopPropagation()}
                            onMouseDown={e => e.stopPropagation()}
                            onKeyDown={e => e.stopPropagation()}
                            onBlur={e => {
                              const next = e.currentTarget.value.trim()
                              if (next !== (note?.note ?? '')) onUpdateVoiceNote(v, { note: next })
                            }}
                            placeholder="메모"
                            className="h-6 min-w-0 flex-1 rounded border border-slate-200 bg-white px-1.5 text-[11px] text-slate-800 outline-none focus:border-amber-400"
                          />
                        </span>
                      )}
                    </span>
                    <span className="text-center text-[10px] font-semibold text-slate-400">{v.category ? facetValueLabel(v.category) : '—'}</span>
                    <span className="truncate font-mono text-[10px] text-slate-400">{v.voice_id}</span>
                  </div>
                )
              })}
            </>
          )}
          {showRaw && (
            <button
              type="button"
              onClick={() => pick(rawQuery)}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs text-purple-700 font-extrabold border-t border-slate-200 hover:bg-purple-50"
            >
              &quot;{rawQuery}&quot; 를 voiceId 로 직접 지정
            </button>
          )}
          </div>
        </div>
        </>
      )}
    </div>
  )
}
