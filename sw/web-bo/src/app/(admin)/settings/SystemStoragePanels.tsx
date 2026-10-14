import { HardDrive, Mail, Trash2 } from 'lucide-react'
import { getMaintenanceHealth } from '@/lib/system-status-health'
import type { HostStorageStatus, MaintenanceTaskStatus, SystemStatus } from '@/lib/system-status-types'
import { formatBytes, formatDate, Metric } from './SystemStatusPanels'

function DiskUsage({ storage, warningAt }: { storage: HostStorageStatus | null; warningAt: number | null }) {
  if (!storage) return <p className="text-sm text-warning-text">디스크 상태를 읽지 못했습니다.</p>
  const { disk } = storage
  const warning = warningAt !== null && disk.usedPercent >= warningAt
  return (
    <div className="rounded-lg border border-border bg-bg-main/50 p-3">
      <div className="flex items-center justify-between gap-3">
        <strong className={`text-2xl tabular-nums ${warning ? 'text-warning-text' : 'text-text-primary'}`}>
          {disk.usedPercent.toFixed(1)}% 사용
        </strong>
        <span className="text-sm text-text-secondary">여유 {formatBytes(disk.freeBytes)}</span>
      </div>
      <div role="progressbar" aria-label="디스크 사용률" aria-valuenow={disk.usedPercent} aria-valuemin={0} aria-valuemax={100}
        className="relative mt-3 h-3 overflow-hidden rounded-full bg-bg-secondary">
        <div className={`h-full ${warning ? 'bg-warning' : 'bg-success'}`} style={{ width: `${disk.usedPercent}%` }} />
        {warningAt !== null && <span className="absolute inset-y-0 w-px bg-text-primary/60" style={{ left: `${warningAt}%` }} />}
      </div>
      <p className="mt-2 text-sm text-text-secondary">
        {formatBytes(disk.usedBytes)} 사용 / 전체 {formatBytes(disk.totalBytes)}
        {disk.inodeUsedPercent !== null && ` · 파일 수 한도 ${disk.inodeUsedPercent.toFixed(1)}% 사용`}
      </p>
      {storage.error && <p className="mt-2 text-sm text-warning-text">일부 조회 실패: {storage.error}</p>}
    </div>
  )
}

function RetentionPolicy({ storage }: { storage: HostStorageStatus | null }) {
  const policy = storage?.retention
  const packageMaxSize = Number(policy?.packages?.MaxSize)
  return (
    <dl>
      <Metric label="시스템 로그 보관" value={policy?.journal?.MaxRetentionSec
        ? `${policy.journal.MaxRetentionSec} · 최대 ${policy.journal.SystemMaxUse ?? '확인 불가'}` : '확인 불가'} />
      <Metric label="임시 파일 보관" value={policy?.temporary?.['/tmp']
        ? `/tmp ${policy.temporary['/tmp']} · /var/tmp ${policy.temporary['/var/tmp'] ?? '확인 불가'}` : '확인 불가'} />
      <Metric label="패키지 캐시 보관" value={policy?.packages?.AutocleanInterval === '1'
        ? `매일 정리 · ${policy.packages.MaxAge ?? '?'}일 · 최대 ${formatBytes(Number.isFinite(packageMaxSize) ? packageMaxSize * 1024 : null)}` : '자동 청소 확인 필요'} />
      <Metric label="로그 회전 / 임시 파일 청소" value={policy
        ? `${policy.logRotation ? policy.logRotation === 'active' ? '켜짐' : '꺼짐' : '확인 불가'} / ${policy.tempCleanup ? policy.tempCleanup === 'active' ? '켜짐' : '꺼짐' : '확인 불가'}` : '확인 불가'} />
    </dl>
  )
}

export function maintenanceLabel(task: MaintenanceTaskStatus | null | undefined): string {
  if (!task) return '확인 불가'
  if (task.serviceState === 'activating' || task.serviceState === 'active') return '실행 중'
  const health = getMaintenanceHealth(task)
  if (health === 'critical') return '최근 실행 실패'
  if (!task.timerLoaded || task.timerState !== 'active') return '자동 실행 꺼짐'
  return task.lastFinishedAt ? '자동 실행 중' : '첫 실행 대기'
}

function TaskMetrics({ task }: { task: MaintenanceTaskStatus | null | undefined }) {
  return (
    <dl>
      <Metric label="상태" value={maintenanceLabel(task)} />
      <Metric label="최근 완료" value={formatDate(task?.lastFinishedAt ?? null)} />
      <Metric label="직전 결과" value={!task?.lastFinishedAt ? '실행 기록 없음'
        : task.result === 'success' && task.exitCode === 0 ? '성공' : `실패 (${task.result ?? '확인 불가'})`} />
      <Metric label="다음 실행" value={formatDate(task?.nextRunAt ?? null)} />
    </dl>
  )
}

export function SystemStoragePanels({ status }: { status: SystemStatus }) {
  const web = status.web.host.storage
  const database = status.database.host.storage
  const cleanup = web?.cleanup
  const mail = web?.mail
  const warningAt = mail?.alertPercent ?? null
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        {[{ title: '웹 서버 디스크', storage: web }, { title: 'DB 서버 디스크', storage: database }].map(({ title, storage }) => (
          <section key={title} className="rounded-xl border border-border bg-bg-card p-4 md:p-5">
            <div className="mb-4 flex items-center gap-2">
              <HardDrive className="h-5 w-5 text-accent" />
              <h2 className="text-lg font-bold text-text-primary">{title}</h2>
            </div>
            <DiskUsage storage={storage} warningAt={warningAt} />
            <div className="mt-3"><RetentionPolicy storage={storage} /></div>
          </section>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-2">
        <section className="rounded-xl border border-border bg-bg-card p-4 md:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-bold text-text-primary">웹 캐시 자동 정리</h2>
          </div>
          <TaskMetrics task={cleanup} />
          <dl>
            <Metric label="직전 측정 합산 캐시" value={formatBytes(cleanup?.cacheBytes ?? null)} />
            <Metric label="직전 정리량" value={formatBytes(cleanup?.removedBytes ?? null)} />
            <Metric label="정리 기준" value={cleanup?.targetFreePercent !== null && cleanup?.targetFreePercent !== undefined
              ? `디스크 여유 ${cleanup.targetFreePercent}% · 합산 캐시 ${formatBytes(cleanup.maxCacheBytes)}` : '확인 불가'} />
          </dl>
          <p className="mt-3 text-sm text-text-secondary">
            캐시 수치는 {formatDate(cleanup?.measuredAt ?? null)} 측정값입니다. 활성·비활성 슬롯을 합산합니다.
            {cleanup?.status === 'progress' && ' 작은 배치로 목표 용량까지 정리 중입니다.'}
            {cleanup?.status === 'blocked' && ' 정리가 필요하지만 삭제할 수 있는 캐시가 없어 확인이 필요합니다.'}
          </p>
        </section>

        <section className="rounded-xl border border-border bg-bg-card p-4 md:p-5">
          <div className="mb-3 flex items-center gap-2">
            <Mail className="h-5 w-5 text-accent" />
            <h2 className="text-lg font-bold text-text-primary">디스크 메일 알림</h2>
          </div>
          <TaskMetrics task={mail} />
          <dl>
            <Metric label="수신 주소" value={mail?.recipient ?? '확인 불가'} />
            <Metric label="알림 기준" value={mail?.alertPercent !== null && mail?.alertPercent !== undefined
              ? `${mail.alertPercent}% 이상 · ${mail.resetPercent}% 미만으로 내려가면 다시 알림 가능` : '확인 불가'} />
            <Metric label="현재 경고" value={mail?.alerted === null || mail?.alerted === undefined
              ? '확인 불가' : mail.alerted ? '발송한 경고 유지 중' : '경고 없음'} />
            <Metric label="최근 경고 발송" value={mail?.lastSentAt ? formatDate(mail.lastSentAt) : '발송 기록 없음'} />
            <Metric label="최근 테스트 발송" value={mail?.lastTestSentAt ? formatDate(mail.lastTestSentAt) : '발송 기록 없음'} />
          </dl>
          <p className="mt-3 text-sm text-text-secondary">웹 서버 디스크를 감시하며 같은 경고는 반복 발송하지 않습니다.</p>
        </section>
      </div>
    </div>
  )
}
