import type { Metadata } from 'next'
import { listFactionEpisodes } from '@/actions/admin/factions/episodes'
import { listFactionThemes } from '@/actions/admin/factions/themes'
import { FACTION_LOCAL } from '@/lib/faction-local'
import FactionBoard from './FactionBoard'

export const metadata: Metadata = {
  title: '세력도감',
}

/**
 * 세력도감 — 영상 편과 웹 전용 테마를 한 목록으로 관리한다(26.08.03 목록 통합).
 *
 * 영상 편은 한 행씩, 제작 연결이 없는 웹 전용 테마도 같은 형식의 한 행으로 함께 선다.
 * 목록은 폴더가 아니라 DB에서 세어 파일이 없는 편도 관리 화면에서 사라지지 않게 한다.
 */
export default async function FactionsPage() {
  const [episodes, themes] = await Promise.all([listFactionEpisodes(), listFactionThemes()])

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">세력도감</h1>
        <p className="mt-1 text-sm text-text-secondary">
          영상 편과 웹 전용 테마를 한 목록에서 관리합니다. 영상 없는 테마에는 「영상 없음」 표찰이 붙습니다.
        </p>
      </div>

      <FactionBoard themes={themes} episodes={episodes} factionLocal={FACTION_LOCAL} />
    </div>
  )
}
