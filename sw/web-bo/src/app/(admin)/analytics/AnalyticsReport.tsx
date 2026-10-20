import Link from 'next/link'
import type { AnalyticsOptions } from '@/lib/analytics/model'
import { AUDIENCES, SUSPECT_PATTERN, formatCount, formatPercent, formatSeconds, visitMetrics } from '@/lib/analytics/model'
import { loadAnalytics } from '@/lib/analytics/load'
import { loadPageLabels } from '@/lib/analytics/page-labels'
import { getClarityProjectId } from '@/lib/analytics/clarity-project'
import ClarityPanel from './ClarityPanel'
import { ActionTable, DailyTable, DataState, OperationTable, PageTable, Panel, SectionTable, Table, VisitTable, cell } from './ReportParts'

export default async function AnalyticsReport({ options }: { options: AnalyticsOptions }) {
  const { reports: r, fetchedAt } = await loadAnalytics(options)
  const labels = await loadPageLabels([...(r.landing.data?.rows ?? []), ...(r.pages.data?.rows ?? [])].map(row => row.dimensions[0]))
  const clarityProject = getClarityProjectId()
  const summary = r.summary.data ? visitMetrics(r.summary.data.rows[0]?.metrics) : null
  const all = r.all.data ? visitMetrics(r.all.data.rows[0]?.metrics) : null
  const suspect = r.suspect.data ? visitMetrics(r.suspect.data.rows[0]?.metrics) : null
  const quality = Object.values(r).some(slot => slot.data && (slot.data.metadata.subjectToThresholding || slot.data.metadata.dataLossFromOtherRow || slot.data.metadata.samplingMetadatas?.length))
  const zones = [...new Set(Object.values(r).flatMap(slot => slot.data?.metadata.timeZone ? [slot.data.metadata.timeZone] : []))]
  const fetched = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(fetchedAt))
  const stats = [
    { label: '이용자', value: summary ? `${formatCount(summary.users)}명` : '—', detail: 'GA가 구별한 이용자 · 실인원과 다를 수 있음' },
    { label: '방문 세션', value: summary ? `${formatCount(summary.sessions)}건` : '—', detail: '선택한 유입 조건에 해당하는 세션' },
    { label: '참여 세션 비율', value: summary ? formatPercent(summary.engagementRate) : '—', detail: '참여 세션 ÷ 세션 · 만족도가 아님' },
    { label: '세션당 참여 시간', value: summary ? formatSeconds(summary.averageSeconds) : '—', detail: '총 참여 시간 ÷ 세션 · 페이지 체류 시간과 다름' },
  ]

  return <div className="space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-text-secondary">
      <p>{options.startDate} ~ {options.endDate} · {AUDIENCES[options.audience]}</p>
      <p>조회 {fetched} KST · GA 집계 시간대 {zones.join(', ') || '확인 불가'}</p>
    </div>
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs leading-relaxed text-amber-100/85">
      최근 24~48시간은 처리 중으로 수치가 바뀔 수 있습니다. 조회 시각은 데이터 처리가 완료된 시각이 아닙니다. 광고 차단·수집 제외·봇 유입으로 실제 이용과 차이가 납니다.
      {quality && <p className="mt-1 font-semibold">GA가 개인정보 임계값·샘플링·기타 행에 따른 데이터 제한을 알렸습니다. 일부 항목이 누락되거나 추정치일 수 있습니다.</p>}
      {zones.some(zone => zone !== 'Asia/Seoul') && <p className="mt-1 font-semibold">GA 속성 시간대가 한국과 다릅니다. 아래 일별 집계는 표시된 GA 시간대를 따릅니다.</p>}
    </div>

    {r.summary.error && <p role="alert" className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-300">{r.summary.error}</p>}
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map(stat => <div key={stat.label} className="rounded-xl border border-border bg-bg-card p-4 md:p-5">
        <p className="text-xs text-text-secondary">{stat.label}</p><p className="mt-3 text-2xl font-semibold tabular-nums tracking-tight md:text-3xl">{stat.value}</p>
        <p className="mt-3 text-[11px] leading-relaxed text-text-secondary">{stat.detail}</p>
      </div>)}
    </div>

    <details className="rounded-xl border border-border bg-bg-card px-4 py-3">
      <summary className="cursor-pointer rounded text-sm text-text-secondary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
        유입 해석 기준 · 전체 {all ? formatCount(all.sessions) : '조회 실패'}세션 / 의심 패턴 {suspect ? formatCount(suspect.sessions) : '조회 실패'}세션
        {all && suspect && all.sessions > 0 ? ` (${formatPercent(suspect.sessions / all.sessions)})` : ''}
      </summary>
      <p className="mt-3 text-xs leading-relaxed text-text-secondary">2026년 10월 20일 조사에서 관찰한 조합: Chrome {SUSPECT_PATTERN.browserVersions.join(' 또는 ')} · 데스크톱 · 영어 · Direct 유입. 모두 일치하는 이벤트를 보고서에서만 분리합니다. 접속을 차단하거나 원본 데이터를 삭제하지 않습니다. 다른 봇은 남을 수 있고 정상 접속이 포함될 수 있습니다. 한국 접속도 사람만 남긴 집계는 아닙니다.</p>
    </details>

    <ClarityPanel projectId={clarityProject} />

    <div className="grid items-start gap-5 xl:grid-cols-2">
      <Panel number="01" title="어디서 들어오는가" description="유입 경로별 방문과 참여. Direct는 출처 미확인을 포함하며 봇을 뜻하지 않습니다.">
        <VisitTable slot={r.sources} label="유입 경로별 방문" explainSource />
      </Panel>
      <Panel number="02" title="어떤 페이지로 들어오는가" description="방문을 시작한 페이지입니다. 아래 조회 페이지 순위와 구별합니다.">
        <PageTable slot={r.landing} labels={labels} landing />
      </Panel>
      <Panel number="03" title="무엇을 선택했는가" description="의도적인 클릭·열기·이동을 보여 줍니다. 구획 노출과 자동 요청은 아래에 따로 표시합니다.">
        <ActionTable slot={r.events} />
      </Panel>
      <Panel number="04" title="기능이 결과를 주었는가" description="작품 소개 요청과 음성 재생에서 관측된 결과. 실패가 곧 불만족을 뜻하지는 않습니다.">
        <OperationTable slot={r.operations} clarityProject={clarityProject} />
      </Panel>
      <Panel number="05" title="어느 인물 구획까지 보였는가" description="화면 노출 범위입니다. 아래로 갈수록 줄어드는 전환 퍼널로 읽지 않습니다.">
        <SectionTable slot={r.sections} />
      </Panel>
      <Panel number="06" title="어떤 페이지를 조회했는가" description="같은 페이지를 여러 번 보면 조회 수가 늘어납니다. 이용자는 페이지 간 중복됩니다.">
        <PageTable slot={r.pages} labels={labels} />
      </Panel>
      <Panel number="07" title="어느 국가·기기에서 오는가" description="접속 위치와 브라우저 환경입니다. 개인 신원이나 거주지를 확인하는 정보는 아닙니다.">
        <VisitTable slot={r.countries} label="국가별 방문" names={{ 'South Korea': '한국', 'United States': '미국', Singapore: '싱가포르', China: '중국', Brazil: '브라질', '(not set)': '미확인' }} />
        <div className="mt-5 border-t border-border pt-3"><VisitTable slot={r.devices} label="기기·언어별 방문" names={{ desktop: '데스크톱', mobile: '모바일', tablet: '태블릿', Korean: '한국어', English: '영어', Chinese: '중국어' }} /></div>
      </Panel>
      <Panel number="08" title="다시 방문하는가" description="GA 식별자 기준입니다. 쿠키 삭제·기기 변경으로 신규로 잡힐 수 있으며 실제 재방문 유지율은 아닙니다.">
        <DataState slot={r.returning}><Table label="신규·재방문" headers={['방문 구분', '이용자', '세션', '참여 세션']}>
          {r.returning.data?.rows.map((row, index) => <tr key={index}><td className="py-2.5 pr-3">{{ new: '신규', returning: '재방문', '(not set)': '미확인' }[row.dimensions[0]] ?? row.dimensions[0]}</td>
            {row.metrics.map((value, i) => <td key={i} className={cell}>{formatCount(value)}</td>)}</tr>)}
        </Table><p className="mt-3 text-xs leading-relaxed text-text-secondary">한 사람이 기간 중 신규와 재방문에 모두 포함될 수 있어 이용자 수를 더하면 중복됩니다.</p></DataState>
      </Panel>
    </div>

    <Panel number="09" title="날짜별로 어떻게 달라지는가" description="선택한 유입 조건의 일별 추이입니다. 일별 이용자를 더해 기간 이용자로 계산하지 않습니다.">
      <DailyTable slot={r.daily} />
    </Panel>

    <section className="rounded-xl border border-dashed border-border p-4 md:p-5">
      <h2 className="text-base font-semibold">아직 답할 수 없는 것</h2>
      <dl className="mt-4 grid gap-4 text-sm md:grid-cols-3">
        <div><dt className="text-text-primary">만족·불만족과 그 이유 <span className="text-xs text-text-secondary">· 측정 안 됨</span></dt><dd className="mt-2 text-xs leading-relaxed text-text-secondary">직접 평가를 수집하지 않습니다. 짧은 방문을 불만족, 긴 방문을 만족으로 단정할 수 없습니다.</dd></div>
        <div><dt className="text-text-primary">검색·저장·기록의 성공 과정 <span className="text-xs text-text-secondary">· 분석 미연결</span></dt><dd className="mt-2 text-xs leading-relaxed text-text-secondary">일부 자동 이벤트·DB 기록이 있어도 시작부터 성공·실패까지 이어진 과정은 이 보고서에서 측정하지 않습니다.</dd></div>
        <div><dt className="text-text-primary">개별 방문의 이동 순서 <span className="text-xs text-text-secondary">· Clarity에서 확인</span></dt><dd className="mt-2 text-xs leading-relaxed text-text-secondary">위 Clarity 레코딩에서 실제 세션을 확인할 수 있습니다. GA 집계표를 같은 사람의 여정으로 이어 붙이거나 재방문 수를 유지율로 읽지는 않습니다.</dd></div>
      </dl>
      <Link href="/commerce" className="mt-4 inline-block rounded text-xs text-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">수익화 클릭 장부에서 실제 링크 클릭 확인 →</Link>
    </section>
  </div>
}
