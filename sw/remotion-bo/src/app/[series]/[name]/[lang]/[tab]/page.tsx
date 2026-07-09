import { redirect } from 'next/navigation'
import { isFactionSeries } from '@/lib/series-registry'
import { FACTION_EDIT_LANGS, FACTION_EDIT_TABS, toFactionEditTab } from '@/lib/faction-edit-route'
import { FactionEditor } from '@/components/faction/FactionEditor'

type Params = { series: string; name: string; lang: string; tab: string }
type SearchParams = { cardOpen?: string; cardPerson?: string; cardPath?: string }

export default async function EpisodeLangTabPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams?: Promise<SearchParams>
}) {
  const { series, name: rawName, lang, tab } = await params
  const query = (await searchParams) ?? {}
  const name = decodeURIComponent(rawName)

  if (!isFactionSeries(series)) redirect(`/${series}/${encodeURIComponent(name)}/scenario`)
  if (!FACTION_EDIT_LANGS.has(lang) || !FACTION_EDIT_TABS.has(tab)) {
    redirect(`/${series}/${encodeURIComponent(name)}/both/info`)
  }

  const cardTarget = query.cardOpen === '1'
    ? {
      ...(query.cardPerson ? { personName: query.cardPerson } : {}),
      ...(query.cardPath ? { cardPath: query.cardPath.split('/').filter(Boolean) } : {}),
    }
    : undefined

  return <FactionEditor series={series} name={name} initialTab={toFactionEditTab(tab)} cardTarget={cardTarget} />
}
