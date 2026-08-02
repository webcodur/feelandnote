import { notFound, redirect } from 'next/navigation'
import { folderToParam, paramToFolder } from '@/lib/faction-edit-route'
import { resolveFactionEditTarget } from '@/actions/admin/factions/themes'
import { ThemeAtlasStandalone } from '@/components/factions/ThemeAtlas/ThemeAtlasStandalone'

/**
 * `/factions/{편 또는 테마}` — 통합 편집 진입점.
 *
 * 토막이 편 폴더면 편 편집기(언어·탭 기본값)로 보내고, 영상 없는 웹 전용 테마(slug 또는 id)면
 * 같은 틀에서 영상 구획 없이 도감 구획만 그린다(26.08.03 편집 화면 통합).
 * 제작 편에 연결된 테마를 가리키면 그 편의 편집기로 보낸다 — 편집의 집은 하나다.
 */
export default async function FactionEpisodeEntryPage({
  params,
}: {
  params: Promise<{ episode: string }>
}) {
  const { episode } = await params
  const target = await resolveFactionEditTarget(paramToFolder(episode))
  if (!target) notFound()

  if (target.kind === 'episode') {
    redirect(`/factions/${folderToParam(target.folder)}/ko/info`)
  }

  return <ThemeAtlasStandalone data={target.data} />
}
