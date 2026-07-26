import { redirect } from 'next/navigation'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { FACTION_EDIT_LANGS, FACTION_EDIT_TABS, folderToParam, paramToFolder } from '@/lib/faction-edit-route'
import { FactionEditor } from '@/components/factions/FactionEditor'
import { FACTION_SERIES } from '@/lib/faction-paths'

type Params = { episode: string; lang: string; tab: string; person: string }

/** `/factions/{편}/{언어}/{탭}/card/{인물}` — 그 인물의 카드 묶음을 펼친 채로 연다 */
export default async function FactionPersonCardPage({ params }: { params: Promise<Params> }) {
  const { episode, lang, tab, person } = await params
  const name = paramToFolder(episode)
  const personName = decodeURIComponent(person)

  if (!FACTION_EDIT_LANGS.has(lang) || !FACTION_EDIT_TABS.has(tab)) {
    redirect(`/factions/${folderToParam(name)}/ko/info/card/${encodeURIComponent(personName)}`)
  }
  if (tab !== 'info') {
    redirect(`/factions/${folderToParam(name)}/${lang}/info/card/${encodeURIComponent(personName)}`)
  }

  return (
    <FactionEditor
      series={FACTION_SERIES}
      name={name}
      initialLang={lang as EditLang}
      cardTarget={{ personName }}
    />
  )
}
