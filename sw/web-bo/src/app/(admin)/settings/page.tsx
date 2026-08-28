import type { Metadata } from 'next'
import { PlannedSettings } from './PlannedSettings'
import { SystemStatusDashboard } from './SystemStatusDashboard'
import { getSystemStatus } from '@/lib/system-status'

export const metadata: Metadata = {
  title: '운영 상태',
}

export default async function SettingsPage() {
  const status = await getSystemStatus()

  return (
    <div className="space-y-6">
      <SystemStatusDashboard status={status} />
      <PlannedSettings />
    </div>
  )
}
