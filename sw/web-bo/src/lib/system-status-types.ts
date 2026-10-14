export type HealthState = 'healthy' | 'warning' | 'critical' | 'unavailable'

export interface EndpointStatus {
  ok: boolean
  statusCode: number | null
  responseMs: number
  error: string | null
}

export interface HostMemoryStatus {
  totalBytes: number
  availableBytes: number
  usedBytes: number
  swapTotalBytes: number
  swapUsedBytes: number
}

export interface MaintenanceTaskStatus {
  timerState: string | null
  timerLoaded: boolean
  serviceState: string | null
  result: string | null
  exitCode: number | null
  lastFinishedAt: string | null
  nextRunAt: string | null
}

export interface HostStorageStatus {
  disk: {
    totalBytes: number
    usedBytes: number
    freeBytes: number
    usedPercent: number
    inodeUsedPercent: number | null
  }
  cleanup: (MaintenanceTaskStatus & {
    cacheBytes: number | null
    removedBytes: number | null
    measuredAt: string | null
    status: string | null
    pressure: boolean | null
    targetFreePercent: number | null
    maxCacheBytes: number | null
  }) | null
  mail: (MaintenanceTaskStatus & {
    status: string | null
    checkedAt: string | null
    recipient: string | null
    alertPercent: number | null
    resetPercent: number | null
    alerted: boolean | null
    lastSentAt: string | null
    lastTestSentAt: string | null
    configPresent: boolean
  }) | null
  retention: {
    journal?: { SystemMaxUse?: string; MaxRetentionSec?: string }
    temporary?: Record<string, string>
    packages?: { MaxAge?: string; MaxSize?: string; AutocleanInterval?: string }
    logRotation?: string | null
    tempCleanup?: string | null
  }
  error: string | null
}

export interface WebHostStatus {
  reachable: boolean
  activeState: string | null
  subState: string | null
  serviceMemoryBytes: number
  serviceSwapBytes: number
  restarts: number
  uptimeSeconds: number
  currentPath: string | null
  slot: string | null
  releaseId: string | null
  commit: string | null
  memory: HostMemoryStatus
  storage: HostStorageStatus | null
  responseMs: number
  error: string | null
}

export interface DatabaseApiStatus {
  ok: boolean
  responseMs: number
  sizeBytes: number | null
  tableCount: number | null
  error: string | null
}

export interface DatabaseHostStatus {
  reachable: boolean
  postgresRunning: boolean
  postgresHealth: string | null
  postgresStartedAt: string | null
  postgresVersion: string | null
  databaseSizeBytes: number | null
  connections: number | null
  maxConnections: number | null
  tableCount: number | null
  backupState: string | null
  backupSubState: string | null
  backupResult: string | null
  backupExitCode: number | null
  lastBackupAt: string | null
  lastBackupCompletedAt: string | null
  nextBackupAt: string | null
  uptimeSeconds: number
  memory: HostMemoryStatus
  storage: HostStorageStatus | null
  responseMs: number
  error: string | null
}

export interface SystemStatus {
  checkedAt: string
  web: {
    endpoint: EndpointStatus
    host: WebHostStatus
  }
  database: {
    api: DatabaseApiStatus
    host: DatabaseHostStatus
  }
}
