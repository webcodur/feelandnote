'use client'

import { BarChart3, MousePointerClick, ShoppingBag } from 'lucide-react'
import {
  PageHeader,
  Badge,
  FilterChips,
  DataTable,
  Pagination,
} from '@/components/ui'
import type { Column } from '@/components/ui'

export interface CommerceEventRow {
  id: number
  created_at: string
  kind: string
  platform: string | null
  target: string
  screen: string
  locale: string
  content_id: string | null
  content_type: string | null
  edition_id: number | null
  external_ref: string | null
}

export type ContentTitleMap = Record<string, { title: string | null; creator: string | null }>

export interface Ga4Section {
  daily: { date: string; open: number; click: number }[]
  pages: { path: string; clicks: number; label?: string | null }[]
  totals: { open: number; click: number }
}

const PLATFORM_LABELS: Record<string, string> = {
  yes24: 'YES24',
  kyobo: '교보문고',
  coupang: '쿠팡',
  aladin: '알라딘',
  amazon: 'Amazon',
  google_books: 'Google Books',
}

const KIND_MAP: Record<string, { label: string; color: 'info' | 'success' }> = {
  open: { label: '창 열림', color: 'info' },
  click: { label: '클릭', color: 'success' },
}

const DAY_OPTIONS = [
  { value: '7', label: '7일' },
  { value: '30', label: '30일' },
  { value: '90', label: '90일' },
]

const KIND_OPTIONS = [
  { value: '', label: '전체' },
  { value: 'click', label: '클릭' },
  { value: 'open', label: '창 열림' },
]

interface Props {
  events: CommerceEventRow[]
  allEvents: CommerceEventRow[]
  ga4: Ga4Section | null
  titles: ContentTitleMap
  editionTitles: Record<number, string>
  days: number
  kind: string
  platform: string
  page: number
  totalPages: number
  total: number
  truncated: boolean
}

function eventHref(days: number, kind: string, platform: string, page?: number): string {
  const params = new URLSearchParams()
  params.set('days', String(days))
  if (kind) params.set('kind', kind)
  if (platform) params.set('platform', platform)
  if (page && page > 1) params.set('page', String(page))
  return `/commerce?${params.toString()}`
}

function subjectOf(row: CommerceEventRow, titles: ContentTitleMap, editionTitles: Record<number, string>): { label: string; href?: string } {
  if (row.edition_id && editionTitles[row.edition_id]) return { label: editionTitles[row.edition_id] }
  if (row.content_id) {
    const title = titles[row.content_id]?.title
    return { label: title ?? row.content_id.slice(0, 8), href: `/contents/${row.content_id}` }
  }
  return { label: row.external_ref ?? '—' }
}

function kstDay(iso: string): string {
  return new Date(iso).toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

/** 최근 days일의 일별 열림·클릭을 KST 날짜로 채워 오래된 순으로 돌린다 */
function buildDailyRows(events: CommerceEventRow[], days: number): [string, { open: number; click: number }][] {
  const daily = new Map<string, { open: number; click: number }>()
  for (let i = 0; i < days; i++) {
    daily.set(kstDay(new Date(Date.now() - i * 24 * 3600_000).toISOString()), { open: 0, click: 0 })
  }
  for (const e of events) {
    const bucket = daily.get(kstDay(e.created_at))
    if (bucket) bucket[e.kind === 'open' ? 'open' : 'click'] += 1
  }
  return [...daily.entries()].reverse()
}

export default function CommerceClient({
  events, allEvents, ga4, titles, editionTitles, days, kind, platform, page, totalPages, total, truncated,
}: Props) {
  const opens = allEvents.filter(e => e.kind === 'open')
  const clicks = allEvents.filter(e => e.kind === 'click')

  // 플랫폼별 집계 — 클릭만 플랫폼을 가진다(열림은 창 자체의 이벤트)
  const platformClicks = new Map<string, number>()
  for (const e of clicks) {
    const key = e.platform ?? 'unknown'
    platformClicks.set(key, (platformClicks.get(key) ?? 0) + 1)
  }
  const platformRows = [...platformClicks.entries()].sort((a, b) => b[1] - a[1])
  const maxPlatform = platformRows[0]?.[1] ?? 1

  // 일별 추이 — 최근 days일을 KST로 채운다
  const dailyRows = buildDailyRows(allEvents, days)
  const maxDaily = Math.max(1, ...dailyRows.map(([, v]) => v.click))

  // 대상별 클릭 순위 — 같은 작품·차트 항목끼리 묶는다
  const subjectClicks = new Map<string, { label: string; href?: string; count: number; platforms: Set<string> }>()
  for (const e of clicks) {
    const key = e.content_id ?? e.external_ref ?? '—'
    const subject = subjectOf(e, titles, editionTitles)
    const entry = subjectClicks.get(key) ?? { label: subject.label, href: subject.href, count: 0, platforms: new Set() }
    entry.count += 1
    if (e.platform) entry.platforms.add(e.platform)
    subjectClicks.set(key, entry)
  }
  const topSubjects = [...subjectClicks.values()].sort((a, b) => b.count - a.count).slice(0, 20)

  const platformFilterOptions = [
    { value: '', label: '전체', count: clicks.length },
    ...platformRows.map(([key, count]) => ({ value: key, label: PLATFORM_LABELS[key] ?? key, count })),
  ]

  const clickRate = opens.length > 0 ? Math.round((clicks.length / opens.length) * 100) : null

  const columns: Column<CommerceEventRow>[] = [
    {
      key: 'created_at',
      header: '시간',
      width: '170px',
      render: (value) => (
        <span className="text-text-secondary tabular-nums">
          {new Date(value as string).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </span>
      ),
    },
    {
      key: 'kind',
      header: '종류',
      width: '90px',
      render: (value) => {
        const config = KIND_MAP[value as string] ?? { label: value as string, color: 'default' as const }
        return <Badge variant={config.color}>{config.label}</Badge>
      },
    },
    {
      key: 'platform',
      header: '플랫폼',
      width: '110px',
      render: (value) => (
        <span className="text-text-primary">{value ? (PLATFORM_LABELS[value as string] ?? (value as string)) : '—'}</span>
      ),
    },
    {
      key: 'subject',
      header: '대상',
      render: (_, row) => {
        const subject = subjectOf(row, titles, editionTitles)
        return (
          <span className="block truncate text-text-primary" title={subject.label}>
            {subject.label}
            {row.external_ref && !row.content_id && <span className="ml-1.5 text-xs text-text-tertiary">외부 차트</span>}
          </span>
        )
      },
    },
    {
      key: 'target',
      header: '연결',
      width: '110px',
      render: (value) => (
        <span className="text-text-secondary">
          {{ product: '상품', search: '검색', 'watch-providers': '감상처', modal: '창' }[value as string] ?? (value as string)}
        </span>
      ),
    },
    {
      key: 'screen',
      header: '화면',
      render: (value) => (
        <span className="block max-w-[220px] truncate text-text-secondary" title={value as string}>{value as string}</span>
      ),
    },
    {
      key: 'locale',
      header: '언어',
      width: '70px',
      render: (value) => <span className="text-text-tertiary uppercase">{value as string}</span>,
    },
  ]

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="수익화 클릭"
        description={`최근 ${days}일 · ${total.toLocaleString()}건${truncated ? ' (표본 상한 도달 — 기간을 좁혀 보세요)' : ''}`}
      />

      {/* 필터 */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <FilterChips options={DAY_OPTIONS.map(o => ({ ...o }))} value={String(days)} href={(v) => eventHref(Number(v), kind, platform)} />
          <FilterChips options={KIND_OPTIONS} value={kind} href={(v) => eventHref(days, v, platform)} />
        </div>
        {platformFilterOptions.length > 1 && (
          <FilterChips options={platformFilterOptions} value={platform} href={(v) => eventHref(days, kind, v)} />
        )}
      </div>

      {/* 요약 */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard icon={ShoppingBag} label="창 열림" value={opens.length} />
        <StatCard icon={MousePointerClick} label="외부로 나간 클릭" value={clicks.length} />
        <StatCard icon={BarChart3} label="창→클릭 전환" value={clickRate === null ? '—' : `${clickRate}%`} />
        <StatCard icon={BarChart3} label="클릭된 플랫폼" value={platformRows.length} />
      </div>

      {/* 플랫폼별 클릭 */}
      <section className="rounded-xl border border-border bg-bg-secondary p-4 md:p-5">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">플랫폼별 클릭</h2>
        {platformRows.length === 0 ? (
          <p className="text-sm text-text-tertiary">기간 내 클릭이 없습니다.</p>
        ) : (
          <ul className="space-y-2">
            {platformRows.map(([key, count]) => (
              <li key={key} className="flex items-center gap-3">
                <span className="w-24 shrink-0 truncate text-sm text-text-secondary">{PLATFORM_LABELS[key] ?? key}</span>
                <div className="h-2.5 min-w-0 flex-1 rounded-full bg-bg-main">
                  <div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(2, (count / maxPlatform) * 100)}%` }} />
                </div>
                <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-text-primary">{count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 일별 추이 */}
      <section className="rounded-xl border border-border bg-bg-secondary p-4 md:p-5">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">일별 클릭</h2>
        <div className="flex h-28 items-end gap-1">
          {dailyRows.map(([day, v]) => (
            <div key={day} className="group relative flex h-full min-w-0 flex-1 flex-col justify-end">
              <div
                className="w-full rounded-sm bg-accent/80"
                style={{ height: `${(v.click / maxDaily) * 100}%`, minHeight: v.click ? '3px' : 0 }}
                title={`${day} · 클릭 ${v.click} · 열림 ${v.open}`}
              />
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex justify-between text-[11px] text-text-tertiary">
          <span>{dailyRows[0]?.[0]}</span>
          <span>{dailyRows[dailyRows.length - 1]?.[0]}</span>
        </div>
      </section>

      {/* GA4 과거 기록 — 내부 장부는 배포 후부터 쌓이므로 이전 구간은 GA4로 본다 */}
      {ga4 && (
        <section className="rounded-xl border border-border bg-bg-secondary p-4 md:p-5">
          <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-text-primary">GA4 기록 — 같은 기간</h2>
            <span className="text-xs tabular-nums text-text-tertiary">
              창 열림 {ga4.totals.open.toLocaleString()} · 클릭 {ga4.totals.click.toLocaleString()}
            </span>
          </div>
          <p className="mb-3 text-xs text-text-tertiary">
            내부 장부 이전의 클릭은 GA4에만 있습니다. 어느 플랫폼으로 나갔는지는 구분되지 않고, 클릭이 일어난 페이지(작품·인물 화면) 단위로만 나뉩니다(1~2일 지연 반영).
          </p>
          {ga4.daily.length === 0 ? (
            <p className="text-sm text-text-tertiary">GA4에 기간 내 commerce 이벤트가 없습니다.</p>
          ) : (
            <>
              <Ga4DailyBars daily={ga4.daily} days={days} />
              {ga4.pages.length > 0 && (
                <>
                  <h3 className="mt-4 text-xs font-medium text-text-tertiary">클릭이 일어난 페이지</h3>
                  <ul className="mt-1 divide-y divide-border/60">
                  {ga4.pages.map((p) => (
                    <li key={p.path} className="flex items-center gap-3 py-1.5">
                      <span className="min-w-0 flex-1 truncate text-sm text-text-secondary" title={p.path}>
                        {p.label ?? p.path}
                        {p.label && <span className="ml-1.5 text-xs text-text-tertiary">{p.path}</span>}
                      </span>
                      <span className="w-14 shrink-0 text-right text-sm tabular-nums text-text-primary">{p.clicks.toLocaleString()}</span>
                    </li>
                    ))}
                  </ul>
                </>
              )}
            </>
          )}
        </section>
      )}

      {/* 작품별 순위 */}
      <section className="rounded-xl border border-border bg-bg-secondary p-4 md:p-5">
        <h2 className="mb-3 text-sm font-semibold text-text-primary">많이 눌린 작품 · 대상</h2>
        {topSubjects.length === 0 ? (
          <p className="text-sm text-text-tertiary">기간 내 클릭이 없습니다.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {topSubjects.map((subject, index) => (
              <li key={`${subject.label}-${index}`} className="flex items-center gap-3 py-2">
                <span className="w-6 shrink-0 text-right text-xs tabular-nums text-text-tertiary">{index + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm text-text-primary" title={subject.label}>{subject.label}</span>
                <span className="shrink-0 text-xs text-text-tertiary">
                  {[...subject.platforms].map(p => PLATFORM_LABELS[p] ?? p).join(' · ')}
                </span>
                <span className="w-14 shrink-0 text-right text-sm font-semibold tabular-nums text-text-primary">{subject.count.toLocaleString()}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 최근 내역 */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-text-primary">최근 내역</h2>
        <DataTable
          data={events}
          columns={columns}
          keyExtractor={(row) => String(row.id)}
          emptyIcon={MousePointerClick}
          emptyTitle="기록된 이벤트가 없습니다"
          emptyDescription="사용자 웹에서 구매·감상처를 누르면 여기에 쌓입니다"
        />
        <Pagination page={page} totalPages={totalPages} href={(p) => eventHref(days, kind, platform, p)} />
      </section>
    </div>
  )
}

/** GA4 일별 배열을 최근 days일 버킷(YYYYMMDD)에 맞춰 채운다 */
function ga4DailyRows(daily: Ga4Section['daily'], days: number): { key: string; click: number; open: number }[] {
  const byDate = new Map(daily.map(d => [d.date, d]))
  const rows: { key: string; click: number; open: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    // GA4 date 차원은 속성 시간대 기준 — KST 속성이라 로컬 날짜로 채운다
    const d = new Date(Date.now() - i * 24 * 3600_000)
    const key = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const hit = byDate.get(key)
    rows.push({ key, click: hit?.click ?? 0, open: hit?.open ?? 0 })
  }
  return rows
}

function Ga4DailyBars({ daily, days }: { daily: Ga4Section['daily']; days: number }) {
  const rows = ga4DailyRows(daily, days)
  const max = Math.max(1, ...rows.map(r => r.click))
  const label = (key: string) => `${key.slice(0, 4)}-${key.slice(4, 6)}-${key.slice(6)}`
  return (
    <div>
      <div className="flex h-20 items-end gap-1">
        {rows.map(r => (
          <div key={r.key} className="flex h-full min-w-0 flex-1 flex-col justify-end">
            <div
              className="w-full rounded-sm bg-text-tertiary/50"
              style={{ height: `${(r.click / max) * 100}%`, minHeight: r.click ? '3px' : 0 }}
              title={`${label(r.key)} · 클릭 ${r.click} · 열림 ${r.open}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[11px] text-text-tertiary">
        <span>{rows[0] ? label(rows[0].key) : ''}</span>
        <span>{rows[rows.length - 1] ? label(rows[rows.length - 1].key) : ''}</span>
      </div>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: typeof BarChart3; label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-border bg-bg-secondary p-4">
      <div className="flex items-center gap-2 text-text-tertiary">
        <Icon className="h-4 w-4" aria-hidden />
        <span className="text-xs">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums text-text-primary">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </p>
    </div>
  )
}
