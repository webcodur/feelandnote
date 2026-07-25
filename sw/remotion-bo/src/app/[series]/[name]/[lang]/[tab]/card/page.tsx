import { notFound, redirect } from 'next/navigation'
import { episodeHomePath, isSeriesModel } from '@/lib/series-registry'
import { FACTION_EDIT_LANGS, FACTION_EDIT_TABS } from '@/lib/faction-edit-route'
import { FactionEditor } from '@/components/faction/FactionEditor'

type Params = {
  series: string
  name: string
  lang: string
  tab: string
}

/** /[series]/[name]/[lang]/[tab]/card */
export default async function FactionCardBoardPage({ params }: { params: Promise<Params> }) {
  const { series, name: rawName, lang, tab } = await params
  const name = decodeURIComponent(rawName)

  // 카드뉴스 편성은 세력도 전용 화면이다
  if (!isSeriesModel(series, 'faction')) {
    const home = episodeHomePath(series, name)
    if (!home) notFound()
    redirect(home)
  }
  if (!FACTION_EDIT_LANGS.has(lang) || !FACTION_EDIT_TABS.has(tab)) {
    redirect(`/${series}/${encodeURIComponent(name)}/ko/info/card`)
  }
  if (tab !== 'info') redirect(`/${series}/${encodeURIComponent(name)}/${lang}/info/card`)

  return <FactionEditor series={series} name={name} cardTarget={{}} />
}
