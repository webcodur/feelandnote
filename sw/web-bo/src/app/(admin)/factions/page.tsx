import type { Metadata } from 'next'
import { listFactionEpisodes } from '@/actions/admin/factions/episodes'
import { listFactionThemes } from '@/actions/admin/factions/themes'
import { FACTION_LOCAL } from '@/lib/faction-local'
import FactionBoard from './FactionBoard'

export const metadata: Metadata = {
  title: '세력도감',
}

/**
 * 세력도감 — 영상 편과 도감 테마를 두 작업 관점으로 나눈다.
 *
 * 같은 DB를 읽되 영상 모드에서는 모든 제작 편이 한 행씩, 테마 모드에서는 서비스 도감에
 * 진열되는 테마가 한 행씩 보인다. 목록은 폴더가 아니라 DB에서 세어 파일이 없는 편도
 * 관리 화면에서 사라지지 않게 한다.
 */
export default async function FactionsPage() {
  const [episodes, themes] = await Promise.all([listFactionEpisodes(), listFactionThemes()])

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">세력도감</h1>
        <p className="mt-1 text-sm text-text-secondary">
          영상 제작 편과 서비스 도감 테마를 작업 기준에 따라 나눠 관리합니다.
        </p>
      </div>

      <FactionBoard initialThemes={themes} episodes={episodes} factionLocal={FACTION_LOCAL} />
    </div>
  )
}
