import { Database, HardDrive, Server, ShieldCheck } from 'lucide-react'
import {
  isBackupHealthy,
  memoryUsagePercent,
  STATUS_THRESHOLDS,
} from '@/lib/system-status-health'
import type { DatabaseHostStatus, HostMemoryStatus, SystemStatus } from '@/lib/system-status-types'

function formatBytes(value: number | null): string {
  if (value === null) return '확인 불가'
  if (value < 1024) return `${value} B`
  const units = ['KB', 'MB', 'GB', 'TB']
  let amount = value
  let unitIndex = -1
  while (amount >= 1024 && unitIndex < units.length - 1) {
    amount /= 1024
    unitIndex += 1
  }
  return `${amount.toFixed(amount >= 100 ? 0 : 1)} ${units[unitIndex]}`
}

function formatUptime(seconds: number): string {
  if (!seconds) return '확인 불가'
  const days = Math.floor(seconds / 86_400)
  const hours = Math.floor((seconds % 86_400) / 3_600)
  return days > 0 ? `${days}일 ${hours}시간` : `${hours}시간`
}

function formatDate(value: string | null): string {
  if (!value) return '확인 불가'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul',
  }).format(date)
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2.5 last:border-0">
      <dt className="text-sm text-text-secondary">{label}</dt>
      <dd className="break-all text-end text-sm font-semibold text-text-primary">{value}</dd>
    </div>
  )
}

function MemoryUsage({ memory }: { memory: HostMemoryStatus }) {
  const percentage = memoryUsagePercent(memory)
  const barClass = percentage === null
    ? 'bg-border'
    : percentage >= STATUS_THRESHOLDS.memoryCriticalPercent
      ? 'bg-danger'
      : percentage >= STATUS_THRESHOLDS.memoryWarningPercent
        ? 'bg-warning'
        : 'bg-success'
  const percentageLabel = percentage === null ? '확인 불가' : `${percentage}%`

  return (
    <div className="rounded-lg border border-border bg-bg-main/50 p-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-text-secondary">VM 메모리</span>
        <strong className="text-text-primary">
          {formatBytes(memory.usedBytes)} / {formatBytes(memory.totalBytes)}
        </strong>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-bg-secondary" aria-label={`메모리 사용 ${percentageLabel}`}>
        <div className={`h-full ${barClass}`} style={{ width: `${Math.min(percentage ?? 0, 100)}%` }} />
      </div>
      <p className="mt-2 text-sm text-text-secondary">
        사용 {percentageLabel} · 스왑 {formatBytes(memory.swapUsedBytes)} / {formatBytes(memory.swapTotalBytes)}
      </p>
    </div>
  )
}

function webServiceStatus(activeState: string | null, subState: string | null): string {
  if (activeState === 'active' && subState === 'running') return '실행 중'
  if (!activeState && !subState) return '확인 불가'
  return '중지 또는 이상'
}

function postgresStatus(database: DatabaseHostStatus): string {
  if (!database.reachable) return '확인 불가'
  if (!database.postgresRunning) return '중지됨'
  if (database.postgresHealth === 'healthy') return '실행 중 · 정상'
  if (database.postgresHealth) return '실행 중 · 이상'
  return '실행 중 · 상태 확인 불가'
}

function backupResultLabel(value: string | null): string {
  if (value === 'success') return '성공'
  if (value === 'failed') return '실패'
  return value ?? '확인 불가'
}

function ErrorNotice({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p className="rounded-lg border border-danger/40 bg-danger/10 p-3 text-sm text-danger-text">
      {message}
    </p>
  )
}

export function SystemStatusPanels({ status }: { status: SystemStatus }) {
  const web = status.web.host
  const database = status.database.host
  const backupHealthy = isBackupHealthy(database)
  const BackupIcon = backupHealthy ? ShieldCheck : HardDrive

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <section className="rounded-xl border border-border bg-bg-card p-4 md:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Server className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold text-text-primary">Oracle 사용자 웹 VM</h2>
        </div>
        <ErrorNotice message={status.web.endpoint.error ?? web.error} />
        <div className="mt-3 space-y-3">
          <MemoryUsage memory={web.memory} />
          <dl>
            <Metric label="서비스" value={webServiceStatus(web.activeState, web.subState)} />
            <Metric label="서비스 메모리" value={formatBytes(web.serviceMemoryBytes)} />
            <Metric label="서비스 스왑" value={formatBytes(web.serviceSwapBytes)} />
            <Metric label="VM 가동 시간" value={formatUptime(web.uptimeSeconds)} />
            <Metric label="활성 슬롯" value={web.slot ?? '확인 불가'} />
            <Metric label="릴리스" value={web.releaseId ?? '확인 불가'} />
            <Metric label="커밋" value={web.commit?.slice(0, 12) ?? '확인 불가'} />
          </dl>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-bg-card p-4 md:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Database className="h-5 w-5 text-accent" />
          <h2 className="text-lg font-bold text-text-primary">Oracle DB VM</h2>
        </div>
        <ErrorNotice message={status.database.api.error ?? database.error} />
        <div className="mt-3 space-y-3">
          <MemoryUsage memory={database.memory} />
          <dl>
            <Metric label="PostgreSQL 상태" value={postgresStatus(database)} />
            <Metric label="PostgreSQL 시작" value={formatDate(database.postgresStartedAt)} />
            <Metric label="DB 크기" value={formatBytes(database.databaseSizeBytes ?? status.database.api.sizeBytes)} />
            <Metric label="연결" value={database.connections === null ? '확인 불가' : `${database.connections} / ${database.maxConnections}`} />
            <Metric label="공개 테이블" value={`${database.tableCount ?? status.database.api.tableCount ?? '확인 불가'}`} />
            <Metric label="VM 가동 시간" value={formatUptime(database.uptimeSeconds)} />
          </dl>
          <div className={`rounded-lg border p-3 ${backupHealthy ? 'border-success/40 bg-success/10' : 'border-danger/40 bg-danger/10'}`}>
            <div className="flex items-center gap-2">
              <BackupIcon className={`h-4 w-4 ${backupHealthy ? 'text-success-text' : 'text-danger-text'}`} />
              <strong className="text-sm text-text-primary">DB 암호화 백업</strong>
            </div>
            <p className="mt-2 text-sm text-text-secondary">
              직전 결과 {backupResultLabel(database.backupResult)}
            </p>
            <p className="mt-1 text-sm text-text-secondary">
              최근 완료 {formatDate(database.lastBackupCompletedAt ?? database.lastBackupAt)}
            </p>
            <p className="mt-1 text-sm text-text-secondary">다음 실행 {formatDate(database.nextBackupAt)}</p>
          </div>
        </div>
      </section>
    </div>
  )
}
