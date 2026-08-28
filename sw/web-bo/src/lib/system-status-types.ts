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
