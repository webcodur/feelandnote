import type { ReactNode } from 'react'
import { notFound, redirect } from 'next/navigation'
import { episodeHomePath, seriesDataModel, usesLangTabEditor, type SeriesDataModel } from '@/lib/series-registry'
import { FACTION_EDIT_LANGS, FACTION_EDIT_TABS, toFactionEditTab, type FactionEditTab } from '@/lib/faction-edit-route'
import { DiscourseEditor } from '@/components/discourse/DiscourseEditor'

type Params = { series: string; name: string; lang: string; tab: string }

type EditorContext = { series: string; name: string; lang: string; tab: FactionEditTab }

/**
 * 편집 화면 등록표 — 시리즈의 데이터 계열이 어느 편집기를 띄울지 정한다.
 * 새 시리즈는 레지스트리에 정의를 얹고 여기에 한 줄 더한다(분기 추가 없음).
 */
const EDITORS: Partial<Record<SeriesDataModel, (ctx: EditorContext) => ReactNode>> = {
  discourse: ({ series, name, tab }) => (
    <DiscourseEditor series={series} name={name} initialTab={tab} />
  ),
}

export default async function EpisodeLangTabPage({ params }: { params: Promise<Params> }) {
  const { series, name: rawName, lang, tab } = await params
  const name = decodeURIComponent(rawName)

  // 언어·탭 편집 화면이 없는 시리즈(책 기반)는 자기 진입 경로로 되돌린다
  if (!usesLangTabEditor(series)) {
    const home = episodeHomePath(series, name)
    if (!home) notFound()
    redirect(home)
  }
  if (!FACTION_EDIT_LANGS.has(lang) || !FACTION_EDIT_TABS.has(tab)) {
    redirect(`/${series}/${encodeURIComponent(name)}/ko/info`)
  }

  const model = seriesDataModel(series)
  const renderEditor = model ? EDITORS[model] : undefined
  if (!renderEditor) notFound()

  return renderEditor({ series, name, lang, tab: toFactionEditTab(tab) })
}
