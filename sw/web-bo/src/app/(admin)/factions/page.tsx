import type { Metadata } from 'next'
import { listFactionEpisodes } from '@/actions/admin/factions/episodes'
import { listFactionThemes } from '@/actions/admin/factions/themes'
import { FACTION_LOCAL } from '@/lib/faction-local'
import FactionBoard from './FactionBoard'

export const metadata: Metadata = {
  title: '세력도',
}

/**
 * 세력도 — 표 하나.
 *
 * 기준은 도감 테마이고 영상 편은 그 테마에 배지로 붙는다. 어느 테마에도 안 걸린 편만
 * 표 맨 아래 「미연결 영상」 구분 줄 밑에 모인다. 위아래로 나뉘어 있던 두 목록을 합친 것은,
 * 생김새를 표로 맞춘 뒤에도 두 덩어리가 서로 다른 물건처럼 읽혔기 때문이다.
 *
 * 목록은 DB 에서 센다. 폴더를 훑지 않는 이유는 파일이 없는 편이 목록에서 사라지면
 * "만들었는데 안 보인다"가 되기 때문이다.
 */
export default async function FactionsPage() {
  const [episodes, themes] = await Promise.all([listFactionEpisodes(), listFactionThemes()])

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">세력도</h1>
        <p className="mt-1 text-sm text-text-secondary">
          도감 테마와 연결된 영상 편을 한 표에서 관리합니다. 영상 배지 = 유튜브로 나가는 제작 편.
        </p>
      </div>

      <FactionBoard initialThemes={themes} episodes={episodes} factionLocal={FACTION_LOCAL} />
    </div>
  )
}
