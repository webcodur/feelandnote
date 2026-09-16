'use client'

/*
  파일명: /app/(admin)/figure-books/audit/FigureBookAuditReport.tsx
  기능: 인물 도서 감사 보고서 화면
  책임: 측정 창구(/api/figure-book-audit)가 돌려준 집계를 표로 그린다. 값은 DB가 쥐고
        이 화면은 그릴 뿐이라 결과를 파일로 남기지 않는다.
*/ // ------------------------------

import { useState, useCallback, useEffect } from 'react'
import { RefreshCw, CheckCircle2, AlertTriangle, ClipboardList } from 'lucide-react'
import Button from '@/components/ui/Button'

type CoverageRow = { total: number; linked: number; publicKo: number }
type TierRow = CoverageRow & { tier: string }
type ProfessionRow = CoverageRow & { profession: string }

type AuditSummary = {
  generatedAt: string
  totals: {
    activeCelebs: number
    linkedActiveCelebs: number
    publicKoActiveCelebs: number
    relationRows: number
    purchaseOptions: number
    publicKoWorks: number
    publicEnWorks: number
    coupangKoWorks: number
    invalidRelatedDescriptions: number
    relationsOfInactiveCelebs: number
  }
  relationTypes: Record<string, number>
  coverageByTier: TierRow[]
  coverageByProfession: ProfessionRow[]
  invalidRelatedDescriptions: { contentId: string; celebId: string; slug: string | null }[]
}

type CachedReport = { measuredAt: string; summary: AuditSummary }
type LoadState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'ready'; report: CachedReport }
  | { kind: 'error'; error: string; log?: string[] }

const CARD = 'rounded-xl border border-border bg-bg-card px-4 py-3'
const TH = 'px-3 py-2 text-left text-xs font-semibold text-text-secondary'
const TD = 'px-3 py-2 text-sm text-text-primary'

function percent(part: number, whole: number): string {
  if (whole <= 0) return '—'
  return `${Math.round((part / whole) * 1000) / 10}%`
}

function Stat({ label, value, note }: { label: string; value: number; note?: string }) {
  return (
    <div className={CARD}>
      <p className="text-xs text-text-secondary">{label}</p>
      <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">{value.toLocaleString()}</p>
      {note && <p className="mt-0.5 text-xs text-text-tertiary">{note}</p>}
    </div>
  )
}

/* 등급·직군 표는 같은 세 칸(전체·연결·공개)을 쓴다 */
function CoverageTable({ title, rows, headLabel }: {
  title: string
  rows: (CoverageRow & { label: string })[]
  headLabel: string
}) {
  return (
    <section className="space-y-2">
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[520px] border-collapse">
          <thead className="bg-bg-secondary">
            <tr>
              <th className={TH}>{headLabel}</th>
              <th className={`${TH} text-right`}>전체</th>
              <th className={`${TH} text-right`}>도서 연결</th>
              <th className={`${TH} text-right`}>한국어 공개</th>
              <th className={`${TH} text-right`}>공개율</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-border hover:bg-white/[0.03]">
                <td className={TD}>{row.label}</td>
                <td className={`${TD} text-right tabular-nums`}>{row.total.toLocaleString()}</td>
                <td className={`${TD} text-right tabular-nums`}>{row.linked.toLocaleString()}</td>
                <td className={`${TD} text-right tabular-nums`}>{row.publicKo.toLocaleString()}</td>
                <td className={`${TD} text-right tabular-nums text-text-secondary`}>{percent(row.publicKo, row.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Report({ report }: { report: CachedReport }) {
  const { totals, relationTypes, coverageByTier, coverageByProfession, invalidRelatedDescriptions } = report.summary
  const measured = new Date(report.measuredAt).toLocaleString('ko-KR')

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="활성 인물" value={totals.activeCelebs} />
        <Stat
          label="도서가 연결된 인물"
          value={totals.linkedActiveCelebs}
          note={`전체의 ${percent(totals.linkedActiveCelebs, totals.activeCelebs)}`}
        />
        <Stat
          label="한국어로 공개되는 인물"
          value={totals.publicKoActiveCelebs}
          note={`전체의 ${percent(totals.publicKoActiveCelebs, totals.activeCelebs)}`}
        />
        <Stat label="관계 건수" value={totals.relationRows} />
        <Stat label="한국어 공개 작품" value={totals.publicKoWorks} />
        <Stat label="영문 공개 작품" value={totals.publicEnWorks} />
        <Stat label="쿠팡 상품이 걸린 한국어 작품" value={totals.coupangKoWorks} />
        <Stat label="판매 판본" value={totals.purchaseOptions} />
      </div>

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-text-primary">관계 갈래</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Object.entries(relationTypes).map(([type, count]) => (
            <Stat key={type} label={type} value={count} />
          ))}
        </div>
      </section>

      <CoverageTable
        title="등급별"
        headLabel="등급"
        rows={coverageByTier.map((row) => ({ ...row, label: row.tier }))}
      />
      <CoverageTable
        title="직군별 (실존 인물)"
        headLabel="직군"
        rows={coverageByProfession.map((row) => ({ ...row, label: row.profession }))}
      />

      <section className="space-y-2">
        <h3 className="text-sm font-semibold text-text-primary">고칠 것</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className={CARD}>
            <p className="text-xs text-text-secondary">등장이 아닌데 설명이 붙은 관계</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">
              {totals.invalidRelatedDescriptions.toLocaleString()}
            </p>
            {invalidRelatedDescriptions.length > 0 && (
              <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-text-secondary">
                {invalidRelatedDescriptions.slice(0, 50).map((row) => (
                  <li key={`${row.contentId}-${row.celebId}`}>{row.slug ?? row.celebId}</li>
                ))}
              </ul>
            )}
          </div>
          <div className={CARD}>
            <p className="text-xs text-text-secondary">비공개 인물에 남은 관계</p>
            <p className="mt-1 text-xl font-bold tabular-nums text-text-primary">
              {totals.relationsOfInactiveCelebs.toLocaleString()}
            </p>
            <p className="mt-0.5 text-xs text-text-tertiary">인물을 다시 공개하면 살아난다. 고칠 대상이 아니라 통계다.</p>
          </div>
        </div>
      </section>

      <p className="text-xs text-text-secondary">측정 · {measured}</p>
    </div>
  )
}

export default function FigureBookAuditReport() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const measure = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const res = await fetch('/api/figure-book-audit', { method: 'POST' })
      const data = await res.json()
      if (!res.ok || !data.summary) {
        setState({ kind: 'error', error: data.error ?? `HTTP ${res.status}`, log: data.log })
        return
      }
      setState({ kind: 'ready', report: data as CachedReport })
    } catch (err) {
      setState({ kind: 'error', error: err instanceof Error ? err.message : String(err) })
    }
  }, [])

  useEffect(() => {
    fetch('/api/figure-book-audit')
      .then(async (res) => {
        if (res.ok) {
          setState({ kind: 'ready', report: (await res.json()) as CachedReport })
        } else {
          setState({ kind: 'empty' })
        }
      })
      .catch(() => setState({ kind: 'empty' }))
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button onClick={measure} disabled={state.kind === 'loading'}>
          <RefreshCw className={`w-4 h-4 ${state.kind === 'loading' ? 'animate-spin' : ''}`} />
          {state.kind === 'loading' ? '측정 중…' : '지금 측정'}
        </Button>
        {state.kind === 'ready' && (
          <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
            <CheckCircle2 className="w-4 h-4" />
            최신 측정 표시 중
          </span>
        )}
        {state.kind === 'error' && (
          <span className="inline-flex items-center gap-1.5 text-sm text-red-400">
            <AlertTriangle className="w-4 h-4" />
            실패 · {state.error}
          </span>
        )}
      </div>

      {state.kind === 'error' && state.log && state.log.length > 0 && (
        <pre className="max-h-40 overflow-auto rounded-lg border border-border bg-bg-card p-3 text-xs text-text-secondary">
          {state.log.join('\n')}
        </pre>
      )}

      {state.kind === 'empty' && (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-bg-card px-6 py-16 text-center">
          <ClipboardList className="h-8 w-8 text-text-secondary" />
          <p className="text-sm text-text-secondary">
            아직 측정된 보고서가 없습니다. 「지금 측정」으로 최신 DB 기준을 집계합니다.
          </p>
        </div>
      )}

      {state.kind === 'loading' && (
        <div className="rounded-xl border border-border bg-bg-card px-6 py-16 text-center text-sm text-text-secondary">
          인물·관계·판본 표를 통째로 읽어 집계하는 중입니다. 1~2분 걸릴 수 있습니다.
        </div>
      )}

      {state.kind === 'ready' && <Report report={state.report} />}
    </div>
  )
}
