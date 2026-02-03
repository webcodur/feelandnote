'use server'

import { createClient } from '@/lib/supabase/server'

// 플랜별 제한량 (MB 단위)
const PLAN_LIMITS = {
  free: {
    database: 500, // 500MB
    storage: 1024, // 1GB
  },
  pro: {
    database: 8192, // 8GB
    storage: 102400, // 100GB
  },
  team: {
    database: 8192, // 8GB (확장 가능)
    storage: 102400, // 100GB (확장 가능)
  },
  enterprise: {
    database: 61440000, // 60TB (최대)
    storage: 102400, // 100GB+ (확장 가능)
  },
} as const

export interface SupabaseStats {
  project: {
    name: string
    region: string
    status: string
    databaseVersion: string
    createdAt: string
    plan: string
  }
  database: {
    sizeBytes: number
    sizeMB: number
    tableCount: number
    limitMB: number
  }
  storage: {
    totalSizeBytes: number
    totalSizeMB: number
    limitMB: number
    buckets: Array<{
      name: string
      sizeBytes: number
      sizeMB: number
      fileCount: number
    }>
  }
}

export async function getSupabaseStats(): Promise<SupabaseStats> {
  const supabase = await createClient()

  try {
    // 병렬로 모든 데이터 조회
    const [
      { data: dbSizeData },
      { data: tableCountData },
      { data: totalStorageSizeData },
      { data: bucketStatsData },
    ] = await Promise.all([
      supabase.rpc('get_database_size').single(),
      supabase.rpc('get_table_count').single(),
      supabase.rpc('get_total_storage_size').single(),
      supabase.rpc('get_bucket_stats'),
    ])

    const dbSizeBytes = Number(dbSizeData) || 0
    const tableCount = Number(tableCountData) || 0
    const totalStorageBytes = Number(totalStorageSizeData) || 0

    // 버킷 통계 가공
    const bucketStats = (bucketStatsData || []).map((bucket: {
      bucket_name: string
      file_count: number
      total_size: number
    }) => ({
      name: bucket.bucket_name,
      sizeBytes: Number(bucket.total_size),
      sizeMB: Math.round((Number(bucket.total_size) / 1024 / 1024) * 100) / 100,
      fileCount: Number(bucket.file_count),
    }))

    // 현재 플랜 (나중에 동적으로 조회 가능)
    const currentPlan = 'free'
    const limits = PLAN_LIMITS[currentPlan]

    return {
      project: {
        name: 'feelandnote',
        region: 'ap-southeast-1',
        status: 'ACTIVE_HEALTHY',
        databaseVersion: '17.6.1',
        createdAt: '2025-11-23',
        plan: 'Free',
      },
      database: {
        sizeBytes: dbSizeBytes,
        sizeMB: Math.round((dbSizeBytes / 1024 / 1024) * 100) / 100,
        tableCount,
        limitMB: limits.database,
      },
      storage: {
        totalSizeBytes: totalStorageBytes,
        totalSizeMB: Math.round((totalStorageBytes / 1024 / 1024) * 100) / 100,
        limitMB: limits.storage,
        buckets: bucketStats,
      },
    }
  } catch (error) {
    console.error('Failed to fetch Supabase stats:', error)

    // 에러 시 기본값 반환
    const limits = PLAN_LIMITS.free
    return {
      project: {
        name: 'feelandnote',
        region: 'ap-southeast-1',
        status: 'ACTIVE_HEALTHY',
        databaseVersion: '17.6.1',
        createdAt: '2025-11-23',
        plan: 'Free',
      },
      database: {
        sizeBytes: 0,
        sizeMB: 0,
        tableCount: 0,
        limitMB: limits.database,
      },
      storage: {
        totalSizeBytes: 0,
        totalSizeMB: 0,
        limitMB: limits.storage,
        buckets: [],
      },
    }
  }
}
