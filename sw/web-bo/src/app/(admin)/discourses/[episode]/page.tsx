import { redirect } from 'next/navigation'
import { folderToParam, paramToFolder } from '@/lib/discourse-edit-route'

/**
 * `/discourses/{편}` — 언어·탭을 안 적고 들어온 경우.
 * 편집 화면은 언어와 탭까지 주소에 담으므로 기본값(둘 다·원고)으로 보낸다.
 */
export default async function DiscourseEpisodeEntryPage({
  params,
}: {
  params: Promise<{ episode: string }>
}) {
  const { episode } = await params
  redirect(`/discourses/${folderToParam(paramToFolder(episode))}/both/shorts`)
}
