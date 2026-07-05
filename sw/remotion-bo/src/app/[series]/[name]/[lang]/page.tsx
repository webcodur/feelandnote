import { redirect } from 'next/navigation'
import { isFactionSeries } from '@/lib/series-registry'
import { FACTION_EDIT_LANGS } from '@/lib/faction-edit-route'

/** /[series]/[name]/[lang] — 탭 미지정 진입은 정보 탭으로 보낸다 */
export default async function EpisodeLangPage({ params }: { params: Promise<{ series: string; name: string; lang: string }> }) {
  const { series, name: rawName, lang } = await params
  const name = decodeURIComponent(rawName)
  if (!isFactionSeries(series)) redirect(`/${series}/${encodeURIComponent(name)}/scenario`)
  const safeLang = FACTION_EDIT_LANGS.has(lang) ? lang : 'both'
  redirect(`/${series}/${encodeURIComponent(name)}/${safeLang}/info`)
}
