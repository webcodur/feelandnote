import type { ReactNode } from 'react'
import type { ReportSlot } from '@/lib/analytics/load'
import { displayPath, formatCount, formatPercent, formatSeconds, visitMetrics, SECTION_LABELS, ACTIONS } from '@/lib/analytics/model'
import { describeTrafficSource } from '@/lib/analytics/source-labels'
import { clarityUrl } from '@/lib/analytics/clarity-links'

export function Panel({ number, title, description, children }: { number: string; title: string; description: string; children: ReactNode }) {
  return <section className="min-w-0 rounded-xl border border-border bg-bg-card p-4 md:p-5">
    <div className="mb-4 flex items-start gap-3">
      <span className="mt-0.5 font-mono text-xs text-accent">{number}</span>
      <div><h2 className="text-base font-semibold text-text-primary">{title}</h2><p className="mt-1 text-xs leading-relaxed text-text-secondary">{description}</p></div>
    </div>
    {children}
  </section>
}

export function Table({ headers, children, label }: { headers: string[]; children: ReactNode; label: string }) {
  return <div className="overflow-x-auto">
    <table aria-label={label} className="w-full text-sm">
      <thead><tr className="border-b border-border text-xs text-text-secondary">{headers.map((header, i) =>
        <th key={header} scope="col" className={`whitespace-nowrap py-2 font-medium ${i ? 'pl-4 text-right' : 'pr-3 text-left'}`}>{header}</th>,
      )}</tr></thead>
      <tbody className="divide-y divide-border/60">{children}</tbody>
    </table>
  </div>
}

export const cell = 'py-2.5 pl-4 text-right tabular-nums whitespace-nowrap'

export function DataState({ slot, children }: { slot: ReportSlot; children: ReactNode }) {
  if (slot.error) return <p role="status" className="rounded-lg bg-red-500/5 p-3 text-sm text-red-300">{slot.error}</p>
  if (!slot.data?.rows.length) return <p className="py-5 text-sm text-text-secondary">이 기간에 관측된 데이터가 없습니다.</p>
  return <>{children}
    {slot.data.rowCount > slot.data.rows.length && <p className="mt-3 text-xs text-text-secondary">상위 {slot.data.rows.length}개 표시 · 전체 {formatCount(slot.data.rowCount)}개 항목</p>}
  </>
}

export function VisitTable({ slot, label, names, explainSource = false }: { slot: ReportSlot; label: string; names?: Record<string, string>; explainSource?: boolean }) {
  return <DataState slot={slot}><Table label={label} headers={['구분', '세션', '참여율', '참여 / 세션']}>
    {slot.data?.rows.map((row, index) => {
      const m = visitMetrics(row.metrics)
      const name = row.dimensions.map(value => names?.[value] ?? value).join(' · ') || '미확인'
      const explanation = explainSource ? describeTrafficSource(row.dimensions[0]) : null
      return <tr key={index}><td className="py-2.5 pr-3 text-text-primary">{explanation ? <div className="min-w-44 max-w-md">
        <p className="font-medium">{explanation.title}</p>
        <p className="mt-1 break-all font-mono text-[11px] text-text-secondary">{name}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{explanation.description}</p>
      </div> : <span className="break-all">{name}</span>}</td>
        <td className={cell}>{formatCount(m.sessions)}</td><td className={cell}>{formatPercent(m.engagementRate)}</td><td className={cell}>{formatSeconds(m.averageSeconds)}</td></tr>
    })}
  </Table></DataState>
}

export function PageTable({ slot, landing = false, labels }: { slot: ReportSlot; landing?: boolean; labels: Record<string, string> }) {
  return <DataState slot={slot}><Table label={landing ? '첫 진입 페이지' : '조회한 페이지'} headers={['페이지 경로', landing ? '세션' : '조회', landing ? '참여율' : '이용자']}>
    {slot.data?.rows.map((row, index) => <tr key={index}>
      <td className="max-w-64 py-2.5 pr-3">{labels[row.dimensions[0]] && <p className="mb-1 truncate text-text-primary">{labels[row.dimensions[0]]}</p>}<span title={displayPath(row.dimensions[0])} className="block truncate font-mono text-xs text-text-secondary">{displayPath(row.dimensions[0])}</span></td>
      <td className={cell}>{formatCount(row.metrics[0])}</td>
      <td className={cell}>{landing ? formatPercent(row.metrics[0] ? row.metrics[1] / row.metrics[0] : null) : formatCount(row.metrics[1])}</td>
    </tr>)}
  </Table></DataState>
}

export function ActionTable({ slot }: { slot: ReportSlot }) {
  const events = new Map(slot.data?.rows.map(row => [row.dimensions[0], row.metrics]))
  return <DataState slot={slot}><Table label="선택·클릭 행동" headers={['행동', '횟수', '이용자']}>
    {ACTIONS.map(action => {
      const metrics = events.get(action.event)
      return <tr key={action.event}>
        <td className="py-3 pr-3"><p className="text-text-primary">{action.label}</p><p className="mt-1 text-xs text-text-secondary">{action.note}</p></td>
        <td className={cell}>{metrics ? formatCount(metrics[0]) : <span className="text-xs text-text-secondary">관측 없음</span>}</td>
        <td className={cell}>{metrics ? formatCount(metrics[1]) : '—'}</td>
      </tr>
    })}
  </Table>
    <p className="mt-3 text-xs leading-relaxed text-text-secondary">횟수와 이용자는 다릅니다. 같은 사람이 여러 행동을 할 수 있어 행을 합치거나 단계별 전환율로 읽을 수 없습니다. 관측 없음은 미사용을 확정하지 않습니다.</p>
  </DataState>
}

export function SectionTable({ slot }: { slot: ReportSlot }) {
  return <DataState slot={slot}><Table label="인물 구획 노출" headers={['화면에 들어온 구획', '이용자', '노출 횟수']}>
    {slot.data?.rows.map((row, index) => <tr key={index}>
      <td className="py-2.5 pr-3">{SECTION_LABELS[row.dimensions[0]] ?? row.dimensions[0]}</td>
      <td className={cell}>{formatCount(row.metrics[1])}</td><td className={cell}>{formatCount(row.metrics[0])}</td>
    </tr>)}
  </Table>
    <p className="mt-3 text-xs leading-relaxed text-amber-200/80">구획의 일부가 화면에 들어오면 기록됩니다. 읽기 완료·관심·만족을 뜻하지 않습니다.</p>
  </DataState>
}

const outcomes: Record<string, string> = { attempt: '요청', started: '실제 재생 시작', success: '완료', empty: '자료 없음', failure: '실패', blocked: '재생 정책 차단', cancelled: '중단' }
const kinds: Record<string, string> = { selected: '선택으로 기록됨', prefetch: '사전 요청으로 기록됨', '(not set)': '구분 미확인', greeting: '인사', quote: '한마디', quotes: '한마디' }

export function OperationTable({ slot, clarityProject }: { slot: ReportSlot; clarityProject: string | null }) {
  return <DataState slot={slot}><Table label="기능 요청과 결과" headers={['기능 · 요청 구분', '결과', '횟수', '이용자']}>
    {slot.data?.rows.map((row, index) => {
      const event = row.dimensions[0]
      const audio = event.startsWith('dialogue_audio_')
      const outcome = event.replace(audio ? 'dialogue_audio_' : 'content_brief_', '')
      const recording = clarityUrl(clarityProject, 'recordings', event)
      return <tr key={index}>
        <td className="py-2.5 pr-3"><p>{audio ? '음성' : '작품 소개'}</p><p className="mt-1 text-xs text-text-secondary">{kinds[row.dimensions[1]] ?? row.dimensions[1]}</p>
          {recording && <a href={recording} target="_blank" rel="noopener noreferrer" className="mt-1.5 inline-block rounded text-xs text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">실제 세션 보기 ↗</a>}
        </td>
        <td className={`${cell} ${['failure', 'blocked'].includes(outcome) ? 'text-red-300' : ''}`}>{outcomes[outcome] ?? outcome}</td>
        <td className={cell}>{formatCount(row.metrics[0])}</td><td className={cell}>{formatCount(row.metrics[1])}</td>
      </tr>
    })}
  </Table>
    <p className="mt-3 text-xs leading-relaxed text-text-secondary">소개 완료는 응답 성공, 음성 완료는 끝까지 재생입니다. 요청 분류는 당시 계측값이며 선택·자동 요청을 완전히 구별하지 못하므로 관심 횟수로 읽을 수 없습니다. 기간 경계·진행 중 요청·계측 도입 시점이 달라 요청과 결과 합계가 맞지 않을 수 있습니다. 실제 세션 링크는 최근 3일간 같은 이벤트가 발생한 Clarity 세션이며 GA 기간·유입 조건·요청 분류를 이어받지 않습니다.</p>
  </DataState>
}

export function DailyTable({ slot }: { slot: ReportSlot }) {
  const max = Math.max(1, ...slot.data?.rows.map(row => row.metrics[1]) ?? [])
  return <DataState slot={slot}><Table label="날짜별 이용 현황" headers={['날짜', '세션', '참여 세션', '참여율', '참여 / 세션']}>
    {slot.data?.rows.map(row => {
      const m = visitMetrics(row.metrics)
      const day = row.dimensions[0]
      return <tr key={day}>
        <td className="min-w-28 py-2.5 pr-3"><div className="text-xs tabular-nums">{day.slice(0, 4)}.{day.slice(4, 6)}.{day.slice(6, 8)}</div>
          <div aria-hidden="true" className="mt-1.5 h-1 bg-bg-secondary"><div className="h-full bg-accent/60" style={{ width: `${m.sessions / max * 100}%` }} /></div></td>
        <td className={cell}>{formatCount(m.sessions)}</td><td className={cell}>{formatCount(m.engaged)}</td>
        <td className={cell}>{formatPercent(m.engagementRate)}</td><td className={cell}>{formatSeconds(m.averageSeconds)}</td>
      </tr>
    })}
  </Table></DataState>
}
