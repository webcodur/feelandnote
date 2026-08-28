import { Activity, Database, Globe2, Server } from 'lucide-react'
import { RefreshStatusButton } from './RefreshStatusButton'
import { SystemStatusPanels } from './SystemStatusPanels'
import { getSystemHealth } from '@/lib/system-status-health'
import type { HealthState, SystemStatus } from '@/lib/system-status-types'

const STATE_LABELS: { [Key in HealthState]: string } = {
  healthy: '정상',
  warning: '확인 필요',
  critical: '장애',
  unavailable: '확인 불가',
}

const STATE_STYLES: { [Key in HealthState]: string } = {
  healthy: 'border-success/50 bg-success/10 text-success-text',
  warning: 'border-warning/50 bg-warning/10 text-warning-text',
  critical: 'border-danger/50 bg-danger/10 text-danger-text',
  unavailable: 'border-border bg-bg-secondary text-text-secondary',
}

function StatusBadge({ state }: { state: HealthState }) {
  return (
    <span className={`rounded-full border px-2 py-1 text-sm font-semibold ${STATE_STYLES[state]}`}>
      {STATE_LABELS[state]}
    </span>
  )
}

interface SummaryCardProps {
  title: string
  value: string
  detail: string
  state: HealthState
  icon: typeof Globe2
}

function SummaryCard({ title, value, detail, state, icon: Icon }: SummaryCardProps) {
  const railClass = state === 'healthy'
    ? 'bg-success'
    : state === 'warning'
      ? 'bg-warning'
      : state === 'critical'
        ? 'bg-danger'
        : 'bg-border'

  return (
    <section className="relative overflow-hidden rounded-xl border border-border bg-bg-card p-4">
      <div className={`absolute inset-y-0 start-0 w-1 ${railClass}`} />
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Icon className="h-5 w-5 shrink-0 text-accent" />
          <h2 className="text-sm font-semibold text-text-secondary">{title}</h2>
        </div>
        <StatusBadge state={state} />
      </div>
      <p className="mt-4 truncate text-lg font-bold text-text-primary">{value}</p>
      <p className="mt-1 text-sm text-text-secondary">{detail}</p>
    </section>
  )
}

function checkedAtLabel(value: string): string {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'medium',
    timeZone: 'Asia/Seoul',
  }).format(new Date(value))
}

export function SystemStatusDashboard({ status }: { status: SystemStatus }) {
  const health = getSystemHealth(status)
  const statusSummary = health.attentionCount === 0
    ? '전체 점검 통과'
    : `${health.attentionCount}개 점검 항목`
  const webServiceLabel = !status.web.host.reachable
    ? 'SSH 연결 실패'
    : status.web.host.activeState === 'active' && status.web.host.subState === 'running'
      ? '실행 중'
      : '서비스 이상'

  return (
    <section className="space-y-4">
      <header className="flex flex-col gap-3 border-b border-border pb-4 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <StatusBadge state={health.overall} />
            <span className="text-sm font-semibold text-text-secondary">{statusSummary}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary md:text-3xl">운영 상태</h1>
          <p className="mt-1 text-sm text-text-secondary">
            사용자 웹과 데이터베이스를 지금 직접 확인한 결과입니다.
          </p>
        </div>
        <div className="flex items-center justify-between gap-3 md:justify-end">
          <span className="text-sm text-text-secondary">확인 {checkedAtLabel(status.checkedAt)}</span>
          <RefreshStatusButton />
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="사용자 웹"
          value={status.web.endpoint.statusCode ? `HTTP ${status.web.endpoint.statusCode}` : '응답 없음'}
          detail={`응답 ${status.web.endpoint.responseMs.toLocaleString()}ms`}
          state={health.webEndpoint}
          icon={Globe2}
        />
        <SummaryCard
          title="웹 서비스"
          value={webServiceLabel}
          detail={`응답 ${status.web.host.responseMs.toLocaleString()}ms · 재시작 ${status.web.host.restarts}회`}
          state={health.webHost}
          icon={Server}
        />
        <SummaryCard
          title="DB API"
          value={status.database.api.ok ? 'RPC 응답 정상' : '응답 실패'}
          detail={`응답 ${status.database.api.responseMs.toLocaleString()}ms`}
          state={health.databaseApi}
          icon={Activity}
        />
        <SummaryCard
          title="DB 서버"
          value={status.database.host.postgresVersion
            ? `PostgreSQL ${status.database.host.postgresVersion}`
            : '상태 없음'}
          detail={status.database.host.connections === null
            ? '연결 수 확인 불가'
            : `연결 ${status.database.host.connections}/${status.database.host.maxConnections}`}
          state={health.databaseHost}
          icon={Database}
        />
      </div>

      <SystemStatusPanels status={status} />
    </section>
  )
}
