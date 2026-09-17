import type { Metadata } from 'next'
import { listFactionEntries } from '@/actions/admin/factions/board'
import FactionBoard from './FactionBoard'

export const metadata: Metadata = {
  title: '세력도감',
}

/** 세력도감 — 서비스 세력도감에 실리는 분류·세력과 인물 명단을 관리한다 */
export default async function FactionsPage() {
  const entries = await listFactionEntries()

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">세력도감</h1>
        <p className="mt-1 text-sm text-text-secondary">
          서비스 세력도감에 실리는 세력과 인물 명단을 관리합니다.
        </p>
      </div>

      <FactionBoard entries={entries} />
    </div>
  )
}
