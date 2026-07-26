import { redirect } from 'next/navigation'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { FACTION_EDIT_LANGS, FACTION_EDIT_TABS, folderToParam, paramToFolder } from '@/lib/faction-edit-route'
import { FactionEditor } from '@/components/factions/FactionEditor'
import { FACTION_SERIES } from '@/lib/faction-paths'

type Params = { episode: string; lang: string; tab: string }

/** `/factions/{편}/{언어}/{탭}/card` — 카드뉴스 편성 화면. 정비 탭 아래에만 있다 */
export default async function FactionCardBoardPage({ params }: { params: Promise<Params> }) {
  const { episode, lang, tab } = await params
  const name = paramToFolder(episode)

  if (!FACTION_EDIT_LANGS.has(lang) || !FACTION_EDIT_TABS.has(tab)) {
    redirect(`/factions/${folderToParam(name)}/ko/info/card`)
  }
  if (tab !== 'info') redirect(`/factions/${folderToParam(name)}/${lang}/info/card`)

  return (
    <FactionEditor
      series={FACTION_SERIES}
      name={name}
      initialLang={lang as EditLang}
      cardTarget={{}}
    />
  )
}
