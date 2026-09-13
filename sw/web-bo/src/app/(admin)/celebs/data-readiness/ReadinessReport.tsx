'use client'

import { useState, useCallback, useEffect } from 'react'
import Button from '@/components/ui/Button'
import { RefreshCw, CheckCircle2, AlertTriangle, ClipboardList } from 'lucide-react'

type CoverageSummary = {
  averagePercentage: number
  bands: Record<string, number>
  domains: Record<string, { complete: number; applicable: number; percentage: number }>
}
type Breakdown = {
  scope: number
  ready: number
  readyPercentage: number
  coverage: CoverageSummary
}
type ReadinessSummary = {
  measuredAt: string
  scope: number
  ready: number
  readyPercentage: number
  readinessByTier: Record<string, Breakdown>
  readinessByPublicationStatus: Record<string, Breakdown>
  coverage: CoverageSummary
  contentResearch: { rawUnconfirmed: number; targets: number; excludedByPublicationStatus: number }
  linkAudit: { mode: 'skipped' | 'checked'; checked: number; passed: number; failed: number }
  gapCounts: Record<string, number>
  qualityWarnings: { celebs: number; readyCelebs: number; counts: Record<string, number> }
}
type CachedReport = { measuredAt: string; summary: ReadinessSummary }
type LoadState =
  | { kind: 'loading' }
  | { kind: 'empty' }
  | { kind: 'ready'; report: CachedReport }
  | { kind: 'error'; error: string; log?: string[] }

const DOMAIN_ORDER = ['basic', 'influence', 'spectrum', 'speech', 'content', 'source']
const DOMAIN_LABELS: Record<string, string> = {
  basic: '기본정보',
  influence: '영향력',
  spectrum: '스펙트럼',
  speech: '발화·대사',
  content: '콘텐츠',
  source: '대표 원전',
}
const DOMAIN_DEFINITIONS: Record<string, string> = {
  basic: '이름·slug·한 줄 정의(KO/EN)·직업·칭호·소개(KO/EN)·국적·성별·생년·아바타.',
  influence: '정치·전략·기술·사회·경제·문화·초역사 7축 점수·축별 설명(KO/EN)·총점.',
  spectrum: '능력·내덕·외덕·성향 16속성별 점수·사유(KO/EN) + 근거(KO/EN).',
  speech: '대사 행 + 명언 + 정해진 7개 상황별 대사(KO/EN).',
  content: 'full은 연결 콘텐츠(도서·영상·게임·음악)가 1건 이상이고 상태 완료·리뷰(KO/EN)·출처 URL을 갖춘 상태. light는 콘텐츠 0건이되 "조사 후 없음"이 확정된 상태도 완비로 친다.',
  source: 'fiction 인물이 등장하는 원작품(소설·신화·전설 등)이 최소 1건 연결된 상태.',
}
const BAND_ORDER = ['100', '80-99', '60-79', '40-59', '20-39', '0-19']
const BAND_LABELS: Record<string, string> = {
  '100': '100% 완비',
  '80-99': '80–99%',
  '60-79': '60–79%',
  '40-59': '40–59%',
  '20-39': '20–39%',
  '0-19': '0–19%',
}

const number = (value: number) => new Intl.NumberFormat('ko-KR').format(value)
const percent = (value: number) => `${value.toFixed(1)}%`

function gapLabel(gap: string): string {
  const labels: Record<string, string> = {
    'content:thumbnail_url': '콘텐츠 표지 누락',
    'content:isbn': 'BOOK ISBN 누락',
    'spectrum:row': '스펙트럼 행 전체 누락',
    'content:creator': '콘텐츠 저자·제작자 누락',
    'basic:avatar_url': '아바타 누락',
    'basic:birth_date': '생년 누락',
    'basic:headline': '한 줄 정의(KO) 누락',
    'basic:headline_en': '한 줄 정의(EN) 누락',
    'content:empty_not_confirmed': 'light 콘텐츠 0건·미확정 (전체 상태)',
    'speech:tone': 'speech tone 누락',
    'influence:row': '영향력 행 전체 누락',
    'speech:dialogue_row': '대사 행 전체 누락',
    'content:row': '콘텐츠 locale 행 누락',
    'speech:quote': '한국어 명언 누락',
    'i18n:quote_en': '영문 명언 누락',
    'source:missing': '대표 원전 연결 누락',
    'basic:bio_en': '영문 소개 누락',
    'basic:gender': '성별 누락',
    'basic:nationality': '국적 누락',
    'content:status': '콘텐츠 완료 상태 결손',
    'content:title': '콘텐츠 제목 누락',
    'content:review': '감상배경(KO) 누락',
    'content:review_en': '감상배경(EN) 누락',
    'content:source_url': '콘텐츠 출처 URL 누락',
    'content:full_without_content': 'full인데 연결 콘텐츠 0건',
    'content:light_has_content': 'light인데 연결 콘텐츠 존재',
  }
  if (labels[gap]) return labels[gap]
  const http = gap.match(/^content:source_http\((.+)\)$/)
  if (http) return `출처 링크 HTTP ${http[1]}`
  return gap.replace(/_/g, ' ')
}

function Bar({ value, className }: { value: number; className: string }) {
  return (
    <div className="h-2 overflow-hidden rounded bg-bg">
      <div className={`h-full ${className}`} style={{ width: `${Math.min(value, 100)}%` }} />
    </div>
  )
}

function Panel({ title, aside, children }: {
  title: string
  aside?: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-xl border border-border bg-bg-card">
      <header className="flex items-baseline justify-between gap-4 border-b border-border px-5 py-3.5">
        <h2 className="text-base font-bold">{title}</h2>
        {aside && <small className="text-xs text-text-secondary">{aside}</small>}
      </header>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}

function CountRows({ counts, tone }: { counts: Record<string, number>; tone: 'gap' | 'warn' }) {
  const entries = Object.entries(counts).slice(0, 14)
  const max = Math.max(...entries.map(([, count]) => count), 1)
  const bar = tone === 'gap' ? 'bg-red-400/80' : 'bg-amber-400/80'
  const text = tone === 'gap' ? 'text-red-400' : 'text-amber-400'
  return (
    <div className="space-y-2">
      {entries.map(([gap, count], index) => (
        <div key={gap} className="grid grid-cols-[2rem_minmax(10rem,1fr)_1.4fr_4rem] items-center gap-3">
          <span className="text-xs text-text-secondary">{String(index + 1).padStart(2, '0')}</span>
          <span className="truncate text-xs font-semibold">{gapLabel(gap)}</span>
          <div className="h-1.5 overflow-hidden rounded bg-bg">
            <div className={`h-full ${bar}`} style={{ width: `${(count / max) * 100}%` }} />
          </div>
          <strong className={`text-right text-xs ${text}`}>{number(count)}명</strong>
        </div>
      ))}
    </div>
  )
}

function BreakdownTable({ source, order }: { source: Record<string, Breakdown>; order: string[] }) {
  const keys = order.filter((key) => source[key])
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-xs text-text-secondary">
          <th className="pb-2 font-medium">구분</th>
          <th className="pb-2 text-right font-medium">전체</th>
          <th className="pb-2 text-right font-medium">완비</th>
          <th className="pb-2 text-right font-medium">완비율</th>
          <th className="pb-2 text-right font-medium">평균 보유율</th>
        </tr>
      </thead>
      <tbody>
        {keys.map((key) => {
          const item = source[key]
          return (
            <tr key={key} className="border-t border-border">
              <th className="py-2.5 text-left font-semibold">{key}</th>
              <td className="py-2.5 text-right">{number(item.scope)}</td>
              <td className="py-2.5 text-right">{number(item.ready)}</td>
              <td className="py-2.5 text-right font-bold">{percent(item.readyPercentage)}</td>
              <td className="py-2.5 text-right">{percent(item.coverage.averagePercentage)}</td>
            </tr>
          )
        })}
      </tbody>
    </table>
  )
}

function Report({ report }: { report: CachedReport }) {
  const s = report.summary
  const incomplete = s.scope - s.ready
  const active = s.readinessByPublicationStatus.active ?? {
    scope: 0, ready: 0, readyPercentage: 0,
    coverage: { averagePercentage: 0, bands: {}, domains: {} },
  }
  const activeIncomplete = active.scope - active.ready
  const eightyPlus = (s.coverage.bands['100'] ?? 0) + (s.coverage.bands['80-99'] ?? 0)
  const eightyPlusPct = s.scope > 0 ? (eightyPlus / s.scope) * 100 : 0
  const zeroToNineteen = s.coverage.bands['0-19'] ?? 0
  const weakestDomain = DOMAIN_ORDER
    .flatMap((domain) => s.coverage.domains[domain] ? [{ domain, ...s.coverage.domains[domain] }] : [])
    .sort((a, b) => a.percentage - b.percentage)[0]
  const measured = new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'full', timeStyle: 'medium', timeZone: 'Asia/Seoul',
  }).format(new Date(report.measuredAt))

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-green-700 px-5 py-4 text-white">
          <span className="text-xs font-bold opacity-80">엄격 완비율</span>
          <strong className="mt-2 block text-4xl font-bold tracking-tight">{percent(s.readyPercentage)}</strong>
          <span className="mt-2 block text-xs opacity-80">{number(s.ready)}명 완비 · {number(incomplete)}명 결손</span>
        </div>
        <div className="rounded-xl border border-border bg-bg-card px-5 py-4">
          <span className="text-xs font-bold text-text-secondary">전체 등록 인원</span>
          <strong className="mt-2 block text-4xl font-bold tracking-tight">{number(s.scope)}</strong>
          <span className="mt-2 block text-xs text-text-secondary">active · inactive 합계</span>
        </div>
        <div className="rounded-xl border border-border bg-bg-card px-5 py-4">
          <span className="text-xs font-bold text-text-secondary">영역 평균 보유율</span>
          <strong className="mt-2 block text-4xl font-bold tracking-tight">{percent(s.coverage.averagePercentage)}</strong>
          <span className="mt-2 block text-xs text-text-secondary">인물별 적용영역 동일 가중치</span>
        </div>
        <div className="rounded-xl border border-border bg-bg-card px-5 py-4">
          <span className="text-xs font-bold text-text-secondary">공개 중 결손</span>
          <strong className="mt-2 block text-4xl font-bold tracking-tight">{number(activeIncomplete)}</strong>
          <span className="mt-2 block text-xs text-text-secondary">active {number(active.scope)}명 중 현행 기준 미완비</span>
        </div>
      </div>

      <div className="grid gap-3 border-y border-border py-4 sm:grid-cols-2 xl:grid-cols-4">
        <div><strong className="block text-lg">{number(s.contentResearch.targets)}명</strong><span className="text-xs text-text-secondary">실제 콘텐츠 조사 대상 · 미확정 {number(s.contentResearch.rawUnconfirmed)}명 중 상태 제외 {number(s.contentResearch.excludedByPublicationStatus)}명</span></div>
        <div><strong className="block text-lg">{number(eightyPlus)}명 · {percent(eightyPlusPct)}</strong><span className="text-xs text-text-secondary">필수영역 보유율 80% 이상</span></div>
        <div><strong className="block text-lg">{number(zeroToNineteen)}명</strong><span className="text-xs text-text-secondary">필수영역 보유율 20% 미만</span></div>
        {weakestDomain && (
          <div><strong className="block text-lg">{DOMAIN_LABELS[weakestDomain.domain]} {percent(weakestDomain.percentage)}</strong><span className="text-xs text-text-secondary">현재 가장 낮은 필수영역 완비율</span></div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="영역별 완비율" aside="완비 / 적용 대상">
          <div className="space-y-4">
            {DOMAIN_ORDER.flatMap((domain) => {
              const item = s.coverage.domains[domain]
              if (!item) return []
              return [(
                <div key={domain}>
                  <div className="grid grid-cols-[6rem_1fr_5.5rem] items-center gap-3">
                    <span className="text-xs font-bold">{DOMAIN_LABELS[domain]}</span>
                    <Bar value={item.percentage} className="bg-green-600/80" />
                    <span className="text-right text-xs"><strong>{percent(item.percentage)}</strong> <span className="text-text-secondary">{number(item.complete)}/{number(item.applicable)}</span></span>
                  </div>
                  <p className="mt-1 pl-[6.75rem] text-[11px] leading-relaxed text-text-secondary">{DOMAIN_DEFINITIONS[domain]}</p>
                </div>
              )]
            })}
          </div>
        </Panel>
        <Panel title="인물 완성도 분포" aside={`전체 ${number(s.scope)}명`}>
          <div className="space-y-3">
            {BAND_ORDER.map((band) => {
              const count = s.coverage.bands[band] ?? 0
              const ratio = s.scope > 0 ? (count / s.scope) * 100 : 0
              return (
                <div key={band} className="grid grid-cols-[6rem_1fr_5.5rem] items-center gap-3">
                  <span className="text-xs font-bold">{BAND_LABELS[band]}</span>
                  <Bar value={ratio} className="bg-blue-500/80" />
                  <span className="text-right text-xs"><strong>{number(count)}명</strong> <span className="text-text-secondary">{percent(ratio)}</span></span>
                </div>
              )
            })}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="티어별" aside="필수조건 차등 적용">
          <BreakdownTable source={s.readinessByTier} order={['full', 'light', 'fiction']} />
        </Panel>
        <Panel title="공개 상태별" aside="publication_status">
          <BreakdownTable source={s.readinessByPublicationStatus} order={['active', 'inactive', 'deleted']} />
        </Panel>
      </div>

      <Panel title="주요 결손 항목" aside="활성화 탈락 사유 · 한 인물의 중복 결손 포함">
        <CountRows counts={s.gapCounts} tone="gap" />
      </Panel>

      <Panel
        title="품질 경고 · 콘텐츠 메타"
        aside={`활성화를 막지 않음 · 대상 ${number(s.qualityWarnings.celebs)}명 (그중 완비 후보 ${number(s.qualityWarnings.readyCelebs)}명)`}
      >
        <CountRows counts={s.qualityWarnings.counts} tone="warn" />
      </Panel>

      {weakestDomain && (
        <aside className="rounded-xl border-l-4 border-amber-400 bg-amber-400/10 px-5 py-4">
          <strong className="text-xs">한 줄 판정</strong>
          <p className="mt-1 text-xs leading-relaxed text-text-secondary">
            전체 인물은 평균적으로 필수영역의 {percent(s.coverage.averagePercentage)}를 갖췄지만, 모든 조건을 통과한 인물은 {percent(s.readyPercentage)}입니다.
            가장 큰 병목은 {DOMAIN_LABELS[weakestDomain.domain]} 영역이며, 공개 중인 active 인물도 {number(activeIncomplete)}명이 현행 기준에서 하나 이상의 결손을 갖습니다.
          </p>
        </aside>
      )}

      <p className="text-[11px] leading-relaxed text-text-secondary">
        <strong>판정 범위:</strong> 필수 필드와 데이터 구조의 보유 여부입니다. 내용의 사실성·문체 품질을 사람 눈으로 검증했다는 뜻은 아닙니다.
        full/light는 기본정보·영향력·스펙트럼·발화·콘텐츠 5영역, fiction은 기본정보·대표 원전 2영역을 동일 가중치로 계산합니다.
        연결된 콘텐츠 자체의 로케일 메타 결손은 완비 판정에서 빼고 품질 경고로만 집계합니다.
      </p>

      <p className="text-xs text-text-secondary">측정 · {measured}</p>
    </div>
  )
}

export default function ReadinessReport() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' })

  const regenerate = useCallback(async () => {
    setState({ kind: 'loading' })
    try {
      const res = await fetch('/api/celeb-readiness', { method: 'POST' })
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
    fetch('/api/celeb-readiness')
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
        <Button onClick={regenerate} disabled={state.kind === 'loading'}>
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
          DB 전체를 읽어 집계하는 중입니다. 1~2분 걸릴 수 있습니다.
        </div>
      )}

      {state.kind === 'ready' && <Report report={state.report} />}
    </div>
  )
}
