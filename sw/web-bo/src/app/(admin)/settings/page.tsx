import type { Metadata } from 'next'
import { PlannedSettings } from './PlannedSettings'
import { SystemStatusDashboard } from './SystemStatusDashboard'
import { getSystemStatus } from '@/lib/system-status'
import { OracleServiceGuide } from './OracleServiceGuide'

export const metadata: Metadata = {
  title: '운영 상태',
}

export default async function SettingsPage() {
  const status = await getSystemStatus()

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <a href="#oracle-guide-title" className="inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm text-accent hover:border-accent hover:bg-bg-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent">
          Oracle 구성과 사용 안내 보기
        </a>
      </div>
      <SystemStatusDashboard status={status} />
      <OracleServiceGuide />
      <PlannedSettings />
    </div>
  )
}
