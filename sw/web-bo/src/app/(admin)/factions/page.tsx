import type { Metadata } from 'next'
import { listFactionEpisodes } from '@/actions/admin/factions/episodes'
import { listFactionThemes } from '@/actions/admin/factions/themes'
import { FACTION_LOCAL } from '@/lib/faction-local'
import EpisodeTable, { type EpisodeThemeLink } from './EpisodeTable'
import ThemeTable from './ThemeTable'

export const metadata: Metadata = {
  title: '세력도',
}

/**
 * 세력도 — 표 두 개로 나뉜다.
 *
 * 위: 유튜브로 나가는 영상 편(제작 데이터). 아래: 서비스 세력도감에 진열되는 테마 전량.
 * 둘은 다른 물건인데 예전에는 카드와 줄로 생김새까지 달라 더 헷갈렸다. 같은 표로 맞추고
 * 각 표 머리에 정체를 한 줄로 적었다.
 *
 * 목록은 DB 에서 센다. 폴더를 훑지 않는 이유는 파일이 없는 편이 목록에서 사라지면
 * "만들었는데 안 보인다"가 되기 때문이다.
 */
export default async function FactionsPage() {
  const [items, themes] = await Promise.all([listFactionEpisodes(), listFactionThemes()])

  // 편 → 테마 방향은 이미 받아 둔 테마 목록을 뒤집어 만든다(질의를 한 번 더 던지지 않는다)
  const themesByFolder: Record<string, EpisodeThemeLink[]> = {}
  for (const t of themes) {
    for (const ep of t.episodes) {
      (themesByFolder[ep.folder] ??= []).push({ id: t.id, name: t.name, color: t.color })
    }
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">세력도</h1>
        <p className="mt-1 text-sm text-text-secondary">
          영상 편과 도감 테마를 여기서 함께 관리합니다. 글과 구성은 이 화면이 원본이고,
          렌더에 쓰이는 파일은 저장할 때 자동으로 다시 만들어집니다.
        </p>
      </div>

      <EpisodeTable items={items} factionLocal={FACTION_LOCAL} themesByFolder={themesByFolder} />

      <div className="border-t border-border pt-6">
        <ThemeTable initialThemes={themes} />
      </div>
    </div>
  )
}
