import { redirect } from 'next/navigation'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { FACTION_EDIT_LANGS, FACTION_EDIT_TABS, toFactionEditTab, folderToParam, paramToFolder } from '@/lib/faction-edit-route'
import { FactionEditor } from '@/components/factions/FactionEditor'
import { FACTION_SERIES } from '@/lib/faction-paths'

type Params = { episode: string; lang: string; tab: string }
type SearchParams = { cardOpen?: string; cardPerson?: string; cardPath?: string }

/**
 * 세력도감 편집 화면 — `/factions/{편}/{언어}/{탭}`
 *
 * 탭은 셋이다. 정비(info)는 세력·인물 데이터 그 자체, 편성 쇼츠(shorts)는 세력을 편별로 배치하고
 * 편 화면·음악을 정하는 곳, 편성 롱폼(longform)은 세력 순서·시대 문구·편 경계를 짜는 곳이다.
 *
 * 영상 관리 대시보드는 주소 첫 토막에 시리즈 이름을 넣었지만(`/{시리즈}/{편}/…`), 이 앱은
 * 세력도감 하나만 다루므로 `/factions/` 아래로 들어온다. 편집기에는 시리즈 이름을 상수로 넘긴다 —
 * 공용 부품이 창구 주소를 만들 때 그 값을 쓴다(`/api/faction/…`).
 */
export default async function FactionEditPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams?: Promise<SearchParams>
}) {
  const { episode, lang, tab } = await params
  const query = (await searchParams) ?? {}
  const name = paramToFolder(episode)

  if (!FACTION_EDIT_LANGS.has(lang) || !FACTION_EDIT_TABS.has(tab)) {
    redirect(`/factions/${folderToParam(name)}/ko/info`)
  }

  // 카드 화면을 바로 열고 특정 인물·카드로 이동하는 진입(옛 주소 호환)
  const cardTarget = query.cardOpen === '1'
    ? {
      ...(query.cardPerson ? { personName: query.cardPerson } : {}),
      ...(query.cardPath ? { cardPath: query.cardPath.split('/').filter(Boolean) } : {}),
    }
    : undefined

  return (
    <FactionEditor
      series={FACTION_SERIES}
      name={name}
      initialLang={lang as EditLang}
      initialTab={toFactionEditTab(tab)}
      cardTarget={cardTarget}
    />
  )
}
