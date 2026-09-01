'use client'

import { useMemo, useState, useTransition } from 'react'
import Link from 'next/link'
import { HardDrive, Search } from 'lucide-react'
import {
  archiveAsset, stageAsset, unstageAsset,
  type AssetArchiveSnapshot, type AssetUnit,
} from '@/actions/admin/assets'

type Series = 'factions' | 'episodes' | 'discourses'
const SERIES_LABEL: Record<Series, string> = { factions: '세력도감', episodes: '서재 탐방', discourses: '가상 담화' }
const SERIES_ORDER: Series[] = ['factions', 'episodes', 'discourses']

type Filter = 'all' | AssetUnit['state']
const STATE_LABEL: Record<AssetUnit['state'], { mark: string; text: string; cls: string }> = {
  staged: { mark: '●', text: '작업 중', cls: 'text-accent' },
  archived: { mark: '○', text: '보관소', cls: 'text-text-tertiary' },
  'public-only': { mark: '◆', text: 'public 실체', cls: 'text-amber-500' },
  conflict: { mark: '✗', text: '충돌', cls: 'text-danger-text' },
  'broken-link': { mark: '✗', text: '끊긴 정션', cls: 'text-danger-text' },
}

const mb = (bytes: number) => bytes >= 1024 * 1048576
  ? `${(bytes / 1073741824).toFixed(1)} GB`
  : `${Math.round(bytes / 1048576).toLocaleString()} MB`

/** 걸린 편을 바로 여는 주소. 서재 탐방·담화는 목록 화면으로 보낸다(편 주소가 인물·편별로 다르다). */
function openHref(u: AssetUnit): string {
  if (u.series === 'factions') return `/factions/${encodeURIComponent(u.name)}/ko/info`
  if (u.series === 'discourses') return '/discourses'
  return '/book-recommend'
}

export default function AssetArchiveBoard({ snapshot }: { snapshot: AssetArchiveSnapshot }) {
  const [units, setUnits] = useState(snapshot.units)
  const [series, setSeries] = useState<Series>('factions')
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')
  const [pending, startTransition] = useTransition()
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // 옮기기는 되돌리기 어려워 두 번 눌러 확정한다 — 브라우저 confirm 을 쓰지 않는다.
  const [confirmKey, setConfirmKey] = useState<string | null>(null)

  const keyOf = (u: AssetUnit) => `${u.series}/${u.name}`
  const seriesUnits = useMemo(() => units.filter(u => u.series === series), [units, series])
  const shown = useMemo(() => {
    const q = query.trim().toLowerCase()
    return seriesUnits.filter(u => (filter === 'all' || u.state === filter) && (!q || u.name.toLowerCase().includes(q)))
  }, [seriesUnits, filter, query])

  const summary = useMemo(() => {
    const by = (s: AssetUnit['state']) => seriesUnits.filter(u => u.state === s)
    const sum = (list: AssetUnit[]) => list.reduce((a, u) => a + u.bytes, 0)
    return {
      staged: by('staged').length,
      stagedBytes: sum(by('staged')),
      archived: by('archived').length,
      archivedBytes: sum(by('archived')),
      publicOnly: by('public-only').length,
      broken: by('conflict').length + by('broken-link').length,
    }
  }, [seriesUnits])

  const run = (u: AssetUnit, action: (s: string, n: string) => Promise<AssetUnit[]>) => {
    setError(null)
    setBusy(keyOf(u))
    setConfirmKey(null)
    startTransition(async () => {
      try {
        const next = await action(u.series, u.name)
        setUnits(prev => [...prev.filter(x => x.series !== u.series), ...next])
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setBusy(null)
      }
    })
  }

  if (!snapshot.available) {
    return (
      <div className="rounded-xl border border-border bg-bg-card p-6 text-sm text-text-secondary">
        이 컴퓨터에는 보관소(<code className="font-mono">{snapshot.archiveRoot}</code>)가 없습니다. 편 실체가 작업 폴더에 그대로 있는 옛 구조로 돕니다.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 시리즈 탭 + 요약 */}
      <div className="flex flex-wrap items-center gap-2">
        {SERIES_ORDER.map(s => {
          const n = units.filter(u => u.series === s).length
          const active = s === series
          return (
            <button
              key={s}
              type="button"
              onClick={() => { setSeries(s); setFilter('all'); setConfirmKey(null) }}
              className={`rounded-lg border px-3 py-1.5 text-sm font-bold ${
                active ? 'border-accent bg-accent/15 text-text-primary' : 'border-border bg-bg-card text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary'
              }`}
            >
              {SERIES_LABEL[s]} <span className="ml-1 font-mono text-xs text-text-tertiary">{n}</span>
            </button>
          )
        })}
        <span className="ml-auto flex items-center gap-1.5 rounded-lg border border-border bg-bg-card px-3 py-1.5 text-xs text-text-secondary">
          <HardDrive size={13} className="text-accent" />
          작업 중 <b className="text-text-primary">{summary.staged}</b>편 · {mb(summary.stagedBytes)}
          <span className="text-text-dim">|</span>
          보관소만 <b className="text-text-primary">{summary.archived}</b>편 · {mb(summary.archivedBytes)}
          {summary.publicOnly > 0 && <><span className="text-text-dim">|</span> public 실체 {summary.publicOnly}</>}
          {summary.broken > 0 && <><span className="text-text-dim">|</span> <span className="text-danger-text">정리 필요 {summary.broken}</span></>}
        </span>
      </div>

      {/* 검색 + 상태 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary" />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="편 이름 검색"
            className="h-8 w-64 rounded-lg border border-border bg-bg-main pl-8 pr-2 text-xs text-text-primary placeholder:text-text-dim focus:border-accent focus:outline-none"
          />
        </div>
        {(['all', 'staged', 'archived', 'public-only'] as const).map(f => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded border px-2 py-1 text-[11px] font-semibold ${
              filter === f ? 'border-accent bg-accent/15 text-text-primary' : 'border-border bg-bg-card text-text-secondary hover:border-accent hover:bg-bg-hover'
            }`}
          >
            {f === 'all' ? '전부' : `${STATE_LABEL[f].mark} ${STATE_LABEL[f].text}`}
          </button>
        ))}
        {series === 'discourses' && (
          <span className="text-[11px] text-text-tertiary">담화는 git이 파일을 추적해 풀지 않습니다.</span>
        )}
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-danger/50 bg-danger/10 px-3 py-2 text-xs text-danger-text">{error}</div>
      )}

      {/* 목록 */}
      <div className="overflow-x-auto rounded-xl border border-border bg-bg-card">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-[11px] uppercase tracking-wide text-text-tertiary">
            <tr>
              <th className="px-3 py-2 font-semibold">상태</th>
              <th className="px-3 py-2 font-semibold">편</th>
              <th className="px-3 py-2 text-right font-semibold">크기</th>
              <th className="px-3 py-2 text-right font-semibold">파일</th>
              <th className="px-3 py-2 text-right font-semibold">동작</th>
            </tr>
          </thead>
          <tbody>
            {shown.map(u => {
              const key = keyOf(u)
              const st = STATE_LABEL[u.state]
              const isBusy = busy === key
              return (
                <tr key={key} className="border-b border-border/60 last:border-b-0 hover:bg-bg-hover">
                  <td className={`whitespace-nowrap px-3 py-2 text-xs font-bold ${st.cls}`}>{st.mark} {st.text}</td>
                  <td className="px-3 py-2 font-mono text-xs text-text-primary">
                    {u.name}
                    {u.state === 'broken-link' && u.target && (
                      <span className="ml-2 text-[10px] text-text-dim" title={u.target}>→ {u.target}</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-xs text-text-secondary">{mb(u.bytes)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-mono text-xs text-text-tertiary">{u.files.toLocaleString()}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-1.5">
                      {u.state === 'archived' && (
                        <button type="button" disabled={pending} onClick={() => run(u, stageAsset)} className={btn('accent')}>
                          {isBusy ? '거는 중…' : '활성화'}
                        </button>
                      )}
                      {u.state === 'staged' && (
                        <>
                          <Link href={openHref(u)} className={btn('plain')}>열기</Link>
                          {u.series !== 'discourses' && (
                            <button type="button" disabled={pending} onClick={() => run(u, unstageAsset)} className={btn('plain')}>
                              {isBusy ? '푸는 중…' : '해제'}
                            </button>
                          )}
                        </>
                      )}
                      {u.state === 'public-only' && (
                        confirmKey === key ? (
                          <>
                            <button type="button" disabled={pending} onClick={() => run(u, archiveAsset)} className={btn('danger')}>
                              {isBusy ? '옮기는 중…' : `정말 옮기기 (${mb(u.bytes)})`}
                            </button>
                            <button type="button" onClick={() => setConfirmKey(null)} className={btn('plain')}>취소</button>
                          </>
                        ) : (
                          <button type="button" disabled={pending} onClick={() => setConfirmKey(key)} className={btn('plain')}>보관소로 옮기기</button>
                        )
                      )}
                      {(u.state === 'conflict' || u.state === 'broken-link') && (
                        <span className="text-[11px] text-text-tertiary">터미널에서 정리</span>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
            {shown.length === 0 && (
              <tr><td colSpan={5} className="px-3 py-8 text-center text-xs text-text-dim">해당하는 편이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function btn(kind: 'accent' | 'plain' | 'danger'): string {
  const base = 'inline-flex h-7 items-center rounded-md border px-2.5 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-50'
  if (kind === 'accent') return `${base} border-accent bg-accent/15 text-text-primary hover:bg-accent/30`
  if (kind === 'danger') return `${base} border-danger/60 bg-danger/10 text-danger-text hover:bg-danger/25`
  return `${base} border-border bg-bg-main text-text-secondary hover:border-accent hover:bg-bg-hover hover:text-text-primary`
}
