'use client'

import { Fragment, useState, useEffect, useMemo, useCallback, useRef } from 'react'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import {
  Plus,
  Search,
  X,
  PanelLeftClose,
  PanelLeft,
  ArrowUp,
  ListTree,
  ChevronsUpDown,
  ChevronsDownUp,
  ChevronDown,
  ChevronRight,
  Sliders,
  MessageSquare,
  Mic,
} from 'lucide-react'
import { factionSceneNumbers, factionSequenceOf, type FactionGroup } from '@/lib/faction-types'
import { factionShortsSegments } from '@feelandnote/shared/lib/faction-shorts'
import { emitFactionJump, highlightTargetElement, scrollToElement } from '../shared/faction-nav-events'

const STORAGE_COLLAPSED_KEY = 'feeln_faction_nav_collapsed'

type Props = {
  groups: FactionGroup[]
  editLang: EditLang
  onAddGroup: () => void
  /** 쇼츠 편 경계 켜고 끄기 — boundary 는 경계 앞 장면 수(장면 사이 1…n-1, 세력 끝 n). 본문의 경계 토글과 같은 규칙이다. */
  onToggleCut?: (groupIndex: number, boundary: number, on: boolean) => void
  /** 쇼츠 편 경계 가로선을 끌어 다른 장면 사이로 옮기기. 세력을 넘나들 수 있다. */
  onMoveCut?: (from: { groupIndex: number; boundary: number }, to: { groupIndex: number; boundary: number }) => void
  /** 장면 안 컷 사이 경계(shortsCutBefore) 전부 지우기 — 배지의 ✕. 컷 단위 위치는 본문 컷 목록에서 고른다. */
  onClearBeatCuts?: (groupIndex: number, clusterIndex: number) => void
  /** 장면 안 컷 경계 배지를 장면 사이 자리에 끌어 놓기 — 컷 경계가 빠지고 그 자리에 장면 사이 경계가 생긴다. */
  onMoveBeatCut?: (from: { groupIndex: number; clusterIndex: number }, to: { groupIndex: number; boundary: number }) => void
  /** 편 번호를 누르면 편성 › 쇼츠의 그 편(펼친 채)으로 이동 */
  onOpenShortsPart?: (part: number) => void
}

/** 목차 안에서 편 경계 가로선을 끌 때 쓰는 데이터 종류 */
const CUT_DND = 'application/x-faction-shorts-cut'

/** 텍스트 첫 줄 추출 */
function headLine(text?: string): string {
  if (!text) return ''
  return text.split('\n')[0]?.trim() ?? ''
}

/** 세력 배경색에 어울리는 글자색 */
function contrastColor(hex?: string): string {
  const h = (hex ?? '#92400e').replace('#', '')
  if (h.length < 6) return '#ffffff'
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b > 150 ? '#1a1a1a' : '#ffffff'
}

export function FactionNavigator({
  groups,
  editLang,
  onAddGroup,
  onToggleCut,
  onMoveCut,
  onClearBeatCuts,
  onMoveBeatCut,
  onOpenShortsPart,
}: Props) {
  const [collapsed, setCollapsed] = useState(false)
  // 끌고 있는 편 경계 — 끄는 동안 놓을 수 있는 자리(장면 사이)를 전부 점선으로 드러낸다.
  const [draggingCut, setDraggingCut] = useState<{ groupIndex: number; boundary: number } | null>(null)
  const [dragOverGap, setDragOverGap] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [expandedGroups, setExpandedGroups] = useState<Record<number, boolean>>({})
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null)
  const [activeClusterIndex, setActiveClusterIndex] = useState<number | null>(null)
  const navContainerRef = useRef<HTMLDivElement>(null)

  // 로컬스토리지 접기 설정 복원
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_COLLAPSED_KEY)
      if (saved === 'true') setCollapsed(true)
    } catch {
      // ignore
    }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_COLLAPSED_KEY, String(next))
      } catch {
        // ignore
      }
      return next
    })
  }, [])

  // 전체 장면 수 집계 (영상 이야기 sequence 기준)
  const totalClusters = useMemo(() => {
    return groups.reduce((acc, g) => acc + factionSequenceOf(g).filter(it => it.kind === 'cluster').length, 0)
  }, [groups])

  // 전체 펼침/접힘 토글 상태
  const areAllExpanded = useMemo(() => {
    if (groups.length === 0) return true
    return groups.every((_, i) => expandedGroups[i] !== false)
  }, [groups, expandedGroups])

  const toggleAllGroups = useCallback(() => {
    const nextState = !areAllExpanded
    const updated: Record<number, boolean> = {}
    groups.forEach((_, i) => {
      updated[i] = nextState
    })
    setExpandedGroups(updated)
  }, [areAllExpanded, groups])

  const toggleGroupExpand = useCallback((groupIndex: number, event?: React.MouseEvent) => {
    event?.stopPropagation()
    setExpandedGroups(prev => ({
      ...prev,
      [groupIndex]: prev[groupIndex] === false ? true : false,
    }))
  }, [])

  // 스크롤 위치 감지 (ScrollSpy)
  useEffect(() => {
    const mainContainer = document.querySelector('main')
    if (!mainContainer) return
    let ticking = false

    const handleScroll = () => {
      if (ticking) return
      ticking = true
      requestAnimationFrame(() => {
        ticking = false
        const containerRect = mainContainer.getBoundingClientRect()
        const targetLine = 80 // <main> 상단에서 80px 지점을 기준으로 현재 활성 섹션 판정

        let currentGroup: number | null = null
        let currentCluster: number | null = null

        for (let gi = 0; gi < groups.length; gi++) {
          const groupEl = document.getElementById(`faction-group-${gi}`)
          if (!groupEl) continue
          const rect = groupEl.getBoundingClientRect()
          const relTop = rect.top - containerRect.top
          const relBottom = rect.bottom - containerRect.top

          if (relTop <= targetLine && relBottom > targetLine) {
            currentGroup = gi

            // 하위 장면 확인 (이야기 순서 sequence 기준)
            const sequence = factionSequenceOf(groups[gi])
            for (const item of sequence) {
              if (item.kind !== 'cluster') continue
              const ci = item.clusterIndex
              const clusterEl = document.getElementById(`cluster-header-${gi}-${ci}`)
              if (!clusterEl) continue
              const cRect = clusterEl.getBoundingClientRect()
              const cRelTop = cRect.top - containerRect.top
              const cRelBottom = cRect.bottom - containerRect.top

              if (cRelTop <= targetLine + 50 && cRelBottom > targetLine - 50) {
                currentCluster = ci
                break
              }
            }
            break
          } else if (relTop > targetLine && currentGroup === null && gi > 0) {
            currentGroup = gi - 1
            break
          }
        }

        if (currentGroup !== null) {
          setActiveGroupIndex(currentGroup)
          setActiveClusterIndex(currentCluster)
        }
      })
    }

    mainContainer.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()
    return () => mainContainer.removeEventListener('scroll', handleScroll)
  }, [groups])

  // 점프 핸들러
  const handleJumpGroup = useCallback((groupIndex: number) => {
    scrollToElement(`faction-group-${groupIndex}`, { offset: 16 })
    emitFactionJump({ groupIndex })
    const el = document.getElementById(`faction-group-${groupIndex}`)
    if (el) highlightTargetElement(el)
  }, [])

  const handleJumpCluster = useCallback((groupIndex: number, clusterIndex: number) => {
    emitFactionJump({ groupIndex, clusterIndex })
  }, [])

  const handleJumpSection = useCallback((elementId: string) => {
    scrollToElement(elementId, { offset: 16 })
    const el = document.getElementById(elementId)
    if (el) highlightTargetElement(el)
  }, [])

  const handleScrollTop = useCallback(() => {
    const mainScroller = document.querySelector('main')
    if (mainScroller) {
      mainScroller.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [])

  // 편 번호 — 편성(쇼츠) 화면과 같은 분할 함수로 센다. 경계선엔 "N편 시작", 배지엔 그 장면 안 경계에서 시작하는 편을 적는다.
  const partStarts = useMemo(() => {
    const byCut = new Map<string, number>()    // `${세력}:${cut 항목의 sequenceIndex}` → 편 번호
    const byBeat = new Map<string, number[]>() // `${세력}:${장면}` → 그 장면 안 경계에서 시작하는 편들
    const visible = (group: FactionGroup | undefined) => !!group && group.disabled !== true && group.longformOnly !== true
    const segments = factionShortsSegments(groups as unknown as Array<Record<string, unknown>>)
    segments.forEach((segment, k) => {
      const first = segment[0]
      if (!first || k === 0) return
      const part = k + 1
      if (first.clusterIndex != null && (first.beatStart ?? 0) > 0) {
        const key = `${first.gi}:${first.clusterIndex}`
        byBeat.set(key, [...(byBeat.get(key) ?? []), part])
        return
      }
      const sequence = factionSequenceOf(groups[first.gi])
      if (sequence[first.sequenceStart - 1]?.kind === 'cut') {
        byCut.set(`${first.gi}:${first.sequenceStart - 1}`, part)
        return
      }
      // 앞 세력 끝 경계로 갈린 편 — 보이는 세력 중 가장 가까운 앞 세력의 마지막 항목이 그 경계다.
      for (let g = first.gi - 1; g >= 0; g--) {
        if (!visible(groups[g])) continue
        const prev = factionSequenceOf(groups[g])
        if (prev.at(-1)?.kind === 'cut') byCut.set(`${g}:${prev.length - 1}`, part)
        break
      }
    })
    return { byCut, byBeat }
  }, [groups])

  // 본문과 100% 동일한 이야기 순서(factionSequenceOf) 기반 검색 필터링
  const filteredGroups = useMemo(() => {
    const q = search.trim().toLowerCase()
    return groups.map((group, gi) => {
      const sequence = factionSequenceOf(group)
      const sceneNumbers = factionSceneNumbers(group)
      const gName = (group.name || '').toLowerCase()
      const gNameEn = (group.nameEn || '').toLowerCase()
      const groupMatched = !q || gName.includes(q) || gNameEn.includes(q)

      const matchedItems = sequence.map((item, sequenceIndex) => {
        if (item.kind === 'cut') {
          return { item, sequenceIndex, matches: !q }
        }
        const ci = item.clusterIndex
        const cluster = group.clusters?.[ci]
        if (!cluster) return null
        const sceneNumber = sceneNumbers.get(ci) ?? 1

        if (!q) {
          return { item, cluster, clusterIndex: ci, sequenceIndex, sceneNumber, matches: true }
        }

        const cLabel = (cluster.label || '').toLowerCase()
        const cLabelEn = (cluster.labelEn || '').toLowerCase()
        const peopleMatched = (cluster.people ?? []).some(p =>
          (p.name || '').toLowerCase().includes(q)
          || (p.role || '').toLowerCase().includes(q)
          || (p.slug || '').toLowerCase().includes(q)
        )
        const beatsMatched = (cluster.beats ?? []).some(b =>
          (b.speaker || '').toLowerCase().includes(q)
          || (b.speakerEn || '').toLowerCase().includes(q)
          || (b.text || '').toLowerCase().includes(q)
        )
        const matches = groupMatched || cLabel.includes(q) || cLabelEn.includes(q) || peopleMatched || beatsMatched
        return { item, cluster, clusterIndex: ci, sequenceIndex, sceneNumber, matches }
      }).filter((entry): entry is NonNullable<typeof entry> => entry !== null && (groupMatched || entry.matches))

      const hasMatchingItem = matchedItems.some(it => it.matches)
      return {
        group,
        index: gi,
        sequence,
        matches: groupMatched || hasMatchingItem,
        matchedItems,
      }
    }).filter(g => g.matches)
  }, [groups, search])

  // 1. 슬림 레일 모드
  if (collapsed) {
    return (
      <nav
        aria-label="세력 네비게이터 (축소됨)"
        className="flex max-h-[calc(100vh-5.5rem)] w-12 flex-col items-center rounded-xl border border-border bg-bg-card/90 py-2.5 shadow-lg backdrop-blur-md"
      >
        <button
          type="button"
          onClick={toggleCollapsed}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border bg-bg-main text-text-secondary hover:bg-bg-hover hover:text-text-primary"
          title="목차 네비게이터 펼치기"
          aria-label="목차 네비게이터 펼치기"
        >
          <PanelLeft size={16} />
        </button>

        <div className="my-2 h-px w-6 bg-border" />

        <div className="flex min-h-0 flex-1 flex-col items-center gap-1.5 overflow-y-auto px-1 scrollbar-hide">
          {groups.map((group, index) => {
            const color = group.color ?? '#92400e'
            const active = activeGroupIndex === index
            const label = headLine(editLang === 'en' ? group.nameEn || group.name : group.name) || `세력 #${index + 1}`
            const clusterCount = factionSequenceOf(group).filter(it => it.kind === 'cluster').length

            return (
              <button
                key={index}
                type="button"
                onClick={() => handleJumpGroup(index)}
                className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-black transition-transform ${
                  active ? 'ring-2 ring-accent ring-offset-2 ring-offset-bg-card scale-110' : 'opacity-85 hover:opacity-100 hover:scale-105'
                }`}
                style={{ backgroundColor: color, color: contrastColor(color) }}
                title={`#${index + 1} ${label} (${clusterCount}장면)`}
                aria-label={`#${index + 1} ${label}로 이동`}
              >
                {index + 1}
              </button>
            )
          })}
        </div>

        <div className="mt-2 flex flex-col items-center gap-1.5 pt-1 border-t border-border/80">
          <button
            type="button"
            onClick={handleScrollTop}
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
            title="맨 위로"
            aria-label="맨 위로"
          >
            <ArrowUp size={14} />
          </button>
        </div>
      </nav>
    )
  }

  // 2. 전체 트리 모드
  return (
    <nav
      ref={navContainerRef}
      aria-label="세력 및 장면 네비게이터"
      className="flex max-h-[calc(100vh-5.5rem)] w-64 xl:w-72 2xl:w-80 flex-col rounded-xl border border-border bg-bg-card/95 p-3 shadow-xl backdrop-blur-md [overflow-anchor:none]"
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between gap-1.5 pb-2.5 border-b border-border/70">
        <div className="flex min-w-0 items-center gap-2">
          <ListTree size={16} className="shrink-0 text-accent" />
          <span className="text-xs font-black tracking-tight text-text-primary">목차</span>
          <span className="shrink-0 rounded-full border border-border/60 bg-bg-main px-2 py-0.5 text-[10px] font-bold text-text-secondary">
            {groups.length}세력 · {totalClusters}장면
          </span>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={toggleAllGroups}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-bg-main/60 text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
            title={areAllExpanded ? '하위 장면 전체 접기' : '하위 장면 전체 펼치기'}
            aria-label={areAllExpanded ? '하위 장면 전체 접기' : '하위 장면 전체 펼치기'}
          >
            {areAllExpanded ? <ChevronsDownUp size={13} /> : <ChevronsUpDown size={13} />}
          </button>
          <button
            type="button"
            onClick={toggleCollapsed}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-border/60 bg-bg-main/60 text-text-tertiary hover:bg-bg-hover hover:text-text-primary"
            title="좌측 네비게이터 축소"
            aria-label="좌측 네비게이터 축소"
          >
            <PanelLeftClose size={14} />
          </button>
        </div>
      </div>

      {/* 실시간 검색창 */}
      <div className="relative my-2">
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="세력·장면·인물 검색..."
          className="h-8 w-full rounded-lg border border-border bg-bg-main pl-8 pr-7 text-xs text-text-primary placeholder:text-text-dim focus:border-accent focus:outline-none"
        />
        {search && (
          <button
            type="button"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
            title="검색어 지우기"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* 퀵 점프 칩 바 */}
      <div className="mb-2 flex flex-wrap items-center gap-1">
        <button
          type="button"
          onClick={() => handleJumpSection('faction-project-settings')}
          className="flex items-center gap-1 rounded border border-border/60 bg-bg-main/80 px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary"
          title="에피소드 및 음악 설정으로 이동"
        >
          <Sliders size={10} className="text-accent" /> 설정
        </button>
        <button
          type="button"
          onClick={() => handleJumpSection('faction-dialogue-settings')}
          className="flex items-center gap-1 rounded border border-border/60 bg-bg-main/80 px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary"
          title="대사 및 타이밍 설정으로 이동"
        >
          <MessageSquare size={10} className="text-amber-500" /> 자막
        </button>
        <button
          type="button"
          onClick={() => handleJumpSection('faction-narrator-voice')}
          className="flex items-center gap-1 rounded border border-border/60 bg-bg-main/80 px-1.5 py-0.5 text-[10px] font-semibold text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary"
          title="나레이터 공용 음성 패널로 이동"
        >
          <Mic size={10} className="text-violet-400" /> 나레이터
        </button>
      </div>

      {/* 세력 및 장면 트리 목록 (이야기 순서 100% 동기화) */}
      <div className="flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto pr-1">
        {filteredGroups.map(({ group, index: gi, sequence, matchedItems }) => {
          const color = group.color ?? '#92400e'
          const isGroupActive = activeGroupIndex === gi
          const isExpanded = expandedGroups[gi] !== false
          const groupName = headLine(editLang === 'en' ? group.nameEn || group.name : group.name) || `세력 #${gi + 1}`
          const clusterCount = sequence.filter(it => it.kind === 'cluster').length
          const hasMultipleClusters = clusterCount > 1

          return (
            <div key={gi} className="group/faction rounded-lg border border-border/40 bg-bg-main/40 p-1">
              {/* 세력 행 */}
              <div
                role="button"
                tabIndex={0}
                onClick={() => handleJumpGroup(gi)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') handleJumpGroup(gi) }}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-left select-none ${
                  isGroupActive
                    ? 'bg-accent/15 text-text-primary font-bold shadow-xs'
                    : 'text-text-secondary hover:bg-bg-hover hover:text-text-primary'
                }`}
              >
                {/* 아코디언 토글 화살표 */}
                <button
                  type="button"
                  onClick={e => toggleGroupExpand(gi, e)}
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-text-tertiary hover:bg-bg-card hover:text-text-primary"
                  title={isExpanded ? '장면 접기' : '장면 펼치기'}
                  aria-label={isExpanded ? `${groupName} 장면 접기` : `${groupName} 장면 펼치기`}
                >
                  {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                </button>

                {/* 세력 번호 칩 */}
                <span
                  className="flex h-4.5 min-w-4.5 shrink-0 items-center justify-center rounded px-1 text-[10px] font-black"
                  style={{ backgroundColor: color, color: contrastColor(color) }}
                >
                  #{gi + 1}
                </span>

                {/* 세력명 */}
                <span className="min-w-0 flex-1 truncate text-xs" title={groupName}>
                  {groupName}
                </span>

                {/* 상태 배지 */}
                {group.disabled && (
                  <span className="shrink-0 rounded bg-danger/20 px-1 py-0.2 text-[9px] font-bold text-danger-text">
                    제외
                  </span>
                )}
                {group.longformOnly && !group.disabled && (
                  <span className="shrink-0 rounded bg-accent/20 px-1 py-0.2 text-[9px] font-bold text-accent">
                    롱폼
                  </span>
                )}

                {/* 장면 개수 */}
                {hasMultipleClusters && (
                  <span className="shrink-0 text-[10px] font-semibold text-text-tertiary">
                    {clusterCount}
                  </span>
                )}
              </div>

              {/* 하위 장면 (이야기 순서 순회) */}
              {isExpanded && matchedItems.length > 0 && (
                <div className="ml-3.5 space-y-0.5 border-l border-border/70 py-0.5 pl-2">
                  {matchedItems.map(entry => {
                    const sequence = factionSequenceOf(group)
                    // 경계 번호 = 그 자리 앞에 오는 장면 수. 본문 경계 토글(withFactionSequenceCut)과 같은 좌표다.
                    const clustersBefore = (until: number) => sequence.slice(0, until).filter(it => it.kind === 'cluster').length
                    // 검색 중엔 장면이 건너뛰어 보여 "이 사이"가 실제 사이가 아닐 수 있다 — 그때는 끄고 켜기를 막는다.
                    const canToggle = !!onToggleCut && !search.trim()

                    if (entry.item.kind === 'cut' || !('cluster' in entry) || !entry.cluster || entry.clusterIndex == null) {
                      const boundary = clustersBefore(entry.sequenceIndex)
                      const partNo = partStarts.byCut.get(`${gi}:${entry.sequenceIndex}`)
                      const canDrag = canToggle && !!onMoveCut
                      // 가로선은 div — 안에 편 번호(편성으로 이동)와 ✕(없애기) 두 버튼이 따로 산다.
                      return (
                        <div
                          key={`cut-${entry.sequenceIndex}`}
                          draggable={canDrag}
                          onDragStart={e => {
                            e.dataTransfer.setData(CUT_DND, `${gi}:${boundary}`)
                            e.dataTransfer.effectAllowed = 'move'
                            setDraggingCut({ groupIndex: gi, boundary })
                          }}
                          onDragEnd={() => { setDraggingCut(null); setDragOverGap(null) }}
                          className={`group/cut my-1 flex w-full items-center gap-1 rounded px-1 py-0.5 hover:bg-sky-500/10 ${canDrag ? 'cursor-grab active:cursor-grabbing' : ''}`}
                          title={canDrag ? '쇼츠 편 경계 — 끌어서 다른 장면 사이로 옮깁니다' : '쇼츠 편 경계'}
                        >
                          <span className="h-px flex-1 bg-sky-500/40" />
                          {partNo != null && onOpenShortsPart ? (
                            <button
                              type="button"
                              onClick={() => onOpenShortsPart(partNo)}
                              className="rounded px-0.5 text-[9px] font-bold text-sky-500 hover:bg-sky-500/30 hover:text-white"
                              title={`${partNo}편 설정(편성 › 쇼츠)으로 이동`}
                            >
                              {partNo}편 시작 →
                            </button>
                          ) : (
                            <span className="text-[9px] font-bold text-sky-500">{partNo != null ? `${partNo}편 시작` : '쇼츠 편 경계'}</span>
                          )}
                          {canToggle && (
                            <button
                              type="button"
                              onClick={() => onToggleCut?.(gi, boundary, false)}
                              className="rounded px-0.5 text-[9px] font-bold leading-none text-sky-500 hover:bg-sky-500/30 hover:text-white"
                              title="이 편 경계를 없앱니다"
                              aria-label="쇼츠 편 경계 없애기"
                            >
                              ✕
                            </button>
                          )}
                          <span className="h-px flex-1 bg-sky-500/40" />
                        </div>
                      )
                    }

                    const { cluster, clusterIndex: ci, sequenceIndex: si, sceneNumber } = entry
                    const isClusterActive = isGroupActive && activeClusterIndex === ci
                    const clusterLabel = headLine(editLang === 'en' ? cluster.labelEn || cluster.label : cluster.label)
                      || '제목 없음'
                    const beatsCount = cluster.beats?.length ?? 0
                    // 장면 안 컷 사이 편 경계 — 장면 사이 경계(sequence cut)와 같은 표식이라 목차에도 보인다. 어느 컷 앞인지 함께 적는다.
                    const beatCutAt = (cluster.beats ?? []).flatMap((beat, beatIndex) => (beatIndex > 0 && beat.shortsCutBefore === true ? [beatIndex + 1] : []))
                    const hasBeatCut = beatCutAt.length > 0
                    const peopleCount = (cluster.people ?? []).filter(p => p.isPerson !== false).length
                    const numberLabel = `${gi + 1}-${sceneNumber}`
                    // 이 장면 뒤 경계 — 바로 뒤에 이미 경계가 있으면 그 줄이 지우기 버튼이라 여기선 안 띄운다.
                    const boundaryAfter = clustersBefore(si + 1)
                    const totalClusters = clustersBefore(sequence.length)
                    const cutFollows = sequence[si + 1]?.kind === 'cut'
                    const isLastScene = boundaryAfter === totalClusters

                    return (
                      <Fragment key={`cluster-${ci}-${si}`}>
                      {/* 행은 div[role=button] — 안에 배지의 ✕(진짜 button)를 두기 위해서다(button 안 button은 허용되지 않는다). */}
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleJumpCluster(gi, ci)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleJumpCluster(gi, ci) } }}
                        className={`flex w-full cursor-pointer items-center gap-1.5 rounded px-1.5 py-0.8 text-left text-[11px] select-none ${
                          isClusterActive
                            ? 'bg-accent/20 font-bold text-accent'
                            : 'text-text-tertiary hover:bg-bg-hover hover:text-text-primary'
                        }`}
                        title={`${numberLabel} ${clusterLabel} (대사 ${beatsCount}컷 · 인물 ${peopleCount}명)`}
                      >
                        <span className="shrink-0 font-mono text-[9px] text-text-dim">
                          {numberLabel}
                        </span>
                        <span className="min-w-0 flex-1 truncate">
                          {clusterLabel}
                        </span>
                        {beatsCount > 0 && (
                          <span className="shrink-0 text-[9px] text-text-dim">
                            {beatsCount}컷
                          </span>
                        )}
                        {hasBeatCut && (
                          <span
                            draggable={canToggle && !!onMoveBeatCut}
                            onDragStart={e => {
                              e.stopPropagation()
                              e.dataTransfer.setData(CUT_DND, `beat:${gi}:${ci}`)
                              e.dataTransfer.effectAllowed = 'move'
                              setDraggingCut({ groupIndex: gi, boundary: -1 })
                            }}
                            onDragEnd={() => { setDraggingCut(null); setDragOverGap(null) }}
                            className={`flex shrink-0 items-center gap-0.5 rounded bg-sky-500/15 px-1 text-[9px] font-bold text-sky-400 ${canToggle && onMoveBeatCut ? 'cursor-grab active:cursor-grabbing' : ''}`}
                            title={`이 장면 안 ${beatCutAt.map(n => `컷 ${n} 앞`).join(' · ')}에서 쇼츠 편이 갈린다. 컷 단위 위치는 본문 컷 목록에서 옮기고, 장면 사이로 끌어 놓으면 장면 사이 경계가 된다.`}
                          >
                            편 경계 {beatCutAt.map(n => `컷${n}`).join('·')}
                            {(partStarts.byBeat.get(`${gi}:${ci}`) ?? []).map(part => (
                              <button
                                key={part}
                                type="button"
                                onClick={e => { e.stopPropagation(); onOpenShortsPart?.(part) }}
                                disabled={!onOpenShortsPart}
                                className="ms-0.5 rounded bg-sky-500/20 px-0.5 leading-none enabled:hover:bg-sky-500/40 enabled:hover:text-white"
                                title={`${part}편 설정(편성 › 쇼츠)으로 이동`}
                              >
                                {part}편→
                              </button>
                            ))}
                            {canToggle && onClearBeatCuts && (
                              <button
                                type="button"
                                onClick={e => { e.stopPropagation(); onClearBeatCuts(gi, ci) }}
                                className="ms-0.5 rounded px-0.5 leading-none hover:bg-sky-500/30 hover:text-white"
                                title="이 장면 안 컷 사이 경계를 없앱니다"
                                aria-label={`${numberLabel} 장면 안 편 경계 없애기`}
                              >
                                ✕
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                      {/* 장면 뒤 경계 자리 — 올리면 바로 "편 나누기"가 보이고, 누르면 그 자리에 쇼츠 편 경계가 생긴다. */}
                      {canToggle && !cutFollows && (() => {
                        const gapKey = `${gi}:${boundaryAfter}`
                        // 경계를 끄는 동안은 놓을 자리를 전부 점선으로 드러내고, 올라온 자리는 실선으로 굵게.
                        const dropReady = !!draggingCut
                        const dropHere = dragOverGap === gapKey
                        const lineCls = dropHere ? 'bg-sky-400' : dropReady ? 'bg-sky-500/30' : 'bg-transparent group-hover/gap:bg-sky-500/40'
                        return (
                          <button
                            type="button"
                            onClick={() => onToggleCut?.(gi, boundaryAfter, true)}
                            onDragOver={e => {
                              if ((!onMoveCut && !onMoveBeatCut) || !e.dataTransfer.types.includes(CUT_DND)) return
                              e.preventDefault()
                              e.dataTransfer.dropEffect = 'move'
                              if (dragOverGap !== gapKey) setDragOverGap(gapKey)
                            }}
                            onDragLeave={() => { if (dragOverGap === gapKey) setDragOverGap(null) }}
                            onDrop={e => {
                              const raw = e.dataTransfer.getData(CUT_DND)
                              setDragOverGap(null)
                              if (!raw) return
                              e.preventDefault()
                              // 'beat:세력:장면' 은 장면 안 컷 경계 배지, '세력:경계' 는 장면 사이 가로선.
                              if (raw.startsWith('beat:')) {
                                const [, fromGi, fromCi] = raw.split(':').map(Number)
                                onMoveBeatCut?.({ groupIndex: fromGi, clusterIndex: fromCi }, { groupIndex: gi, boundary: boundaryAfter })
                                return
                              }
                              if (!onMoveCut) return
                              const [fromGi, fromBoundary] = raw.split(':').map(Number)
                              onMoveCut({ groupIndex: fromGi, boundary: fromBoundary }, { groupIndex: gi, boundary: boundaryAfter })
                            }}
                            className={`group/gap flex h-3 w-full items-center gap-1.5 px-1 ${dropHere ? 'bg-sky-500/10' : ''}`}
                            title={isLastScene ? '세력 끝에서 쇼츠 편 나누기' : '이 사이에서 쇼츠 편 나누기'}
                            aria-label={isLastScene ? '세력 끝에서 쇼츠 편 나누기' : `${numberLabel} 뒤에서 쇼츠 편 나누기`}
                          >
                            <span className={`h-px flex-1 ${lineCls}`} />
                            <span className={`text-[9px] font-bold text-sky-500 ${dropReady ? 'inline' : 'hidden group-hover/gap:inline'}`}>
                              {dropReady ? (dropHere ? '여기로' : '·') : `+ 편 나누기${isLastScene ? ' (세력 끝)' : ''}`}
                            </span>
                            <span className={`h-px flex-1 ${lineCls}`} />
                          </button>
                        )
                      })()}
                      </Fragment>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {filteredGroups.length === 0 && (
          <p className="py-6 text-center text-xs text-text-dim">
            검색 결과가 없습니다.
          </p>
        )}
      </div>

      {/* 푸터 액션 */}
      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/70 pt-2">
        <button
          type="button"
          onClick={onAddGroup}
          className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-md border border-dashed border-border bg-bg-main py-1.5 text-xs font-bold text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary"
        >
          <Plus size={13} /> 세력 추가
        </button>

        <button
          type="button"
          onClick={handleScrollTop}
          className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-md border border-border bg-bg-main text-text-secondary hover:bg-bg-hover hover:text-text-primary"
          title="맨 위로 스크롤"
          aria-label="맨 위로 스크롤"
        >
          <ArrowUp size={14} />
        </button>
      </div>
    </nav>
  )
}
