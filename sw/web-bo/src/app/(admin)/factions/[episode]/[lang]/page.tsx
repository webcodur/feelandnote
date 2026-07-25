import { redirect } from 'next/navigation'
import { FACTION_EDIT_LANGS } from '@/lib/faction-edit-route'

/** `/factions/{편}/{언어}` — 탭을 안 적고 들어온 경우 정비 탭으로 보낸다 */
export default async function FactionEpisodeLangPage({
  params,
}: {
  params: Promise<{ episode: string; lang: string }>
}) {
  const { episode, lang } = await params
  const name = decodeURIComponent(episode)
  const safeLang = FACTION_EDIT_LANGS.has(lang) ? lang : 'ko'
  redirect(`/factions/${encodeURIComponent(name)}/${safeLang}/info`)
}
