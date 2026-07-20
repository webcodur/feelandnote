import { notFound, redirect } from 'next/navigation'
import { episodeHomePath, isSeriesModel } from '@/lib/series-registry'
import { FACTION_EDIT_LANGS, FACTION_EDIT_TABS } from '@/lib/faction-edit-route'
import { FactionEditor } from '@/components/faction/FactionEditor'

type Params = {
  series: string
  name: string
  lang: string
  tab: string
  person: string
  card: string[]
}

/** /[series]/[name]/[lang]/[tab]/card/[person]/... */
export default async function FactionPersonCardDeepLinkPage({ params }: { params: Promise<Params> }) {
  const { series, name: rawName, lang, tab, person: rawPerson, card } = await params
  const name = decodeURIComponent(rawName)
  const personName = decodeURIComponent(rawPerson)

  // 카드뉴스 편성은 세력도 전용 화면이다
  if (!isSeriesModel(series, 'faction')) {
    const home = episodeHomePath(series, name)
    if (!home) notFound()
    redirect(home)
  }
  if (!FACTION_EDIT_LANGS.has(lang) || !FACTION_EDIT_TABS.has(tab)) {
    redirect(`/${series}/${encodeURIComponent(name)}/both/info/card/${encodeURIComponent(personName)}/${card.map(encodeURIComponent).join('/')}`)
  }
  if (tab !== 'info') {
    redirect(`/${series}/${encodeURIComponent(name)}/${lang}/info/card/${encodeURIComponent(personName)}/${card.map(encodeURIComponent).join('/')}`)
  }

  return (
    <FactionEditor
      series={series}
      name={name}
      cardTarget={{ personName, cardPath: card.map(decodeURIComponent) }}
    />
  )
}
