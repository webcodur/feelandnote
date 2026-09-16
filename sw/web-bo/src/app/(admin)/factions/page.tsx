import type { Metadata } from 'next'
import { listFactionThemes } from '@/actions/admin/factions/themes'
import FactionBoard from './FactionBoard'

export const metadata: Metadata = {
  title: '세력도감',
}

/** 세력도감 — 서비스 세력도감에 실리는 테마를 관리한다 */
export default async function FactionsPage() {
  const themes = await listFactionThemes()

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">세력도감</h1>
        <p className="mt-1 text-sm text-text-secondary">
          서비스 세력도감에 실리는 테마와 인물 명단을 관리합니다.
        </p>
      </div>

      <FactionBoard themes={themes} />
    </div>
  )
}
