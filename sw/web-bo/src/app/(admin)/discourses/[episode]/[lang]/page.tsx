import { redirect } from 'next/navigation'
import { DISCOURSE_EDIT_LANGS, folderToParam, paramToFolder } from '@/lib/discourse-edit-route'

/** `/discourses/{편}/{언어}` — 탭을 안 적고 들어온 경우 원고 탭으로 보낸다 */
export default async function DiscourseEpisodeLangPage({
  params,
}: {
  params: Promise<{ episode: string; lang: string }>
}) {
  const { episode, lang } = await params
  const name = paramToFolder(episode)
  const safeLang = DISCOURSE_EDIT_LANGS.has(lang) ? lang : 'both'
  redirect(`/discourses/${folderToParam(name)}/${safeLang}/shorts`)
}
