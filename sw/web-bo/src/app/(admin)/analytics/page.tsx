import { Suspense } from 'react'
import type { Metadata } from 'next'
import { AUDIENCES, DAY_OPTIONS, parseAnalyticsOptions } from '@/lib/analytics/model'
import AnalyticsReport from './AnalyticsReport'

export const metadata: Metadata = { title: '서비스 이용 현황', robots: { index: false, follow: false } }
export const dynamic = 'force-dynamic'
const control = 'rounded-lg border border-border bg-bg-card px-3 py-2 text-sm hover:border-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const options = parseAnalyticsOptions(await searchParams)
  return <div className="mx-auto max-w-[1440px] space-y-5">
    <header className="border-b border-border pb-5">
      <p className="text-xs tracking-widest text-accent">feelandnote / 이용 분석</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">서비스 이용 현황</h1>
      <p className="mt-2 text-sm leading-relaxed text-text-secondary">어디서 들어와 무엇을 선택하고, 어떤 결과를 얻었는지 확인합니다.</p>
    </header>
    <form action="/analytics" method="get" className="flex flex-wrap items-end gap-3">
      <label className="grid gap-1.5 text-xs text-text-secondary">조회 기간
        <select name="days" defaultValue={options.days} className={control}>{DAY_OPTIONS.map(days => <option key={days} value={days}>최근 {days}일</option>)}</select>
      </label>
      <label className="grid gap-1.5 text-xs text-text-secondary">유입 조건
        <select name="audience" defaultValue={options.audience} className={control}>{Object.entries(AUDIENCES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </label>
      <label className="mb-2 flex cursor-pointer items-center gap-2 rounded text-sm text-text-secondary hover:text-accent focus-within:ring-2 focus-within:ring-accent">
        <input type="checkbox" name="today" value="1" defaultChecked={options.includeToday} className="accent-accent" />오늘 포함
      </label>
      <button type="submit" className="rounded-lg border border-accent/50 bg-accent/10 px-5 py-2 text-sm font-medium text-accent hover:bg-accent/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">조회</button>
      <p className="mb-2 text-xs text-text-secondary">기본은 어제까지 · 동일 조건으로 조회하면 새로 불러옵니다.</p>
    </form>
    <Suspense key={`${options.days}-${options.audience}-${options.includeToday}`} fallback={<p role="status" className="rounded-xl border border-border bg-bg-card p-8 text-sm text-text-secondary">GA에서 유입과 행동을 조회하고 있습니다…</p>}>
      <AnalyticsReport options={options} />
    </Suspense>
  </div>
}
