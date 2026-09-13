'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Film,
  Gamepad2,
  Landmark,
  Library,
  ListFilter,
  Music,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Unlink,
} from 'lucide-react'
import type {
  CuratedAdminCurator,
  CuratedAdminList,
  CuratedAdminOverview,
} from '@/actions/admin/curated'
import { curatorKindLabel } from '@/constants/curated'
import { CONTENT_TYPE_CONFIG, type ContentType } from '@/constants/contentTypes'
import { CuratorFormModal, ListFormModal } from './CuratedForms'

type VisibilityFilter = 'all' | 'featured' | 'hidden'

const TYPE_ICONS = {
  BOOK: BookOpen,
  VIDEO: Film,
  GAME: Gamepad2,
  MUSIC: Music,
} as const

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function StatCard({ label, value, detail, accent }: { label: string; value: number; detail: string; accent: string }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-bg-card p-4">
      <div className={`absolute inset-y-0 left-0 w-1 ${accent}`} />
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-text-secondary">{label}</p>
      <p className="mt-2 font-mono text-2xl font-bold text-text-primary">{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-text-secondary">{detail}</p>
    </div>
  )
}

function TypeBadge({ type }: { type: string }) {
  const config = CONTENT_TYPE_CONFIG[type as ContentType]
  const Icon = TYPE_ICONS[type as keyof typeof TYPE_ICONS] ?? Library
  return (
    <span className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold ${config?.bgColor ?? 'bg-white/5'} ${config?.color ?? 'text-text-secondary'}`}>
      <Icon className="h-3.5 w-3.5" />
      {config?.label ?? type}
    </span>
  )
}

function CuratorMark({ curator, size = 'md' }: { curator: CuratedAdminCurator; size?: 'sm' | 'md' }) {
  const sizeClass = size === 'sm' ? 'h-9 w-9' : 'h-11 w-11'
  return (
    <div className={`relative flex ${sizeClass} shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-bg-secondary`}>
      {curator.logoUrl ? (
        <Image src={curator.logoUrl} alt="" fill sizes={size === 'sm' ? '36px' : '44px'} unoptimized className="object-contain p-1" />
      ) : (
        <Landmark className="h-5 w-5 text-accent/70" />
      )}
    </div>
  )
}

export default function CuratedBoard({ initialData }: { initialData: CuratedAdminOverview }) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState('all')
  const [contentType, setContentType] = useState('all')
  const [visibility, setVisibility] = useState<VisibilityFilter>('all')
  const [editingCurator, setEditingCurator] = useState<CuratedAdminCurator | null | undefined>(undefined)
  const [editingList, setEditingList] = useState<CuratedAdminList | null | undefined>(undefined)

  const curatorMap = useMemo(
    () => new Map(initialData.curators.map((curator) => [curator.id, curator])),
    [initialData.curators],
  )

  const filteredLists = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    return initialData.lists.filter((list) => {
      const curator = curatorMap.get(list.curatorId)
      const matchesQuery = !normalizedQuery || [
        list.title,
        list.titleEn,
        list.slug,
        list.seriesKey,
        list.curatorName,
        curator?.nameEn,
      ].some((value) => value?.toLocaleLowerCase().includes(normalizedQuery))
      const matchesKind = kind === 'all' || curator?.kind === kind
      const matchesType = contentType === 'all' || list.contentType === contentType
      const matchesVisibility = visibility === 'all'
        || (visibility === 'featured' && list.isFeatured)
        || (visibility === 'hidden' && !list.isFeatured)
      return matchesQuery && matchesKind && matchesType && matchesVisibility
    })
  }, [contentType, curatorMap, initialData.lists, kind, query, visibility])

  function closeCuratorModal() {
    setEditingCurator(undefined)
  }

  function closeListModal() {
    setEditingList(undefined)
  }

  function handleCuratorSaved() {
    closeCuratorModal()
    router.refresh()
  }

  function handleListSaved(id?: string) {
    closeListModal()
    router.refresh()
    if (id) router.push(`/curated/${id}`)
  }

  return (
    <div className="space-y-5">
      <header className="relative overflow-hidden rounded-2xl border border-border bg-[#101923] p-5 md:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-accent/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-px w-2/3 bg-gradient-to-l from-accent/70 to-transparent" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 flex items-center gap-2 text-accent">
              <Library className="h-4 w-4" />
              <span className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em]">Editorial index / curated</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">기관 선정</h1>
            <p className="mt-2 max-w-xl text-sm leading-6 text-text-secondary">
              대학·언론·시상 기관이 발표한 목록을 관리합니다. 원문 출처를 기준으로 목록을 보존하고,
              우리 콘텐츠와 연결된 항목만 공개 화면에 정식 작품으로 표시합니다.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setEditingCurator(null)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-border bg-white/[0.04] px-3.5 text-sm font-semibold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent"
            >
              <Landmark className="h-4 w-4" />
              새 기관
            </button>
            <button
              type="button"
              onClick={() => setEditingList(null)}
              disabled={initialData.curators.length === 0}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-accent px-3.5 text-sm font-bold text-[#08111c] hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Plus className="h-4 w-4" />
              새 목록
            </button>
          </div>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="curators" value={initialData.totals.curatorCount} detail="선정 주체" accent="bg-accent" />
        <StatCard label="lists" value={initialData.totals.listCount} detail="공개 목록 원장" accent="bg-cyan-400" />
        <StatCard label="items" value={initialData.totals.visibleItemCount} detail={`전체 ${initialData.totals.itemCount.toLocaleString()}건 중 노출`} accent="bg-emerald-400" />
        <StatCard label="linked" value={initialData.totals.linkedCount} detail={`미연결 ${initialData.totals.unlinkedCount.toLocaleString()}건`} accent="bg-amber-400" />
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-bg-card">
        <div className="border-b border-border p-4 md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <ListFilter className="h-4 w-4 text-accent" />
                <h2 className="text-sm font-bold text-text-primary">선정 목록 원장</h2>
                <span className="rounded-full bg-accent/10 px-2 py-0.5 font-mono text-[11px] text-accent">{filteredLists.length}/{initialData.lists.length}</span>
              </div>
              <p className="mt-1 text-xs text-text-secondary">목록을 열면 항목의 원문 표기와 콘텐츠 연결 상태까지 편집할 수 있습니다.</p>
            </div>
            <div className="flex flex-col gap-2 md:flex-row">
              <label className="relative min-w-0 md:w-64">
                <span className="sr-only">기관·목록 검색</span>
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="기관, 목록, slug 검색"
                  className="w-full rounded-lg border border-border bg-bg-secondary py-2.5 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
                />
              </label>
              <select
                value={kind}
                onChange={(event) => setKind(event.target.value)}
                aria-label="기관 유형 필터"
                className="rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="all">모든 기관 유형</option>
                {[...new Set(initialData.curators.map((curator) => curator.kind))].map((value) => (
                  <option key={value} value={value}>{curatorKindLabel(value)}</option>
                ))}
              </select>
              <select
                value={contentType}
                onChange={(event) => setContentType(event.target.value)}
                aria-label="콘텐츠 유형 필터"
                className="rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="all">모든 콘텐츠 유형</option>
                {Object.entries(CONTENT_TYPE_CONFIG).map(([value, config]) => (
                  <option key={value} value={value}>{config.label}</option>
                ))}
              </select>
              <select
                value={visibility}
                onChange={(event) => setVisibility(event.target.value as VisibilityFilter)}
                aria-label="허브 노출 필터"
                className="rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-sm text-text-primary focus:border-accent focus:outline-none"
              >
                <option value="all">노출 전체</option>
                <option value="featured">허브 노출</option>
                <option value="hidden">허브 숨김</option>
              </select>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead className="border-b border-border bg-bg-secondary/70">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.12em] text-text-secondary">
                <th className="px-5 py-3">목록</th>
                <th className="px-4 py-3">유형</th>
                <th className="px-4 py-3">발표</th>
                <th className="px-4 py-3">항목</th>
                <th className="px-4 py-3">상태</th>
                <th className="px-4 py-3">최근 수정</th>
                <th className="px-5 py-3 text-right">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredLists.map((list) => {
                const curator = curatorMap.get(list.curatorId)
                return (
                  <tr key={list.id} className="group hover:bg-white/[0.025]">
                    <td className="px-5 py-4">
                      <Link href={`/curated/${list.id}`} className="flex min-w-0 items-center gap-3 hover:text-accent">
                        {curator ? <CuratorMark curator={curator} size="sm" /> : <div className="h-9 w-9 shrink-0 rounded-lg bg-bg-secondary" />}
                        <span className="min-w-0">
                          <span className="flex items-center gap-2">
                            <span className="line-clamp-1 text-sm font-semibold text-text-primary group-hover:text-accent">{list.title}</span>
                            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-text-secondary" />
                          </span>
                          <span className="mt-1 block truncate font-mono text-[10px] text-text-secondary">{list.curatorName} · /{list.slug}</span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-4 py-4"><TypeBadge type={list.contentType} /></td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-text-primary">{list.publishedYear ?? '—'}</div>
                      <div className="mt-1 text-xs text-text-secondary">{list.edition || (list.isAnnual ? '연례 목록' : '단일 목록')}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-mono text-sm text-text-primary">{list.visibleItemCount.toLocaleString()} <span className="text-text-secondary">/ {list.itemCount.toLocaleString()}</span></div>
                      <div className="mt-1 text-xs text-emerald-300">연결 {list.linkedCount.toLocaleString()} · 미연결 {(list.itemCount - list.linkedCount).toLocaleString()}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className={`inline-flex items-center gap-1.5 text-xs font-semibold ${list.isFeatured ? 'text-emerald-300' : 'text-text-secondary'}`}>
                        {list.isFeatured ? <Check className="h-3.5 w-3.5" /> : <Unlink className="h-3.5 w-3.5" />}
                        {list.isFeatured ? '허브 노출' : '허브 숨김'}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-4 text-xs text-text-secondary">{formatDate(list.updatedAt)}</td>
                    <td className="px-5 py-4 text-right">
                      <Link href={`/curated/${list.id}`} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold text-text-secondary hover:border-accent hover:bg-accent/10 hover:text-accent">
                        <Settings2 className="h-3.5 w-3.5" />
                        편집
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filteredLists.length === 0 && (
            <div className="flex min-h-48 flex-col items-center justify-center px-6 text-center">
              <Search className="mb-3 h-6 w-6 text-text-secondary" />
              <p className="text-sm font-semibold text-text-primary">조건에 맞는 목록이 없습니다.</p>
              <p className="mt-1 text-xs text-text-secondary">검색어나 필터를 바꾸거나 새 목록을 만들어 보세요.</p>
            </div>
          )}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-bg-card p-4 md:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-accent" />
              <h2 className="text-sm font-bold text-text-primary">선정 기관</h2>
            </div>
            <p className="mt-1 text-xs text-text-secondary">기관의 한영 표기·로고·설명과 허브 노출 순서를 관리합니다.</p>
          </div>
          <span className="font-mono text-xs text-text-secondary">{initialData.curators.length} curators</span>
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {initialData.curators.map((curator) => (
            <article key={curator.id} className="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary/50 p-3 hover:border-accent/60">
              <CuratorMark curator={curator} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-text-primary">{curator.name}</p>
                <p className="mt-1 truncate text-xs text-text-secondary">{curatorKindLabel(curator.kind)} · 목록 {curator.listCount}</p>
              </div>
              <button
                type="button"
                onClick={() => setEditingCurator(curator)}
                aria-label={`${curator.name} 기관 편집`}
                className="rounded-md p-2 text-text-secondary hover:bg-accent/10 hover:text-accent"
              >
                <Settings2 className="h-4 w-4" />
              </button>
            </article>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-2 rounded-lg border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3 text-xs leading-5 text-amber-200/80">
        <Sparkles className="h-4 w-4 shrink-0 text-amber-300" />
        <span>원문 목록의 전체성을 보존하기 위해 미연결 항목도 삭제하지 않고 남겨 둡니다. 연결 작업은 항목 편집에서 기존 콘텐츠를 검색해 진행합니다.</span>
        <ArrowUpRight className="ml-auto hidden h-4 w-4 shrink-0 text-amber-300 sm:block" />
      </div>

      {editingCurator !== undefined && (
        <CuratorFormModal curator={editingCurator} onClose={closeCuratorModal} onSaved={handleCuratorSaved} />
      )}
      {editingList !== undefined && (
        <ListFormModal
          list={editingList}
          curators={initialData.curators}
          onClose={closeListModal}
          onSaved={handleListSaved}
        />
      )}
    </div>
  )
}
