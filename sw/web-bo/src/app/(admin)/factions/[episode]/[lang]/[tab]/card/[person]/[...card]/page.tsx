import { redirect } from 'next/navigation'
import type { EditLang } from '@feelandnote/shared/bo/editor'
import { FACTION_EDIT_LANGS, FACTION_EDIT_TABS } from '@/lib/faction-edit-route'
import { FactionEditor } from '@/components/factions/FactionEditor'
import { FACTION_SERIES } from '@/lib/faction-paths'

type Params = { episode: string; lang: string; tab: string; person: string; card: string[] }

/** `/factions/{편}/{언어}/{탭}/card/{인물}/…` — 카드 한 장까지 곧바로 여는 주소 */
export default async function FactionPersonCardDeepLinkPage({ params }: { params: Promise<Params> }) {
  const { episode, lang, tab, person, card } = await params
  const name = decodeURIComponent(episode)
  const personName = decodeURIComponent(person)
  const tail = card.map(encodeURIComponent).join('/')

  if (!FACTION_EDIT_LANGS.has(lang) || !FACTION_EDIT_TABS.has(tab)) {
    redirect(`/factions/${encodeURIComponent(name)}/ko/info/card/${encodeURIComponent(personName)}/${tail}`)
  }
  if (tab !== 'info') {
    redirect(`/factions/${encodeURIComponent(name)}/${lang}/info/card/${encodeURIComponent(personName)}/${tail}`)
  }

  return (
    <FactionEditor
      series={FACTION_SERIES}
      name={name}
      initialLang={lang as EditLang}
      cardTarget={{ personName, cardPath: card.map(decodeURIComponent) }}
    />
  )
}
