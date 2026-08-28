import type {
  DatabaseHostStatus,
  HealthState,
  HostMemoryStatus,
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
  if (!host.postgresRunning || host.postgresHealth !== 'healthy' || !isBackupHealthy(host)) {
    return 'critical'
  }

  const connectionPercent = host.connections !== null && host.maxConnections
    ? Math.round((host.connections / host.maxConnections) * 100)
    : null
  return highestState([
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

export function getSystemHealth(status: SystemStatus) {
  const items = {
    webEndpoint: status.web.endpoint.ok ? 'healthy' : 'critical',
    webHost: getWebHostHealth(status.web.host),
    databaseApi: status.database.api.ok ? 'healthy' : 'critical',
    databaseHost: getDatabaseHostHealth(status.database.host),
  } satisfies Record<string, HealthState>
  const states = Object.values(items)

  return {
    ...items,
    overall: highestState(states),
    attentionCount: states.filter((state) => state !== 'healthy').length,
  }
}
