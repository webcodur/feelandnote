'use client'

import Link from 'next/link'
import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  ExternalLink,
  HardDriveDownload,
  Link2,
  RefreshCw,
  Search,
} from 'lucide-react'
import {
  syncBookRecommendResourceAction,
} from '@/actions/admin/book-recommend'
import type {
  BookCoverState,
  BookResourceAudit,
  BookResourceRow,
} from '@/lib/book-recommend-resources'
import { useToast } from '@/contexts/ToastContext'

type Filter = 'all' | 'needs-sync' | 'unlinked' | 'synced'

const COVER_LABELS: Record<BookCoverState, { label: string; className: string }> = {
  synced: { label: '동기화', className: 'bg-emerald-500/10 text-emerald-400' },
  stale: { label: 'DB 변경', className: 'bg-amber-500/10 text-amber-300' },
  legacy: { label: '구경로', className: 'bg-blue-500/10 text-blue-300' },
  external: { label: '외부 URL', className: 'bg-orange-500/10 text-orange-300' },
  missing: { label: '비어 있음', className: 'bg-red-500/10 text-red-300' },
  'missing-file': { label: '파일 없음', className: 'bg-red-500/10 text-red-300' },
  'source-missing': { label: 'DB 표지 없음', className: 'bg-purple-500/10 text-purple-300' },
  unlinked: { label: 'DB 미연결', className: 'bg-gray-500/10 text-text-secondary' },
}

function needsSync(row: BookResourceRow): boolean {
  return row.covers.some(cover => cover.state !== 'synced')
}

function canSyncCover(row: BookResourceRow): boolean {
  return row.covers.some(cover =>
    cover.state === 'stale'
    || cover.state === 'legacy'
    || cover.state === 'external'
    || cover.state === 'missing'
    || cover.state === 'missing-file'
  )
}

function isSafe(row: BookResourceRow): boolean {
  return row.matchKind === 'linked' || row.matchKind === 'exact'
}

function SummaryCard({
  label,
  value,
  tone = 'normal',
}: {
  label: string
  value: number
  tone?: 'normal' | 'good' | 'warn'
}) {
  const color = tone === 'good'
    ? 'text-emerald-400'
    : tone === 'warn'
      ? 'text-amber-300'
      : 'text-text-primary'
  return (
    <div className="rounded-lg border border-border bg-bg-card px-4 py-3">
      <div className={`text-xl font-bold ${color}`}>{value.toLocaleString()}</div>
      <div className="mt-0.5 text-[11px] text-text-secondary">{label}</div>
    </div>
  )
}

export default function BookRecommendResourceBoard({
  audit,
  remotionLocal,
  initialContentId,
}: {
  audit: BookResourceAudit | null
  remotionLocal: boolean
  initialContentId: string
}) {
  const router = useRouter()
  const { showToast } = useToast()
  const [pending, startTransition] = useTransition()
  const [query, setQuery] = useState(initialContentId)
  const [filter, setFilter] = useState<Filter>(initialContentId ? 'all' : 'needs-sync')
  const [manual, setManual] = useState<Record<string, string>>({})

  const rows = useMemo(() => {
    if (!audit) return []
    const q = query.trim().toLocaleLowerCase()
    return audit.rows.filter(row => {
      const queryMatch = !q || [
        row.title,
        row.creator,
        row.episode,
        row.celebNickname,
        row.currentContentId,
        row.match?.contentId,
      ].some(value => value?.toLocaleLowerCase().includes(q))
      if (!queryMatch) return false
      if (filter === 'needs-sync') return isSafe(row) && needsSync(row)
      if (filter === 'unlinked') return !isSafe(row)
      if (filter === 'synced') return isSafe(row) && !needsSync(row)
      return true
    })
  }, [audit, filter, query])

  if (!remotionLocal || !audit) {
    return (
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5">
        <div className="flex items-center gap-2 font-semibold text-amber-300">
          <AlertTriangle className="h-4 w-4" />
          로컬 렌더 저장소가 연결되지 않았습니다
        </div>
        <p className="mt-2 text-sm text-text-secondary">
          이 화면은 <code className="font-mono text-text-primary">sw/remotion</code>의 원고와 표지 파일을
          직접 점검합니다. <code className="font-mono text-text-primary">sw/web-bo/.env</code>에
          <code className="ml-1 font-mono text-text-primary">REMOTION_LOCAL=1</code>을 설정하고 서버를 다시 시작하세요.
        </p>
      </div>
    )
  }

  const runSync = (keys: string[], mappings?: Record<string, string>) => {
    startTransition(async () => {
      try {
        const result = await syncBookRecommendResourceAction({ keys, mappings })
        if (result.failed) {
          const first = result.results.find(item => !item.ok)
          showToast('error', `${result.synced}권 완료, ${result.failed}권 실패: ${first?.error ?? '원인 불명'}`)
        } else {
          const warnings = result.results.reduce((sum, item) => sum + item.warnings.length, 0)
          showToast(
            warnings ? 'info' : 'success',
            `${result.synced}건을 동기화했습니다${warnings ? ` · 표지 없는 판본 ${warnings}건` : ''}`,
          )
        }
        router.refresh()
      } catch (error) {
        showToast('error', error instanceof Error ? error.message : String(error))
      }
    })
  }

  const nextSafeBatch = rows
    .filter(row => isSafe(row) && (row.matchKind === 'exact' || canSyncCover(row)))
    .slice(0, 10)

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-8">
        <SummaryCard label="에피소드" value={audit.summary.episodes} />
        <SummaryCard label="콘텐츠" value={audit.summary.books} />
        <SummaryCard label="ID 연결" value={audit.summary.linked} tone="good" />
        <SummaryCard label="안전 자동 연결" value={audit.summary.exact} />
        <SummaryCard label="확인 필요" value={audit.summary.candidate} tone="warn" />
        <SummaryCard label="미해결" value={audit.summary.unresolved + audit.summary.invalidLink} tone="warn" />
        <SummaryCard label="표지 동기화" value={audit.summary.syncedCovers} tone="good" />
        <SummaryCard
          label="표지 조치 필요"
          value={audit.summary.staleCovers + audit.summary.externalCovers + audit.summary.legacyCovers + audit.summary.missingCovers}
          tone="warn"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-bg-card p-3">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            placeholder="인물·책·에피소드·content ID 검색"
            className="w-full rounded-lg border border-border bg-bg-secondary py-2 pl-9 pr-3 text-sm text-text-primary placeholder:text-text-tertiary focus:border-accent focus:outline-none"
          />
        </div>
        <select
          value={filter}
          onChange={event => setFilter(event.target.value as Filter)}
          className="rounded-lg border border-border bg-bg-secondary px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none"
        >
          <option value="needs-sync">안전·조치 필요</option>
          <option value="unlinked">DB 연결 확인 필요</option>
          <option value="synced">동기화 완료</option>
          <option value="all">전체</option>
        </select>
        <button
          type="button"
          disabled={pending || nextSafeBatch.length === 0}
          onClick={() => runSync(nextSafeBatch.map(row => row.key))}
          className="inline-flex items-center gap-1.5 rounded-lg border border-accent bg-accent/10 px-3 py-2 text-sm font-semibold text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
          title="외부 표지 서버의 제한과 요청 시간 초과를 피하기 위해 한 번에 10권씩 처리합니다"
        >
          {pending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <HardDriveDownload className="h-4 w-4" />}
          안전 항목 {nextSafeBatch.length}건 동기화
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1120px] text-left">
            <thead className="border-b border-border bg-bg-secondary text-[11px] text-text-secondary">
              <tr>
                <th className="px-4 py-3 font-medium">인물·콘텐츠</th>
                <th className="px-4 py-3 font-medium">DB 연결</th>
                <th className="px-4 py-3 font-medium">KO/EN 표지</th>
                <th className="px-4 py-3 text-right font-medium">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map(row => {
                const selectedManual = manual[row.key] ?? ''
                const canRunSync = row.match
                  ? row.matchKind === 'exact' || canSyncCover(row)
                  : Boolean(selectedManual)
                return (
                  <tr
                    key={row.key}
                    className="hover:bg-bg-secondary/70 [content-visibility:auto] [contain-intrinsic-size:92px]"
                  >
                    <td className="px-4 py-3 align-top">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-text-primary">{row.title}</span>
                        <span className="rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-text-secondary">
                          {row.status}
                        </span>
                      </div>
                      <div className="mt-0.5 text-xs text-text-secondary">{row.creator || '저자 없음'}</div>
                      <div className="mt-1 font-mono text-[10px] text-text-tertiary">
                        {row.celebNickname} · {row.key}
                      </div>
                    </td>

                    <td className="px-4 py-3 align-top">
                      {row.match ? (
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                            {row.matchKind === 'linked'
                              ? <Link2 className="h-3.5 w-3.5" />
                              : <Database className="h-3.5 w-3.5" />}
                            {row.matchKind === 'linked' ? 'ID 연결됨' : '안전 메타 일치'}
                          </div>
                          <Link
                            href={`/contents/${row.match.contentId}`}
                            className="block text-xs text-text-primary hover:text-accent"
                          >
                            {row.match.title}
                          </Link>
                          <div className="font-mono text-[10px] text-text-tertiary">{row.match.contentId}</div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-amber-300">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            {row.matchKind === 'invalid-link' ? '저장된 ID가 DB 관계와 다름' : '사람 확인 필요'}
                          </div>
                          {row.candidates.length > 0 ? (
                            <select
                              value={selectedManual}
                              onChange={event => setManual(current => ({ ...current, [row.key]: event.target.value }))}
                              className="max-w-[330px] rounded border border-border bg-bg-secondary px-2 py-1.5 text-xs text-text-primary"
                            >
                              <option value="">후보를 직접 선택하세요</option>
                              {row.candidates.map(candidate => (
                                <option key={candidate.userContentId} value={candidate.userContentId}>
                                  {candidate.title} · {candidate.creator || '저자 없음'} · {candidate.score}점
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="block text-[11px] text-text-secondary">이 인물의 DB 도서에서 후보를 찾지 못했습니다.</span>
                          )}
                        </div>
                      )}
                    </td>

                    <td className="px-4 py-3 align-top">
                      <div className="flex flex-wrap gap-2">
                        {row.covers.map(cover => {
                          const style = COVER_LABELS[cover.state]
                          return (
                            <div key={cover.locale} className="rounded-md border border-border bg-bg-secondary/60 px-2.5 py-2">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-[10px] font-semibold text-text-primary">
                                  {cover.locale.toUpperCase()}
                                </span>
                                <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${style.className}`}>
                                  {style.label}
                                </span>
                              </div>
                              {cover.current && (
                                <div className="mt-1 max-w-[230px] truncate font-mono text-[9px] text-text-tertiary" title={cover.current}>
                                  {cover.current}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </td>

                    <td className="px-4 py-3 align-top">
                      <div className="flex justify-end gap-2">
                        {row.celebSlug && (
                          <Link
                            href={`/celebs/${row.celebSlug}/contents`}
                            title="이 인물의 콘텐츠 관계를 정비합니다"
                            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs text-text-secondary hover:border-accent hover:text-accent"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                            콘텐츠
                          </Link>
                        )}
                        <button
                          type="button"
                          disabled={pending || !canRunSync}
                          onClick={() => runSync(
                            [row.key],
                            row.match ? undefined : { [row.key]: selectedManual },
                          )}
                          title={
                            row.matchKind === 'linked' && !canSyncCover(row)
                              ? 'DB 판본에 표지 URL을 등록한 뒤 동기화할 수 있습니다'
                              : undefined
                          }
                          className="inline-flex items-center gap-1 rounded-md border border-accent bg-accent/10 px-2.5 py-1.5 text-xs font-semibold text-accent hover:bg-accent/20 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {row.covers.every(cover => cover.state === 'synced')
                            ? <CheckCircle2 className="h-3.5 w-3.5" />
                            : <HardDriveDownload className="h-3.5 w-3.5" />}
                          {row.match ? '동기화' : '선택 연결'}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-text-secondary">
                    조건에 맞는 책이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11px] text-text-tertiary">
        마지막 점검 {new Date(audit.generatedAt).toLocaleString('ko-KR')} · 렌더 저장소 {audit.remotionRoot}
      </p>
    </div>
  )
}
