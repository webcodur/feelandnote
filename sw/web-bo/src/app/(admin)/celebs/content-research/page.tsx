import type { Metadata } from 'next'
import Link from 'next/link'
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  CircleDashed,
  SearchCheck,
  Sparkles,
} from 'lucide-react'
import { getContentResearchWorkspace } from '@/actions/admin/content-research'
import {
  CONTENT_RESEARCH_BUCKETS,
  type ContentResearchBucket,
} from '@/actions/admin/content-research-types'
import type { CelebContentResearchStatus } from '@feelandnote/shared/constants/celeb-content-research'
import Button from '@/components/ui/Button'
import Pagination from '@/components/ui/Pagination'
import { getCelebProfessionLabel } from '@/constants/celebCategories'
import ResearchStatusControls from './ResearchStatusControls'

export const metadata: Metadata = {
  title: '셀럽 콘텐츠 조사',
  robots: { index: false, follow: false },
}

interface PageProps {
  searchParams: Promise<{
    page?: string
    search?: string
    bucket?: string
    researchStatus?: string
  }>
}

const BUCKET_META: Record<
  ContentResearchBucket,
  { label: string; shortLabel: string; description: string; className: string }
> = {
  promote_audit: {
    label: 'Light 승격 감사',
    shortLabel: '승격 감사',
    description: '콘텐츠가 이미 있으므로 내용 감사 뒤 Full 승격',
    className: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
  },
  active_research: {
    label: '활성·조사 대상',
    shortLabel: '활성 조사',
    description: '실제 콘텐츠 0건, 없음 미확정',
    className: 'border-rose-500/30 bg-rose-500/10 text-rose-200',
  },
  inactive_triage: {
    label: '비활성·쓱 보기',
    shortLabel: '비활성 선별',
    description: '영향력·자료 존재 가능성만 보고 조사 큐 여부 결정',
    className: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
  },
  confirmed_empty: {
    label: '조사 완료·없음',
    shortLabel: '-1 확정',
    description: '정식 조사에서 콘텐츠가 없음을 확인',
    className: 'border-slate-500/30 bg-slate-500/10 text-slate-200',
  },
}

const VALID_RESEARCH_STATUSES = new Set([
  'open',
  'queued',
  'researching',
  'deferred',
  'confirmed_empty',
])

const RESEARCH_STATUS_LABELS: Record<CelebContentResearchStatus, string> = {
  open: '열린 0',
  queued: '조사 큐',
  researching: '조사 중',
  deferred: '보류',
  confirmed_empty: '-1 확정',
}

function parseBucket(value: string | undefined): ContentResearchBucket | 'all' {
  return CONTENT_RESEARCH_BUCKETS.includes(value as ContentResearchBucket)
    ? (value as ContentResearchBucket)
    : 'all'
}

function parseResearchStatus(
  value: string | undefined
): CelebContentResearchStatus | 'all' {
  return VALID_RESEARCH_STATUSES.has(value ?? '')
    ? (value as CelebContentResearchStatus)
    : 'all'
}

function makeFilterHref(
  current: {
    search: string
    bucket: ContentResearchBucket | 'all'
    researchStatus: CelebContentResearchStatus | 'all'
  },
  patch: Partial<{
    search: string
    bucket: ContentResearchBucket | 'all'
    researchStatus: CelebContentResearchStatus | 'all'
  }>
): string {
  const next = { ...current, ...patch }
  const query = new URLSearchParams()
  if (next.search) query.set('search', next.search)
  if (next.bucket !== 'all') query.set('bucket', next.bucket)
  if (next.researchStatus !== 'all') query.set('researchStatus', next.researchStatus)
  const queryString = query.toString()
  return `/celebs/content-research${queryString ? `?${queryString}` : ''}`
}

function formatDate(value: string | null): string {
  if (!value) return '-'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('ko-KR')
}

export default async function ContentResearchPage({ searchParams }: PageProps) {
  const params = await searchParams
  const page = Math.max(1, Number(params.page) || 1)
  const search = params.search?.trim() ?? ''
  const bucket = parseBucket(params.bucket)
  const researchStatus = parseResearchStatus(params.researchStatus)
  const workspace = await getContentResearchWorkspace({
    page,
    limit: 50,
    search,
    bucket,
    researchStatus,
  })
  const currentFilters = { search, bucket, researchStatus }

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <SearchCheck className="h-6 w-6 text-accent" />
            <h1 className="text-2xl font-bold text-text-primary">셀럽 콘텐츠 조사</h1>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">
            <strong className="text-text-primary">0은 가능성을 열어 둔 상태</strong>이고,
            정식 조사로 없음이 확인된 경우만 <strong className="text-rose-300">-1</strong>로
            닫습니다. 콘텐츠가 하나라도 등록되면 조사 상태와 무관하게 실측 개수를 표시합니다.
          </p>
        </div>
        <Link
          href="/celebs"
          className="inline-flex items-center gap-1.5 self-start rounded-lg border border-border px-3 py-2 text-sm text-text-secondary hover:border-accent hover:text-accent"
        >
          셀럽 목록
          <ArrowRight className="h-4 w-4" />
        </Link>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <CircleDashed className="h-4 w-4" />
            열린 상태
          </div>
          <p className="mt-2 text-2xl font-bold text-text-primary">
            {(
              workspace.statusCounts.open +
              workspace.statusCounts.queued +
              workspace.statusCounts.researching +
              workspace.statusCounts.deferred
            ).toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">전부 표시값 0, 다시 조사 가능</p>
        </div>
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <BookOpen className="h-4 w-4" />
            실제 콘텐츠 보유
          </div>
          <p className="mt-2 text-2xl font-bold text-emerald-300">
            {workspace.bucketCounts.promote_audit.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">Light 승격 감사 대상</p>
        </div>
        <div className="rounded-lg border border-border bg-bg-card p-4">
          <div className="flex items-center gap-2 text-sm text-text-secondary">
            <CheckCircle2 className="h-4 w-4" />
            없음 확정
          </div>
          <p className="mt-2 text-2xl font-bold text-rose-300">
            {workspace.statusCounts.confirmed_empty.toLocaleString()}
          </p>
          <p className="mt-1 text-xs text-text-tertiary">정식 조사 완료, 표시값 -1</p>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-bg-card p-3">
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          <Link
            href={makeFilterHref(currentFilters, { bucket: 'all' })}
            className={`rounded-lg border p-3 hover:border-accent hover:bg-accent/5 ${
              bucket === 'all' ? 'border-accent bg-accent/10' : 'border-border'
            }`}
          >
            <p className="text-sm font-semibold text-text-primary">전체 Light</p>
            <p className="mt-1 text-xs text-text-tertiary">
              {Object.values(workspace.bucketCounts).reduce((sum, count) => sum + count, 0)}명
            </p>
          </Link>
          {CONTENT_RESEARCH_BUCKETS.map((bucketKey) => {
            const meta = BUCKET_META[bucketKey]
            const active = bucket === bucketKey
            return (
              <Link
                key={bucketKey}
                href={makeFilterHref(currentFilters, { bucket: bucketKey })}
                className={`rounded-lg border p-3 hover:border-accent hover:bg-accent/5 ${
                  active ? meta.className : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-text-primary">{meta.label}</p>
                  <span className="font-mono text-sm text-text-secondary">
                    {workspace.bucketCounts[bucketKey]}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-text-tertiary">{meta.description}</p>
              </Link>
            )
          })}
        </div>
      </section>

      <form
        action="/celebs/content-research"
        className="flex flex-col gap-2 rounded-lg border border-border bg-bg-card p-3 sm:flex-row"
      >
        <input
          type="search"
          name="search"
          defaultValue={search}
          placeholder="인물명·slug 검색"
          className="min-w-0 flex-1 rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
        />
        {bucket !== 'all' ? <input type="hidden" name="bucket" value={bucket} /> : null}
        <select
          name="researchStatus"
          defaultValue={researchStatus}
          className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary outline-none focus:border-accent"
        >
          <option value="all">모든 조사 상태</option>
          {Object.entries(RESEARCH_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label} ({workspace.statusCounts[value as CelebContentResearchStatus]})
            </option>
          ))}
        </select>
        <Button type="submit" size="sm">
          필터 적용
        </Button>
      </form>

      <div className="overflow-hidden rounded-lg border border-border bg-bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px]">
            <thead className="border-b border-border bg-bg-secondary">
              <tr className="text-left text-xs text-text-secondary">
                <th className="px-4 py-3 font-medium">인물</th>
                <th className="px-4 py-3 font-medium">작업 경로</th>
                <th className="px-4 py-3 font-medium">쓱 보기 신호</th>
                <th className="px-4 py-3 text-center font-medium">표시값</th>
                <th className="px-4 py-3 font-medium">조사 상태</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {workspace.rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-14 text-center text-sm text-text-secondary">
                    조건에 맞는 인물이 없습니다.
                  </td>
                </tr>
              ) : (
                workspace.rows.map((row) => {
                  const bucketMeta = BUCKET_META[row.bucket]
                  return (
                    <tr key={row.id} className="hover:bg-white/[0.025]">
                      <td className="px-4 py-3 align-top">
                        <div className="flex items-start gap-2">
                          <div>
                            <Link
                              href={row.slug ? `/celebs/${row.slug}` : '/celebs'}
                              className="font-medium text-text-primary hover:text-accent hover:underline"
                            >
                              {row.nickname}
                            </Link>
                            <p className="mt-1 text-xs text-text-tertiary">
                              {getCelebProfessionLabel(row.profession)}
                              {' · '}
                              {row.profileStatus === 'active' ? '활성' : '비활성'}
                              {' · '}
                              영향력 {row.influenceTotal}
                            </p>
                            <p className="mt-1 text-[11px] text-text-tertiary">
                              {row.birthDate ?? '?'}–{row.deathDate ?? ''}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <span
                          className={`inline-flex rounded border px-2 py-1 text-xs font-medium ${bucketMeta.className}`}
                        >
                          {bucketMeta.shortLabel}
                        </span>
                        <div className="mt-2 flex gap-2 text-xs">
                          {row.slug ? (
                            <>
                              <Link
                                href={`/celebs/${row.slug}/contents`}
                                className="text-accent hover:underline"
                              >
                                콘텐츠 관리
                              </Link>
                              <Link
                                href={`/celebs/${row.slug}/contents/collect`}
                                className="text-text-secondary hover:text-accent hover:underline"
                              >
                                수집 작업대
                              </Link>
                            </>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3 align-top">
                        <div className="flex flex-wrap gap-1">
                          {row.triageSignals.map((signal) => (
                            <span
                              key={signal}
                              className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[11px] text-amber-200"
                            >
                              {signal}
                            </span>
                          ))}
                        </div>
                        {row.bucket === 'inactive_triage' ? (
                          <p className="mt-2 text-[11px] text-text-tertiary">
                            우선순위 점수 {row.triageScore} · 점수는 조사 확정이 아닌 정렬 신호
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-center align-top">
                        <span
                          className={`inline-flex min-w-9 justify-center rounded px-2 py-1 font-mono text-sm font-bold ${
                            row.displayContentCount > 0
                              ? 'bg-emerald-500/15 text-emerald-200'
                              : row.displayContentCount === -1
                                ? 'bg-rose-500/15 text-rose-200'
                                : 'bg-slate-500/15 text-slate-300'
                          }`}
                        >
                          {row.displayContentCount}
                        </span>
                        {row.confirmedEmptyAt ? (
                          <p className="mt-1 text-[10px] text-text-tertiary">
                            {formatDate(row.confirmedEmptyAt)}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <ResearchStatusControls
                          celebId={row.id}
                          currentStatus={row.researchStatus}
                          actualContentCount={row.actualContentCount}
                        />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex flex-col gap-2 text-xs text-text-tertiary sm:flex-row sm:items-center sm:justify-between">
        <p>
          총 {workspace.total.toLocaleString()}명 · 50명씩 표시
        </p>
        <p className="inline-flex items-center gap-1">
          <Sparkles className="h-3.5 w-3.5" />
          비활성 선별 점수는 큐 정렬용이며, 낮다고 없음으로 확정하지 않습니다.
        </p>
      </div>

      <Pagination
        page={workspace.page}
        totalPages={workspace.totalPages}
        baseHref="/celebs/content-research"
        params={{
          search: search || undefined,
          bucket: bucket !== 'all' ? bucket : undefined,
          researchStatus: researchStatus !== 'all' ? researchStatus : undefined,
        }}
      />
    </div>
  )
}
