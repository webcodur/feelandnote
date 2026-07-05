import { redirect } from 'next/navigation'
import { isFactionSeries } from '@/lib/series-registry'
import { FACTION_EDIT_LANGS, FACTION_EDIT_TABS } from '@/lib/faction-edit-route'
import { FactionEditor } from '@/components/faction/FactionEditor'

type Params = {
  series: string
  name: string
  lang: string
  tab: string
  person: string
}

/** /[series]/[name]/[lang]/[tab]/card/[person] */
export default async function FactionPersonCardPage({ params }: { params: Promise<Params> }) {
  const { series, name: rawName, lang, tab, person: rawPerson } = await params
  const name = decodeURIComponent(rawName)
  const personName = decodeURIComponent(rawPerson)

  if (!isFactionSeries(series)) redirect(`/${series}/${encodeURIComponent(name)}/scenario`)
  if (!FACTION_EDIT_LANGS.has(lang) || !FACTION_EDIT_TABS.has(tab)) {
    redirect(`/${series}/${encodeURIComponent(name)}/both/info/card/${encodeURIComponent(personName)}`)
  }
  if (tab !== 'info') {
    redirect(`/${series}/${encodeURIComponent(name)}/${lang}/info/card/${encodeURIComponent(personName)}`)
  }

  return <FactionEditor series={series} name={name} cardTarget={{ personName }} />
}
