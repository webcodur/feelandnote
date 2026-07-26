import { redirect } from 'next/navigation'
import {
  DISCOURSE_EDIT_LANGS, DISCOURSE_EDIT_TABS, toDiscourseEditTab, folderToParam, paramToFolder,
} from '@/lib/discourse-edit-route'
import { DiscourseEditor } from '@/components/discourses/DiscourseEditor'
import { DISCOURSE_SERIES } from '@/lib/discourse-paths'

type Params = { episode: string; lang: string; tab: string }

/**
 * 담화 편집 화면 — `/discourses/{편}/{언어}/{탭}`
 *
 * 탭은 둘이다. 원고(주소 토막은 shorts)는 대사와 발언 순서, 인물(info)은 말하는 사람의 실체와
 * 영상 전체 설정이다. 편집 언어는 화면 안 스위치가 다루므로(항상 '둘 다'로 시작) 이 페이지는
 * 주소의 언어 토막을 검증에만 쓴다.
 */
export default async function DiscourseEditPage({
  params,
}: {
  params: Promise<Params>
}) {
  const { episode, lang, tab } = await params
  const name = paramToFolder(episode)

  if (!DISCOURSE_EDIT_LANGS.has(lang) || !DISCOURSE_EDIT_TABS.has(tab)) {
    redirect(`/discourses/${folderToParam(name)}/both/shorts`)
  }

  return (
    <DiscourseEditor
      series={DISCOURSE_SERIES}
      name={name}
      initialTab={toDiscourseEditTab(tab)}
    />
  )
}
