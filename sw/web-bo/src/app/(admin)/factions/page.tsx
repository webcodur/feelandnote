import type { Metadata } from 'next'
import { listFactionEpisodes } from '@/actions/admin/factions/episodes'
import { listFactionThemes } from '@/actions/admin/factions/themes'
import { FACTION_LOCAL } from '@/lib/faction-local'
import FactionEpisodeList from './FactionEpisodeList'
import ThemeList from './ThemeList'

export const metadata: Metadata = {
  title: '세력도',
}

/**
 * 세력도 목록 — 두 켠으로 나뉜다.
 *
 * 위: 영상 한 편이 카드 한 장. 아래: 도감 테마 전량(영상 없이 글만으로 실리는 테마 포함).
 * 테마가 영상보다 먼저 있었고 영상 없는 테마가 대다수라, 영상 편만 세던 예전 목록은
 * 있는 테마의 절반 이상을 감춰 버렸다.
 *
 * 목록은 DB 에서 센다. 폴더를 훑지 않는 이유는 파일이 없는 편이 목록에서 사라지면
 * "만들었는데 안 보인다"가 되기 때문이다.
 */
export default async function FactionsPage() {
  const [items, themes] = await Promise.all([listFactionEpisodes(), listFactionThemes()])

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

      <div className="border-t border-border pt-6">
        <ThemeList initialThemes={themes} />
      </div>
    </div>
  )
}
