import type {
  DatabaseHostStatus,
  HealthState,
  HostMemoryStatus,
  HostStorageStatus,
  MaintenanceTaskStatus,
  SystemStatus,
  WebHostStatus,
} from './system-status-types'

export const STATUS_THRESHOLDS = {
  memoryWarningPercent: 85,
  memoryCriticalPercent: 95,
  connectionsWarningPercent: 80,
  connectionsCriticalPercent: 95,
} as const

const STATE_PRIORITY: Record<HealthState, number> = {
  healthy: 0,
  warning: 1,
  unavailable: 2,
  critical: 3,
}

export function memoryUsagePercent(memory: HostMemoryStatus): number | null {
  if (memory.totalBytes <= 0) return null
  return Math.round((memory.usedBytes / memory.totalBytes) * 100)
}

export function isBackupHealthy(host: DatabaseHostStatus): boolean {
  return host.backupState === 'active'
    && host.backupSubState === 'waiting'
    && host.backupResult === 'success'
    && host.backupExitCode === 0
}

function pressureState(percent: number | null, warningAt: number, criticalAt: number): HealthState {
  if (percent === null) return 'healthy'
  if (percent >= criticalAt) return 'critical'
  if (percent >= warningAt) return 'warning'
  return 'healthy'
}

function highestState(states: HealthState[]): HealthState {
  return states.reduce((highest, state) => (
    STATE_PRIORITY[state] > STATE_PRIORITY[highest] ? state : highest
  ), 'healthy')
}

export function getWebHostHealth(host: WebHostStatus): HealthState {
  if (!host.reachable) return 'unavailable'
  if (host.activeState !== 'active' || host.subState !== 'running') return 'critical'
  return pressureState(
    memoryUsagePercent(host.memory),
    STATUS_THRESHOLDS.memoryWarningPercent,
    STATUS_THRESHOLDS.memoryCriticalPercent,
  )
}

export function getDatabaseHostHealth(host: DatabaseHostStatus): HealthState {
  if (!host.reachable) return 'unavailable'
  if (!host.postgresRunning || host.postgresHealth !== 'healthy' || host.backupResult && host.backupResult !== 'success') {
    return 'critical'
  }

  const connectionPercent = host.connections !== null && host.maxConnections
    ? Math.round((host.connections / host.maxConnections) * 100)
    : null
  return highestState([
    isBackupHealthy(host) ? 'healthy' : 'warning',
    pressureState(
      memoryUsagePercent(host.memory),
      STATUS_THRESHOLDS.memoryWarningPercent,
      STATUS_THRESHOLDS.memoryCriticalPercent,
    ),
    pressureState(
      connectionPercent,
      STATUS_THRESHOLDS.connectionsWarningPercent,
      STATUS_THRESHOLDS.connectionsCriticalPercent,
    ),
  ])
}

export function getDiskHealth(storage: HostStorageStatus | null, warningAt: number | null): HealthState {
  if (!storage || storage.error || warningAt === null) return 'unavailable'
  if (storage.disk.usedPercent >= 100) return 'critical'
  return storage.disk.usedPercent >= warningAt ? 'warning' : 'healthy'
}

export function getMaintenanceHealth(task: MaintenanceTaskStatus | null | undefined): HealthState {
  if (!task) return 'unavailable'
  if (task.serviceState === 'failed' || task.result && task.result !== 'success'
    || task.exitCode !== null && task.exitCode !== 0) return 'critical'
  if (!task.timerLoaded || task.timerState !== 'active' || !task.lastFinishedAt) return 'warning'
  return 'healthy'
}

export function getSystemHealth(status: SystemStatus) {
  const warningAt = status.web.host.storage?.mail?.alertPercent ?? null
  const items = {
    webEndpoint: status.web.endpoint.ok ? 'healthy' : 'critical',
    webHost: getWebHostHealth(status.web.host),
    databaseApi: status.database.api.ok ? 'healthy' : 'critical',
    databaseHost: getDatabaseHostHealth(status.database.host),
    webDisk: getDiskHealth(status.web.host.storage, warningAt),
    databaseDisk: getDiskHealth(status.database.host.storage, warningAt),
    cleanup: getMaintenanceHealth(status.web.host.storage?.cleanup),
    mail: status.web.host.storage?.mail?.configPresent
      ? getMaintenanceHealth(status.web.host.storage.mail) : 'unavailable',
  } satisfies Record<string, HealthState>
  const states = Object.values(items)

  return {
    ...items,
    overall: highestState(states),
    attentionCount: states.filter((state) => state !== 'healthy').length,
  }
}
