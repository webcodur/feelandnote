import type { Metadata } from 'next'
import { listFactionEpisodes } from '@/actions/admin/factions/episodes'
import { FACTION_LOCAL } from '@/lib/faction-local'
import FactionEpisodeList from './FactionEpisodeList'

export const metadata: Metadata = {
  title: '세력도',
}

/**
 * 세력도 목록 — 영상 한 편이 카드 한 장.
 *
 * 목록은 DB 에서 센다. 폴더를 훑지 않는 이유는 파일이 없는 편이 목록에서 사라지면
 * "만들었는데 안 보인다"가 되기 때문이다.
 */
export default async function FactionsPage() {
  const items = await listFactionEpisodes()

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">세력도</h1>
        <p className="mt-1 text-sm text-text-secondary">
          영상 한 편의 세력·인물·대사를 여기서 관리합니다. 글과 구성은 이 화면이 원본이고,
          렌더에 쓰이는 파일은 저장할 때 자동으로 다시 만들어집니다.
        </p>
      </div>

      <FactionEpisodeList items={items} factionLocal={FACTION_LOCAL} />
    </div>
  )
}
