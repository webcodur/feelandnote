import { notFound, redirect } from 'next/navigation'
import { episodeHomePath, usesLangTabEditor } from '@/lib/series-registry'
import { FACTION_EDIT_LANGS } from '@/lib/faction-edit-route'

/** /[series]/[name]/[lang] — 탭 미지정 진입은 정보 탭으로 보낸다 */
export default async function EpisodeLangPage({ params }: { params: Promise<{ series: string; name: string; lang: string }> }) {
  const { series, name: rawName, lang } = await params
  const name = decodeURIComponent(rawName)
  // 언어·탭 편집 화면이 없는 시리즈(책 기반)는 자기 진입 경로로 되돌린다
  if (!usesLangTabEditor(series)) {
    const home = episodeHomePath(series, name)
    if (!home) notFound()
    redirect(home)
  }
  const safeLang = FACTION_EDIT_LANGS.has(lang) ? lang : 'both'
  redirect(`/${series}/${encodeURIComponent(name)}/${safeLang}/info`)
}
