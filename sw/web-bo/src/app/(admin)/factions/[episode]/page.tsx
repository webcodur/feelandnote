import { redirect } from 'next/navigation'
import { paramToFolder } from '@/lib/faction-edit-route'

/**
 * `/factions/{편}` — 언어·탭을 안 적고 들어온 경우.
 * 편집 화면은 언어와 탭까지 주소에 담으므로 기본값(한국어·정비)으로 보낸다.
 */
export default async function FactionEpisodeEntryPage({
  params,
}: {
  params: Promise<{ episode: string }>
}) {
  const { episode } = await params
  redirect(`/factions/${encodeURIComponent(paramToFolder(episode))}/ko/info`)
}
